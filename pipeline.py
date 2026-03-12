import os
import sys
from pathlib import Path
from PIL import Image

try:
    from rembg import remove, new_session
except ImportError:
    print("Error: 'rembg' library not found. Please install it using 'pip install rembg'.")
    sys.exit(1)

# --- Configuration ---
# Get the directory where the script is located to ensure paths work regardless of where it's launched from
BASE_DIR = Path(__file__).resolve().parent
GRID_SIZE = 48
INPUT_DIR = BASE_DIR / "input"
OUTPUT_DIR = BASE_DIR / "output"
CONFIG_FILE = INPUT_DIR / "config.txt"

def setup_directories():
    """Ensures input and output directories exist."""
    INPUT_DIR.mkdir(exist_ok=True)
    OUTPUT_DIR.mkdir(exist_ok=True)
    if not CONFIG_FILE.exists():
        with open(CONFIG_FILE, "w") as f:
            f.write("# Format: [filename.ext]:[grid_x]x[grid_y]\n")
            f.write("# Example: office_desk.png:4x2\n")
        print(f"Created {CONFIG_FILE}. Please add your assets and configuration.")

def parse_config():
    """Parses the config.txt file and returns a list of tasks."""
    tasks = []
    if not CONFIG_FILE.exists():
        return tasks

    with open(CONFIG_FILE, "r") as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line or line.startswith("#"):
                continue

            try:
                parts = line.rsplit(":", 1)
                if len(parts) != 2:
                    raise ValueError("Missing colon separator")

                filename, grid_dims = parts
                grid_x, grid_y = map(int, grid_dims.lower().split("x"))
                tasks.append({
                    "filename": filename.strip(),
                    "grid_x": grid_x,
                    "grid_y": grid_y
                })
            except Exception as e:
                print(f"Warning: Skipping malformed line {line_num} '{line}': {e}")
    
    return tasks

def process_assets():
    """Main pipeline execution."""
    setup_directories()
    tasks = parse_config()

    if not tasks:
        print("No valid tasks found in config.txt. Add files to 'input/' and update 'config.txt'.")
        return

    print(f"Starting pipeline: Processing {len(tasks)} assets...")

    try:
        session = new_session()
    except Exception as e:
        print(f"Error initializing rembg session: {e}")
        return

    for task in tasks:
        input_path = INPUT_DIR / task["filename"]
        output_filename = Path(task["filename"]).with_suffix(".png").name
        output_path = OUTPUT_DIR / output_filename

        if not input_path.exists():
            print(f"Error: File not found: {input_path}")
            continue

        try:
            print(f"Processing {task['filename']}...")
            with Image.open(input_path) as img:
                img = img.convert("RGBA")
                no_bg_img = remove(img, session=session)
                target_w = task["grid_x"] * GRID_SIZE
                target_h = task["grid_y"] * GRID_SIZE
                resized_img = no_bg_img.resize((target_w, target_h), Image.Resampling.NEAREST)
                resized_img.save(output_path, "PNG")
                print(f"  -> Resized to {target_w}x{target_h} -> Saved to {output_path}")

            input_path.unlink()
            print(f"  -> Deleted original: {input_path}")

        except Exception as e:
            print(f"Failed to process {task['filename']}: {e}")

    print("\nPipeline execution complete.")

if __name__ == "__main__":
    try:
        process_assets()
    except Exception as e:
        print(f"A critical error occurred: {e}")
    finally:
        input("\nPress Enter to exit...")
