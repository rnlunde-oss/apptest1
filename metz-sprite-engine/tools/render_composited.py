#!/usr/bin/env python3
"""
render_composited.py — Renders a composited palette-mapped template into a
proper game spritesheet and walk-cycle GIF previews.

Input:  templates/composited/metz_act1_composited.json
        palettes/metz_master_palette.json

Output: output/sheets/act1_start_composited_spritesheet.png   (192x192, 1x)
        output/previews/act1_start_composited_preview.png      (768x768, 4x)
        output/previews/act1_start_composited_walk_{dir}.gif   (192x192 per frame, 4x)
        output/previews/act1_start_composited_walk_all.gif     (2x2 grid, 4x)
"""

import json
import os
from PIL import Image

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.join(SCRIPT_DIR, "..")

TEMPLATE_PATH = os.path.join(
    PROJECT_DIR, "templates", "composited", "metz_act1_composited.json"
)
PALETTE_PATH = os.path.join(PROJECT_DIR, "palettes", "metz_master_palette.json")

OUTPUT_SHEET = os.path.join(
    PROJECT_DIR, "output", "sheets", "act1_start_composited_spritesheet.png"
)
OUTPUT_PREVIEW = os.path.join(
    PROJECT_DIR, "output", "previews", "act1_start_composited_preview.png"
)
OUTPUT_GIF_DIR = os.path.join(PROJECT_DIR, "output", "previews")

CELL = 48          # each frame is 48x48 pixels
SCALE = 4          # preview / GIF upscale factor
FPS = 8            # walk-cycle frame rate
FRAME_MS = 1000 // FPS  # 125 ms

# Spritesheet layout: 4 rows x 4 cols
#   Rows: down, left, right, up
#   Cols: idle, walk_1, idle (copy), walk_2
DIRECTIONS_ORDER = ["down", "left", "right", "up"]
COLS_ORDER = ["idle", "walk_1", "idle", "walk_2"]

# ---------------------------------------------------------------------------
# Palette helpers
# ---------------------------------------------------------------------------

def hex_to_rgba(hex_str):
    """Convert '#RRGGBB' to (R, G, B, 255) tuple."""
    h = hex_str.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


def load_palette_flat(path):
    """
    Load the nested palette JSON and flatten it to a dict of
    "group.subkey" -> (R, G, B, A) tuples.
    """
    with open(path, "r") as f:
        raw = json.load(f)

    flat = {}
    for key, value in raw.items():
        if isinstance(value, dict):
            for sub_key, hex_val in value.items():
                if isinstance(hex_val, str) and hex_val.startswith("#"):
                    flat[f"{key}.{sub_key}"] = hex_to_rgba(hex_val)
        # skip non-dict top-level entries like "palette_id"
    return flat


# ---------------------------------------------------------------------------
# Frame rendering
# ---------------------------------------------------------------------------

def render_frame(grid, palette):
    """
    Turn a 48x48 grid of palette-key strings (or 0) into a PIL RGBA Image.
    """
    img = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    pixels = img.load()

    for y, row in enumerate(grid):
        for x, val in enumerate(row):
            if val == 0 or val == "0":
                continue  # transparent
            color = palette.get(val)
            if color is None:
                print(f"  WARNING: palette key '{val}' not found — using magenta")
                color = (255, 0, 255, 255)
            pixels[x, y] = color

    return img


def mirror_frame(img):
    """Horizontally flip a frame (left → right)."""
    return img.transpose(Image.FLIP_LEFT_RIGHT)


def upscale(img, factor):
    """Nearest-neighbour upscale for pixel art."""
    return img.resize(
        (img.width * factor, img.height * factor), Image.NEAREST
    )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    # -- Load data ----------------------------------------------------------
    print("Loading palette …")
    palette = load_palette_flat(PALETTE_PATH)
    print(f"  {len(palette)} palette entries loaded")

    print("Loading composited template …")
    with open(TEMPLATE_PATH, "r") as f:
        template = json.load(f)

    mirror_right = template.get("mirror_right_from_left", False)
    directions_data = template["directions"]  # down, left, up
    walk_cycle = template.get("walk_cycle", ["idle", "walk_1", "idle", "walk_2"])

    # -- Pre-render every frame per direction -------------------------------
    # frames[direction][frame_name] = PIL Image
    print("Rendering frames …")
    frames = {}
    for d_name in ("down", "left", "up"):
        frames[d_name] = {}
        for f_name in ("idle", "walk_1", "walk_2"):
            grid = directions_data[d_name][f_name]
            frames[d_name][f_name] = render_frame(grid, palette)

    # Generate right by mirroring left
    if mirror_right:
        frames["right"] = {}
        for f_name in ("idle", "walk_1", "walk_2"):
            frames["right"][f_name] = mirror_frame(frames["left"][f_name])

    # -- Build spritesheet (1x) --------------------------------------------
    print("Building spritesheet …")
    sheet = Image.new("RGBA", (CELL * 4, CELL * 4), (0, 0, 0, 0))

    for row_idx, direction in enumerate(DIRECTIONS_ORDER):
        for col_idx, col_key in enumerate(COLS_ORDER):
            frame_img = frames[direction][col_key]
            sheet.paste(frame_img, (col_idx * CELL, row_idx * CELL))

    os.makedirs(os.path.dirname(OUTPUT_SHEET), exist_ok=True)
    sheet.save(OUTPUT_SHEET)
    print(f"  Saved 1x spritesheet: {OUTPUT_SHEET}  ({sheet.width}x{sheet.height})")

    # -- Save 4x preview ----------------------------------------------------
    os.makedirs(os.path.dirname(OUTPUT_PREVIEW), exist_ok=True)
    preview = upscale(sheet, SCALE)
    preview.save(OUTPUT_PREVIEW)
    print(f"  Saved 4x preview:     {OUTPUT_PREVIEW}  ({preview.width}x{preview.height})")

    # -- Walk-cycle GIFs per direction (4x) ---------------------------------
    print("Generating walk-cycle GIFs …")
    gif_frames_by_dir = {}

    for direction in DIRECTIONS_ORDER:
        cycle_imgs = []
        for frame_name in walk_cycle:
            big = upscale(frames[direction][frame_name], SCALE)
            cycle_imgs.append(big)
        gif_frames_by_dir[direction] = cycle_imgs

        gif_path = os.path.join(
            OUTPUT_GIF_DIR,
            f"act1_start_composited_walk_{direction}.gif",
        )
        cycle_imgs[0].save(
            gif_path,
            save_all=True,
            append_images=cycle_imgs[1:],
            duration=FRAME_MS,
            loop=0,
            disposal=2,        # clear each frame before drawing next
            transparency=0,
        )
        print(f"  Saved {direction} GIF: {gif_path}")

    # -- Combined 2x2 GIF --------------------------------------------------
    #   top-left: down    top-right: right
    #   bot-left: left    bot-right: up
    cell_big = CELL * SCALE  # 192
    combined_size = cell_big * 2  # 384

    layout = [
        ("down",  (0, 0)),
        ("right", (cell_big, 0)),
        ("left",  (0, cell_big)),
        ("up",    (cell_big, cell_big)),
    ]

    combined_frames = []
    num_cycle_frames = len(walk_cycle)
    for i in range(num_cycle_frames):
        canvas = Image.new("RGBA", (combined_size, combined_size), (0, 0, 0, 0))
        for direction, pos in layout:
            canvas.paste(gif_frames_by_dir[direction][i], pos)
        combined_frames.append(canvas)

    combined_path = os.path.join(
        OUTPUT_GIF_DIR, "act1_start_composited_walk_all.gif"
    )
    combined_frames[0].save(
        combined_path,
        save_all=True,
        append_images=combined_frames[1:],
        duration=FRAME_MS,
        loop=0,
        disposal=2,
        transparency=0,
    )
    print(f"  Saved combined GIF:   {combined_path}")

    # -- Summary ------------------------------------------------------------
    print("\n=== Generation complete ===")
    outputs = [
        OUTPUT_SHEET,
        OUTPUT_PREVIEW,
    ]
    for d in DIRECTIONS_ORDER:
        outputs.append(
            os.path.join(OUTPUT_GIF_DIR, f"act1_start_composited_walk_{d}.gif")
        )
    outputs.append(combined_path)

    all_ok = True
    for p in outputs:
        exists = os.path.isfile(p)
        status = "OK" if exists else "MISSING"
        if not exists:
            all_ok = False
        size_str = ""
        if exists:
            img = Image.open(p)
            size_str = f"  ({img.width}x{img.height})"
            img.close()
        print(f"  [{status}] {os.path.relpath(p, PROJECT_DIR)}{size_str}")

    if all_ok:
        print("\nAll files generated successfully.")
    else:
        print("\nSome files are MISSING — check errors above.")


if __name__ == "__main__":
    main()
