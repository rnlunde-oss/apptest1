#!/usr/bin/env python3
"""
Generate 5 equipment template JSON files for Captain Metz's 48x48 sprite system.

Templates generated:
  1. Blue Scarf (scarf_blue_cowl.json)        - z_order 1
  2. Navy Tabard (tabard_navy_gold.json)       - z_order 2
  3. Steel Chestplate (chestplate_steel_gold.json) - z_order 4
  4. Segmented Pauldrons (pauldrons_segmented_fur.json) - z_order 6
  5. Steel Bracers (bracers_steel.json)        - z_order 5
"""

import json
import os
import copy

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
W, H = 48, 48
EMPTY_ROW = [0] * W

BASE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
)
ARMOR_DIR = os.path.join(BASE_DIR, "templates", "equipment", "armor")
ACCESSORIES_DIR = os.path.join(BASE_DIR, "templates", "equipment", "accessories")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def row(left_pad, *segments):
    """Build a 48-pixel row from a left pad and pixel segments.

    Each segment is either:
      - an int  -> that many transparent (0) pixels
      - a str   -> one pixel of that palette key
      - a tuple (count, key) -> *count* pixels of *key* (key may be 0)
    """
    pixels = [0] * left_pad
    for seg in segments:
        if isinstance(seg, int):
            pixels.extend([0] * seg)
        elif isinstance(seg, str):
            pixels.append(seg)
        elif isinstance(seg, tuple):
            count, key = seg
            pixels.extend([key] * count)
        else:
            raise ValueError(f"Unknown segment type: {type(seg)}")
    # Pad / truncate to 48
    if len(pixels) < W:
        pixels.extend([0] * (W - len(pixels)))
    elif len(pixels) > W:
        pixels = pixels[:W]
    return pixels


def empty_frame():
    """Return a 48x48 transparent frame."""
    return [[0] * W for _ in range(H)]


def validate_frame(frame, label):
    """Validate a frame is exactly 48 rows x 48 cols, values are 0 or strings."""
    errors = []
    if len(frame) != H:
        errors.append(f"  {label}: expected {H} rows, got {len(frame)}")
    for r_idx, r in enumerate(frame):
        if len(r) != W:
            errors.append(f"  {label} row {r_idx}: expected {W} cols, got {len(r)}")
        for c_idx, val in enumerate(r):
            if val != 0 and not isinstance(val, str):
                errors.append(
                    f"  {label} row {r_idx} col {c_idx}: invalid value {val!r}"
                )
            if isinstance(val, str) and "." not in val:
                errors.append(
                    f"  {label} row {r_idx} col {c_idx}: missing dot notation in '{val}'"
                )
    return errors


def validate_template(tpl):
    """Validate every frame in a template. Returns list of error strings."""
    errors = []
    tid = tpl.get("template_id", "???")
    for d_name, d_frames in tpl["directions"].items():
        for f_name, frame in d_frames.items():
            errors.extend(validate_frame(frame, f"{tid}/{d_name}/{f_name}"))
    return errors


def save_template(tpl, path):
    """Write template to JSON, creating dirs as needed."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(tpl, f, indent=2)
    print(f"  Saved: {path}")


def shift_frame_up(frame, px=1):
    """Shift non-empty content up by px rows (bottom rows become empty)."""
    out = copy.deepcopy(frame)
    for r in range(H):
        if r + px < H:
            out[r] = frame[r + px][:]
        else:
            out[r] = [0] * W
    return out


def shift_frame_cols(frame, dx):
    """Shift non-zero content horizontally by dx cols (positive = right)."""
    out = []
    for r in frame:
        new_r = [0] * W
        for c in range(W):
            nc = c + dx
            if 0 <= nc < W and r[c] != 0:
                new_r[nc] = r[c]
        out.append(new_r)
    return out


# ===========================================================================
# TEMPLATE 1: Blue Scarf
# ===========================================================================
def make_scarf_blue_cowl():
    # -- DOWN direction (idle) --
    # Scarf wraps around neck at rows 12-17, roughly cols 16-31
    # U-shape bunched fabric
    down_idle = empty_frame()

    # Row 12: top edge, outline across top of scarf
    down_idle[12] = row(18, (2, "blue_scarf.outline"), (6, "blue_scarf.highlight"), (2, "blue_scarf.outline"))

    # Row 13: scarf sides with open center (U-shape)
    down_idle[13] = row(17,
        "blue_scarf.outline", "blue_scarf.base", "blue_scarf.highlight",
        (4, "blue_scarf.base"),
        "blue_scarf.highlight", "blue_scarf.base", "blue_scarf.outline",
        "blue_scarf.base", "blue_scarf.outline",
    )

    # Row 14: wider with bunched fabric
    down_idle[14] = row(16,
        "blue_scarf.outline",
        (2, "blue_scarf.base"), "blue_scarf.shadow",
        (4, "blue_scarf.base"),
        "blue_scarf.shadow", (2, "blue_scarf.base"),
        "blue_scarf.outline",
    )

    # Row 15: main body, U-shape open at center-top
    down_idle[15] = row(16,
        "blue_scarf.outline",
        "blue_scarf.shadow", "blue_scarf.base",
        (2, "blue_scarf.shadow"),
        (2, "blue_scarf.base"),
        (2, "blue_scarf.shadow"),
        "blue_scarf.base", "blue_scarf.shadow",
        "blue_scarf.outline",
    )

    # Row 16: lower fabric, more bunching
    down_idle[16] = row(17,
        "blue_scarf.outline",
        "blue_scarf.shadow", (2, "blue_scarf.base"),
        "blue_scarf.highlight",
        (2, "blue_scarf.base"), "blue_scarf.shadow",
        "blue_scarf.outline",
    )

    # Row 17: bottom edge
    down_idle[17] = row(18,
        (2, "blue_scarf.outline"),
        (4, "blue_scarf.shadow"),
        (2, "blue_scarf.outline"),
    )

    # -- LEFT direction (idle) -- 2-3 px on side of neck
    left_idle = empty_frame()
    # Thin strip on left side of neck, cols ~19-22
    left_idle[12] = row(20, "blue_scarf.outline", "blue_scarf.highlight", "blue_scarf.outline")
    left_idle[13] = row(19, "blue_scarf.outline", "blue_scarf.base", "blue_scarf.highlight", "blue_scarf.outline")
    left_idle[14] = row(19, "blue_scarf.outline", "blue_scarf.shadow", "blue_scarf.base", "blue_scarf.outline")
    left_idle[15] = row(19, "blue_scarf.outline", "blue_scarf.shadow", "blue_scarf.base", "blue_scarf.outline")
    left_idle[16] = row(20, "blue_scarf.outline", "blue_scarf.shadow", "blue_scarf.outline")
    left_idle[17] = row(20, (2, "blue_scarf.outline"))

    # -- UP direction (idle) -- simple band at back of neck
    up_idle = empty_frame()
    up_idle[12] = row(19, (2, "blue_scarf.outline"), (6, "blue_scarf.shadow"), (2, "blue_scarf.outline"))
    up_idle[13] = row(18, "blue_scarf.outline", (2, "blue_scarf.shadow"),
                       (4, "blue_scarf.base"),
                       (2, "blue_scarf.shadow"), "blue_scarf.outline")
    up_idle[14] = row(18, "blue_scarf.outline", "blue_scarf.shadow",
                       (6, "blue_scarf.base"),
                       "blue_scarf.shadow", "blue_scarf.outline")
    up_idle[15] = row(19, (2, "blue_scarf.outline"), (6, "blue_scarf.shadow"), (2, "blue_scarf.outline"))

    # Static: same for all frames
    return {
        "template_id": "scarf_blue_cowl",
        "type": "equipment",
        "size": [48, 48],
        "palette_type": "master",
        "z_order": 1,
        "z_order_override": {"up": 1},
        "mirror_right_from_left": True,
        "walk_cycle": ["idle", "walk_1", "idle", "walk_2"],
        "directions": {
            "down": {"idle": down_idle, "walk_1": copy.deepcopy(down_idle), "walk_2": copy.deepcopy(down_idle)},
            "left": {"idle": left_idle, "walk_1": copy.deepcopy(left_idle), "walk_2": copy.deepcopy(left_idle)},
            "up":   {"idle": up_idle, "walk_1": copy.deepcopy(up_idle), "walk_2": copy.deepcopy(up_idle)},
        },
    }


# ===========================================================================
# TEMPLATE 2: Navy Tabard
# ===========================================================================
def make_tabard_navy_gold():
    # -- Helper: gold dot pattern on navy for lower tabard rows 28-40 --
    def lower_tabard_row_down(r_idx, left_col, right_col, split=False):
        """Generate a row of navy with scattered gold dots."""
        r = [0] * W
        for c in range(left_col, right_col + 1):
            # Default navy
            if c == left_col or c == right_col:
                r[c] = "navy_fabric.outline"
            elif c == left_col + 1 or c == right_col - 1:
                r[c] = "navy_fabric.shadow"
            else:
                r[c] = "navy_fabric.base"
            # Gold dots every 3-4 px (offset by row for checkerboard)
            interior_start = left_col + 2
            interior_end = right_col - 2
            if interior_start <= c <= interior_end:
                if (c + r_idx) % 4 == 0:
                    r[c] = "gold_trim.base"
            # Center split at rows 38-40
            if split and r_idx >= 38:
                mid = (left_col + right_col) // 2
                if c == mid:
                    r[c] = "navy_fabric.shadow"
        return r

    # -- DOWN idle --
    down_idle = empty_frame()

    # Upper tabard rows 17-27: peeks out at sides of chest (2-3px on each side)
    for r in range(17, 28):
        down_idle[r] = [0] * W
        # Left side peek: cols 13-15
        down_idle[r][13] = "navy_fabric.outline"
        down_idle[r][14] = "navy_fabric.shadow"
        down_idle[r][15] = "navy_fabric.base"
        # Right side peek: cols 32-34
        down_idle[r][32] = "navy_fabric.base"
        down_idle[r][33] = "navy_fabric.shadow"
        down_idle[r][34] = "navy_fabric.outline"

    # Lower tabard rows 28-40: full front, ~14px wide centered
    for r_idx in range(28, 41):
        # Slightly tapers: wider at top, narrower at bottom
        if r_idx <= 32:
            left_c, right_c = 17, 30
        elif r_idx <= 36:
            left_c, right_c = 17, 30
        else:
            left_c, right_c = 18, 29

        has_split = r_idx >= 38
        down_idle[r_idx] = lower_tabard_row_down(r_idx, left_c, right_c, split=has_split)

    # Bottom edge: outline
    down_idle[40] = [0] * W
    for c in range(18, 30):
        down_idle[40][c] = "navy_fabric.outline"

    # -- DOWN walk_1: sway 1px left --
    down_walk1 = shift_frame_cols(down_idle, -1)
    # -- DOWN walk_2: sway 1px right --
    down_walk2 = shift_frame_cols(down_idle, 1)

    # -- LEFT idle: narrow side drape 4-5px --
    left_idle = empty_frame()
    for r_idx in range(17, 28):
        # Upper: thin side
        left_idle[r_idx][20] = "navy_fabric.outline"
        left_idle[r_idx][21] = "navy_fabric.shadow"
        left_idle[r_idx][22] = "navy_fabric.base"
        left_idle[r_idx][23] = "navy_fabric.outline"

    for r_idx in range(28, 41):
        left_idle[r_idx][19] = "navy_fabric.outline"
        left_idle[r_idx][20] = "navy_fabric.shadow"
        left_idle[r_idx][21] = "navy_fabric.base"
        left_idle[r_idx][22] = "navy_fabric.base"
        left_idle[r_idx][23] = "navy_fabric.outline"

    left_idle[40] = [0] * W
    for c in range(19, 24):
        left_idle[40][c] = "navy_fabric.outline"

    left_walk1 = shift_frame_cols(left_idle, -1)
    left_walk2 = shift_frame_cols(left_idle, 1)

    # -- UP idle: similar to down but plain back (no gold dots) --
    up_idle = empty_frame()
    # Upper back: side peeks
    for r in range(17, 28):
        up_idle[r][13] = "navy_fabric.outline"
        up_idle[r][14] = "navy_fabric.shadow"
        up_idle[r][15] = "navy_fabric.base"
        up_idle[r][32] = "navy_fabric.base"
        up_idle[r][33] = "navy_fabric.shadow"
        up_idle[r][34] = "navy_fabric.outline"

    # Lower back: plain navy (no gold)
    for r_idx in range(28, 41):
        if r_idx <= 36:
            left_c, right_c = 17, 30
        else:
            left_c, right_c = 18, 29
        for c in range(left_c, right_c + 1):
            if c == left_c or c == right_c:
                up_idle[r_idx][c] = "navy_fabric.outline"
            elif c == left_c + 1 or c == right_c - 1:
                up_idle[r_idx][c] = "navy_fabric.shadow"
            else:
                up_idle[r_idx][c] = "navy_fabric.base"

    up_idle[40] = [0] * W
    for c in range(18, 30):
        up_idle[40][c] = "navy_fabric.outline"

    up_walk1 = shift_frame_cols(up_idle, -1)
    up_walk2 = shift_frame_cols(up_idle, 1)

    return {
        "template_id": "tabard_navy_gold",
        "type": "equipment",
        "size": [48, 48],
        "palette_type": "master",
        "z_order": 2,
        "z_order_override": {"up": 2},
        "mirror_right_from_left": True,
        "walk_cycle": ["idle", "walk_1", "idle", "walk_2"],
        "directions": {
            "down": {"idle": down_idle, "walk_1": down_walk1, "walk_2": down_walk2},
            "left": {"idle": left_idle, "walk_1": left_walk1, "walk_2": left_walk2},
            "up":   {"idle": up_idle,   "walk_1": up_walk1,   "walk_2": up_walk2},
        },
    }


# ===========================================================================
# TEMPLATE 3: Steel Chestplate
# ===========================================================================
def make_chestplate_steel_gold():
    # -- DOWN idle --
    # Covers rows 15-28, ~16-18px wide at chest tapering to ~14px at waist
    # Center col for the character: ~23-24 (between cols 14-33)
    # Chest ~cols 15-32 (18px), waist ~cols 16-30 (15px)
    down_idle = empty_frame()

    center = 23  # center column for the ridge

    # Row 15: V-neckline top - gold trim at top edge with V opening
    down_idle[15] = row(15,
        "gold_trim.base", "gold_trim.base", "steel_armor.highlight",
        (2, "steel_armor.base"),
        "steel_armor.highlight",
        (3, 0),  # V-neck opening
        "steel_armor.highlight",
        (2, "steel_armor.base"),
        "steel_armor.highlight", "gold_trim.base", "gold_trim.base",
    )

    # Row 16: V-neck narrower opening
    down_idle[16] = row(15,
        "steel_armor.outline", "steel_armor.highlight", "steel_armor.highlight",
        (2, "steel_armor.base"),
        "steel_armor.highlight",
        (1, 0),  # narrow V
        "steel_armor.highlight",
        (1, 0),  # narrow V
        "steel_armor.highlight",
        (2, "steel_armor.base"),
        "steel_armor.highlight", "steel_armor.highlight", "steel_armor.outline",
    )

    # Row 17: V closes, center ridge begins
    down_idle[17] = row(15,
        "steel_armor.outline", "steel_armor.highlight",
        (3, "steel_armor.base"),
        "steel_armor.highlight",
        "steel_armor.base",
        "steel_armor.highlight",  # center ridge
        "steel_armor.base",
        "steel_armor.highlight",
        (3, "steel_armor.base"),
        "steel_armor.highlight", "steel_armor.outline",
    )

    # Row 18: full chest with rivets
    down_idle[18] = row(15,
        "steel_armor.outline", "steel_armor.highlight",
        "gold_trim.highlight",  # left rivet
        (2, "steel_armor.base"),
        "steel_armor.highlight",
        "steel_armor.base",
        "steel_armor.highlight",  # center ridge
        "steel_armor.base",
        "steel_armor.highlight",
        (2, "steel_armor.base"),
        "gold_trim.highlight",  # right rivet
        "steel_armor.highlight", "steel_armor.outline",
    )

    # Row 19: gold trim horizontal line
    down_idle[19] = row(15,
        "steel_armor.outline",
        (6, "gold_trim.base"),
        "steel_armor.highlight",  # center ridge
        (6, "gold_trim.base"),
        "steel_armor.outline",
    )

    # Rows 20-22: mid chest with shading
    for r in range(20, 23):
        down_idle[r] = row(15,
            "steel_armor.outline",
            "steel_armor.base", "steel_armor.base",
            "steel_armor.highlight" if r == 20 else "steel_armor.base",
            (2, "steel_armor.base"),
            "steel_armor.base",
            "steel_armor.highlight",  # center ridge
            "steel_armor.base",
            (2, "steel_armor.base"),
            "steel_armor.highlight" if r == 20 else "steel_armor.base",
            "steel_armor.base", "steel_armor.base",
            "steel_armor.outline",
        )

    # Row 23: lower rivets
    down_idle[23] = row(15,
        "steel_armor.outline", "steel_armor.base",
        "gold_trim.highlight",  # left rivet
        (3, "steel_armor.base"),
        "steel_armor.shadow",
        "steel_armor.highlight",  # center ridge
        "steel_armor.shadow",
        (3, "steel_armor.base"),
        "gold_trim.highlight",  # right rivet
        "steel_armor.base", "steel_armor.outline",
    )

    # Row 24: gold trim horizontal line (second segment)
    down_idle[24] = row(16,
        "steel_armor.outline",
        (5, "gold_trim.base"),
        "steel_armor.highlight",  # center ridge
        (5, "gold_trim.base"),
        "steel_armor.outline",
    )

    # Rows 25-27: lower chest / waist - more shadow
    for r in range(25, 28):
        taper = r - 24  # gradually narrow: 0,1,2
        lc = 16 + (taper // 2)
        rc = 31 - (taper // 2)
        width = rc - lc - 1  # interior width
        left_w = (width - 1) // 2
        right_w = width - 1 - left_w
        down_idle[r] = [0] * W
        down_idle[r][lc] = "steel_armor.outline"
        for c in range(lc + 1, lc + 1 + left_w):
            down_idle[r][c] = "steel_armor.shadow"
        down_idle[r][center] = "steel_armor.highlight"  # center ridge
        for c in range(center + 1, rc):
            down_idle[r][c] = "steel_armor.shadow"
        down_idle[r][rc] = "steel_armor.outline"

    # Row 28: bottom gold trim edge
    down_idle[28] = [0] * W
    for c in range(17, 31):
        down_idle[28][c] = "gold_trim.base"

    # -- LEFT idle: side view, narrower (~8px wide) --
    left_idle = empty_frame()

    for r in range(15, 29):
        left_idle[r] = [0] * W
        # Side view: cols ~19-26 (8px)
        left_col_start = 19
        left_col_end = 26
        left_idle[r][left_col_start] = "steel_armor.outline"
        left_idle[r][left_col_end] = "steel_armor.outline"
        for c in range(left_col_start + 1, left_col_end):
            if r == 15 or r == 28:
                left_idle[r][c] = "gold_trim.base"
            elif r == 19 or r == 24:
                left_idle[r][c] = "gold_trim.base"
            elif c == left_col_start + 1:
                left_idle[r][c] = "steel_armor.shadow"
            elif c == left_col_end - 1:
                left_idle[r][c] = "steel_armor.highlight"
            else:
                left_idle[r][c] = "steel_armor.base"

    # Gold trim top and bottom
    for c in range(19, 27):
        left_idle[15][c] = "gold_trim.base"
        left_idle[28][c] = "gold_trim.base"
    left_idle[15][19] = "steel_armor.outline"
    left_idle[15][26] = "steel_armor.outline"
    left_idle[28][19] = "steel_armor.outline"
    left_idle[28][26] = "steel_armor.outline"

    # -- UP idle: back plate, simpler --
    up_idle = empty_frame()
    for r in range(15, 29):
        up_idle[r] = [0] * W
        if r <= 20:
            lc, rc = 15, 32
        elif r <= 25:
            lc, rc = 16, 31
        else:
            lc, rc = 17, 30
        up_idle[r][lc] = "steel_armor.outline"
        up_idle[r][rc] = "steel_armor.outline"
        for c in range(lc + 1, rc):
            if r == 15 or r == 28:
                up_idle[r][c] = "gold_trim.base"
            elif r == 19 or r == 24:
                up_idle[r][c] = "gold_trim.base"
            else:
                up_idle[r][c] = "steel_armor.base"
        # Shadow near edges
        if r not in (15, 19, 24, 28):
            up_idle[r][lc + 1] = "steel_armor.shadow"
            up_idle[r][rc - 1] = "steel_armor.shadow"

    # Gold trim top and bottom edge
    for c in range(15, 33):
        up_idle[15][c] = "gold_trim.base"
    up_idle[15][15] = "steel_armor.outline"
    up_idle[15][32] = "steel_armor.outline"
    for c in range(17, 31):
        up_idle[28][c] = "gold_trim.base"

    # Static: same for all frames
    return {
        "template_id": "chestplate_steel_gold",
        "type": "equipment",
        "size": [48, 48],
        "palette_type": "master",
        "z_order": 4,
        "z_order_override": {"up": 4},
        "mirror_right_from_left": True,
        "walk_cycle": ["idle", "walk_1", "idle", "walk_2"],
        "directions": {
            "down": {"idle": down_idle, "walk_1": copy.deepcopy(down_idle), "walk_2": copy.deepcopy(down_idle)},
            "left": {"idle": left_idle, "walk_1": copy.deepcopy(left_idle), "walk_2": copy.deepcopy(left_idle)},
            "up":   {"idle": up_idle,   "walk_1": copy.deepcopy(up_idle),   "walk_2": copy.deepcopy(up_idle)},
        },
    }


# ===========================================================================
# TEMPLATE 4: Segmented Pauldrons with Fur
# ===========================================================================
def make_pauldrons_segmented_fur():
    def fur_pixel(c, r):
        """Semi-random checkerboard fur pattern."""
        if (c + r) % 3 == 0:
            return "fur_trim.highlight"
        elif (c + r) % 3 == 1:
            return "fur_trim.base"
        else:
            return "fur_trim.shadow"

    def build_down_frame(shift_y=0):
        """Build front-facing pauldrons. shift_y: -1 for walk bounce."""
        frame = empty_frame()

        for side in ("left", "right"):
            if side == "left":
                base_col = 4
            else:
                base_col = 35

            # Fur trim: rows 11-13 (3 rows), extends 1-2px beyond pauldron
            for r in range(11, 14):
                actual_r = r + shift_y
                if actual_r < 0 or actual_r >= H:
                    continue
                fur_start = base_col - 1
                fur_end = base_col + 9  # 1px beyond pauldron (8 wide + 1 each side)
                for c in range(fur_start, fur_end + 1):
                    if 0 <= c < W:
                        # Irregular edges: skip some edge pixels
                        if (c == fur_start or c == fur_end) and r == 13:
                            continue  # irregular bottom edge
                        if c == fur_start and r == 11 and side == "left":
                            continue  # irregular top-left
                        if c == fur_end and r == 11 and side == "right":
                            continue  # irregular top-right
                        frame[actual_r][c] = fur_pixel(c, r)

            # Layered plates: 3-4 plates, rows 14-20, each 2px tall, offset outward
            plates = [
                (14, 15, 0),   # plate 1: no offset
                (16, 17, 1),   # plate 2: 1px outward
                (18, 19, 2),   # plate 3: 2px outward
            ]
            for plate_top, plate_bot, offset in plates:
                for r in (plate_top, plate_bot):
                    actual_r = r + shift_y
                    if actual_r < 0 or actual_r >= H:
                        continue
                    if side == "left":
                        pc_start = base_col - offset
                        pc_end = base_col + 8
                    else:
                        pc_start = base_col
                        pc_end = base_col + 8 + offset

                    for c in range(pc_start, pc_end + 1):
                        if 0 <= c < W:
                            if c == pc_start or c == pc_end:
                                frame[actual_r][c] = "steel_armor.outline"
                            elif r == plate_top and c == pc_start + 1:
                                frame[actual_r][c] = "steel_armor.highlight"
                            elif r == plate_bot and c == pc_end - 1:
                                frame[actual_r][c] = "steel_armor.shadow"
                            else:
                                frame[actual_r][c] = "steel_armor.base"

            # Gold clasps: where pauldron meets chest (row 18-19 at inner edge)
            clasp_r = 18 + shift_y
            if 0 <= clasp_r < H:
                if side == "left":
                    clasp_c = base_col + 8
                    if clasp_c < W:
                        frame[clasp_r][clasp_c] = "gold_trim.base"
                else:
                    clasp_c = base_col
                    if clasp_c >= 0:
                        frame[clasp_r][clasp_c] = "gold_trim.base"

            clasp_r2 = 19 + shift_y
            if 0 <= clasp_r2 < H:
                if side == "left":
                    if base_col + 8 < W:
                        frame[clasp_r2][base_col + 8] = "gold_trim.base"
                else:
                    if base_col >= 0:
                        frame[clasp_r2][base_col] = "gold_trim.base"

        return frame

    down_idle = build_down_frame(shift_y=0)
    down_walk1 = build_down_frame(shift_y=-1)
    down_walk2 = build_down_frame(shift_y=-1)

    # -- LEFT direction: only near-side pauldron visible --
    def build_left_frame(shift_y=0):
        frame = empty_frame()
        # Near pauldron (left shoulder facing camera): cols ~14-23
        base_col = 14

        # Fur trim rows 11-13
        for r in range(11, 14):
            actual_r = r + shift_y
            if actual_r < 0 or actual_r >= H:
                continue
            for c in range(base_col - 1, base_col + 10):
                if 0 <= c < W:
                    if c == base_col - 1 and r == 13:
                        continue
                    frame[actual_r][c] = fur_pixel(c, r)

        # Plates
        plates = [
            (14, 15, 0),
            (16, 17, 1),
            (18, 19, 2),
        ]
        for plate_top, plate_bot, offset in plates:
            for r in (plate_top, plate_bot):
                actual_r = r + shift_y
                if actual_r < 0 or actual_r >= H:
                    continue
                pc_start = base_col - offset
                pc_end = base_col + 9
                for c in range(pc_start, pc_end + 1):
                    if 0 <= c < W:
                        if c == pc_start or c == pc_end:
                            frame[actual_r][c] = "steel_armor.outline"
                        elif r == plate_top and c == pc_start + 1:
                            frame[actual_r][c] = "steel_armor.highlight"
                        elif r == plate_bot and c == pc_end - 1:
                            frame[actual_r][c] = "steel_armor.shadow"
                        else:
                            frame[actual_r][c] = "steel_armor.base"

        # Gold clasp
        clasp_r = 18 + shift_y
        if 0 <= clasp_r < H:
            frame[clasp_r][base_col + 9] = "gold_trim.base"

        return frame

    left_idle = build_left_frame(shift_y=0)
    left_walk1 = build_left_frame(shift_y=-1)
    left_walk2 = build_left_frame(shift_y=-1)

    # -- UP direction: both pauldrons from behind --
    def build_up_frame(shift_y=0):
        frame = empty_frame()
        for side in ("left", "right"):
            if side == "left":
                base_col = 4
            else:
                base_col = 35

            # Fur trim
            for r in range(11, 14):
                actual_r = r + shift_y
                if actual_r < 0 or actual_r >= H:
                    continue
                fur_start = base_col - 1
                fur_end = base_col + 9
                for c in range(fur_start, fur_end + 1):
                    if 0 <= c < W:
                        if (c == fur_start or c == fur_end) and r == 13:
                            continue
                        frame[actual_r][c] = fur_pixel(c, r)

            # Plates (from behind, shading reversed)
            plates = [
                (14, 15, 0),
                (16, 17, 1),
                (18, 19, 2),
            ]
            for plate_top, plate_bot, offset in plates:
                for r in (plate_top, plate_bot):
                    actual_r = r + shift_y
                    if actual_r < 0 or actual_r >= H:
                        continue
                    if side == "left":
                        pc_start = base_col - offset
                        pc_end = base_col + 8
                    else:
                        pc_start = base_col
                        pc_end = base_col + 8 + offset

                    for c in range(pc_start, pc_end + 1):
                        if 0 <= c < W:
                            if c == pc_start or c == pc_end:
                                frame[actual_r][c] = "steel_armor.outline"
                            elif r == plate_top:
                                frame[actual_r][c] = "steel_armor.shadow"
                            else:
                                frame[actual_r][c] = "steel_armor.base"

            # Gold clasp
            clasp_r = 18 + shift_y
            if 0 <= clasp_r < H:
                if side == "left":
                    if base_col + 8 < W:
                        frame[clasp_r][base_col + 8] = "gold_trim.base"
                else:
                    if base_col >= 0:
                        frame[clasp_r][base_col] = "gold_trim.base"

        return frame

    up_idle = build_up_frame(shift_y=0)
    up_walk1 = build_up_frame(shift_y=-1)
    up_walk2 = build_up_frame(shift_y=-1)

    return {
        "template_id": "pauldrons_segmented_fur",
        "type": "equipment",
        "size": [48, 48],
        "palette_type": "master",
        "z_order": 6,
        "z_order_override": {"up": 6},
        "mirror_right_from_left": True,
        "walk_cycle": ["idle", "walk_1", "idle", "walk_2"],
        "directions": {
            "down": {"idle": down_idle, "walk_1": down_walk1, "walk_2": down_walk2},
            "left": {"idle": left_idle, "walk_1": left_walk1, "walk_2": left_walk2},
            "up":   {"idle": up_idle,   "walk_1": up_walk1,   "walk_2": up_walk2},
        },
    }


# ===========================================================================
# TEMPLATE 5: Steel Bracers
# ===========================================================================
def make_bracers_steel():
    def build_down_frame(left_shift=0, right_shift=0):
        """Down-facing bracers on both arms.
        left_shift/right_shift: column shift for walk animation.
        Left arm cols ~9-12, right arm cols ~35-38.
        Bracers rows ~22-30 (8px tall).
        """
        frame = empty_frame()

        # Left bracer: cols 9-11 (3px wide), rows 22-29
        lc_start = 9 + left_shift
        for r in range(22, 30):
            for c in range(lc_start, lc_start + 3):
                if 0 <= c < W:
                    if r == 22 or r == 29:
                        frame[r][c] = "steel_armor.outline"
                    elif c == lc_start:
                        frame[r][c] = "steel_armor.shadow"
                    elif c == lc_start + 2:
                        frame[r][c] = "steel_armor.highlight"
                    elif r == 25:
                        # Gold trim horizontal line in the middle
                        frame[r][c] = "gold_trim.base"
                    else:
                        frame[r][c] = "steel_armor.base"

        # Right bracer: cols 35-37 (3px wide), rows 22-29
        rc_start = 35 + right_shift
        for r in range(22, 30):
            for c in range(rc_start, rc_start + 3):
                if 0 <= c < W:
                    if r == 22 or r == 29:
                        frame[r][c] = "steel_armor.outline"
                    elif c == rc_start:
                        frame[r][c] = "steel_armor.highlight"
                    elif c == rc_start + 2:
                        frame[r][c] = "steel_armor.shadow"
                    elif r == 25:
                        frame[r][c] = "gold_trim.base"
                    else:
                        frame[r][c] = "steel_armor.base"

        return frame

    down_idle = build_down_frame(0, 0)
    down_walk1 = build_down_frame(-1, 1)   # left forward, right back
    down_walk2 = build_down_frame(1, -1)   # left back, right forward

    # -- LEFT: only near arm bracer visible --
    def build_left_frame(shift=0):
        frame = empty_frame()
        # Near arm in left view: cols ~18-21
        lc_start = 18 + shift
        for r in range(22, 30):
            for c in range(lc_start, lc_start + 3):
                if 0 <= c < W:
                    if r == 22 or r == 29:
                        frame[r][c] = "steel_armor.outline"
                    elif c == lc_start:
                        frame[r][c] = "steel_armor.shadow"
                    elif c == lc_start + 2:
                        frame[r][c] = "steel_armor.highlight"
                    elif r == 25:
                        frame[r][c] = "gold_trim.base"
                    else:
                        frame[r][c] = "steel_armor.base"
        return frame

    left_idle = build_left_frame(0)
    left_walk1 = build_left_frame(-1)
    left_walk2 = build_left_frame(1)

    # -- UP: both bracers visible from behind --
    def build_up_frame(left_shift=0, right_shift=0):
        frame = empty_frame()

        # Left bracer from behind: cols 9-11
        lc_start = 9 + left_shift
        for r in range(22, 30):
            for c in range(lc_start, lc_start + 3):
                if 0 <= c < W:
                    if r == 22 or r == 29:
                        frame[r][c] = "steel_armor.outline"
                    elif c == lc_start:
                        frame[r][c] = "steel_armor.highlight"
                    elif c == lc_start + 2:
                        frame[r][c] = "steel_armor.shadow"
                    elif r == 25:
                        frame[r][c] = "gold_trim.base"
                    else:
                        frame[r][c] = "steel_armor.base"

        # Right bracer from behind: cols 35-37
        rc_start = 35 + right_shift
        for r in range(22, 30):
            for c in range(rc_start, rc_start + 3):
                if 0 <= c < W:
                    if r == 22 or r == 29:
                        frame[r][c] = "steel_armor.outline"
                    elif c == rc_start:
                        frame[r][c] = "steel_armor.shadow"
                    elif c == rc_start + 2:
                        frame[r][c] = "steel_armor.highlight"
                    elif r == 25:
                        frame[r][c] = "gold_trim.base"
                    else:
                        frame[r][c] = "steel_armor.base"

        return frame

    up_idle = build_up_frame(0, 0)
    up_walk1 = build_up_frame(-1, 1)
    up_walk2 = build_up_frame(1, -1)

    return {
        "template_id": "bracers_steel",
        "type": "equipment",
        "size": [48, 48],
        "palette_type": "master",
        "z_order": 5,
        "z_order_override": {"up": 5},
        "mirror_right_from_left": True,
        "walk_cycle": ["idle", "walk_1", "idle", "walk_2"],
        "directions": {
            "down": {"idle": down_idle, "walk_1": down_walk1, "walk_2": down_walk2},
            "left": {"idle": left_idle, "walk_1": left_walk1, "walk_2": left_walk2},
            "up":   {"idle": up_idle,   "walk_1": up_walk1,   "walk_2": up_walk2},
        },
    }


# ===========================================================================
# Main
# ===========================================================================
def main():
    templates = [
        (make_scarf_blue_cowl,        os.path.join(ACCESSORIES_DIR, "scarf_blue_cowl.json")),
        (make_tabard_navy_gold,       os.path.join(ARMOR_DIR, "tabard_navy_gold.json")),
        (make_chestplate_steel_gold,  os.path.join(ARMOR_DIR, "chestplate_steel_gold.json")),
        (make_pauldrons_segmented_fur, os.path.join(ARMOR_DIR, "pauldrons_segmented_fur.json")),
        (make_bracers_steel,          os.path.join(ARMOR_DIR, "bracers_steel.json")),
    ]

    print("=" * 60)
    print("Equipment Template Generator - Group 1")
    print("=" * 60)

    all_errors = []
    for builder, path in templates:
        tpl = builder()
        errors = validate_template(tpl)
        all_errors.extend(errors)
        save_template(tpl, path)

        # Count non-transparent pixels per frame
        frame_count = 0
        total_pixels = 0
        for d_name, d_frames in tpl["directions"].items():
            for f_name, frame in d_frames.items():
                frame_count += 1
                px = sum(1 for row in frame for val in row if val != 0)
                total_pixels += px
        avg_px = total_pixels // frame_count if frame_count else 0
        print(f"    {tpl['template_id']}: {frame_count} frames, avg {avg_px} non-transparent px/frame")

    print()
    print("-" * 60)
    print("VALIDATION SUMMARY")
    print("-" * 60)

    if all_errors:
        print(f"ERRORS FOUND: {len(all_errors)}")
        for e in all_errors:
            print(e)
    else:
        print("All templates PASSED validation.")
        print(f"  - {len(templates)} templates generated")
        print(f"  - {len(templates) * 9} total frames (3 directions x 3 frames each)")
        print(f"  - All frames: {H} rows x {W} cols")
        print(f"  - All values: 0 (transparent) or dot-notation palette keys")

    print("=" * 60)
    print("Done!")


if __name__ == "__main__":
    main()
