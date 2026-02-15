#!/usr/bin/env python3
"""
Generate 5 equipment template JSON files for Captain Metz's 48x48 sprite system.

Aligned to the wider/stockier chibi body template:
  DOWN body layout:
    Head:      rows 1-13,  ~12px wide, centered ~col 24
    Neck:      rows 13-15, ~20px wide (cols ~14-34)
    Torso:     rows 15-28, ~18px wide core (cols ~15-33), arms cols 10-13 / 35-38
    Legs:      rows 29-40, two legs ~6px wide, 2-3px gap
    Feet:      rows 41-44, each ~7px wide
  LEFT body layout:
    Head:      rows 1-13,  ~10px wide, cols ~17-27
    Body:      rows 14-28, ~14px wide, cols ~16-30
    Legs:      rows 29-40, ~8px wide overlapping
    Feet:      rows 41-44, ~8px wide

Templates generated:
  1. Blue Scarf   (scarf_blue_cowl.json)            - z_order 1
  2. Navy Tabard  (tabard_navy_gold.json)            - z_order 2
  3. Steel Chestplate (chestplate_steel_gold.json)   - z_order 4
  4. Segmented Pauldrons (pauldrons_segmented_fur.json) - z_order 6
  5. Steel Bracers (bracers_steel.json)              - z_order 5
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
# TEMPLATE 1: Blue Scarf (Cowl)
# ===========================================================================
# Wider U-shape wrapping the wider neck/shoulder area.
# DOWN: rows 11-15, ~14px wide (cols ~17-30), U-shape open at top center
# LEFT: 3-4px strip on near side of neck
# UP: band across wider back of neck
# ===========================================================================
def make_scarf_blue_cowl():
    # -- DOWN direction (idle) --
    # U-shape cowl around neck, rows 11-15, ~14px wide (cols 17-30)
    down_idle = empty_frame()

    # Row 11: top edge outline
    down_idle[11] = row(17,
        (2, "blue_scarf.outline"),
        (10, "blue_scarf.highlight"),
        (2, "blue_scarf.outline"),
    )

    # Row 12: open U-shape - sides with open center
    down_idle[12] = row(17,
        "blue_scarf.outline", "blue_scarf.base", "blue_scarf.highlight",
        "blue_scarf.base",
        (6, 0),  # U-opening in center
        "blue_scarf.base",
        "blue_scarf.highlight", "blue_scarf.base", "blue_scarf.outline",
    )

    # Row 13: U narrows, bunched fabric at sides
    down_idle[13] = row(17,
        "blue_scarf.outline", "blue_scarf.shadow", "blue_scarf.base",
        "blue_scarf.highlight",
        (4, 0),  # narrower opening
        "blue_scarf.highlight",
        "blue_scarf.base", "blue_scarf.shadow", "blue_scarf.base",
        "blue_scarf.outline",
    )

    # Row 14: U mostly closed, thick bunched cowl
    down_idle[14] = row(16,
        "blue_scarf.outline",
        "blue_scarf.shadow", "blue_scarf.base", "blue_scarf.highlight",
        "blue_scarf.base", "blue_scarf.shadow",
        (2, "blue_scarf.base"),
        "blue_scarf.shadow", "blue_scarf.base",
        "blue_scarf.highlight", "blue_scarf.base", "blue_scarf.shadow",
        "blue_scarf.outline",
    )

    # Row 15: bottom edge, thick shadow
    down_idle[15] = row(17,
        (2, "blue_scarf.outline"),
        (2, "blue_scarf.shadow"),
        (6, "blue_scarf.shadow"),
        (2, "blue_scarf.shadow"),
        (2, "blue_scarf.outline"),
    )

    # -- LEFT direction (idle) -- 3-4px strip on near side of neck
    left_idle = empty_frame()
    # Thin strip cols ~18-21 (4px), rows 11-15
    left_idle[11] = row(18, "blue_scarf.outline", "blue_scarf.highlight",
                         "blue_scarf.base", "blue_scarf.outline")
    left_idle[12] = row(18, "blue_scarf.outline", "blue_scarf.base",
                         "blue_scarf.highlight", "blue_scarf.outline")
    left_idle[13] = row(18, "blue_scarf.outline", "blue_scarf.shadow",
                         "blue_scarf.base", "blue_scarf.outline")
    left_idle[14] = row(18, "blue_scarf.outline", "blue_scarf.shadow",
                         "blue_scarf.base", "blue_scarf.outline")
    left_idle[15] = row(18, "blue_scarf.outline", "blue_scarf.shadow",
                         "blue_scarf.outline")

    # -- UP direction (idle) -- band across wider back of neck, rows 11-15
    up_idle = empty_frame()
    # ~14px wide (cols 17-30) - solid band at back of neck
    up_idle[11] = row(17,
        (2, "blue_scarf.outline"),
        (10, "blue_scarf.shadow"),
        (2, "blue_scarf.outline"),
    )
    up_idle[12] = row(17,
        "blue_scarf.outline", "blue_scarf.shadow",
        (10, "blue_scarf.base"),
        "blue_scarf.shadow", "blue_scarf.outline",
    )
    up_idle[13] = row(17,
        "blue_scarf.outline", "blue_scarf.shadow",
        (3, "blue_scarf.base"),
        (2, "blue_scarf.highlight"),
        "blue_scarf.base",
        (2, "blue_scarf.highlight"),
        (2, "blue_scarf.base"),
        "blue_scarf.shadow", "blue_scarf.outline",
    )
    up_idle[14] = row(17,
        "blue_scarf.outline", "blue_scarf.shadow",
        (10, "blue_scarf.base"),
        "blue_scarf.shadow", "blue_scarf.outline",
    )
    up_idle[15] = row(17,
        (2, "blue_scarf.outline"),
        (10, "blue_scarf.shadow"),
        (2, "blue_scarf.outline"),
    )

    # Static: same for all walk frames (scarf doesn't bounce much)
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
# TEMPLATE 2: Navy Tabard with Gold Dot Pattern
# ===========================================================================
# Wider to match wider torso.
# DOWN: side peeks at chest rows 16-28 (~3px each side), hanging skirt
#        rows 28-40 (~16px wide) with gold dot pattern and bottom split.
# LEFT: narrow profile strip ~5px
# UP: plain back panel (no gold dots)
# ===========================================================================
def make_tabard_navy_gold():
    def lower_tabard_row_down(r_idx, left_col, right_col, split=False):
        """Generate a row of navy with scattered gold dots."""
        r = [0] * W
        for c in range(left_col, right_col + 1):
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

    # Upper tabard rows 16-28: peeks out at sides of wider chest (3px each side)
    # Left side peek: cols 12-14, Right side peek: cols 34-36
    for r in range(16, 29):
        down_idle[r] = [0] * W
        # Left side peek
        down_idle[r][12] = "navy_fabric.outline"
        down_idle[r][13] = "navy_fabric.shadow"
        down_idle[r][14] = "navy_fabric.base"
        # Right side peek
        down_idle[r][34] = "navy_fabric.base"
        down_idle[r][35] = "navy_fabric.shadow"
        down_idle[r][36] = "navy_fabric.outline"

    # Lower tabard rows 28-40: full front hanging skirt, ~16px wide centered
    for r_idx in range(28, 41):
        # Wider skirt: cols 16-31 (16px) tapering slightly at bottom
        if r_idx <= 34:
            left_c, right_c = 16, 31
        elif r_idx <= 37:
            left_c, right_c = 16, 31
        else:
            left_c, right_c = 17, 30

        has_split = r_idx >= 38
        down_idle[r_idx] = lower_tabard_row_down(r_idx, left_c, right_c, split=has_split)

    # Bottom edge: outline
    down_idle[40] = [0] * W
    for c in range(17, 31):
        down_idle[40][c] = "navy_fabric.outline"

    # -- DOWN walk_1: sway 1px left --
    down_walk1 = shift_frame_cols(down_idle, -1)
    # -- DOWN walk_2: sway 1px right --
    down_walk2 = shift_frame_cols(down_idle, 1)

    # -- LEFT idle: narrow side drape 5px (cols 19-23) --
    left_idle = empty_frame()
    for r_idx in range(16, 29):
        left_idle[r_idx][19] = "navy_fabric.outline"
        left_idle[r_idx][20] = "navy_fabric.shadow"
        left_idle[r_idx][21] = "navy_fabric.base"
        left_idle[r_idx][22] = "navy_fabric.base"
        left_idle[r_idx][23] = "navy_fabric.outline"

    for r_idx in range(29, 41):
        left_idle[r_idx][18] = "navy_fabric.outline"
        left_idle[r_idx][19] = "navy_fabric.shadow"
        left_idle[r_idx][20] = "navy_fabric.base"
        left_idle[r_idx][21] = "navy_fabric.base"
        left_idle[r_idx][22] = "navy_fabric.base"
        left_idle[r_idx][23] = "navy_fabric.outline"

    left_idle[40] = [0] * W
    for c in range(18, 24):
        left_idle[40][c] = "navy_fabric.outline"

    left_walk1 = shift_frame_cols(left_idle, -1)
    left_walk2 = shift_frame_cols(left_idle, 1)

    # -- UP idle: similar to down but plain back (no gold dots) --
    up_idle = empty_frame()
    # Upper back: side peeks (matching wider body)
    for r in range(16, 29):
        up_idle[r][12] = "navy_fabric.outline"
        up_idle[r][13] = "navy_fabric.shadow"
        up_idle[r][14] = "navy_fabric.base"
        up_idle[r][34] = "navy_fabric.base"
        up_idle[r][35] = "navy_fabric.shadow"
        up_idle[r][36] = "navy_fabric.outline"

    # Lower back: plain navy (no gold), wider to match
    for r_idx in range(28, 41):
        if r_idx <= 37:
            left_c, right_c = 16, 31
        else:
            left_c, right_c = 17, 30
        for c in range(left_c, right_c + 1):
            if c == left_c or c == right_c:
                up_idle[r_idx][c] = "navy_fabric.outline"
            elif c == left_c + 1 or c == right_c - 1:
                up_idle[r_idx][c] = "navy_fabric.shadow"
            else:
                up_idle[r_idx][c] = "navy_fabric.base"

    up_idle[40] = [0] * W
    for c in range(17, 31):
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
# TEMPLATE 3: Steel Chestplate with Gold Trim
# ===========================================================================
# Wider to match wider torso core (~18px).
# DOWN: rows 14-27, ~18px wide (cols 15-32), V-neckline, center ridge,
#        gold trim horizontal lines and rivets.
# LEFT: 8-10px side profile
# UP: back plate ~18px wide, simpler shading
# ===========================================================================
def make_chestplate_steel_gold():
    center = 24  # center column for the ridge (center of 48)

    # -- DOWN idle --
    # Covers rows 14-27, 18px wide: cols 15-32
    down_idle = empty_frame()

    # Row 14: V-neckline top - gold trim at top edge with wide V opening
    down_idle[14] = row(15,
        "gold_trim.base", "gold_trim.base",
        "steel_armor.highlight", (2, "steel_armor.base"), "steel_armor.highlight",
        (4, 0),  # V-neck opening (wider for chibi head)
        "steel_armor.highlight", (2, "steel_armor.base"), "steel_armor.highlight",
        "gold_trim.base", "gold_trim.base",
    )

    # Row 15: V-neck narrows
    down_idle[15] = row(15,
        "steel_armor.outline", "steel_armor.highlight",
        (3, "steel_armor.base"), "steel_armor.highlight",
        (2, 0),  # narrow V
        "steel_armor.highlight",
        (3, "steel_armor.base"),
        "steel_armor.highlight", "steel_armor.outline",
    )

    # Row 16: V closes, center ridge begins
    down_idle[16] = row(15,
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

    # Row 17: full chest with rivets at col 3 and col 14 from left edge
    down_idle[17] = row(15,
        "steel_armor.outline", "steel_armor.highlight",
        "gold_trim.highlight",  # left rivet
        (3, "steel_armor.base"),
        "steel_armor.base",
        "steel_armor.highlight",  # center ridge
        "steel_armor.base",
        (3, "steel_armor.base"),
        "gold_trim.highlight",  # right rivet
        "steel_armor.highlight", "steel_armor.outline",
    )

    # Row 18: gold trim horizontal line
    down_idle[18] = row(15,
        "steel_armor.outline",
        (7, "gold_trim.base"),
        "steel_armor.highlight",  # center ridge
        (7, "gold_trim.base"),
        "steel_armor.outline",
    )

    # Rows 19-21: mid chest with shading
    for r in range(19, 22):
        down_idle[r] = row(15,
            "steel_armor.outline",
            "steel_armor.base",
            "steel_armor.highlight" if r == 19 else "steel_armor.base",
            (3, "steel_armor.base"),
            "steel_armor.base",
            "steel_armor.highlight",  # center ridge
            "steel_armor.base",
            (3, "steel_armor.base"),
            "steel_armor.highlight" if r == 19 else "steel_armor.base",
            "steel_armor.base",
            "steel_armor.outline",
        )

    # Row 22: lower rivets
    down_idle[22] = row(15,
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

    # Row 23: gold trim horizontal line (second segment)
    down_idle[23] = row(15,
        "steel_armor.outline",
        (7, "gold_trim.base"),
        "steel_armor.highlight",  # center ridge
        (7, "gold_trim.base"),
        "steel_armor.outline",
    )

    # Rows 24-26: lower chest / waist - more shadow, slight taper
    for r in range(24, 27):
        taper = r - 23  # 1, 2, 3
        lc = 15 + (taper // 2)
        rc = 32 - (taper // 2)
        width = rc - lc + 1
        down_idle[r] = [0] * W
        down_idle[r][lc] = "steel_armor.outline"
        for c in range(lc + 1, center):
            down_idle[r][c] = "steel_armor.shadow"
        down_idle[r][center] = "steel_armor.highlight"  # center ridge
        for c in range(center + 1, rc):
            down_idle[r][c] = "steel_armor.shadow"
        down_idle[r][rc] = "steel_armor.outline"

    # Row 27: bottom gold trim edge
    down_idle[27] = [0] * W
    for c in range(16, 32):
        down_idle[27][c] = "gold_trim.base"

    # -- LEFT idle: side view, 8-10px wide (cols 17-26) --
    left_idle = empty_frame()

    for r in range(14, 28):
        left_idle[r] = [0] * W
        left_col_start = 17
        left_col_end = 26
        left_idle[r][left_col_start] = "steel_armor.outline"
        left_idle[r][left_col_end] = "steel_armor.outline"
        for c in range(left_col_start + 1, left_col_end):
            if r == 14 or r == 27:
                left_idle[r][c] = "gold_trim.base"
            elif r == 18 or r == 23:
                left_idle[r][c] = "gold_trim.base"
            elif c == left_col_start + 1:
                left_idle[r][c] = "steel_armor.shadow"
            elif c == left_col_end - 1:
                left_idle[r][c] = "steel_armor.highlight"
            else:
                left_idle[r][c] = "steel_armor.base"

    # Gold trim top and bottom
    for c in range(17, 27):
        left_idle[14][c] = "gold_trim.base"
        left_idle[27][c] = "gold_trim.base"
    left_idle[14][17] = "steel_armor.outline"
    left_idle[14][26] = "steel_armor.outline"
    left_idle[27][17] = "steel_armor.outline"
    left_idle[27][26] = "steel_armor.outline"

    # -- UP idle: back plate, ~18px wide, simpler --
    up_idle = empty_frame()
    for r in range(14, 28):
        up_idle[r] = [0] * W
        if r <= 19:
            lc, rc = 15, 32
        elif r <= 24:
            lc, rc = 15, 32
        else:
            lc, rc = 16, 31
        up_idle[r][lc] = "steel_armor.outline"
        up_idle[r][rc] = "steel_armor.outline"
        for c in range(lc + 1, rc):
            if r == 14 or r == 27:
                up_idle[r][c] = "gold_trim.base"
            elif r == 18 or r == 23:
                up_idle[r][c] = "gold_trim.base"
            else:
                up_idle[r][c] = "steel_armor.base"
        # Shadow near edges for non-trim rows
        if r not in (14, 18, 23, 27):
            up_idle[r][lc + 1] = "steel_armor.shadow"
            up_idle[r][rc - 1] = "steel_armor.shadow"

    # Gold trim top and bottom edge
    for c in range(15, 33):
        up_idle[14][c] = "gold_trim.base"
    up_idle[14][15] = "steel_armor.outline"
    up_idle[14][32] = "steel_armor.outline"
    for c in range(16, 32):
        up_idle[27][c] = "gold_trim.base"

    # Static: same for all walk frames
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
# TEMPLATE 4: Segmented Pauldrons with Fur Trim
# ===========================================================================
# MUCH WIDER than previous - extends 5-6px past each shoulder.
# DOWN: Left pauldron cols ~6-14, right cols ~34-42.
#        3 segmented plates each 3px tall with 1px offset.
#        Fur trim 4 rows tall with textured pattern.
# LEFT: One large pauldron on near shoulder.
# UP: Both visible from behind.
# ===========================================================================
def make_pauldrons_segmented_fur():
    def fur_pixel(c, r):
        """Textured fur pattern with more variation."""
        v = (c * 7 + r * 3) % 5
        if v == 0:
            return "fur_trim.highlight"
        elif v <= 2:
            return "fur_trim.base"
        else:
            return "fur_trim.shadow"

    def build_down_frame(shift_y=0):
        """Build front-facing pauldrons on wider body."""
        frame = empty_frame()

        for side in ("left", "right"):
            if side == "left":
                # Left pauldron: cols 6-14 (9px wide)
                base_col = 6
                inner_edge = 14
            else:
                # Right pauldron: cols 34-42 (9px wide)
                base_col = 34
                inner_edge = 42

            # --- Fur trim: rows 9-12 (4 rows tall), extends 1px beyond plates ---
            for r in range(9, 13):
                actual_r = r + shift_y
                if actual_r < 0 or actual_r >= H:
                    continue
                if side == "left":
                    fur_start = base_col - 1  # 5
                    fur_end = inner_edge + 1   # 15
                else:
                    fur_start = base_col - 1   # 33
                    fur_end = inner_edge + 1    # 43
                for c in range(fur_start, fur_end + 1):
                    if 0 <= c < W:
                        # Irregular edges: skip corners for organic look
                        if r == 9 and (c == fur_start or c == fur_end):
                            continue  # round top corners
                        if r == 12 and ((c - fur_start) % 3 == 0):
                            continue  # ragged bottom edge
                        frame[actual_r][c] = fur_pixel(c, r)

            # --- 3 segmented plates, each 3px tall, with 1px outward offset ---
            # Plate 1: rows 13-15, no offset
            # Plate 2: rows 16-18, 1px outward offset
            # Plate 3: rows 19-21, 2px outward offset
            plates = [
                (13, 15, 0),  # plate 1
                (16, 18, 1),  # plate 2
                (19, 21, 2),  # plate 3
            ]
            for plate_top, plate_bot, offset in plates:
                for r in range(plate_top, plate_bot + 1):
                    actual_r = r + shift_y
                    if actual_r < 0 or actual_r >= H:
                        continue
                    if side == "left":
                        pc_start = base_col - offset
                        pc_end = inner_edge
                    else:
                        pc_start = base_col
                        pc_end = inner_edge + offset

                    for c in range(pc_start, pc_end + 1):
                        if 0 <= c < W:
                            if c == pc_start or c == pc_end:
                                frame[actual_r][c] = "steel_armor.outline"
                            elif r == plate_top and c == pc_start + 1:
                                frame[actual_r][c] = "steel_armor.highlight"
                            elif r == plate_top:
                                frame[actual_r][c] = "steel_armor.highlight"
                            elif r == plate_bot and c == pc_end - 1:
                                frame[actual_r][c] = "steel_armor.shadow"
                            elif r == plate_bot:
                                frame[actual_r][c] = "steel_armor.shadow"
                            else:
                                frame[actual_r][c] = "steel_armor.base"

            # --- Gold clasps: where pauldron meets chest (plate 2 inner edge) ---
            for dr in range(16, 19):
                clasp_r = dr + shift_y
                if 0 <= clasp_r < H:
                    if side == "left":
                        cc = inner_edge
                        if cc < W:
                            frame[clasp_r][cc] = "gold_trim.base"
                    else:
                        cc = base_col
                        if cc >= 0:
                            frame[clasp_r][cc] = "gold_trim.base"

        return frame

    down_idle = build_down_frame(shift_y=0)
    down_walk1 = build_down_frame(shift_y=-1)
    down_walk2 = build_down_frame(shift_y=-1)

    # -- LEFT direction: only near-side pauldron visible --
    def build_left_frame(shift_y=0):
        frame = empty_frame()
        # Near pauldron on left shoulder facing camera: cols 12-23 (12px wide)
        base_col = 12
        inner_edge = 23

        # Fur trim: rows 9-12 (4 rows)
        for r in range(9, 13):
            actual_r = r + shift_y
            if actual_r < 0 or actual_r >= H:
                continue
            fur_start = base_col - 1
            fur_end = inner_edge + 1
            for c in range(fur_start, fur_end + 1):
                if 0 <= c < W:
                    if r == 9 and (c == fur_start or c == fur_end):
                        continue
                    if r == 12 and ((c - fur_start) % 3 == 0):
                        continue
                    frame[actual_r][c] = fur_pixel(c, r)

        # Plates
        plates = [
            (13, 15, 0),
            (16, 18, 1),
            (19, 21, 2),
        ]
        for plate_top, plate_bot, offset in plates:
            for r in range(plate_top, plate_bot + 1):
                actual_r = r + shift_y
                if actual_r < 0 or actual_r >= H:
                    continue
                pc_start = base_col - offset
                pc_end = inner_edge
                for c in range(pc_start, pc_end + 1):
                    if 0 <= c < W:
                        if c == pc_start or c == pc_end:
                            frame[actual_r][c] = "steel_armor.outline"
                        elif r == plate_top:
                            frame[actual_r][c] = "steel_armor.highlight"
                        elif r == plate_bot:
                            frame[actual_r][c] = "steel_armor.shadow"
                        else:
                            frame[actual_r][c] = "steel_armor.base"

        # Gold clasp at inner edge
        for dr in range(16, 19):
            clasp_r = dr + shift_y
            if 0 <= clasp_r < H:
                if inner_edge < W:
                    frame[clasp_r][inner_edge] = "gold_trim.base"

        return frame

    left_idle = build_left_frame(shift_y=0)
    left_walk1 = build_left_frame(shift_y=-1)
    left_walk2 = build_left_frame(shift_y=-1)

    # -- UP direction: both pauldrons from behind --
    def build_up_frame(shift_y=0):
        frame = empty_frame()
        for side in ("left", "right"):
            if side == "left":
                base_col = 6
                inner_edge = 14
            else:
                base_col = 34
                inner_edge = 42

            # Fur trim: rows 9-12
            for r in range(9, 13):
                actual_r = r + shift_y
                if actual_r < 0 or actual_r >= H:
                    continue
                if side == "left":
                    fur_start = base_col - 1
                    fur_end = inner_edge + 1
                else:
                    fur_start = base_col - 1
                    fur_end = inner_edge + 1
                for c in range(fur_start, fur_end + 1):
                    if 0 <= c < W:
                        if r == 9 and (c == fur_start or c == fur_end):
                            continue
                        if r == 12 and ((c - fur_start) % 3 == 0):
                            continue
                        frame[actual_r][c] = fur_pixel(c, r)

            # Plates (from behind, shading reversed - shadow on top, highlight on bottom)
            plates = [
                (13, 15, 0),
                (16, 18, 1),
                (19, 21, 2),
            ]
            for plate_top, plate_bot, offset in plates:
                for r in range(plate_top, plate_bot + 1):
                    actual_r = r + shift_y
                    if actual_r < 0 or actual_r >= H:
                        continue
                    if side == "left":
                        pc_start = base_col - offset
                        pc_end = inner_edge
                    else:
                        pc_start = base_col
                        pc_end = inner_edge + offset

                    for c in range(pc_start, pc_end + 1):
                        if 0 <= c < W:
                            if c == pc_start or c == pc_end:
                                frame[actual_r][c] = "steel_armor.outline"
                            elif r == plate_top:
                                frame[actual_r][c] = "steel_armor.shadow"
                            elif r == plate_bot:
                                frame[actual_r][c] = "steel_armor.base"
                            else:
                                frame[actual_r][c] = "steel_armor.base"

            # Gold clasp
            for dr in range(16, 19):
                clasp_r = dr + shift_y
                if 0 <= clasp_r < H:
                    if side == "left":
                        if inner_edge < W:
                            frame[clasp_r][inner_edge] = "gold_trim.base"
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
# Repositioned to match wider arm placement.
# DOWN: left bracer cols 10-13, right bracer cols 35-38, rows 22-28.
#        4px wide each with gold trim stripe.
# LEFT: near arm bracer visible
# UP: both bracers from behind
# ===========================================================================
def make_bracers_steel():
    def build_down_frame(left_shift=0, right_shift=0):
        """Down-facing bracers on both arms.
        Left arm cols 10-13, right arm cols 35-38.
        Bracers rows 22-28 (7px tall).
        """
        frame = empty_frame()

        # Left bracer: cols 10-13 (4px wide), rows 22-28
        lc_start = 10 + left_shift
        for r in range(22, 29):
            for c in range(lc_start, lc_start + 4):
                if 0 <= c < W:
                    if r == 22 or r == 28:
                        frame[r][c] = "steel_armor.outline"
                    elif c == lc_start:
                        frame[r][c] = "steel_armor.shadow"
                    elif c == lc_start + 3:
                        frame[r][c] = "steel_armor.highlight"
                    elif r == 25:
                        # Gold trim horizontal stripe in the middle
                        frame[r][c] = "gold_trim.base"
                    else:
                        frame[r][c] = "steel_armor.base"

        # Right bracer: cols 35-38 (4px wide), rows 22-28
        rc_start = 35 + right_shift
        for r in range(22, 29):
            for c in range(rc_start, rc_start + 4):
                if 0 <= c < W:
                    if r == 22 or r == 28:
                        frame[r][c] = "steel_armor.outline"
                    elif c == rc_start:
                        frame[r][c] = "steel_armor.highlight"
                    elif c == rc_start + 3:
                        frame[r][c] = "steel_armor.shadow"
                    elif r == 25:
                        frame[r][c] = "gold_trim.base"
                    else:
                        frame[r][c] = "steel_armor.base"

        return frame

    down_idle = build_down_frame(0, 0)
    down_walk1 = build_down_frame(-1, 1)   # left forward, right back
    down_walk2 = build_down_frame(1, -1)   # left back, right forward

    # -- LEFT: only near arm bracer visible, cols 16-19 --
    def build_left_frame(shift=0):
        frame = empty_frame()
        lc_start = 16 + shift
        for r in range(22, 29):
            for c in range(lc_start, lc_start + 4):
                if 0 <= c < W:
                    if r == 22 or r == 28:
                        frame[r][c] = "steel_armor.outline"
                    elif c == lc_start:
                        frame[r][c] = "steel_armor.shadow"
                    elif c == lc_start + 3:
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

        # Left bracer from behind: cols 10-13
        lc_start = 10 + left_shift
        for r in range(22, 29):
            for c in range(lc_start, lc_start + 4):
                if 0 <= c < W:
                    if r == 22 or r == 28:
                        frame[r][c] = "steel_armor.outline"
                    elif c == lc_start:
                        frame[r][c] = "steel_armor.highlight"
                    elif c == lc_start + 3:
                        frame[r][c] = "steel_armor.shadow"
                    elif r == 25:
                        frame[r][c] = "gold_trim.base"
                    else:
                        frame[r][c] = "steel_armor.base"

        # Right bracer from behind: cols 35-38
        rc_start = 35 + right_shift
        for r in range(22, 29):
            for c in range(rc_start, rc_start + 4):
                if 0 <= c < W:
                    if r == 22 or r == 28:
                        frame[r][c] = "steel_armor.outline"
                    elif c == rc_start:
                        frame[r][c] = "steel_armor.shadow"
                    elif c == rc_start + 3:
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
    print("Equipment Template Generator - Group 1 (Chibi Body Aligned)")
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
