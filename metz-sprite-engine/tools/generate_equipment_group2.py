#!/usr/bin/env python3
"""
Generate Equipment Group 2 — 6 equipment template JSONs for Captain Metz's 48x48 sprite system.

Aligned to the wider, stockier chibi body template:
  DOWN-FACING body layout:
    Head: rows 1-13, centered ~col 24, ~12px wide
    Neck/shoulders: rows 13-15, ~20px wide (cols ~14-34)
    Torso: rows 15-28, ~18px core (cols ~15-33), arms cols 10-13 (L) / 35-38 (R)
    Legs: rows 29-40, two legs ~6px wide, 2-3px gap, left ~cols 15-20, right ~cols 28-33
    Feet: rows 41-44, each ~7px wide

  LEFT-FACING body layout:
    Body: cols ~16-30, ~14px wide
    Legs: rows 29-44, ~8px wide

Templates generated:
  1. belt_captain_leather   (accessories, z:5)
  2. greaves_steel          (armor, z:3)
  3. boots_leather_sturdy   (armor, z:3)
  4. weapon_longsword       (weapons, z:9, up:-1)
  5. shield_rhaud_kite      (weapons, z:9, overrides left:10 right:-1 up:8)
  6. cape_navy_half         (accessories, z:-1, up:10)
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


def set_pixel(frame, r, c, val):
    """Safely set a single pixel."""
    if 0 <= r < H and 0 <= c < W:
        frame[r][c] = val


def set_rect(frame, r1, c1, r2, c2, val):
    """Fill a rectangle [r1..r2] x [c1..c2] inclusive."""
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
# TEMPLATE 1 — Leather Belt with Pouch (z:5)
# ===================================================================
def generate_belt():
    """
    Belt across wider torso.
    DOWN: rows 27-29, cols 15-33 (~18px wide). Gold buckle center, hip pouch right.
    LEFT: 4-5px strip at waist.
    UP: same width as down, pouch barely visible.
    """
    # --- DOWN ---
    down_idle = empty_frame()
    # Belt band: rows 27-29, cols 15-33
    for r in range(27, 30):
        for c in range(15, 34):
            if r == 27:
                set_pixel(down_idle, r, c, BLo)    # top outline
            elif r == 29:
                set_pixel(down_idle, r, c, BLs)    # bottom shadow
            else:
                set_pixel(down_idle, r, c, BLb)    # base leather

    # Gold buckle: center (cols 23-25, rows 27-29)
    set_rect(down_idle, 27, 23, 29, 25, GTb)
    set_pixel(down_idle, 27, 23, GTh)  # highlight top-left
    set_pixel(down_idle, 29, 25, GTs)  # shadow bottom-right

    # Hip pouch: right side cols 29-32, rows 28-31
    set_rect(down_idle, 28, 29, 31, 32, BLb)
    # Pouch outline
    for c in range(29, 33):
        set_pixel(down_idle, 28, c, BLo)
    for r in range(28, 32):
        set_pixel(down_idle, r, 29, BLo)
        set_pixel(down_idle, r, 32, BLo)
    # Pouch bottom shadow
    for c in range(29, 33):
        set_pixel(down_idle, 31, c, BLs)
    # Buckle clasp on pouch
    set_pixel(down_idle, 29, 30, BLbu)
    set_pixel(down_idle, 30, 30, BLbu)

    down_w1 = copy_frame(down_idle)
    down_w2 = copy_frame(down_idle)

    # --- LEFT ---
    left_idle = empty_frame()
    # Belt band from side: cols 18-22 (4-5px strip), rows 27-29
    for r in range(27, 30):
        for c in range(18, 23):
            if r == 27:
                set_pixel(left_idle, r, c, BLo)
            elif r == 29:
                set_pixel(left_idle, r, c, BLs)
            else:
                set_pixel(left_idle, r, c, BLb)
    # Buckle at front (left-facing, front = left ~ col 18-19)
    set_rect(left_idle, 27, 18, 28, 19, GTb)
    set_pixel(left_idle, 27, 18, GTh)
    # Pouch peeking on far hip (cols 21-23, rows 28-31)
    set_rect(left_idle, 28, 21, 31, 23, BLb)
    for c in range(21, 24):
        set_pixel(left_idle, 31, c, BLs)
    set_pixel(left_idle, 29, 22, BLbu)

    left_w1 = copy_frame(left_idle)
    left_w2 = copy_frame(left_idle)

    # --- UP ---
    up_idle = empty_frame()
    # Belt band: rows 27-29, cols 15-33 (same width as down)
    for r in range(27, 30):
        for c in range(15, 34):
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
# TEMPLATE 2 — Steel Leg Greaves (z:3)
# ===================================================================
def generate_greaves():
    """
    Greaves on new leg positions.
    DOWN: left leg cols ~15-20, right leg cols ~28-33, rows 30-40.
          Gold trim at knee (row 30). Knee guards bump at rows 32-33.
    LEFT: single leg view, cols 18-25, rows 30-40.
    Walk: legs shift during stride (+/-1px vertical).
    """

    def _greave_down_idle():
        f = empty_frame()
        # Left greave: cols 15-20, rows 30-40
        for r in range(30, 41):
            for c in range(15, 21):
                if c == 15:
                    set_pixel(f, r, c, SAo)       # outer outline
                elif c == 20:
                    set_pixel(f, r, c, SAs)       # inner shadow
                elif c == 16:
                    set_pixel(f, r, c, SAh)       # highlight outer
                else:
                    set_pixel(f, r, c, SAb)       # base
        # Right greave: cols 28-33, rows 30-40
        for r in range(30, 41):
            for c in range(28, 34):
                if c == 33:
                    set_pixel(f, r, c, SAo)
                elif c == 28:
                    set_pixel(f, r, c, SAs)
                elif c == 32:
                    set_pixel(f, r, c, SAh)
                else:
                    set_pixel(f, r, c, SAb)
        # Knee guards: bump out at rows 32-33
        for r in (32, 33):
            set_pixel(f, r, 14, SAo)
            set_pixel(f, r, 21, SAs)
            set_pixel(f, r, 27, SAs)
            set_pixel(f, r, 34, SAo)
        # Gold trim at top (row 30)
        for c in range(15, 21):
            set_pixel(f, 30, c, GTb)
        set_pixel(f, 30, 15, GTs)  # shadow on edge
        for c in range(28, 34):
            set_pixel(f, 30, c, GTb)
        set_pixel(f, 30, 33, GTs)
        return f

    down_idle = _greave_down_idle()

    # walk_1: left leg forward (shift down 1px), right leg back (shift up 1px)
    down_w1 = empty_frame()
    for r in range(30, 41):
        for c in range(W):
            v = down_idle[r][c]
            if v != T:
                if c <= 23:  # left greave
                    set_pixel(down_w1, min(r + 1, 46), c, v)
                else:        # right greave
                    set_pixel(down_w1, max(r - 1, 0), c, v)
    # Re-apply knee guard bumps shifted
    for r in (32, 33):
        for c_val in [(14, SAo), (21, SAs)]:
            set_pixel(down_w1, min(r + 1, 46), c_val[0], c_val[1])
        for c_val in [(27, SAs), (34, SAo)]:
            set_pixel(down_w1, max(r - 1, 0), c_val[0], c_val[1])

    # walk_2: opposite
    down_w2 = empty_frame()
    for r in range(30, 41):
        for c in range(W):
            v = down_idle[r][c]
            if v != T:
                if c <= 23:
                    set_pixel(down_w2, max(r - 1, 0), c, v)
                else:
                    set_pixel(down_w2, min(r + 1, 46), c, v)
    for r in (32, 33):
        for c_val in [(14, SAo), (21, SAs)]:
            set_pixel(down_w2, max(r - 1, 0), c_val[0], c_val[1])
        for c_val in [(27, SAs), (34, SAo)]:
            set_pixel(down_w2, min(r + 1, 46), c_val[0], c_val[1])

    # --- LEFT ---
    def _greave_left_idle():
        f = empty_frame()
        # Single leg visible from side: cols 18-25 (~8px), rows 30-40
        for r in range(30, 41):
            for c in range(18, 26):
                if c == 18:
                    set_pixel(f, r, c, SAo)
                elif c == 25:
                    set_pixel(f, r, c, SAs)
                elif c == 19:
                    set_pixel(f, r, c, SAh)
                else:
                    set_pixel(f, r, c, SAb)
        # Knee guard bump
        for r in (32, 33):
            set_pixel(f, r, 17, SAo)
            set_pixel(f, r, 26, SAs)
        # Gold trim at top
        for c in range(18, 26):
            set_pixel(f, 30, c, GTb)
        set_pixel(f, 30, 18, GTs)
        return f

    left_idle = _greave_left_idle()

    # walk_1: front leg forward (down 2px, left 1px), back leg behind (up 2px, right 1px)
    left_w1 = empty_frame()
    for r in range(30, 41):
        for c in range(17, 27):
            v = left_idle[r][c]
            if v != T:
                set_pixel(left_w1, min(r + 2, 46), c - 1, v)
    # Back leg peek
    for r in range(30, 41):
        for c in range(17, 27):
            v = left_idle[r][c]
            if v != T:
                set_pixel(left_w1, max(r - 2, 0), c + 1, v)

    # walk_2: opposite stride
    left_w2 = empty_frame()
    for r in range(30, 41):
        for c in range(17, 27):
            v = left_idle[r][c]
            if v != T:
                set_pixel(left_w2, min(r + 2, 46), c + 1, v)
    for r in range(30, 41):
        for c in range(17, 27):
            v = left_idle[r][c]
            if v != T:
                set_pixel(left_w2, max(r - 2, 0), c - 1, v)

    # --- UP ---
    def _greave_up_idle():
        f = empty_frame()
        # Left greave: cols 15-20, rows 30-40 (shadow/highlight reversed from down)
        for r in range(30, 41):
            for c in range(15, 21):
                if c == 15:
                    set_pixel(f, r, c, SAs)
                elif c == 20:
                    set_pixel(f, r, c, SAo)
                elif c == 19:
                    set_pixel(f, r, c, SAh)
                else:
                    set_pixel(f, r, c, SAb)
        # Right greave: cols 28-33
        for r in range(30, 41):
            for c in range(28, 34):
                if c == 33:
                    set_pixel(f, r, c, SAs)
                elif c == 28:
                    set_pixel(f, r, c, SAo)
                elif c == 29:
                    set_pixel(f, r, c, SAh)
                else:
                    set_pixel(f, r, c, SAb)
        # Knee guards
        for r in (32, 33):
            set_pixel(f, r, 14, SAs)
            set_pixel(f, r, 21, SAo)
            set_pixel(f, r, 27, SAo)
            set_pixel(f, r, 34, SAs)
        # Gold trim at top
        for c in range(15, 21):
            set_pixel(f, 30, c, GTb)
        for c in range(28, 34):
            set_pixel(f, 30, c, GTb)
        return f

    up_idle = _greave_up_idle()

    up_w1 = empty_frame()
    for r in range(30, 41):
        for c in range(W):
            v = up_idle[r][c]
            if v != T:
                if c <= 23:
                    set_pixel(up_w1, min(r + 1, 46), c, v)
                else:
                    set_pixel(up_w1, max(r - 1, 0), c, v)
    for r in (32, 33):
        for c_val in [(14, SAs), (21, SAo)]:
            set_pixel(up_w1, min(r + 1, 46), c_val[0], c_val[1])
        for c_val in [(27, SAo), (34, SAs)]:
            set_pixel(up_w1, max(r - 1, 0), c_val[0], c_val[1])

    up_w2 = empty_frame()
    for r in range(30, 41):
        for c in range(W):
            v = up_idle[r][c]
            if v != T:
                if c <= 23:
                    set_pixel(up_w2, max(r - 1, 0), c, v)
                else:
                    set_pixel(up_w2, min(r + 1, 46), c, v)
    for r in (32, 33):
        for c_val in [(14, SAs), (21, SAo)]:
            set_pixel(up_w2, max(r - 1, 0), c_val[0], c_val[1])
        for c_val in [(27, SAo), (34, SAs)]:
            set_pixel(up_w2, min(r + 1, 46), c_val[0], c_val[1])

    directions = {
        "down": {"idle": down_idle, "walk_1": down_w1, "walk_2": down_w2},
        "left": {"idle": left_idle, "walk_1": left_w1, "walk_2": left_w2},
        "up":   {"idle": up_idle,   "walk_1": up_w1,   "walk_2": up_w2},
    }
    return make_template("greaves_steel", 3, {}, directions)


# ===================================================================
# TEMPLATE 3 — Brown Leather Boots (z:3)
# ===================================================================
def generate_boots():
    """
    Wider, chunkier boots at new foot positions.
    DOWN: rows 41-44, left boot cols ~14-20 (~7px), right boot cols ~28-34 (~7px).
    LEFT: single boot, ~8px wide, rows 41-44.
    """

    def _boots_down_idle():
        f = empty_frame()
        # Left boot: cols 14-20, rows 41-44
        for r in range(41, 45):
            for c in range(14, 21):
                if r == 44:
                    set_pixel(f, r, c, BLs)       # sole
                elif r == 41 and c in (16, 17, 18):
                    set_pixel(f, r, c, BLh)       # tongue highlight
                elif c == 14 or c == 20:
                    set_pixel(f, r, c, BLo)       # side outline
                else:
                    set_pixel(f, r, c, BLb)       # base
        # Right boot: cols 28-34, rows 41-44
        for r in range(41, 45):
            for c in range(28, 35):
                if r == 44:
                    set_pixel(f, r, c, BLs)
                elif r == 41 and c in (30, 31, 32):
                    set_pixel(f, r, c, BLh)
                elif c == 28 or c == 34:
                    set_pixel(f, r, c, BLo)
                else:
                    set_pixel(f, r, c, BLb)
        return f

    down_idle = _boots_down_idle()

    # walk_1: left foot forward (shift down 1), right foot back (shift up 1)
    down_w1 = empty_frame()
    for r in range(41, 45):
        for c in range(W):
            v = down_idle[r][c]
            if v != T:
                if c <= 23:  # left boot
                    set_pixel(down_w1, min(r + 1, 47), c, v)
                else:        # right boot
                    set_pixel(down_w1, max(r - 1, 0), c, v)

    # walk_2: opposite
    down_w2 = empty_frame()
    for r in range(41, 45):
        for c in range(W):
            v = down_idle[r][c]
            if v != T:
                if c <= 23:
                    set_pixel(down_w2, max(r - 1, 0), c, v)
                else:
                    set_pixel(down_w2, min(r + 1, 47), c, v)

    # --- LEFT ---
    def _boots_left_idle():
        f = empty_frame()
        # Single boot from side: cols 17-24 (~8px wide), rows 41-44
        for r in range(41, 45):
            for c in range(17, 25):
                if r == 44:
                    set_pixel(f, r, c, BLs)       # sole
                elif r == 41 and c in (19, 20, 21):
                    set_pixel(f, r, c, BLh)       # tongue
                elif c == 17 or c == 24:
                    set_pixel(f, r, c, BLo)       # outline
                else:
                    set_pixel(f, r, c, BLb)
        return f

    left_idle = _boots_left_idle()

    # walk_1: front foot forward/down, back foot up
    left_w1 = empty_frame()
    for r in range(41, 45):
        for c in range(17, 25):
            v = left_idle[r][c]
            if v != T:
                set_pixel(left_w1, min(r + 1, 47), c - 1, v)
    # Back foot
    for r in range(41, 45):
        for c in range(17, 25):
            v = left_idle[r][c]
            if v != T:
                set_pixel(left_w1, max(r - 1, 0), c + 1, v)

    left_w2 = empty_frame()
    for r in range(41, 45):
        for c in range(17, 25):
            v = left_idle[r][c]
            if v != T:
                set_pixel(left_w2, min(r + 1, 47), c + 1, v)
    for r in range(41, 45):
        for c in range(17, 25):
            v = left_idle[r][c]
            if v != T:
                set_pixel(left_w2, max(r - 1, 0), c - 1, v)

    # --- UP ---
    def _boots_up_idle():
        f = empty_frame()
        # Same positions as down, shading reversed
        # Left boot: cols 14-20
        for r in range(41, 45):
            for c in range(14, 21):
                if r == 44:
                    set_pixel(f, r, c, BLs)
                elif c == 14 or c == 20:
                    set_pixel(f, r, c, BLo)
                else:
                    set_pixel(f, r, c, BLb)
        # Right boot: cols 28-34
        for r in range(41, 45):
            for c in range(28, 35):
                if r == 44:
                    set_pixel(f, r, c, BLs)
                elif c == 28 or c == 34:
                    set_pixel(f, r, c, BLo)
                else:
                    set_pixel(f, r, c, BLb)
        return f

    up_idle = _boots_up_idle()

    up_w1 = empty_frame()
    for r in range(41, 45):
        for c in range(W):
            v = up_idle[r][c]
            if v != T:
                if c <= 23:
                    set_pixel(up_w1, min(r + 1, 47), c, v)
                else:
                    set_pixel(up_w1, max(r - 1, 0), c, v)

    up_w2 = empty_frame()
    for r in range(41, 45):
        for c in range(W):
            v = up_idle[r][c]
            if v != T:
                if c <= 23:
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
# TEMPLATE 4 — Longsword (z:9, up:-1)
# ===================================================================
def generate_longsword():
    """
    Sword visible on LEFT side of sprite (viewer's left, character's right).
    DOWN: blade rows 20-34, cols ~6-10. Guard at row 28, grip/pommel with red gem below.
          More visible than before.
    LEFT: partial blade behind body.
    UP: mostly hidden (pommel hint at hip).
    """
    # --- DOWN ---
    down_idle = empty_frame()
    # Blade: rows 20-27, cols 7-9 (3px wide, tapers to point at top)
    # Tip
    set_pixel(down_idle, 20, 8, SWo)
    set_pixel(down_idle, 21, 7, SWo)
    set_pixel(down_idle, 21, 8, SWe)
    set_pixel(down_idle, 21, 9, SWo)
    # Blade body
    for r in range(22, 28):
        set_pixel(down_idle, r, 7, SWe)     # bright edge
        set_pixel(down_idle, r, 8, SWbl)    # blade center
        set_pixel(down_idle, r, 9, SWsh)    # shadow edge
    # Blade outline left/right
    for r in range(22, 28):
        set_pixel(down_idle, r, 6, SWo)
        set_pixel(down_idle, r, 10, SWo)

    # Guard: row 28, cols 5-11 (7px wide cross-guard)
    for c in range(5, 12):
        set_pixel(down_idle, 28, c, SWg)
    set_pixel(down_idle, 28, 5, SWo)
    set_pixel(down_idle, 28, 11, SWo)

    # Grip: rows 29-31, col 8
    for r in range(29, 32):
        set_pixel(down_idle, r, 8, SWgr)
        set_pixel(down_idle, r, 7, SWo)
        set_pixel(down_idle, r, 9, SWo)

    # Pommel: rows 32-33, cols 7-9 (3px with red gem)
    set_pixel(down_idle, 32, 7, SWg)
    set_pixel(down_idle, 32, 8, SWp)   # red gem
    set_pixel(down_idle, 32, 9, SWg)
    set_pixel(down_idle, 33, 7, SWo)
    set_pixel(down_idle, 33, 8, SWg)
    set_pixel(down_idle, 33, 9, SWo)

    # walk: slight sway
    down_w1 = shift_frame(down_idle, 0, 1)
    down_w2 = shift_frame(down_idle, 0, -1)

    # --- LEFT ---
    left_idle = empty_frame()
    # Sword behind body — partial blade visible sticking up behind, cols 27-29
    # Blade tip peeking above shoulder
    set_pixel(left_idle, 18, 28, SWo)
    set_pixel(left_idle, 19, 28, SWe)
    set_pixel(left_idle, 20, 27, SWo)
    set_pixel(left_idle, 20, 28, SWbl)
    set_pixel(left_idle, 20, 29, SWo)
    set_pixel(left_idle, 21, 27, SWo)
    set_pixel(left_idle, 21, 28, SWbl)
    set_pixel(left_idle, 21, 29, SWsh)
    set_pixel(left_idle, 22, 27, SWe)
    set_pixel(left_idle, 22, 28, SWbl)
    set_pixel(left_idle, 22, 29, SWsh)
    set_pixel(left_idle, 23, 27, SWe)
    set_pixel(left_idle, 23, 28, SWbl)
    set_pixel(left_idle, 24, 27, SWsh)
    set_pixel(left_idle, 24, 28, SWbl)
    # Guard hint at hip
    set_pixel(left_idle, 25, 26, SWg)
    set_pixel(left_idle, 25, 27, SWg)
    set_pixel(left_idle, 25, 28, SWg)
    # Pommel
    set_pixel(left_idle, 26, 27, SWp)
    set_pixel(left_idle, 26, 28, SWg)

    left_w1 = shift_frame(left_idle, 0, 1)
    left_w2 = shift_frame(left_idle, 0, -1)

    # --- UP ---
    up_idle = empty_frame()
    # Mostly hidden — just pommel/grip hint at hip level
    set_pixel(up_idle, 28, 8, SWp)
    set_pixel(up_idle, 28, 9, SWg)
    set_pixel(up_idle, 29, 8, SWg)
    set_pixel(up_idle, 29, 9, SWo)

    up_w1 = shift_frame(up_idle, 0, 1)
    up_w2 = shift_frame(up_idle, 0, -1)

    directions = {
        "down": {"idle": down_idle, "walk_1": down_w1, "walk_2": down_w2},
        "left": {"idle": left_idle, "walk_1": left_w1, "walk_2": left_w2},
        "up":   {"idle": up_idle,   "walk_1": up_w1,   "walk_2": up_w2},
    }
    return make_template("weapon_longsword", 9, {"up": -1}, directions)


# ===================================================================
# TEMPLATE 5 — Kite Shield (Rhaud) (z:9, overrides: left:10 right:-1 up:8)
# ===================================================================
def generate_shield():
    """
    BIGGEST FIX: shield much more prominent.
    DOWN: viewer's LEFT side, cols ~4-16, rows 16-34. Kite shape, navy field,
          gold border, steel rim, gold lion crest.
    LEFT: FULL FRONTAL — very large, cols ~10-32, rows 15-35.
    UP: on back — oval with leather straps, ~16px wide.
    """

    # --- DOWN (shield on viewer's left, character's left arm side) ---
    down_idle = empty_frame()
    # Kite shape: cols 4-16, rows 16-34. Wide at top, tapers to point.
    kite_down = {
        16: (6,  15),
        17: (5,  16),
        18: (4,  16),
        19: (4,  16),
        20: (4,  16),
        21: (4,  16),
        22: (4,  16),
        23: (4,  16),
        24: (4,  16),
        25: (5,  16),
        26: (5,  15),
        27: (6,  15),
        28: (6,  14),
        29: (7,  14),
        30: (7,  13),
        31: (8,  13),
        32: (9,  12),
        33: (9,  11),
        34: (10, 11),
    }

    for r, (c1, c2) in kite_down.items():
        for c in range(c1, c2 + 1):
            # Gold border on edges and top/bottom rows
            if c == c1 or c == c2 or r == 16 or r == 34:
                set_pixel(down_idle, r, c, SHb)
            # Steel rim just inside border
            elif c == c1 + 1 or c == c2 - 1 or r == 17:
                set_pixel(down_idle, r, c, SHr)
            # Navy field interior
            else:
                set_pixel(down_idle, r, c, SHf)

    # Lion crest in center of shield: rows 21-27, cols 8-13
    # Simplified rearing lion silhouette in gold
    crest_down = [
        # Row 21: head top (2px)
        (21, 10, GTh), (21, 11, GTb),
        # Row 22: head wider
        (22, 9, GTb), (22, 10, GTh), (22, 11, GTb), (22, 12, GTb),
        # Row 23: neck/mane
        (23, 9, GTb), (23, 10, GTb), (23, 11, GTh), (23, 12, GTb),
        # Row 24: upper body
        (24, 8, GTb), (24, 9, GTb), (24, 10, GTh), (24, 11, GTb), (24, 12, GTb), (24, 13, GTb),
        # Row 25: torso + front paws
        (25, 8, GTb), (25, 9, GTh), (25, 10, GTb), (25, 11, GTb), (25, 12, GTb), (25, 13, GTh),
        # Row 26: lower body
        (26, 9, GTb), (26, 10, GTb), (26, 11, GTh), (26, 12, GTb),
        # Row 27: legs/base
        (27, 9, GTb), (27, 10, GTb), (27, 11, GTb), (27, 12, GTb),
    ]
    for r, c, v in crest_down:
        set_pixel(down_idle, r, c, v)

    # Walk: slight vertical bob
    down_w1 = shift_frame(down_idle, 1, 0)
    down_w2 = shift_frame(down_idle, -1, 0)

    # --- LEFT (FULL FRONTAL — shield faces camera, very detailed) ---
    left_idle = empty_frame()
    # Large kite shield: cols 10-32, rows 15-35
    kite_left = {
        15: (15, 27),
        16: (13, 29),
        17: (12, 30),
        18: (11, 31),
        19: (10, 32),
        20: (10, 32),
        21: (10, 32),
        22: (10, 32),
        23: (10, 32),
        24: (10, 32),
        25: (11, 31),
        26: (11, 31),
        27: (12, 30),
        28: (13, 29),
        29: (14, 28),
        30: (15, 27),
        31: (16, 26),
        32: (17, 25),
        33: (18, 24),
        34: (19, 23),
        35: (20, 22),
    }

    for r, (c1, c2) in kite_left.items():
        for c in range(c1, c2 + 1):
            if c == c1 or c == c2 or r == 15 or r == 35:
                set_pixel(left_idle, r, c, SHb)    # gold border
            elif c == c1 + 1 or c == c2 - 1 or r == 16:
                set_pixel(left_idle, r, c, SHr)    # steel rim
            else:
                set_pixel(left_idle, r, c, SHf)    # navy field

    # Full lion crest centered: rows 20-28, cols 17-25
    crest_left = [
        # Row 20: head top
        (20, 20, GTh), (20, 21, GTb), (20, 22, GTh),
        # Row 21: head/mane
        (21, 19, GTb), (21, 20, GTh), (21, 21, GTb), (21, 22, GTh), (21, 23, GTb),
        # Row 22: neck/mane full
        (22, 18, GTb), (22, 19, GTb), (22, 20, GTh), (22, 21, GTb), (22, 22, GTb), (22, 23, GTb), (22, 24, GTb),
        # Row 23: upper body
        (23, 18, GTb), (23, 19, GTh), (23, 20, GTb), (23, 21, GTh), (23, 22, GTb), (23, 23, GTb), (23, 24, GTb),
        # Row 24: torso widest
        (24, 17, GTb), (24, 18, GTb), (24, 19, GTh), (24, 20, GTb), (24, 21, GTb), (24, 22, GTh), (24, 23, GTb), (24, 24, GTb), (24, 25, GTb),
        # Row 25: lower torso + front paws reaching
        (25, 17, GTh), (25, 18, GTb), (25, 19, GTb), (25, 20, GTh), (25, 21, GTb), (25, 22, GTb), (25, 23, GTh), (25, 24, GTb), (25, 25, GTh),
        # Row 26: hind legs
        (26, 18, GTb), (26, 19, GTb), (26, 20, GTb), (26, 21, GTh), (26, 22, GTb), (26, 23, GTb), (26, 24, GTb),
        # Row 27: rear legs/tail
        (27, 18, GTb), (27, 19, GTh), (27, 20, GTb), (27, 21, GTb), (27, 22, GTb), (27, 23, GTh), (27, 24, GTb),
        # Row 28: base/paws
        (28, 19, GTb), (28, 20, GTb), (28, 21, GTb), (28, 22, GTb), (28, 23, GTb),
    ]
    for r, c, v in crest_left:
        set_pixel(left_idle, r, c, v)

    left_w1 = shift_frame(left_idle, 1, 0)
    left_w2 = shift_frame(left_idle, -1, 0)

    # --- UP (shield on back — oval with straps) ---
    up_idle = empty_frame()
    # Oval: rows 16-32, centered, ~16px wide
    oval_rows = {
        16: (20, 28),
        17: (18, 30),
        18: (17, 31),
        19: (16, 32),
        20: (16, 32),
        21: (16, 32),
        22: (16, 32),
        23: (16, 32),
        24: (16, 32),
        25: (17, 31),
        26: (17, 31),
        27: (18, 30),
        28: (18, 30),
        29: (19, 29),
        30: (20, 28),
        31: (21, 27),
        32: (22, 26),
    }
    for r, (c1, c2) in oval_rows.items():
        for c in range(c1, c2 + 1):
            if c == c1 or c == c2:
                set_pixel(up_idle, r, c, SHb)    # border
            elif c == c1 + 1 or c == c2 - 1:
                set_pixel(up_idle, r, c, SHr)    # rim
            else:
                set_pixel(up_idle, r, c, SHf)    # field

    # Top/bottom border fill
    for r in (16, 32):
        if r in oval_rows:
            c1, c2 = oval_rows[r]
            for c in range(c1, c2 + 1):
                set_pixel(up_idle, r, c, SHb)

    # Leather straps: two vertical lines
    for r in range(18, 29):
        set_pixel(up_idle, r, 21, BLb)
        set_pixel(up_idle, r, 27, BLb)
    # Horizontal strap crossing
    for c in range(21, 28):
        set_pixel(up_idle, 23, c, BLb)

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
# TEMPLATE 6 — Navy Half-Cape (z:-1, up:10)
# ===================================================================
def generate_cape():
    """
    MAJOR FIX: cape proportional in all views.
    DOWN: very minimal — 1-2px edge on RIGHT side behind body (cols ~37-40, rows 15-38).
    LEFT: medium drape behind body, cols ~28-36, rows 14-40.
    UP: KEY FIX — proportional cape, NOT a giant navy rectangle.
        Cols ~12-36, rows 14-38. Legs/boots VISIBLE below (rows 39-44 clear).
        Rounded/scalloped bottom edge, fold lines, pauldrons peeking at top.
    """

    # --- DOWN (z:-1, behind body — very minimal edge on right side) ---
    down_idle = empty_frame()
    # Just 1-2px edge peeking out on the right side behind the body
    for r in range(15, 39):
        set_pixel(down_idle, r, 38, CPo)    # outline edge
        if r > 22:
            set_pixel(down_idle, r, 39, CPs)    # shadow
        if r > 30:
            set_pixel(down_idle, r, 40, CPs)    # wider near bottom

    down_w1 = copy_frame(down_idle)
    down_w2 = copy_frame(down_idle)

    # --- LEFT (z:-1, behind body — medium drape) ---
    left_idle = empty_frame()
    # Cape drapes behind body, cols 28-36, rows 14-40
    for r in range(14, 41):
        # Width increases gradually as we go down
        if r < 18:
            c_start, c_end = 30, 34
        elif r < 24:
            c_start, c_end = 29, 35
        elif r < 32:
            c_start, c_end = 28, 36
        else:
            c_start, c_end = 28, 36

        for c in range(c_start, c_end + 1):
            if c == c_start:
                set_pixel(left_idle, r, c, CPo)     # outline on leading edge
            elif c == c_end:
                set_pixel(left_idle, r, c, CPs)     # shadow on trailing edge
            else:
                # Fold lines for texture
                if (c - c_start) % 3 == 0:
                    set_pixel(left_idle, r, c, CPs)
                else:
                    set_pixel(left_idle, r, c, CPp)

    # Highlight on shoulder area
    for r in range(14, 19):
        set_pixel(left_idle, r, 31, CPh)

    # Scalloped bottom edge
    for c in range(28, 37):
        if c % 2 == 0:
            set_pixel(left_idle, 40, c, CPo)
        else:
            set_pixel(left_idle, 39, c, CPo)  # alternating scallop

    left_w1 = copy_frame(left_idle)
    # Slight sway on bottom portion
    for r in range(35, 41):
        old_row = left_idle[r][:]
        left_w1[r] = [T] * W
        for c in range(W):
            if old_row[c] != T:
                nc = c + 1
                if 0 <= nc < W:
                    left_w1[r][nc] = old_row[c]

    left_w2 = copy_frame(left_idle)
    for r in range(35, 41):
        old_row = left_idle[r][:]
        left_w2[r] = [T] * W
        for c in range(W):
            if old_row[c] != T:
                nc = c - 1
                if 0 <= nc < W:
                    left_w2[r][nc] = old_row[c]

    # --- UP (z:10, IN FRONT — cape over back, BUT legs/boots visible below!) ---
    up_idle = empty_frame()
    # Cape: cols 12-36, rows 14-38. Stops at row 38 so legs (39-40) and
    # boots (41-44) remain visible.
    # Shoulder area narrower, widens at torso, then scalloped bottom.

    cape_up_rows = {
        14: (15, 33),   # shoulder — narrower, pauldrons peek outside
        15: (14, 34),
        16: (13, 35),
        17: (13, 35),
        18: (12, 36),
        19: (12, 36),
        20: (12, 36),
        21: (12, 36),
        22: (12, 36),
        23: (12, 36),
        24: (12, 36),
        25: (12, 36),
        26: (12, 36),
        27: (12, 36),
        28: (12, 36),
        29: (13, 35),
        30: (13, 35),
        31: (13, 35),
        32: (13, 35),
        33: (14, 34),
        34: (14, 34),
        35: (14, 34),
        36: (15, 33),
        37: (15, 33),
    }

    for r, (c1, c2) in cape_up_rows.items():
        for c in range(c1, c2 + 1):
            if c == c1 or c == c2:
                set_pixel(up_idle, r, c, CPo)       # outline
            elif c == c1 + 1:
                set_pixel(up_idle, r, c, CPs)       # shadow left edge
            elif c == c2 - 1:
                set_pixel(up_idle, r, c, CPs)       # shadow right edge
            else:
                # Vertical fold lines every 4 cols for texture
                if (c - c1) % 4 == 0:
                    set_pixel(up_idle, r, c, CPs)
                else:
                    set_pixel(up_idle, r, c, CPp)

    # Scalloped/rounded bottom edge at row 38 (not a flat rectangle!)
    # Create gentle curves: some cols end at 37, some at 38
    scallop_bottom = []
    for r_key in (36, 37):
        if r_key in cape_up_rows:
            c1, c2 = cape_up_rows[r_key]
            for c in range(c1, c2 + 1):
                # Every 3rd column, the cape extends 1 row lower (scallop)
                if (c - c1) % 3 == 1:
                    scallop_bottom.append((38, c))

    for r, c in scallop_bottom:
        set_pixel(up_idle, r, c, CPo)

    # Highlight on left shoulder area
    for r in range(14, 20):
        if r in cape_up_rows:
            set_pixel(up_idle, r, cape_up_rows[r][0] + 2, CPh)
            if r < 17:
                set_pixel(up_idle, r, cape_up_rows[r][0] + 3, CPh)

    # Pauldron hints peeking at top edges (steel armor visible at shoulders)
    # Left pauldron at rows 14-16
    set_pixel(up_idle, 14, 13, SAb)
    set_pixel(up_idle, 14, 14, SAh)
    set_pixel(up_idle, 15, 12, SAb)
    set_pixel(up_idle, 15, 13, SAh)
    # Right pauldron
    set_pixel(up_idle, 14, 34, SAb)
    set_pixel(up_idle, 14, 35, SAh)
    set_pixel(up_idle, 15, 35, SAb)
    set_pixel(up_idle, 15, 36, SAh)

    # Walk: bottom sways 1px right (walk_1) / left (walk_2) — subtle
    up_w1 = copy_frame(up_idle)
    for r in range(33, 39):
        old_row = up_idle[r][:]
        up_w1[r] = [T] * W
        for c in range(W):
            if old_row[c] != T:
                nc = c + 1
                if 0 <= nc < W:
                    up_w1[r][nc] = old_row[c]

    up_w2 = copy_frame(up_idle)
    for r in range(33, 39):
        old_row = up_idle[r][:]
        up_w2[r] = [T] * W
        for c in range(W):
            if old_row[c] != T:
                nc = c - 1
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
    print("Equipment Group 2 — Template Generator (v2 chibi body)")
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
