# Pixel Art Asset Pipeline for Tiled

A production-ready Python automation tool for game developers and technical artists. This script processes raw images (AI-generated or sketches), removes backgrounds, and scales them to a pixel-perfect grid for the Tiled Map Editor.

## 🚀 Quick Start

1.  **Install Python 3.10+**
2.  **Install Dependencies**:
    ```bash
    pip install "rembg[cpu]" Pillow numpy
    ```
3.  **Setup**:
    - Place your raw images in the `input/` folder.
    - Edit `input/config.txt` to map images to their grid size.
      *Example: `desk.png:4x2` (This will create a 192x96px image if your grid is 48px).*
4.  **Run**:
    Double-click `pipeline.py` or run `python pipeline.py` in your terminal.
5.  **Collect**:
    Your processed, transparent PNGs will be in the `output/` folder.

## 🛠 Dependencies Explained

*   **rembg[cpu]**: Uses AI (U2-Net) to identify and remove backgrounds.
*   **Pillow (PIL)**: Handles image resizing using `NEAREST` neighbor sampling to preserve sharp pixel edges.
*   **numpy**: Required as a mathematical backend for image array processing.

## ⚠️ Important Notes
- **First Run**: The script will download the AI model (~170MB) the first time you run it.
- **Pixel Art**: The script specifically uses `Resampling.NEAREST` to ensure your assets stay "crunchy" and don't get blurred.
