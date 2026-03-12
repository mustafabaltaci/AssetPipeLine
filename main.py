import sys
import os
import json
import numpy as np
from PIL import Image
from PyQt5.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                             QHBoxLayout, QLabel, QLineEdit, QComboBox, 
                             QPushButton, QFileDialog, QScrollArea, QFrame, 
                             QCheckBox, QMessageBox, QStatusBar, QSpinBox)
from PyQt5.QtCore import Qt, QSize, pyqtSignal
from PyQt5.QtGui import QPixmap, QImage, QIcon, QIntValidator, QFont, QPalette, QColor

def pil_to_pixmap(pil_img):
    """Safely converts a PIL image to a QPixmap without using PIL.ImageQt."""
    if pil_img.mode != "RGBA":
        pil_img = pil_img.convert("RGBA")
    data = pil_img.tobytes("raw", "RGBA")
    qimg = QImage(data, pil_img.size[0], pil_img.size[1], QImage.Format_RGBA8888)
    return QPixmap.fromImage(qimg.copy()) # Copy ensures the buffer isn't lost

# --- Professional UI Styling ---
ELITE_STYLE = """
    QMainWindow { background-color: #0f0f0f; }
    QWidget { background-color: #1a1a1a; color: #e0e0e0; font-family: 'Consolas', 'Segoe UI'; }
    QFrame#ItemRow { border: 1px solid #333; background-color: #222; border-radius: 4px; margin-bottom: 2px; }
    QFrame#ItemRow:hover { border: 1px solid #007acc; background-color: #2a2a2a; }
    QLineEdit, QSpinBox, QComboBox { 
        background-color: #333; border: 1px solid #444; color: #fff; 
        padding: 5px; border-radius: 3px; 
    }
    QPushButton#PrimaryBtn { 
        background-color: #007acc; color: white; border: none; 
        border-radius: 5px; font-weight: bold; font-size: 15px; 
    }
    QPushButton#PrimaryBtn:hover { background-color: #0098ff; }
    QPushButton#RemoveBtn { color: #ff4444; background: transparent; font-size: 18px; border: none; }
    QPushButton#RemoveBtn:hover { color: #ff0000; }
    QLabel#DropZone { 
        border: 2px dashed #007acc; border-radius: 8px; 
        background-color: #121212; color: #007acc; font-weight: bold; 
    }
    QScrollBar:vertical { border: none; background: #1a1a1a; width: 10px; }
    QScrollBar::handle:vertical { background: #444; border-radius: 5px; }
"""

class DropZone(QLabel):
    """Subclassed QLabel for robust drag and drop handling."""
    filesDropped = pyqtSignal(list)
    def __init__(self, text):
        super().__init__(text)
        self.setAlignment(Qt.AlignCenter)
        self.setAcceptDrops(True)
        self.setObjectName("DropZone")
        self.setMinimumHeight(100)

    def dragEnterEvent(self, event):
        if event.mimeData().hasUrls():
            self.setStyleSheet("background-color: #1e3a5f; color: #fff;")
            event.accept()
        else: event.ignore()

    def dragLeaveEvent(self, event): self.setStyleSheet("")
    def dropEvent(self, event):
        self.setStyleSheet("")
        urls = [u.toLocalFile() for u in event.mimeData().urls()]
        self.filesDropped.emit(urls)

class SpriteAsset:
    """Core logic for asset manipulation and metadata tracking."""
    def __init__(self, path):
        self.path = path
        self.name = os.path.splitext(os.path.basename(path))[0]
        self.raw_img = Image.open(path).convert("RGBA")
        self.grid_w = 1
        self.grid_h = 1

class SpriteRow(QFrame):
    """An individual row for a sprite asset in the scrollable list."""
    removed = pyqtSignal(object)
    def __init__(self, asset):
        super().__init__()
        self.asset = asset
        self.setObjectName("ItemRow")
        self.init_ui()

    def init_ui(self):
        layout = QHBoxLayout(self)
        
        # Thumbnail for visual feedback
        thumb = self.asset.raw_img.copy()
        thumb.thumbnail((40, 40), Image.Resampling.NEAREST)
        lbl_thumb = QLabel()
        lbl_thumb.setPixmap(pil_to_pixmap(thumb))
        
        lbl_name = QLabel(self.asset.name)
        lbl_name.setFixedWidth(150)

        # UI for setting Grid Span
        self.spn_w = QSpinBox()
        self.spn_w.setRange(1, 128)
        self.spn_w.valueChanged.connect(self._upd_w)
        
        self.spn_h = QSpinBox()
        self.spn_h.setRange(1, 128)
        self.spn_h.valueChanged.connect(self._upd_h)

        btn_del = QPushButton("×")
        btn_del.setObjectName("RemoveBtn")
        btn_del.clicked.connect(lambda: self.removed.emit(self))

        layout.addWidget(lbl_thumb)
        layout.addWidget(lbl_name)
        layout.addStretch()
        layout.addWidget(QLabel("Grid Span: "))
        layout.addWidget(self.spn_w)
        layout.addWidget(QLabel("x"))
        layout.addWidget(self.spn_h)
        layout.addWidget(btn_del)

    def _upd_w(self, v): self.asset.grid_w = v
    def _upd_h(self, v): self.asset.grid_h = v

class SpritePackerApp(QMainWindow):
    """Main Application window for the Pixel Art Sprite Sheet Packer."""
    def __init__(self):
        super().__init__()
        self.assets = []
        self.setWindowTitle("Mustafa's Elite Pixel-Art Pipeline")
        self.setMinimumSize(800, 900)
        self.setStyleSheet(ELITE_STYLE)
        self.init_ui()

    def init_ui(self):
        central = QWidget()
        self.setCentralWidget(central)
        main_layout = QVBoxLayout(central)

        # --- Settings: Top Section ---
        settings_box = QFrame()
        s_lay = QHBoxLayout(settings_box)
        
        self.package_name = QLineEdit("SpriteAtlas_01")
        self.base_res = QComboBox()
        self.base_res.addItems(["16", "32", "48", "64", "128"])
        self.base_res.setCurrentText("32")

        s_lay.addWidget(QLabel("Export Name:"))
        s_lay.addWidget(self.package_name)
        s_lay.addWidget(QLabel("Grid Unit:"))
        s_lay.addWidget(self.base_res)
        main_layout.addWidget(settings_box)

        # --- Drop Zone: Middle Section ---
        self.drop_zone = DropZone("DRAG ASSETS HERE (PNG / JPG / WEBP)")
        self.drop_zone.filesDropped.connect(self.import_files)
        main_layout.addWidget(self.drop_zone)

        # --- Scroll Area: Asset List ---
        self.scroll = QScrollArea()
        self.scroll.setWidgetResizable(True)
        self.container = QWidget()
        self.list_layout = QVBoxLayout(self.container)
        self.list_layout.setAlignment(Qt.AlignTop)
        self.scroll.setWidget(self.container)
        main_layout.addWidget(self.scroll)

        # --- Advanced Options: Bottom-Middle ---
        adv_box = QFrame()
        adv_lay = QHBoxLayout(adv_box)
        
        self.chk_keying = QCheckBox("Remove White (#FFFFFF)")
        self.chk_pot = QCheckBox("Force Power-of-Two (PoT)")
        self.chk_json = QCheckBox("Export JSON Metadata")
        self.chk_json.setChecked(True)
        
        self.spn_padding = QSpinBox()
        self.spn_padding.setRange(0, 16)
        
        adv_lay.addWidget(self.chk_keying)
        adv_lay.addWidget(self.chk_pot)
        adv_lay.addWidget(self.chk_json)
        adv_lay.addWidget(QLabel("Padding:"))
        adv_lay.addWidget(self.spn_padding)
        main_layout.addWidget(adv_box)

        # --- Action Button: Finalize ---
        self.btn_gen = QPushButton("GENERATE TEXTURE ATLAS")
        self.btn_gen.setObjectName("PrimaryBtn")
        self.btn_gen.setFixedHeight(60)
        self.btn_gen.clicked.connect(self.process_atlas)
        main_layout.addWidget(self.btn_gen)

        self.status = QStatusBar()
        self.setStatusBar(self.status)

    def import_files(self, paths):
        """Imports and wraps dropped files into assets."""
        for p in paths:
            if p.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.bmp')):
                asset = SpriteAsset(p)
                row = SpriteRow(asset)
                row.removed.connect(self.remove_item)
                self.list_layout.addWidget(row)
                self.assets.append(row)
        self.status.showMessage(f"Assets Loaded: {len(self.assets)}", 3000)

    def remove_item(self, row):
        """Safely removes an asset from the pipeline list."""
        self.list_layout.removeWidget(row)
        self.assets.remove(row)
        row.deleteLater()

    def process_atlas(self):
        """Executes the packing pipeline: Preprocess -> Pack -> Composite -> Export."""
        if not self.assets:
            QMessageBox.Warning(self, "No Assets", "Please drag some images first.")
            return
        
        res = int(self.base_res.currentText())
        padding = self.spn_padding.value()
        
        processed_items = []
        for row in self.assets:
            asset = row.asset
            img = asset.raw_img.copy()

            # 1. NumPy Optimized Color Keying
            if self.chk_keying.isChecked():
                arr = np.array(img)
                # Filter specifically for pure white pixels and set alpha to 0
                mask = (arr[:,:,0] == 255) & (arr[:,:,1] == 255) & (arr[:,:,2] == 255)
                if arr.shape[2] == 4:
                    arr[mask, 3] = 0
                img = Image.fromarray(arr)

            # 2. Precise Resizing (Pixel Art Friendly)
            tw, th = asset.grid_w * res, asset.grid_h * res
            img = img.resize((tw, th), Image.Resampling.NEAREST)
            processed_items.append({'img': img, 'name': asset.name, 'gw': asset.grid_w, 'gh': asset.grid_h})

        # 3. Shelf Packing Algorithm with Padding Support
        # Sort items by height descending for optimal packing
        processed_items.sort(key=lambda x: x['gh'], reverse=True)
        
        total_pixels = sum((d['img'].width + padding) * (d['img'].height + padding) for d in processed_items)
        canvas_width = max(max(d['img'].width for d in processed_items) + padding, int(np.sqrt(total_pixels*1.5)))

        packed_positions = []
        cx, cy = 0, 0
        shelf_h = 0
        max_x = 0

        for d in processed_items:
            item_w = d['img'].width + padding
            item_h = d['img'].height + padding

            if cx + item_w > canvas_width:
                cx = 0
                cy += shelf_h
                shelf_h = 0
            
            packed_positions.append({'img': d['img'], 'name': d['name'], 'x': cx, 'y': cy})
            cx += item_w
            shelf_h = max(shelf_h, item_h)
            max_x = max(max_x, cx)

        final_w, final_h = max_x, cy + shelf_h

        # 4. Power of Two Correction (Critical for GPU compatibility)
        if self.chk_pot.isChecked():
            final_w = 2**(final_w - 1).bit_length()
            final_h = 2**(final_h - 1).bit_length()

        # 5. Compositing Final Atlas
        atlas = Image.new("RGBA", (final_w, final_h), (0, 0, 0, 0))
        metadata = {"package": self.package_name.text(), "size": {"w": final_w, "h": final_h}, "frames": {}}

        for p in packed_positions:
            atlas.paste(p['img'], (p['x'], p['y']))
            metadata["frames"][p['name']] = {
                "x": p['x'], "y": p['y'], 
                "w": p['img'].width, "h": p['img'].height
            }

        # 6. Final Export
        f_path, _ = QFileDialog.getSaveFileName(self, "Export Atlas", f"{self.package_name.text()}.png", "PNG (*.png)")
        if f_path:
            atlas.save(f_path)
            if self.chk_json.isChecked():
                json_path = f_path.replace(".png", ".json")
                with open(json_path, 'w') as jf:
                    json.dump(metadata, jf, indent=4)
            
            QMessageBox.information(self, "Export Complete", f"Saved: {f_path}\nDimensions: {final_w}x{final_h}")

if __name__ == "__main__":
    # Optimize for Mustafa's high-end workstation display (High DPI)
    QApplication.setAttribute(Qt.AA_EnableHighDpiScaling, True)
    QApplication.setAttribute(Qt.AA_UseHighDpiPixmaps, True)
    
    app = QApplication(sys.argv)
    gui = SpritePackerApp()
    gui.show()
    sys.exit(app.exec_())
