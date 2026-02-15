#!/usr/bin/env python3
"""
Generate Equipment Group 2 — 6 equipment template JSONs for Captain Metz's 48x48 sprite system.

Templates generated:
  1. belt_captain_leather   (accessories)
  2. greaves_steel          (armor)
  3. boots_leather_sturdy   (armor)
  4. weapon_longsword       (weapons)
  5. shield_rhaud_kite      (weapons)
  6. cape_navy_half         (accessories)
"""

import json
import os
import sys

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
W, H = 48, 48
T = 0  # transparent

# Valid palette keys (dot-notation) from metz_master_palette.json
VALID_KEYS = {
    # skin
    "skin.base", "skin.shadow", "skin.highlight", "skin.outline",
    # hair
    "hair.base", "hair.shadow", "hair.highlight", "hair.outline",
    # beard
    "beard.base", "beard.shadow", "beard.highlight",
    # eyes
    "eyes.white", "eyes.iris", "eyes.pupil",
    # steel_armor
    "steel_armor.base", "steel_armor.shadow", "steel_armor.highlight",
    "steel_armor.bright", "steel_armor.outline",
    # gold_trim
    "gold_trim.base", "gold_trim.shadow", "gold_trim.highlight", "gold_trim.outline",
    # navy_fabric
    "navy_fabric.base", "navy_fabric.shadow", "navy_fabric.highlight", "navy_fabric.outline",
    # blue_scarf
    "blue_scarf.base", "blue_scarf.shadow", "blue_scarf.highlight", "blue_scarf.outline",
    # brown_leather
    "brown_leather.base", "brown_leather.shadow", "brown_leather.highlight",
    "brown_leather.buckle", "brown_leather.outline",
    # fur_trim
    "fur_trim.base", "fur_trim.shadow", "fur_trim.highlight", "fur_trim.outline",
    # shield
    "shield.field", "shield.border", "shield.rim", "shield.crest",
    # sword
    "sword.blade", "sword.edge", "sword.shadow", "sword.guard",
    "sword.grip", "sword.pommel", "sword.outline",
    # cape
    "cape.primary", "cape.shadow", "cape.highlight", "cape.lining", "cape.outline",
}

# Shortcuts for readability
BLb  = "brown_leather.base"
BLs  = "brown_leather.shadow"
BLh  = "brown_leather.highlight"
BLo  = "brown_leather.outline"
BLbu = "brown_leather.buckle"

GTb  = "gold_trim.base"
GTs  = "gold_trim.shadow"
GTh  = "gold_trim.highlight"
GTo  = "gold_trim.outline"

SAb  = "steel_armor.base"
SAs  = "steel_armor.shadow"
SAh  = "steel_armor.highlight"
SAB  = "steel_armor.bright"
SAo  = "steel_armor.outline"

SWbl = "sword.blade"
SWe  = "sword.edge"
SWsh = "sword.shadow"
SWg  = "sword.guard"
SWgr = "sword.grip"
SWp  = "sword.pommel"
SWo  = "sword.outline"

SHf  = "shield.field"
SHb  = "shield.border"
SHr  = "shield.rim"
SHc  = "shield.crest"

CPp  = "cape.primary"
CPs  = "cape.shadow"
CPh  = "cape.highlight"
CPl  = "cape.lining"
CPo  = "cape.outline"

NFb  = "navy_fabric.base"
NFs  = "navy_fabric.shadow"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def empty_frame():
    """Return a 48x48 grid of transparent."""
    return [[T] * W for _ in range(H)]


def row(left_pad, *segments):
    """
    Build a single 48-col row.
    left_pad: number of transparent pixels on the left.
    segments: pairs of (count, value) or single values.
      - If an int/str is given alone it counts as 1 pixel.
      - If a tuple (n, v), it means n pixels of value v.
    The row is right-padded with T to 48 cols.
    """
    r = [T] * left_pad
    for seg in segments:
        if isinstance(seg, tuple):
            n, v = seg
            r.extend([v] * n)
        else:
            r.append(seg)
    # pad to 48
    while len(r) < W:
        r.append(T)
    if len(r) > W:
        r = r[:W]
    return r


def set_pixel(frame, r, c, val):
    """Safely set a single pixel."""
    if 0 <= r < H and 0 <= c < W:
        frame[r][c] = val


def set_rect(frame, r1, c1, r2, c2, val):
    """Fill a rectangle [r1..r2) x [c1..c2) inclusive of r2, c2."""
    for rr in range(r1, r2 + 1):
        for cc in range(c1, c2 + 1):
            set_pixel(frame, rr, cc, val)


def copy_frame(frame):
    """Deep copy a frame."""
    return [row[:] for row in frame]


def shift_frame(frame, dr, dc):
    """Return a new frame shifted by (dr, dc) pixels."""
    nf = empty_frame()
    for r in range(H):
        for c in range(W):
            nr, nc = r + dr, c + dc
            if 0 <= nr < H and 0 <= nc < W and frame[r][c] != T:
                nf[nr][nc] = frame[r][c]
    return nf


def validate_frame(frame, template_id, direction, anim):
    """Validate frame dimensions and palette keys. Returns list of errors."""
    errors = []
    if len(frame) != H:
        errors.append(f"{template_id}/{direction}/{anim}: {len(frame)} rows (expected {H})")
    for ri, r in enumerate(frame):
        if len(r) != W:
            errors.append(f"{template_id}/{direction}/{anim} row {ri}: {len(r)} cols (expected {W})")
        for ci, v in enumerate(r):
            if v != T and v not in VALID_KEYS:
                errors.append(f"{template_id}/{direction}/{anim} [{ri},{ci}]: invalid key '{v}'")
    return errors


def make_template(template_id, z_order, z_order_override, directions):
    """Construct the full template dict."""
    tmpl = {
        "template_id": template_id,
        "type": "equipment",
        "size": [W, H],
        "palette_type": "master",
        "z_order": z_order,
    }
    if z_order_override:
        tmpl["z_order_override"] = z_order_override
    tmpl["mirror_right_from_left"] = True
    tmpl["walk_cycle"] = ["idle", "walk_1", "idle", "walk_2"]
    tmpl["directions"] = directions
    return tmpl


# ===================================================================
# TEMPLATE 1 — Leather Belt with Pouch
# ===================================================================
def generate_belt():
    # --- DOWN ---
    down_idle = empty_frame()
    # Belt band: rows 27-29, cols 14-33 (roughly body width)
    for r in range(27, 30):
        for c in range(14, 34):
            if r == 27:
                set_pixel(down_idle, r, c, BLo)    # top outline
            elif r == 29:
                set_pixel(down_idle, r, c, BLs)    # bottom shadow
            else:
                set_pixel(down_idle, r, c, BLb)    # base leather
    # Bottom outline row
    for c in range(14, 34):
        set_pixel(down_idle, 29, c, BLs)
    # Gold buckle: center (cols 22-24, rows 27-28)
    set_rect(down_idle, 27, 22, 28, 24, GTb)
    set_pixel(down_idle, 27, 22, GTh)  # highlight top-left
    # Hip pouch: right side cols 28-31, rows 28-31
    set_rect(down_idle, 28, 28, 31, 31, BLb)
    # pouch shadow bottom
    for c in range(28, 32):
        set_pixel(down_idle, 31, c, BLs)
    # pouch outline
    for c in range(28, 32):
        set_pixel(down_idle, 28, c, BLo)
    for r in range(28, 32):
        set_pixel(down_idle, r, 28, BLo)
        set_pixel(down_idle, r, 31, BLo)
    # buckle clasp on pouch
    set_pixel(down_idle, 29, 29, BLbu)

    down_w1 = copy_frame(down_idle)
    down_w2 = copy_frame(down_idle)

    # --- LEFT ---
    left_idle = empty_frame()
    # Belt band thinner from side: cols 18-28, rows 27-29
    for r in range(27, 30):
        for c in range(18, 29):
            if r == 27:
                set_pixel(left_idle, r, c, BLo)
            elif r == 29:
                set_pixel(left_idle, r, c, BLs)
            else:
                set_pixel(left_idle, r, c, BLb)
    # buckle at front (left-facing, so front is left side ~ col 18-19)
    set_rect(left_idle, 27, 18, 28, 19, GTb)
    set_pixel(left_idle, 27, 18, GTh)
    # Pouch on far hip (cols 26-28, rows 28-31)
    set_rect(left_idle, 28, 26, 31, 28, BLb)
    for c in range(26, 29):
        set_pixel(left_idle, 31, c, BLs)
    set_pixel(left_idle, 29, 27, BLbu)

    left_w1 = copy_frame(left_idle)
    left_w2 = copy_frame(left_idle)

    # --- UP ---
    up_idle = empty_frame()
    # Belt band: rows 27-29, cols 14-33
    for r in range(27, 30):
        for c in range(14, 34):
            if r == 27:
                set_pixel(up_idle, r, c, BLo)
            elif r == 29:
                set_pixel(up_idle, r, c, BLs)
            else:
                set_pixel(up_idle, r, c, BLb)
    # Pouch barely visible — just 2px peeking right side
    set_pixel(up_idle, 28, 33, BLb)
    set_pixel(up_idle, 29, 33, BLs)

    up_w1 = copy_frame(up_idle)
    up_w2 = copy_frame(up_idle)

    directions = {
        "down": {"idle": down_idle, "walk_1": down_w1, "walk_2": down_w2},
        "left": {"idle": left_idle, "walk_1": left_w1, "walk_2": left_w2},
        "up":   {"idle": up_idle,   "walk_1": up_w1,   "walk_2": up_w2},
    }
    return make_template("belt_captain_leather", 5, {}, directions)


# ===================================================================
# TEMPLATE 2 — Steel Leg Greaves
# ===================================================================
def generate_greaves():
    # Body legs: rows 29-42, approx cols 17-22 (left leg), 25-30 (right leg)
    # Greaves cover rows 30-42

    def _greave_down_idle():
        f = empty_frame()
        # Left greave: cols 17-21, rows 30-42
        for r in range(30, 43):
            for c in range(17, 22):
                if c == 17:
                    set_pixel(f, r, c, SAo)       # outer outline
                elif c == 21:
                    set_pixel(f, r, c, SAs)       # inner shadow
                elif c == 18:
                    set_pixel(f, r, c, SAh)       # highlight outer
                else:
                    set_pixel(f, r, c, SAb)       # base
        # Right greave: cols 26-30, rows 30-42
        for r in range(30, 43):
            for c in range(26, 31):
                if c == 30:
                    set_pixel(f, r, c, SAo)
                elif c == 26:
                    set_pixel(f, r, c, SAs)
                elif c == 29:
                    set_pixel(f, r, c, SAh)
                else:
                    set_pixel(f, r, c, SAb)
        # Knee guards: bump out at rows 32-33
        for r in (32, 33):
            set_pixel(f, r, 16, SAo)
            set_pixel(f, r, 22, SAs)
            set_pixel(f, r, 25, SAs)
            set_pixel(f, r, 31, SAo)
        # Gold trim at top
        for c in range(17, 22):
            set_pixel(f, 30, c, GTb)
        for c in range(26, 31):
            set_pixel(f, 30, c, GTb)
        return f

    down_idle = _greave_down_idle()

    # walk_1: left leg forward (shift left greave 1px down), right leg back (shift right greave 1px up)
    down_w1 = empty_frame()
    for r in range(30, 43):
        for c in range(W):
            v = down_idle[r][c]
            if v != T:
                if c <= 22:  # left greave — forward/down
                    set_pixel(down_w1, min(r + 1, 46), c, v)
                else:        # right greave — back/up
                    set_pixel(down_w1, max(r - 1, 0), c, v)

    # walk_2: opposite
    down_w2 = empty_frame()
    for r in range(30, 43):
        for c in range(W):
            v = down_idle[r][c]
            if v != T:
                if c <= 22:  # left greave — back/up
                    set_pixel(down_w2, max(r - 1, 0), c, v)
                else:        # right greave — forward/down
                    set_pixel(down_w2, min(r + 1, 46), c, v)

    # --- LEFT ---
    def _greave_left_idle():
        f = empty_frame()
        # From left view: one leg visible, cols 19-24, rows 30-42
        for r in range(30, 43):
            for c in range(19, 25):
                if c == 19:
                    set_pixel(f, r, c, SAo)
                elif c == 24:
                    set_pixel(f, r, c, SAs)
                elif c == 20:
                    set_pixel(f, r, c, SAh)
                else:
                    set_pixel(f, r, c, SAb)
        # Knee guard
        for r in (32, 33):
            set_pixel(f, r, 18, SAo)
            set_pixel(f, r, 25, SAs)
        # Gold top
        for c in range(19, 25):
            set_pixel(f, 30, c, GTb)
        return f

    left_idle = _greave_left_idle()

    # walk_1: front leg forward (down 2px), back leg visible behind
    left_w1 = empty_frame()
    # Front leg greave shifted down
    for r in range(30, 43):
        for c in range(19, 26):
            v = left_idle[r][c]
            if v != T:
                set_pixel(left_w1, min(r + 2, 46), c - 1, v)
    # Back leg greave shifted up — peek behind
    for r in range(30, 43):
        for c in range(19, 26):
            v = left_idle[r][c]
            if v != T:
                set_pixel(left_w1, max(r - 2, 0), c + 1, v)

    # walk_2: opposite stride
    left_w2 = empty_frame()
    for r in range(30, 43):
        for c in range(19, 26):
            v = left_idle[r][c]
            if v != T:
                set_pixel(left_w2, min(r + 2, 46), c + 1, v)
    for r in range(30, 43):
        for c in range(19, 26):
            v = left_idle[r][c]
            if v != T:
                set_pixel(left_w2, max(r - 2, 0), c - 1, v)

    # --- UP ---
    def _greave_up_idle():
        f = empty_frame()
        # Same shape as down, maybe slightly different shading (shadow on outside)
        # Left greave: cols 17-21, rows 30-42
        for r in range(30, 43):
            for c in range(17, 22):
                if c == 17:
                    set_pixel(f, r, c, SAs)
                elif c == 21:
                    set_pixel(f, r, c, SAo)
                elif c == 20:
                    set_pixel(f, r, c, SAh)
                else:
                    set_pixel(f, r, c, SAb)
        # Right greave: cols 26-30
        for r in range(30, 43):
            for c in range(26, 31):
                if c == 30:
                    set_pixel(f, r, c, SAs)
                elif c == 26:
                    set_pixel(f, r, c, SAo)
                elif c == 27:
                    set_pixel(f, r, c, SAh)
                else:
                    set_pixel(f, r, c, SAb)
        # Knee guards
        for r in (32, 33):
            set_pixel(f, r, 16, SAs)
            set_pixel(f, r, 22, SAo)
            set_pixel(f, r, 25, SAo)
            set_pixel(f, r, 31, SAs)
        # Gold top
        for c in range(17, 22):
            set_pixel(f, 30, c, GTb)
        for c in range(26, 31):
            set_pixel(f, 30, c, GTb)
        return f

    up_idle = _greave_up_idle()

    up_w1 = empty_frame()
    for r in range(30, 43):
        for c in range(W):
            v = up_idle[r][c]
            if v != T:
                if c <= 22:
                    set_pixel(up_w1, min(r + 1, 46), c, v)
                else:
                    set_pixel(up_w1, max(r - 1, 0), c, v)

    up_w2 = empty_frame()
    for r in range(30, 43):
        for c in range(W):
            v = up_idle[r][c]
            if v != T:
                if c <= 22:
                    set_pixel(up_w2, max(r - 1, 0), c, v)
                else:
                    set_pixel(up_w2, min(r + 1, 46), c, v)

    directions = {
        "down": {"idle": down_idle, "walk_1": down_w1, "walk_2": down_w2},
        "left": {"idle": left_idle, "walk_1": left_w1, "walk_2": left_w2},
        "up":   {"idle": up_idle,   "walk_1": up_w1,   "walk_2": up_w2},
    }
    return make_template("greaves_steel", 3, {}, directions)


# ===================================================================
# TEMPLATE 3 — Brown Leather Boots
# ===================================================================
def generate_boots():
    # Feet area: rows 42-46

    def _boots_down_idle():
        f = empty_frame()
        # Left boot: cols 16-21, rows 42-46
        for r in range(42, 47):
            for c in range(16, 22):
                if r == 46:
                    set_pixel(f, r, c, BLs)       # sole
                elif r == 42 and c in (18, 19):
                    set_pixel(f, r, c, BLh)       # tongue highlight
                elif c == 16 or c == 21:
                    set_pixel(f, r, c, BLo)       # side outline
                else:
                    set_pixel(f, r, c, BLb)       # base
        # Right boot: cols 26-31, rows 42-46
        for r in range(42, 47):
            for c in range(26, 32):
                if r == 46:
                    set_pixel(f, r, c, BLs)
                elif r == 42 and c in (28, 29):
                    set_pixel(f, r, c, BLh)
                elif c == 26 or c == 31:
                    set_pixel(f, r, c, BLo)
                else:
                    set_pixel(f, r, c, BLb)
        return f

    down_idle = _boots_down_idle()

    # walk_1: left foot forward (shift down 1), right foot back (shift up 1)
    down_w1 = empty_frame()
    for r in range(42, 47):
        for c in range(W):
            v = down_idle[r][c]
            if v != T:
                if c <= 22:  # left boot forward
                    set_pixel(down_w1, min(r + 1, 47), c, v)
                else:        # right boot back
                    set_pixel(down_w1, max(r - 1, 0), c, v)

    # walk_2: opposite
    down_w2 = empty_frame()
    for r in range(42, 47):
        for c in range(W):
            v = down_idle[r][c]
            if v != T:
                if c <= 22:
                    set_pixel(down_w2, max(r - 1, 0), c, v)
                else:
                    set_pixel(down_w2, min(r + 1, 47), c, v)

    # --- LEFT ---
    def _boots_left_idle():
        f = empty_frame()
        # From left view: one boot visible, cols 18-24, rows 42-46
        for r in range(42, 47):
            for c in range(18, 25):
                if r == 46:
                    set_pixel(f, r, c, BLs)
                elif r == 42 and c in (20, 21):
                    set_pixel(f, r, c, BLh)
                elif c == 18 or c == 24:
                    set_pixel(f, r, c, BLo)
                else:
                    set_pixel(f, r, c, BLb)
        return f

    left_idle = _boots_left_idle()

    # walk_1: front foot forward/down, back foot up
    left_w1 = empty_frame()
    for r in range(42, 47):
        for c in range(18, 25):
            v = left_idle[r][c]
            if v != T:
                set_pixel(left_w1, min(r + 1, 47), c - 1, v)
    # back foot
    for r in range(42, 47):
        for c in range(18, 25):
            v = left_idle[r][c]
            if v != T:
                set_pixel(left_w1, max(r - 1, 0), c + 1, v)

    left_w2 = empty_frame()
    for r in range(42, 47):
        for c in range(18, 25):
            v = left_idle[r][c]
            if v != T:
                set_pixel(left_w2, min(r + 1, 47), c + 1, v)
    for r in range(42, 47):
        for c in range(18, 25):
            v = left_idle[r][c]
            if v != T:
                set_pixel(left_w2, max(r - 1, 0), c - 1, v)

    # --- UP ---
    def _boots_up_idle():
        f = empty_frame()
        # Same positions as down, shading reversed
        # Left boot: cols 16-21
        for r in range(42, 47):
            for c in range(16, 22):
                if r == 46:
                    set_pixel(f, r, c, BLs)
                elif c == 16 or c == 21:
                    set_pixel(f, r, c, BLo)
                else:
                    set_pixel(f, r, c, BLb)
        # Right boot: cols 26-31
        for r in range(42, 47):
            for c in range(26, 32):
                if r == 46:
                    set_pixel(f, r, c, BLs)
                elif c == 26 or c == 31:
                    set_pixel(f, r, c, BLo)
                else:
                    set_pixel(f, r, c, BLb)
        return f

    up_idle = _boots_up_idle()

    up_w1 = empty_frame()
    for r in range(42, 47):
        for c in range(W):
            v = up_idle[r][c]
            if v != T:
                if c <= 22:
                    set_pixel(up_w1, min(r + 1, 47), c, v)
                else:
                    set_pixel(up_w1, max(r - 1, 0), c, v)

    up_w2 = empty_frame()
    for r in range(42, 47):
        for c in range(W):
            v = up_idle[r][c]
            if v != T:
                if c <= 22:
                    set_pixel(up_w2, max(r - 1, 0), c, v)
                else:
                    set_pixel(up_w2, min(r + 1, 47), c, v)

    directions = {
        "down": {"idle": down_idle, "walk_1": down_w1, "walk_2": down_w2},
        "left": {"idle": left_idle, "walk_1": left_w1, "walk_2": left_w2},
        "up":   {"idle": up_idle,   "walk_1": up_w1,   "walk_2": up_w2},
    }
    return make_template("boots_leather_sturdy", 3, {}, directions)


# ===================================================================
# TEMPLATE 4 — Longsword
# ===================================================================
def generate_longsword():
    # --- DOWN ---
    down_idle = empty_frame()
    # Sword on right side of body (character's right = viewer's left)
    # Blade: rows 20-27, col 11 — tapers to point at row 20
    for r in range(21, 28):
        set_pixel(down_idle, r, 10, SWe)     # edge (left of blade)
        set_pixel(down_idle, r, 11, SWbl)    # blade center
        set_pixel(down_idle, r, 12, SWsh)    # shadow (right)
    # Blade tip at row 20 — single pixel point
    set_pixel(down_idle, 20, 11, SWe)
    # Outline on blade
    set_pixel(down_idle, 20, 10, SWo)
    set_pixel(down_idle, 20, 12, SWo)
    # Guard: row 28, cols 8-13 (6px wide cross-guard)
    for c in range(8, 14):
        set_pixel(down_idle, 28, c, SWg)
    # Grip: rows 29-30, col 11
    set_pixel(down_idle, 29, 11, SWgr)
    set_pixel(down_idle, 30, 11, SWgr)
    # Pommel: rows 31-32, cols 10-11 (2x2 with red gem)
    set_pixel(down_idle, 31, 10, SWg)
    set_pixel(down_idle, 31, 11, SWp)   # red gem
    set_pixel(down_idle, 32, 10, SWg)
    set_pixel(down_idle, 32, 11, SWg)

    # walk_1: tilt sword 1px right
    down_w1 = shift_frame(down_idle, 0, 1)
    # walk_2: tilt 1px left
    down_w2 = shift_frame(down_idle, 0, -1)

    # --- LEFT ---
    left_idle = empty_frame()
    # Sword angled behind body — show as short diagonal, 2-3 px visible
    # Blade behind, visible at cols 26-28, rows 22-26 as a diagonal
    set_pixel(left_idle, 22, 28, SWe)
    set_pixel(left_idle, 23, 27, SWbl)
    set_pixel(left_idle, 24, 27, SWbl)
    set_pixel(left_idle, 25, 26, SWsh)
    # Guard hint
    set_pixel(left_idle, 26, 26, SWg)
    set_pixel(left_idle, 26, 27, SWg)
    # Pommel at hip
    set_pixel(left_idle, 27, 26, SWp)

    left_w1 = shift_frame(left_idle, 0, 1)
    left_w2 = shift_frame(left_idle, 0, -1)

    # --- UP ---
    up_idle = empty_frame()
    # Mostly hidden — just pommel pixels at hip level
    set_pixel(up_idle, 28, 11, SWp)
    set_pixel(up_idle, 28, 12, SWg)
    set_pixel(up_idle, 29, 11, SWg)

    up_w1 = shift_frame(up_idle, 0, 1)
    up_w2 = shift_frame(up_idle, 0, -1)

    directions = {
        "down": {"idle": down_idle, "walk_1": down_w1, "walk_2": down_w2},
        "left": {"idle": left_idle, "walk_1": left_w1, "walk_2": left_w2},
        "up":   {"idle": up_idle,   "walk_1": up_w1,   "walk_2": up_w2},
    }
    return make_template("weapon_longsword", 9, {"up": -1}, directions)


# ===================================================================
# TEMPLATE 5 — Kite Shield (Rhaud)
# ===================================================================
def generate_shield():
    # --- DOWN ---
    down_idle = empty_frame()
    # Shield on character's left side (viewer's right). Cols ~32-42, rows 18-34.
    # Kite shape: wider at top, narrows to point at bottom.

    # Define the kite outline: width per row
    # rows 18-20: width 10 (cols 32-41)
    # rows 21-24: width 10
    # rows 25-28: width 8 (cols 33-40)
    # rows 29-31: width 6 (cols 34-39)
    # rows 32-33: width 4 (cols 35-38)
    # row 34: width 2 (cols 36-37) — point

    kite_rows = {
        18: (32, 41), 19: (32, 41), 20: (32, 41),
        21: (32, 41), 22: (32, 41), 23: (32, 41), 24: (32, 41),
        25: (33, 40), 26: (33, 40), 27: (33, 40), 28: (33, 40),
        29: (34, 39), 30: (34, 39), 31: (34, 39),
        32: (35, 38), 33: (35, 38),
        34: (36, 37),
    }

    for r, (c1, c2) in kite_rows.items():
        for c in range(c1, c2 + 1):
            # Border (1px gold)
            if c == c1 or c == c2 or r == 18 or r == 34:
                set_pixel(down_idle, r, c, SHb)
            # Rim (1px steel inside border)
            elif c == c1 + 1 or c == c2 - 1 or r == 19:
                set_pixel(down_idle, r, c, SHr)
            # Interior: navy field
            else:
                set_pixel(down_idle, r, c, SHf)

    # Kite bottom point
    set_pixel(down_idle, 34, 36, SHb)
    set_pixel(down_idle, 34, 37, SHb)

    # Lion crest in center: ~4x6 gold shape, rows 22-27, cols 35-38
    # Simplified rearing lion silhouette
    # Row 22: head (2px)
    set_pixel(down_idle, 22, 36, GTh)
    set_pixel(down_idle, 22, 37, GTb)
    # Row 23: head wider
    set_pixel(down_idle, 23, 35, GTb)
    set_pixel(down_idle, 23, 36, GTh)
    set_pixel(down_idle, 23, 37, GTb)
    set_pixel(down_idle, 23, 38, GTb)
    # Row 24: upper body
    set_pixel(down_idle, 24, 36, GTb)
    set_pixel(down_idle, 24, 37, GTh)
    # Row 25: torso
    set_pixel(down_idle, 25, 35, GTb)
    set_pixel(down_idle, 25, 36, GTh)
    set_pixel(down_idle, 25, 37, GTb)
    set_pixel(down_idle, 25, 38, GTb)
    # Row 26: lower body + front paws
    set_pixel(down_idle, 26, 35, GTb)
    set_pixel(down_idle, 26, 36, GTb)
    set_pixel(down_idle, 26, 37, GTb)
    set_pixel(down_idle, 26, 38, GTh)
    # Row 27: legs/base
    set_pixel(down_idle, 27, 35, GTb)
    set_pixel(down_idle, 27, 36, GTb)
    set_pixel(down_idle, 27, 37, GTb)

    # Walk: shift 1px down (walk_1), 1px up (walk_2) relative to idle
    down_w1 = shift_frame(down_idle, 1, 0)
    down_w2 = shift_frame(down_idle, -1, 0)

    # --- LEFT ---
    # Shield faces camera — full detail, largest rendering
    left_idle = empty_frame()
    # Full frontal shield, centered more: cols 14-33, rows 17-35
    kite_left = {
        17: (17, 30), 18: (16, 31), 19: (15, 32), 20: (15, 32),
        21: (15, 32), 22: (15, 32), 23: (15, 32), 24: (15, 32),
        25: (16, 31), 26: (16, 31), 27: (17, 30), 28: (17, 30),
        29: (18, 29), 30: (18, 29), 31: (19, 28), 32: (20, 27),
        33: (21, 26), 34: (22, 25), 35: (23, 24),
    }

    for r, (c1, c2) in kite_left.items():
        for c in range(c1, c2 + 1):
            if c == c1 or c == c2 or r == 17 or r == 35:
                set_pixel(left_idle, r, c, SHb)
            elif c == c1 + 1 or c == c2 - 1 or r == 18:
                set_pixel(left_idle, r, c, SHr)
            else:
                set_pixel(left_idle, r, c, SHf)

    # Lion crest centered: rows 22-28, cols 21-26
    crest_pixels = [
        (22, 23, GTh), (22, 24, GTb),
        (23, 22, GTb), (23, 23, GTh), (23, 24, GTb), (23, 25, GTb),
        (24, 22, GTb), (24, 23, GTb), (24, 24, GTh), (24, 25, GTb),
        (25, 21, GTb), (25, 22, GTb), (25, 23, GTh), (25, 24, GTb), (25, 25, GTb), (25, 26, GTb),
        (26, 21, GTb), (26, 22, GTh), (26, 23, GTb), (26, 24, GTb), (26, 25, GTb), (26, 26, GTb),
        (27, 22, GTb), (27, 23, GTb), (27, 24, GTh), (27, 25, GTb),
        (28, 22, GTb), (28, 23, GTb), (28, 24, GTb), (28, 25, GTb),
    ]
    for r, c, v in crest_pixels:
        set_pixel(left_idle, r, c, v)

    left_w1 = shift_frame(left_idle, 1, 0)
    left_w2 = shift_frame(left_idle, -1, 0)

    # --- UP ---
    # Shield on back — oval shape with leather straps
    up_idle = empty_frame()
    # Oval: rows 16-32, cols 16-31 (wider in middle)
    oval_rows = {
        16: (20, 27), 17: (18, 29), 18: (17, 30), 19: (16, 31),
        20: (16, 31), 21: (16, 31), 22: (16, 31), 23: (16, 31),
        24: (16, 31), 25: (17, 30), 26: (17, 30), 27: (18, 29),
        28: (18, 29), 29: (19, 28), 30: (20, 27), 31: (21, 26),
        32: (22, 25),
    }
    for r, (c1, c2) in oval_rows.items():
        for c in range(c1, c2 + 1):
            if c == c1 or c == c2:
                set_pixel(up_idle, r, c, SHb)
            elif c == c1 + 1 or c == c2 - 1:
                set_pixel(up_idle, r, c, SHr)
            else:
                set_pixel(up_idle, r, c, SHf)
    # top/bottom border
    for r in (16, 32):
        if r in oval_rows:
            c1, c2 = oval_rows[r]
            for c in range(c1, c2 + 1):
                set_pixel(up_idle, r, c, SHb)

    # Leather straps: two vertical lines
    for r in range(18, 28):
        set_pixel(up_idle, r, 20, BLb)
        set_pixel(up_idle, r, 27, BLb)
    # Strap crossing
    for c in range(20, 28):
        set_pixel(up_idle, 22, c, BLb)

    up_w1 = shift_frame(up_idle, 1, 0)
    up_w2 = shift_frame(up_idle, -1, 0)

    directions = {
        "down": {"idle": down_idle, "walk_1": down_w1, "walk_2": down_w2},
        "left": {"idle": left_idle, "walk_1": left_w1, "walk_2": left_w2},
        "up":   {"idle": up_idle,   "walk_1": up_w1,   "walk_2": up_w2},
    }
    return make_template("shield_rhaud_kite", 9,
                         {"left": 10, "right": -1, "up": 8}, directions)


# ===================================================================
# TEMPLATE 6 — Navy Half-Cape
# ===================================================================
def generate_cape():
    # --- DOWN --- (z:-1, behind body — minimal edge on left)
    down_idle = empty_frame()
    # 1-2px cape edge on left side, cols 2-5, rows 15-40
    for r in range(15, 41):
        set_pixel(down_idle, r, 4, CPo)
        set_pixel(down_idle, r, 5, CPs)
    # Slightly wider near bottom
    for r in range(32, 41):
        set_pixel(down_idle, r, 3, CPo)
        set_pixel(down_idle, r, 4, CPs)
        set_pixel(down_idle, r, 5, CPp)

    down_w1 = copy_frame(down_idle)
    down_w2 = copy_frame(down_idle)

    # --- LEFT --- (z:-1, behind — wider drape behind body)
    left_idle = empty_frame()
    # Cape drapes behind, cols 2-10, rows 14-42, wider at bottom
    for r in range(14, 43):
        # Width increases as we go down
        if r < 20:
            c_start, c_end = 6, 10
        elif r < 28:
            c_start, c_end = 4, 10
        elif r < 36:
            c_start, c_end = 3, 10
        else:
            c_start, c_end = 2, 10

        for c in range(c_start, c_end + 1):
            if c == c_start:
                set_pixel(left_idle, r, c, CPo)   # outline edge
            elif c == c_end:
                set_pixel(left_idle, r, c, CPs)   # shadow on body side
            else:
                # Fold lines every 4 cols
                if (c - c_start) % 4 == 0:
                    set_pixel(left_idle, r, c, CPs)
                else:
                    set_pixel(left_idle, r, c, CPp)

    left_w1 = copy_frame(left_idle)
    left_w2 = copy_frame(left_idle)

    # --- UP --- (z:10, IN FRONT — full cape over back)
    up_idle = empty_frame()
    # Full cape: cols 10-38, rows 14-44
    for r in range(14, 45):
        # Cape shape: full width at shoulders, slight taper at bottom
        if r < 18:
            c_start, c_end = 13, 35
        elif r < 24:
            c_start, c_end = 11, 37
        elif r < 32:
            c_start, c_end = 10, 38
        elif r < 40:
            c_start, c_end = 11, 37
        else:
            c_start, c_end = 12, 36

        for c in range(c_start, c_end + 1):
            if c == c_start or c == c_end:
                set_pixel(up_idle, r, c, CPo)       # outline
            elif c == c_start + 1:
                set_pixel(up_idle, r, c, CPs)       # shadow left edge
            elif c == c_end - 1:
                set_pixel(up_idle, r, c, CPs)       # shadow right edge
            else:
                # Vertical fold lines every 5 cols
                if (c - c_start) % 5 == 0:
                    set_pixel(up_idle, r, c, CPs)
                else:
                    set_pixel(up_idle, r, c, CPp)

    # Highlight on left shoulder
    for r in range(14, 20):
        set_pixel(up_idle, r, 14, CPh)
        if r < 18:
            set_pixel(up_idle, r, 15, CPh)

    # Bottom edge slightly irregular (every other pixel)
    bottom_r = 44
    for c in range(12, 37):
        if up_idle[bottom_r][c] != T:
            if c % 2 == 0:
                set_pixel(up_idle, bottom_r, c, CPo)
            else:
                set_pixel(up_idle, bottom_r, c, CPs)

    # Walk: bottom sways 2px right (walk_1) / left (walk_2)
    up_w1 = copy_frame(up_idle)
    # Shift bottom portion (rows 36-44) 2px right
    for r in range(36, 45):
        old_row = up_idle[r][:]
        up_w1[r] = [T] * W
        for c in range(W):
            if old_row[c] != T:
                nc = c + 2
                if 0 <= nc < W:
                    up_w1[r][nc] = old_row[c]

    up_w2 = copy_frame(up_idle)
    # Shift bottom portion 2px left
    for r in range(36, 45):
        old_row = up_idle[r][:]
        up_w2[r] = [T] * W
        for c in range(W):
            if old_row[c] != T:
                nc = c - 2
                if 0 <= nc < W:
                    up_w2[r][nc] = old_row[c]

    directions = {
        "down": {"idle": down_idle, "walk_1": down_w1, "walk_2": down_w2},
        "left": {"idle": left_idle, "walk_1": left_w1, "walk_2": left_w2},
        "up":   {"idle": up_idle,   "walk_1": up_w1,   "walk_2": up_w2},
    }
    return make_template("cape_navy_half", -1, {"up": 10}, directions)


# ===================================================================
# Main — generate, validate, save
# ===================================================================
def main():
    BASE = "/Users/ryanlunde/Documents/apptest1/metz-sprite-engine"

    templates = [
        (generate_belt,      f"{BASE}/templates/equipment/accessories/belt_captain_leather.json"),
        (generate_greaves,   f"{BASE}/templates/equipment/armor/greaves_steel.json"),
        (generate_boots,     f"{BASE}/templates/equipment/armor/boots_leather_sturdy.json"),
        (generate_longsword, f"{BASE}/templates/equipment/weapons/weapon_longsword.json"),
        (generate_shield,    f"{BASE}/templates/equipment/weapons/shield_rhaud_kite.json"),
        (generate_cape,      f"{BASE}/templates/equipment/accessories/cape_navy_half.json"),
    ]

    all_errors = []
    print("=" * 60)
    print("Equipment Group 2 — Template Generator")
    print("=" * 60)

    for gen_fn, path in templates:
        tmpl = gen_fn()
        tid = tmpl["template_id"]

        # Validate every frame
        errors = []
        for d_name, anims in tmpl["directions"].items():
            for a_name, frame in anims.items():
                errors.extend(validate_frame(frame, tid, d_name, a_name))

        # Count non-transparent pixels per direction
        pixel_counts = {}
        for d_name, anims in tmpl["directions"].items():
            total = 0
            for a_name, frame in anims.items():
                for row_data in frame:
                    total += sum(1 for v in row_data if v != T)
            pixel_counts[d_name] = total

        if errors:
            all_errors.extend(errors)
            status = f"ERRORS ({len(errors)})"
        else:
            status = "OK"

        # Ensure directory exists
        os.makedirs(os.path.dirname(path), exist_ok=True)

        # Write JSON
        with open(path, "w") as f:
            json.dump(tmpl, f, indent=2)

        file_size = os.path.getsize(path)
        print(f"\n  [{status}] {tid}")
        print(f"    Path: {path}")
        print(f"    Size: {file_size:,} bytes")
        print(f"    z_order: {tmpl['z_order']}", end="")
        if tmpl.get("z_order_override"):
            print(f"  overrides: {tmpl['z_order_override']}", end="")
        print()
        print(f"    Pixels: " + ", ".join(f"{d}={n}" for d, n in pixel_counts.items()))
        if errors:
            for e in errors[:5]:
                print(f"    ERROR: {e}")
            if len(errors) > 5:
                print(f"    ... and {len(errors) - 5} more")

    print("\n" + "=" * 60)
    if all_errors:
        print(f"VALIDATION FAILED — {len(all_errors)} total errors")
        for e in all_errors:
            print(f"  {e}")
        sys.exit(1)
    else:
        print("ALL 6 TEMPLATES VALID")
        print(f"  Frames: {6 * 9} (6 templates x 3 directions x 3 anims)")
        print(f"  Grid: {W}x{H} per frame")
        print("  Palette: master (metz_master)")
    print("=" * 60)


if __name__ == "__main__":
    main()
