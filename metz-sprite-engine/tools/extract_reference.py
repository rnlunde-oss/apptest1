#!/usr/bin/env python3
"""
extract_reference.py — Extracts sprite frames from a ChatGPT-generated reference image
and converts them to the 48x48 palette-mapped JSON template format used by the
Metz Sprite Engine.

Input:  A 4x4 grid reference image (1545x2000) with 16 sprite frames
        Row 1: Down/front-facing (idle, walk_1, idle_copy, walk_2)
        Row 2: Left-facing (idle, walk_1, idle_copy, walk_2)
        Row 3: Right-facing (skipped — auto-mirrored from left)
        Row 4: Up/back-facing (idle, walk_1, idle_copy, walk_2)

Output: templates/composited/metz_act1_composited.json
        output/previews/reference_extraction_preview.png
"""

import json
import os
import math
from PIL import Image

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.join(SCRIPT_DIR, "..")

REFERENCE_IMAGE = os.path.expanduser(
    "~/Downloads/Untitled design (10).png"
)
PALETTE_PATH = os.path.join(PROJECT_DIR, "palettes", "metz_master_palette.json")
OUTPUT_JSON = os.path.join(PROJECT_DIR, "templates", "composited", "metz_act1_composited.json")
OUTPUT_PREVIEW = os.path.join(PROJECT_DIR, "output", "previews", "reference_extraction_preview.png")
OUTPUT_COMPARISON = os.path.join(PROJECT_DIR, "output", "previews", "reference_extraction_comparison.png")

SIZE = 48
BACKGROUND_THRESHOLD = 200  # R, G, B all > this → transparent
MAX_PALETTE_DISTANCE = 80   # Euclidean RGB distance; beyond this → transparent
ALPHA_THRESHOLD = 180       # alpha < this → transparent (higher to reject partially transparent edge pixels)

# ---------------------------------------------------------------------------
# Palette loading
# ---------------------------------------------------------------------------
def hex_to_rgb(hex_str):
    """Convert '#RRGGBB' to (R, G, B) tuple."""
    hex_str = hex_str.lstrip("#")
    return (int(hex_str[0:2], 16), int(hex_str[2:4], 16), int(hex_str[4:6], 16))


def load_palette(path):
    """Load the master palette and build a flat dict: 'group.key' → (R, G, B)."""
    with open(path, "r") as f:
        data = json.load(f)

    palette = {}  # "group.key" → (R, G, B)
    for group_name, group_val in data.items():
        if group_name == "palette_id":
            continue
        if isinstance(group_val, dict):
            for key_name, hex_val in group_val.items():
                if isinstance(hex_val, str) and hex_val.startswith("#"):
                    dot_key = f"{group_name}.{key_name}"
                    palette[dot_key] = hex_to_rgb(hex_val)
    return palette


# ---------------------------------------------------------------------------
# Grid detection
# ---------------------------------------------------------------------------
def detect_grid(img, num_rows=4, num_cols=4):
    """Detect the 4x4 grid cell boundaries in the reference image.

    Strategy: divide the image into equal quadrants since ChatGPT-generated
    sprite sheets typically have uniform cell sizes. Then refine by looking
    for the actual sprite content within each cell.

    Returns: list of (col, row) → (x0, y0, x1, y1) bounding boxes.
    """
    w, h = img.size
    cell_w = w / num_cols
    cell_h = h / num_rows

    cells = []  # list of 16 tuples: (grid_col, grid_row, x0, y0, x1, y1)
    for r in range(num_rows):
        for c in range(num_cols):
            x0 = int(round(c * cell_w))
            y0 = int(round(r * cell_h))
            x1 = int(round((c + 1) * cell_w))
            y1 = int(round((r + 1) * cell_h))

            # Row 3 (back-facing): the head extends above the cell boundary
            # into the bottom of row 2. Extend the top boundary upward by 60px
            # to capture the full head.
            if r == 3:
                y0 = max(0, y0 - 85)  # Head starts ~75px above cell boundary

            cells.append((c, r, x0, y0, x1, y1))

    return cells


# ---------------------------------------------------------------------------
# Sprite extraction from a single cell
# ---------------------------------------------------------------------------
def is_background_pixel(r, g, b, a=255):
    """Check if a pixel should be treated as transparent background."""
    if a < ALPHA_THRESHOLD:
        return True
    if r > BACKGROUND_THRESHOLD and g > BACKGROUND_THRESHOLD and b > BACKGROUND_THRESHOLD:
        return True
    return False


def find_sprite_bbox(img_cell):
    """Find the bounding box of non-background pixels in a cell image."""
    w, h = img_cell.size
    pixels = img_cell.load()
    has_alpha = img_cell.mode == "RGBA"

    min_x, min_y = w, h
    max_x, max_y = -1, -1

    for y in range(h):
        for x in range(w):
            px = pixels[x, y]
            if has_alpha:
                r, g, b, a = px
            else:
                r, g, b = px
                a = 255

            if not is_background_pixel(r, g, b, a):
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)

    if max_x < 0:
        # No sprite content found
        return None

    return (min_x, min_y, max_x + 1, max_y + 1)


def extract_and_scale_cell(img, cell_bounds, palette, direction="down", global_scale=None):
    """Extract a sprite from a cell, scale to 48x48, and palette-map it.

    Steps:
    1. Crop the cell from the full image
    2. Find the sprite bounding box within the cell
    3. Crop to sprite bounds
    4. Scale using global_scale (consistent across all directions)
    5. Bottom-align in the 48x48 grid
    6. Map each pixel to the nearest palette color

    Returns: (48x48 grid, sprite_w, sprite_h) or just grid if no global_scale computation needed
    """
    c, r, x0, y0, x1, y1 = cell_bounds
    cell_img = img.crop((x0, y0, x1, y1))

    # Convert to RGBA if needed
    if cell_img.mode != "RGBA":
        cell_img = cell_img.convert("RGBA")

    # Find sprite bounding box
    bbox = find_sprite_bbox(cell_img)
    if bbox is None:
        print(f"  WARNING: No sprite found in cell ({c}, {r})")
        return [[0] * SIZE for _ in range(SIZE)]

    # Crop to sprite bounds with inset margin to avoid grid-line artifacts
    sx0, sy0, sx1, sy1 = bbox
    margin = 10  # pixels to inset from cell edges to skip border artifacts
    cell_w, cell_h = cell_img.size
    if sx0 < margin:
        sx0 = margin
    if sy0 < margin:
        sy0 = margin
    if sx1 > cell_w - margin:
        sx1 = cell_w - margin
    if sy1 > cell_h - margin:
        sy1 = cell_h - margin
    sprite = cell_img.crop((sx0, sy0, sx1, sy1))

    sprite_w, sprite_h = sprite.size
    print(f"  Cell ({c},{r}): sprite size {sprite_w}x{sprite_h} in cell {x1-x0}x{y1-y0} [dir={direction}]")

    # Make background transparent BEFORE scaling. This way LANCZOS anti-aliasing
    # at sprite edges blends with transparency (partial alpha) instead of blending
    # with white. We can then alpha-threshold the partially transparent edge pixels.
    sprite_pixels = sprite.load()
    for sy in range(sprite_h):
        for sx in range(sprite_w):
            r, g, b, a = sprite_pixels[sx, sy]
            if is_background_pixel(r, g, b, a):
                sprite_pixels[sx, sy] = (0, 0, 0, 0)

    # Scale strategy depends on direction
    if direction == "up":
        # Back-facing: scale to fill full height (48px) so head is visible.
        # If width overflows, center-crop horizontally.
        scale = SIZE / sprite_h
    elif global_scale is not None:
        scale = global_scale
    else:
        # Fallback: fit within 48x48
        scale = min(SIZE / sprite_w, SIZE / sprite_h)

    new_w = max(1, int(round(sprite_w * scale)))
    new_h = max(1, int(round(sprite_h * scale)))

    # Clamp to SIZE
    new_w = min(new_w, SIZE)
    new_h = min(new_h, SIZE)

    # Use LANCZOS for downscaling to preserve small features (like heads).
    # Since background is now transparent, edge pixels get partial alpha.
    scaled = sprite.resize((new_w, new_h), Image.LANCZOS)

    # If width overflows 48, center-crop horizontally
    crop_x = 0
    if new_w > SIZE:
        crop_x = (new_w - SIZE) // 2
        scaled = scaled.crop((crop_x, 0, crop_x + SIZE, new_h))
        new_w = SIZE

    # Bottom-align all directions (feet at the same row) and center horizontally
    offset_x = (SIZE - new_w) // 2
    offset_y = SIZE - new_h

    # Build the 48x48 grid with palette mapping
    grid = [[0] * SIZE for _ in range(SIZE)]
    scaled_pixels = scaled.load()

    # Pre-compute palette as list for faster distance calculation
    palette_items = list(palette.items())  # [(key, (r,g,b)), ...]

    for py in range(new_h):
        for px in range(new_w):
            rgba = scaled_pixels[px, py]
            r, g, b, a = rgba

            gx = offset_x + px
            gy = offset_y + py

            if gx < 0 or gx >= SIZE or gy < 0 or gy >= SIZE:
                continue

            if is_background_pixel(r, g, b, a):
                grid[gy][gx] = 0
                continue

            # Find nearest palette color
            best_key = None
            best_dist = float("inf")
            for key, (pr, pg, pb) in palette_items:
                dist = math.sqrt((r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2)
                if dist < best_dist:
                    best_dist = dist
                    best_key = key

            if best_dist > MAX_PALETTE_DISTANCE:
                grid[gy][gx] = 0  # Too far from any palette color — artifact
            else:
                grid[gy][gx] = best_key

    # Post-process Step 1: Edge artifact removal.
    # Artifact lines (cell borders, ground shadows) appear as thin strips
    # at the edges, separated from the main sprite by sparse gaps (may have
    # 1-2 stray anti-aliased pixels). Use a pixel count threshold so sparse
    # rows/cols are treated as gaps.
    MAX_ARTIFACT_THICKNESS = 4   # max rows/cols for an artifact strip
    MIN_CONTENT_PIXELS = 5       # rows/cols with fewer pixels = treated as gap

    def _row_px(grid, gy):
        return sum(1 for gx in range(SIZE) if grid[gy][gx] != 0)

    def _col_px(grid, gx):
        return sum(1 for gy in range(SIZE) if grid[gy][gx] != 0)

    def _scan_edge_artifacts(grid, indices, count_fn, clear_fn):
        """Scan from an edge inward. indices = row/col indices from edge inward.
        count_fn(idx) → pixel count. clear_fn(idx) clears that row/col.
        Returns number of artifact rows/cols removed."""
        phase = "empty"
        strip = []
        for idx in indices:
            px = count_fn(idx)
            is_content = px >= MIN_CONTENT_PIXELS
            if phase == "empty":
                if is_content:
                    phase = "content"
                    strip.append(idx)
            elif phase == "content":
                if is_content:
                    strip.append(idx)
                else:
                    # Hit sparse/empty zone after content strip
                    if len(strip) <= MAX_ARTIFACT_THICKNESS:
                        # Check for main body content beyond the gap
                        remaining = indices[indices.index(idx):]
                        has_more = any(count_fn(i) >= MIN_CONTENT_PIXELS for i in remaining)
                        if has_more:
                            for s in strip:
                                clear_fn(s)
                            # Also clear stray pixels between edge and strip
                            edge_start = indices[0]
                            edge_end = strip[-1] if indices[0] < indices[-1] else strip[-1]
                            return len(strip)
                    break
        return 0

    # Bottom edge
    indices_bottom = list(range(SIZE - 1, -1, -1))
    n = _scan_edge_artifacts(
        grid, indices_bottom,
        lambda gy: _row_px(grid, gy),
        lambda gy: [grid[gy].__setitem__(gx, 0) for gx in range(SIZE)]
    )
    if n:
        print(f"    Removed {n}-row bottom artifact")

    # Top edge
    indices_top = list(range(SIZE))
    n = _scan_edge_artifacts(
        grid, indices_top,
        lambda gy: _row_px(grid, gy),
        lambda gy: [grid[gy].__setitem__(gx, 0) for gx in range(SIZE)]
    )
    if n:
        print(f"    Removed {n}-row top artifact")

    # Left edge
    indices_left = list(range(SIZE))
    n = _scan_edge_artifacts(
        grid, indices_left,
        lambda gx: _col_px(grid, gx),
        lambda gx: [grid[gy].__setitem__(gx, 0) for gy in range(SIZE)]
    )
    if n:
        print(f"    Removed {n}-col left artifact")

    # Right edge
    indices_right = list(range(SIZE - 1, -1, -1))
    n = _scan_edge_artifacts(
        grid, indices_right,
        lambda gx: _col_px(grid, gx),
        lambda gx: [grid[gy].__setitem__(gx, 0) for gy in range(SIZE)]
    )
    if n:
        print(f"    Removed {n}-col right artifact")

    # Post-process Step 2: Gentle edge erosion to clean up stray pixels.
    # The pre-scaling transparency + alpha threshold handles most of the halo,
    # so only light erosion is needed here (2 passes, threshold 5).
    for _pass in range(2):
        to_clear = []
        for gy in range(SIZE):
            for gx in range(SIZE):
                if grid[gy][gx] == 0:
                    continue
                transparent_neighbors = 0
                for dy in [-1, 0, 1]:
                    for dx in [-1, 0, 1]:
                        if dy == 0 and dx == 0:
                            continue
                        ny, nx = gy + dy, gx + dx
                        if ny < 0 or ny >= SIZE or nx < 0 or nx >= SIZE:
                            transparent_neighbors += 1
                        elif grid[ny][nx] == 0:
                            transparent_neighbors += 1
                if transparent_neighbors >= 5:
                    to_clear.append((gy, gx))
        for gy, gx in to_clear:
            grid[gy][gx] = 0

    return grid


# ---------------------------------------------------------------------------
# Preview rendering
# ---------------------------------------------------------------------------
def render_frame_to_image(frame, palette, scale=4):
    """Render a single 48x48 palette-mapped frame to a PIL Image."""
    img = Image.new("RGBA", (SIZE * scale, SIZE * scale), (255, 255, 255, 0))
    pixels = img.load()

    for y in range(SIZE):
        for x in range(SIZE):
            val = frame[y][x]
            if val == 0:
                color = (255, 255, 255, 0)  # transparent
            elif val in palette:
                r, g, b = palette[val]
                color = (r, g, b, 255)
            else:
                color = (255, 0, 255, 255)  # magenta = unknown key

            for sy in range(scale):
                for sx in range(scale):
                    pixels[x * scale + sx, y * scale + sy] = color

    return img


def render_preview(template_data, palette, scale=4):
    """Render a 4x3 grid preview: 4 columns (idle, walk_1, walk_2, idle_repeat)
    for each of 3 directions (down, left, up).

    Returns a PIL Image of size (4*48*scale, 3*48*scale).
    """
    directions = ["down", "left", "up"]
    frames_per_dir = ["idle", "walk_1", "walk_2"]

    cols = len(frames_per_dir)
    rows = len(directions)

    canvas_w = cols * SIZE * scale
    canvas_h = rows * SIZE * scale
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (40, 40, 40, 255))

    for row_idx, direction in enumerate(directions):
        for col_idx, frame_name in enumerate(frames_per_dir):
            frame = template_data["directions"][direction][frame_name]
            frame_img = render_frame_to_image(frame, palette, scale)

            px = col_idx * SIZE * scale
            py = row_idx * SIZE * scale
            canvas.paste(frame_img, (px, py), frame_img)

    return canvas


def render_comparison(reference_path, preview_img, scale=4):
    """Create a side-by-side comparison: original reference (left) and
    our palette-mapped preview (right)."""
    ref_img = Image.open(reference_path).convert("RGBA")

    # Scale reference to match preview height
    preview_w, preview_h = preview_img.size
    ref_scale = preview_h / ref_img.height
    ref_resized = ref_img.resize(
        (int(ref_img.width * ref_scale), preview_h),
        Image.NEAREST
    )

    # Create side-by-side canvas
    gap = 20
    total_w = ref_resized.width + gap + preview_w
    canvas = Image.new("RGBA", (total_w, preview_h), (60, 60, 60, 255))
    canvas.paste(ref_resized, (0, 0), ref_resized)
    canvas.paste(preview_img, (ref_resized.width + gap, 0), preview_img)

    return canvas


# ---------------------------------------------------------------------------
# Statistics
# ---------------------------------------------------------------------------
def print_stats(template_data, palette):
    """Print statistics about the extracted template."""
    all_keys = set()
    total_pixels = 0
    transparent_pixels = 0

    for direction in template_data["directions"]:
        for frame_name in template_data["directions"][direction]:
            frame = template_data["directions"][direction][frame_name]
            for row in frame:
                for val in row:
                    if val == 0:
                        transparent_pixels += 1
                    else:
                        all_keys.add(val)
                        total_pixels += 1

    total = total_pixels + transparent_pixels
    print(f"\n  EXTRACTION STATISTICS")
    print(f"  {'='*50}")
    print(f"  Total cells:        {total:,} (9 frames x 48x48)")
    print(f"  Opaque pixels:      {total_pixels:,} ({100*total_pixels/total:.1f}%)")
    print(f"  Transparent pixels: {transparent_pixels:,} ({100*transparent_pixels/total:.1f}%)")
    print(f"  Unique palette keys used: {len(all_keys)}")
    print(f"  Keys: {sorted(all_keys)}")

    # Check for any keys not in palette
    invalid = [k for k in all_keys if k not in palette]
    if invalid:
        print(f"  WARNING: Invalid palette keys: {invalid}")
    else:
        print(f"  All palette keys valid.")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("=" * 60)
    print("  REFERENCE IMAGE EXTRACTION — Captain Metz Act I")
    print("=" * 60)

    # Load palette
    print(f"\n  Loading palette from: {PALETTE_PATH}")
    palette = load_palette(PALETTE_PATH)
    print(f"  Palette loaded: {len(palette)} colors")
    for key, rgb in sorted(palette.items()):
        print(f"    {key:30s} → #{rgb[0]:02X}{rgb[1]:02X}{rgb[2]:02X}  {rgb}")

    # Open reference image
    print(f"\n  Opening reference image: {REFERENCE_IMAGE}")
    img = Image.open(REFERENCE_IMAGE)
    print(f"  Image size: {img.size}, mode: {img.mode}")

    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA")

    # Detect grid
    print(f"\n  Detecting 4x4 grid...")
    cells = detect_grid(img)
    print(f"  Found {len(cells)} cells")

    # Map grid rows to directions for proper positioning
    row_to_direction = {0: "down", 1: "left", 2: "right", 3: "up"}

    # First pass: find sprite dimensions to compute a global scale
    # Use front-facing (row 0) sprites to determine the reference scale,
    # so the character is the same size in all views
    print(f"\n  Computing global scale from front-facing sprites...")
    max_sprite_h = 0
    max_sprite_w = 0
    for cell in cells:
        c, r = cell[0], cell[1]
        if r != 0:  # Only look at front-facing row
            continue
        cell_img = img.crop((cell[2], cell[3], cell[4], cell[5]))
        if cell_img.mode != "RGBA":
            cell_img = cell_img.convert("RGBA")
        bbox = find_sprite_bbox(cell_img)
        if bbox:
            sx0, sy0, sx1, sy1 = bbox
            # Apply margin (must match extraction margin)
            cell_w, cell_h = cell_img.size
            sx0 = max(sx0, 10)
            sy0 = max(sy0, 10)
            sx1 = min(sx1, cell_w - 10)
            sy1 = min(sy1, cell_h - 10)
            h = sy1 - sy0
            w = sx1 - sx0
            if h > max_sprite_h:
                max_sprite_h = h
            if w > max_sprite_w:
                max_sprite_w = w

    # Global scale: fit the tallest front-facing sprite into SIZE pixels
    global_scale = min(SIZE / max_sprite_w, SIZE / max_sprite_h)
    print(f"  Reference sprite: {max_sprite_w}x{max_sprite_h}, global scale: {global_scale:.4f}")

    # Extract all 16 cells using the global scale
    print(f"\n  Extracting and palette-mapping sprites...")
    extracted = {}  # (col, row) → 48x48 grid
    for cell in cells:
        c, r = cell[0], cell[1]
        direction = row_to_direction.get(r, "down")
        grid = extract_and_scale_cell(img, cell, palette, direction=direction, global_scale=global_scale)
        extracted[(c, r)] = grid

    # Organize into template structure
    # Row 0 (index 0) → direction "down": col0=idle, col1=walk_1, col3=walk_2
    # Row 1 (index 1) → direction "left": col0=idle, col1=walk_1, col3=walk_2
    # Row 2 (index 2) → SKIP (right is auto-mirrored from left)
    # Row 3 (index 3) → direction "up": col0=idle, col1=walk_1, col3=walk_2

    template = {
        "template_id": "metz_act1_composited",
        "type": "composited",
        "size": [SIZE, SIZE],
        "palette_type": "master",
        "mirror_right_from_left": True,
        "walk_cycle": ["idle", "walk_1", "idle", "walk_2"],
        "source": "reference_extraction",
        "directions": {
            "down": {
                "idle":   extracted[(0, 0)],
                "walk_1": extracted[(1, 0)],
                "walk_2": extracted[(3, 0)],
            },
            "left": {
                "idle":   extracted[(0, 1)],
                "walk_1": extracted[(1, 1)],
                "walk_2": extracted[(3, 1)],
            },
            "up": {
                "idle":   extracted[(0, 3)],
                "walk_1": extracted[(1, 3)],
                "walk_2": extracted[(3, 3)],
            },
        }
    }

    # Validate all frames
    print(f"\n  VALIDATION")
    print(f"  {'='*50}")
    all_ok = True
    for direction in ["down", "left", "up"]:
        for frame_name in ["idle", "walk_1", "walk_2"]:
            frame = template["directions"][direction][frame_name]
            rows_ok = len(frame) == SIZE
            cols_ok = all(len(r) == SIZE for r in frame)
            pixel_count = sum(1 for r in frame for v in r if v != 0)
            status = "OK" if (rows_ok and cols_ok) else "FAIL"
            if not (rows_ok and cols_ok):
                all_ok = False
            print(f"    {direction}.{frame_name:8s}  {status:4s}  ({len(frame)}x{len(frame[0]) if frame else 0})  opaque_pixels: {pixel_count}")

    if not all_ok:
        print("\n  *** VALIDATION FAILED ***")
        return

    # Print statistics
    print_stats(template, palette)

    # Write output JSON
    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    with open(OUTPUT_JSON, "w") as f:
        json.dump(template, f, indent=2)
    file_size = os.path.getsize(OUTPUT_JSON)
    print(f"\n  Output JSON: {OUTPUT_JSON}")
    print(f"  Size: {file_size:,} bytes")

    # Generate preview
    print(f"\n  Generating preview images...")
    os.makedirs(os.path.dirname(OUTPUT_PREVIEW), exist_ok=True)

    preview = render_preview(template, palette, scale=4)
    preview.save(OUTPUT_PREVIEW)
    print(f"  Preview saved: {OUTPUT_PREVIEW} ({preview.size[0]}x{preview.size[1]})")

    # Generate comparison
    comparison = render_comparison(REFERENCE_IMAGE, preview, scale=4)
    comparison.save(OUTPUT_COMPARISON)
    print(f"  Comparison saved: {OUTPUT_COMPARISON} ({comparison.size[0]}x{comparison.size[1]})")

    print(f"\n  Done!")
    print("=" * 60)


if __name__ == "__main__":
    main()
