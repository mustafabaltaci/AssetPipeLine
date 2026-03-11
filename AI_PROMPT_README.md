# AI Context & Instruction Prompt

**Copy and paste the content below into any AI (ChatGPT, Claude, Gemini) if you want it to modify or troubleshoot this specific project.**

---

### AI SYSTEM PROMPT: Asset Pipeline Context

**Project Goal:** A Python-based Pixel Art Asset Pipeline that removes backgrounds and scales images to a specific grid (48x48) for Tiled Map Editor.

**Technical Stack:**
- **Language:** Python 3.10+
- **Background Removal:** `rembg` (using `new_session` for batch optimization).
- **Image Processing:** `Pillow` (PIL) using `Image.Resampling.NEAREST`.
- **Logic:** Parses a `config.txt` formatted as `filename.ext:WxH` (grid units).

**Current Architecture:**
- `pipeline.py`: Uses absolute paths via `Path(__file__).resolve().parent`.
- `input/`: Source folder containing `config.txt` and raw images.
- `output/`: Target folder for transparent PNGs.
- Automatic cleanup: Deletes source images from `input/` after successful processing.

**Mandates for AI Modifications:**
1. **Preserve Pixel Integrity:** Never use Bilinear or Lanczos scaling; always use `NEAREST`.
2. **Batch Efficiency:** Always keep the `rembg` session initialization outside the main processing loop.
3. **Robustness:** Maintain the `try-except` blocks and absolute path logic to ensure "double-click" compatibility on Windows.
4. **Transparency:** Ensure output is always saved as a `.png` with RGBA mode.

---
