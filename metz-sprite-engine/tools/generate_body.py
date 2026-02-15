#!/usr/bin/env python3
"""
generate_body.py — Programmatically generates Captain Metz's 48x48 base body template.

Outputs: templates/body/body_metz_48.json

Captain Metz is a broad-shouldered military captain rendered in chibi RPG style
(Fire Emblem GBA proportions): big head (~1/3 body height), wide shoulders,
short stumpy legs. This is the NAKED BASE BODY — no armor or clothing.
Equipment layers are composited separately.

The character occupies roughly columns 8-40 (32px wide) of the 48px frame,
leaving ~8px padding on each side.

Palette keys used (dot-notation):
  skin.base, skin.shadow, skin.highlight, skin.outline
  hair.base, hair.shadow, hair.highlight, hair.outline
  beard.base, beard.shadow
  eyes.white, eyes.iris
"""

import json
import os
import copy

# ---------------------------------------------------------------------------
# Shorthand aliases for readability
# ---------------------------------------------------------------------------
O  = 0               # transparent
SB = "skin.base"
SS = "skin.shadow"
SH = "skin.highlight"
SO = "skin.outline"
HB = "hair.base"
HS = "hair.shadow"
HH = "hair.highlight"
HO = "hair.outline"
BB = "beard.base"
BDS= "beard.shadow"
EW = "eyes.white"
EI = "eyes.iris"

SIZE = 48

# Valid palette keys for validation
VALID_KEYS = {
    0,
    "skin.base", "skin.shadow", "skin.highlight", "skin.outline",
    "hair.base", "hair.shadow", "hair.highlight", "hair.outline",
    "beard.base", "beard.shadow",
    "eyes.white", "eyes.iris",
}


# ---------------------------------------------------------------------------
# Helper: build a 48-wide row from segments
# ---------------------------------------------------------------------------
def row(left_pad, *segments):
    """Build a 48-pixel row.

    Args:
        left_pad: number of transparent pixels on the left
        *segments: flat sequence of pixel values

    Returns:
        list of 48 values, right-padded with 0s
    """
    pixels = [O] * left_pad
    for seg in segments:
        if isinstance(seg, list):
            pixels.extend(seg)
        else:
            pixels.append(seg)
    # Right-pad to 48
    while len(pixels) < SIZE:
        pixels.append(O)
    if len(pixels) > SIZE:
        raise ValueError(f"Row too wide: {len(pixels)} pixels (max {SIZE})")
    return pixels


def empty_row():
    """Fully transparent row."""
    return [O] * SIZE


def filled(value, count):
    """Return a list of `count` copies of `value`."""
    return [value] * count


# ---------------------------------------------------------------------------
# DOWN-IDLE (front-facing) — Chibi proportions
# ---------------------------------------------------------------------------
def build_down_idle():
    """Captain Metz facing down (toward viewer), idle stance.

    Chibi proportions: big head (rows 1-13), broad torso (rows 14-28),
    short legs (rows 29-40), chunky feet (rows 41-44).
    Character spans roughly cols 8-40 (~32px wide).
    """
    f = []

    # Row 0: top padding
    f.append(empty_row())  # 0

    # --- HEAD rows 1-13 (13 rows total, ~14px wide) ---
    # Head centered around cols 17-30 (14px wide)

    # Row 1: top of hair — narrow crest
    f.append(row(19, HO, HO, HH, HB, HB, HB, HB, HH, HO, HO))  # 1 — hair top

    # Row 2: hair widens
    f.append(row(17, HO, HS, HB, HH, HB, HB, HB, HB, HH, HB, HS, HO))  # 2 — 12px

    # Row 3: full hair width
    f.append(row(16, HO, HB, HB, HH, HB, HB, HB, HB, HB, HB, HH, HB, HB, HO))  # 3 — 14px

    # Row 4: hair meeting forehead — transition row
    f.append(row(16, HO, HS, HB, HB, HB, HB, HB, HB, HB, HB, HB, HB, HS, HO))  # 4 — 14px

    # Row 5: forehead — skin visible below hair
    f.append(row(16, SO, SH, SH, SH, SH, SH, SH, SH, SH, SH, SH, SH, SH, SO))  # 5

    # Row 6: brow ridge with scar (shadow on one brow)
    f.append(row(16, SO, SB, SH, SH, SS, SB, SB, SB, SB, SS, SH, SH, SB, SO))  # 6 — brow, scar at col20

    # Row 7: eyes row — each eye is 2px (white+iris), separated by 4px nose bridge
    #   14px wide: outline, skin, [W,I], skin, skin, skin, skin, [W,I], skin, skin, outline
    f.append(row(16, SO, SB, EW, EI, SB, SB, SB, SB, SB, SB, EW, EI, SB, SO))  # 7

    # Row 8: below eyes / nose — center shadow for nose
    f.append(row(16, SO, SB, SB, SB, SB, SB, SS, SS, SB, SB, SB, SB, SB, SO))  # 8

    # Row 9: upper beard area — stubble on cheeks
    f.append(row(16, SO, SB, SB, BB, BB, SB, SB, SB, SB, BB, BB, SB, SB, SO))  # 9

    # Row 10: mid beard — fuller in center
    f.append(row(17, SO, SB, BB, BDS, BB, BB, BB, BB, BDS, BB, SB, SO))  # 10

    # Row 11: lower beard / chin
    f.append(row(17, SO, SB, BB, BDS, BDS, BB, BB, BDS, BDS, BB, SB, SO))  # 11

    # Row 12: jaw narrowing
    f.append(row(18, SO, SB, SB, BB, BDS, BDS, BDS, BB, SB, SB, SO))  # 12

    # Row 13: chin bottom — head ends
    f.append(row(19, SO, SO, SB, SB, SS, SS, SB, SB, SO, SO))  # 13

    # --- NECK rows 14-15 (short, wide neck) ---
    f.append(row(20, SO, SB, SS, SB, SB, SS, SB, SO))  # 14 — 8px neck
    f.append(row(18, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO))  # 15 — neck widens into shoulders

    # --- SHOULDERS & TORSO rows 16-28 ---
    # Shoulders are the widest point: ~22px (cols 13-34)
    # Torso core: ~16px (cols 16-31), arms: 3px each on the sides

    # Row 16: shoulder tops — very wide
    f.append(row(13, SO, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, SO))  # 16 — 22px

    # Row 17: upper chest + arm start
    # arms: 3px each with 1px gap from torso core
    # Left arm cols 10-12, gap 13, torso 14-33, gap 34, right arm 35-37
    f.append(row(10, SO, SB, SS, O, SO, SS, SB, SB, SB, SH, SH, SB, SB, SB, SB, SB, SB, SH, SH, SB, SB, SB, SS, SO, O, SS, SB, SO))  # 17 — 28px content

    # Row 18: chest — highlights for pecs
    f.append(row(10, SO, SB, SB, O, SO, SS, SB, SB, SH, SH, SH, SB, SB, SB, SB, SB, SH, SH, SH, SB, SB, SS, SO, O, SB, SB, SO))  # 18

    # Row 19: mid-chest
    f.append(row(10, SO, SS, SB, O, SO, SS, SB, SB, SB, SH, SB, SB, SB, SB, SB, SB, SH, SB, SB, SB, SB, SS, SO, O, SB, SS, SO))  # 19

    # Row 20: torso mid
    f.append(row(10, SO, SB, SS, O, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, O, SS, SB, SO))  # 20

    # Row 21: torso — abs area
    f.append(row(10, SO, SS, SB, O, SO, SS, SB, SB, SB, SB, SB, SS, SB, SB, SB, SS, SB, SB, SB, SB, SB, SS, SO, O, SB, SS, SO))  # 21

    # Row 22: torso narrowing — arms start to end
    f.append(row(11, SO, SB, O, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, O, SB, SO))  # 22

    # Row 23: lower torso
    f.append(row(11, SO, SS, O, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, O, SS, SO))  # 23

    # Row 24: torso continues
    f.append(row(11, SO, SB, O, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, O, SB, SO))  # 24

    # Row 25: arms ending — hands appear
    f.append(row(12, SO, O, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, O, SO))  # 25

    # Row 26: waist — hands at sides
    f.append(row(11, SB, SO, O, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, O, SO, SB))  # 26

    # Row 27: hips
    f.append(row(11, SO, SO, O, SO, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, SO, O, SO, SO))  # 27

    # Row 28: hip bottom — transition to legs
    f.append(row(15, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO))  # 28

    # --- LEGS rows 29-40 ---
    # Each leg ~6px wide, 2px gap between, centered
    # Left leg: cols 15-20, gap: 21-22, right leg: 23-28

    # Row 29: top of legs — split begins
    f.append(row(15, SO, SB, SB, SB, SB, SB, SO, O, O, SO, SB, SB, SB, SB, SB, SO))  # 29

    # Row 30: upper legs
    f.append(row(15, SO, SB, SB, SB, SB, SB, SO, O, O, SO, SB, SB, SB, SB, SB, SO))  # 30

    # Row 31: thigh
    f.append(row(15, SO, SB, SB, SS, SB, SB, SO, O, O, SO, SB, SB, SS, SB, SB, SO))  # 31

    # Row 32: thigh
    f.append(row(15, SO, SB, SB, SS, SB, SB, SO, O, O, SO, SB, SB, SS, SB, SB, SO))  # 32

    # Row 33: knee area — slightly wider
    f.append(row(14, SO, SB, SB, SB, SS, SB, SB, SO, O, O, SO, SB, SB, SS, SB, SB, SB, SO))  # 33

    # Row 34: knee
    f.append(row(14, SO, SB, SB, SB, SS, SB, SB, SO, O, O, SO, SB, SB, SS, SB, SB, SB, SO))  # 34

    # Row 35: below knee
    f.append(row(15, SO, SB, SB, SS, SB, SB, SO, O, O, SO, SB, SB, SS, SB, SB, SO))  # 35

    # Row 36: shins
    f.append(row(15, SO, SB, SB, SS, SB, SB, SO, O, O, SO, SB, SB, SS, SB, SB, SO))  # 36

    # Row 37: lower shins
    f.append(row(15, SO, SB, SS, SS, SB, SB, SO, O, O, SO, SB, SB, SS, SS, SB, SO))  # 37

    # Row 38: shins narrow slightly
    f.append(row(15, SO, SB, SB, SS, SB, SB, SO, O, O, SO, SB, SB, SS, SB, SB, SO))  # 38

    # Row 39: ankles
    f.append(row(15, SO, SB, SB, SB, SB, SB, SO, O, O, SO, SB, SB, SB, SB, SB, SO))  # 39

    # Row 40: ankle bottoms
    f.append(row(15, SO, SB, SB, SB, SB, SB, SO, O, O, SO, SB, SB, SB, SB, SB, SO))  # 40

    # --- FEET rows 41-44 ---
    # Chunky boots: 7px wide each, 2px gap
    # Left foot cols 14-20, gap 21-22, right foot 23-29

    # Row 41: boot tops — wider than legs
    f.append(row(14, SO, SB, SB, SB, SB, SB, SB, SO, O, O, SO, SB, SB, SB, SB, SB, SB, SO))  # 41

    # Row 42: boot mid
    f.append(row(14, SO, SB, SB, SB, SB, SB, SB, SO, O, O, SO, SB, SB, SB, SB, SB, SB, SO))  # 42

    # Row 43: boot soles
    f.append(row(14, SO, SS, SS, SS, SS, SS, SS, SO, O, O, SO, SS, SS, SS, SS, SS, SS, SO))  # 43

    # Row 44: boot bottom outline
    f.append(row(14, SO, SO, SO, SO, SO, SO, SO, SO, O, O, SO, SO, SO, SO, SO, SO, SO, SO))  # 44

    # Rows 45-47: bottom padding
    f.append(empty_row())  # 45
    f.append(empty_row())  # 46
    f.append(empty_row())  # 47

    return f


# ---------------------------------------------------------------------------
# LEFT-IDLE (profile, facing left)
# ---------------------------------------------------------------------------
def build_left_idle():
    """Captain Metz facing left, idle stance.

    Profile is ~15px wide. Head rounder from side (~11px).
    Body thicker, one arm visible in front, legs overlap but chunky.
    """
    f = []

    # Row 0: top padding
    f.append(empty_row())  # 0

    # --- HEAD rows 1-13 (~11px wide profile, centered around cols 18-28) ---

    # Row 1: top of hair — narrow from side
    f.append(row(19, HO, HO, HH, HB, HB, HB, HO, HO))  # 1

    # Row 2: hair fuller
    f.append(row(18, HO, HB, HH, HB, HB, HB, HB, HB, HO))  # 2 — 9px

    # Row 3: full hair from side — extends back
    f.append(row(17, HO, HS, HB, HB, HH, HB, HB, HB, HB, HS, HO))  # 3 — 11px

    # Row 4: hair lower
    f.append(row(17, HO, HB, HB, HB, HB, HB, HB, HB, HB, HB, HO))  # 4

    # Row 5: forehead in profile — brow ridge
    f.append(row(17, HO, SH, SH, SH, SS, SB, SB, SB, SB, SB, SO))  # 5

    # Row 6: eye row — one eye visible, nose protrudes left
    f.append(row(16, SO, SB, SB, EW, EI, SB, SB, SB, SB, SB, SB, SO))  # 6

    # Row 7: nose protrudes further
    f.append(row(15, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SO))  # 7

    # Row 8: cheek / upper beard
    f.append(row(16, SO, SB, SB, SB, BB, BB, SB, SB, SB, SB, SB, SO))  # 8

    # Row 9: beard area
    f.append(row(16, SO, SB, BB, BDS, BB, BB, SB, SB, SB, SB, SO))  # 9

    # Row 10: chin / lower beard
    f.append(row(17, SO, SB, BB, BDS, BDS, BB, SB, SB, SB, SO))  # 10

    # Row 11: lower jaw
    f.append(row(18, SO, SB, SB, SS, SB, SB, SB, SB, SO))  # 11

    # Row 12: jaw bottom
    f.append(row(19, SO, SB, SB, SB, SB, SB, SB, SO))  # 12

    # Row 13: chin tip
    f.append(row(19, SO, SO, SB, SB, SB, SB, SO, SO))  # 13

    # --- NECK rows 14-15 ---
    f.append(row(20, SO, SS, SB, SB, SB, SS, SO))  # 14
    f.append(row(19, SO, SS, SB, SB, SB, SB, SB, SS, SO))  # 15

    # --- SHOULDERS & TORSO rows 16-28 (profile ~15px wide) ---
    # Back arm behind, body, front arm in front

    # Row 16: shoulders — wide in profile too
    f.append(row(15, SO, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, SO))  # 16 — 15px

    # Row 17: upper chest + arms (back arm behind, front arm in front)
    f.append(row(13, SO, SB, SO, O, SO, SS, SB, SB, SB, SH, SB, SB, SB, SB, SS, SO, O, SO, SB, SO))  # 17

    # Row 18: chest
    f.append(row(13, SB, SS, SO, O, SO, SS, SB, SB, SH, SH, SB, SB, SB, SB, SS, SO, O, SO, SS, SB))  # 18

    # Row 19: mid chest
    f.append(row(13, SB, SO, SO, O, SO, SS, SB, SB, SB, SH, SB, SB, SB, SB, SS, SO, O, SO, SO, SB))  # 19

    # Row 20: torso
    f.append(row(13, SS, SB, SO, O, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, O, SO, SB, SS))  # 20

    # Row 21: torso
    f.append(row(13, SB, SS, SO, O, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, O, SO, SS, SB))  # 21

    # Row 22: torso narrowing
    f.append(row(14, SB, SO, O, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, O, SO, SB))  # 22

    # Row 23: lower torso
    f.append(row(14, SS, SO, O, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, O, SO, SS))  # 23

    # Row 24: lower torso
    f.append(row(14, SB, SO, O, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, O, SO, SB))  # 24

    # Row 25: hands + waist
    f.append(row(15, SO, O, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, O, SO))  # 25

    # Row 26: waist
    f.append(row(14, SB, SO, O, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, O, SO, SB))  # 26

    # Row 27: hips
    f.append(row(14, SO, SO, O, SO, SO, SS, SB, SB, SB, SB, SB, SB, SS, SO, SO, O, SO, SO))  # 27

    # Row 28: hip bottom
    f.append(row(17, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO))  # 28

    # --- LEGS rows 29-40 (profile: overlapping, ~9px wide) ---

    f.append(row(17, SO, SB, SB, SB, SB, SB, SB, SB, SB, SO))  # 29

    f.append(row(17, SO, SB, SB, SS, SB, SB, SB, SB, SB, SO))  # 30

    f.append(row(17, SO, SB, SB, SS, SB, SB, SB, SB, SB, SO))  # 31

    f.append(row(17, SO, SB, SB, SS, SB, SB, SB, SB, SB, SO))  # 32

    f.append(row(17, SO, SB, SB, SS, SB, SB, SS, SB, SB, SO))  # 33 — knee

    f.append(row(17, SO, SB, SB, SS, SB, SB, SS, SB, SB, SO))  # 34 — knee

    f.append(row(17, SO, SB, SB, SS, SB, SB, SB, SB, SB, SO))  # 35

    f.append(row(17, SO, SB, SS, SS, SB, SB, SB, SB, SB, SO))  # 36

    f.append(row(17, SO, SB, SB, SS, SB, SB, SS, SB, SB, SO))  # 37

    f.append(row(17, SO, SB, SB, SB, SB, SB, SB, SB, SB, SO))  # 38

    f.append(row(17, SO, SB, SB, SB, SB, SB, SB, SB, SB, SO))  # 39

    f.append(row(17, SO, SB, SB, SB, SB, SB, SB, SB, SB, SO))  # 40

    # --- FEET rows 41-44 ---
    f.append(row(16, SO, SB, SB, SB, SB, SB, SB, SB, SB, SB, SO))  # 41

    f.append(row(16, SO, SB, SB, SB, SB, SB, SB, SB, SB, SB, SO))  # 42

    f.append(row(16, SO, SS, SS, SS, SS, SS, SS, SS, SS, SS, SO))  # 43

    f.append(row(16, SO, SO, SO, SO, SO, SO, SO, SO, SO, SO, SO))  # 44

    # Rows 45-47: bottom padding
    f.append(empty_row())  # 45
    f.append(empty_row())  # 46
    f.append(empty_row())  # 47

    return f


# ---------------------------------------------------------------------------
# UP-IDLE (back view)
# ---------------------------------------------------------------------------
def build_up_idle():
    """Captain Metz facing up (away from viewer), idle stance.

    Same width as down-facing (~32px). All hair on head (no face features).
    Back of torso visible, broad shoulders.
    """
    f = []

    # Row 0: top padding
    f.append(empty_row())  # 0

    # --- HEAD rows 1-13: back of head — all hair ---

    # Row 1: top of hair
    f.append(row(19, HO, HO, HB, HB, HB, HB, HB, HB, HO, HO))  # 1

    # Row 2: hair widens
    f.append(row(17, HO, HS, HB, HB, HH, HB, HB, HH, HB, HB, HS, HO))  # 2

    # Row 3: full hair
    f.append(row(16, HO, HB, HB, HB, HB, HH, HB, HB, HH, HB, HB, HB, HB, HO))  # 3

    # Row 4: hair
    f.append(row(16, HO, HS, HB, HB, HB, HB, HB, HB, HB, HB, HB, HB, HS, HO))  # 4

    # Row 5: hair
    f.append(row(16, HO, HB, HB, HS, HB, HB, HB, HB, HB, HB, HS, HB, HB, HO))  # 5

    # Row 6: hair
    f.append(row(16, HO, HB, HB, HB, HB, HS, HB, HB, HS, HB, HB, HB, HB, HO))  # 6

    # Row 7: hair
    f.append(row(16, HO, HB, HS, HB, HB, HB, HB, HB, HB, HB, HB, HS, HB, HO))  # 7

    # Row 8: hair
    f.append(row(16, HO, HB, HB, HB, HB, HB, HB, HB, HB, HB, HB, HB, HB, HO))  # 8

    # Row 9: hair
    f.append(row(16, HO, HB, HB, HS, HB, HB, HB, HB, HB, HB, HS, HB, HB, HO))  # 9

    # Row 10: hair lower
    f.append(row(17, HO, HB, HB, HB, HS, HB, HB, HS, HB, HB, HB, HO))  # 10

    # Row 11: hair bottom
    f.append(row(18, HO, HB, HB, HB, HB, HB, HB, HB, HB, HB, HO))  # 11

    # Row 12: hair ends
    f.append(row(19, HO, HO, HB, HB, HB, HB, HB, HB, HO, HO))  # 12

    # Row 13: nape of neck visible
    f.append(row(20, SO, SB, SB, SB, SB, SB, SB, SO))  # 13

    # --- NECK rows 14-15 ---
    f.append(row(20, SO, SB, SS, SB, SB, SS, SB, SO))  # 14
    f.append(row(18, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO))  # 15

    # --- SHOULDERS & TORSO rows 16-28 (same proportions as front, less detail) ---
    f.append(row(13, SO, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, SO))  # 16

    # Arms + torso — flat skin on back, no chest highlights
    f.append(row(10, SO, SB, SS, O, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, O, SS, SB, SO))  # 17

    f.append(row(10, SO, SB, SB, O, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, O, SB, SB, SO))  # 18

    f.append(row(10, SO, SS, SB, O, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, O, SB, SS, SO))  # 19

    f.append(row(10, SO, SB, SS, O, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, O, SS, SB, SO))  # 20

    f.append(row(10, SO, SS, SB, O, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, O, SB, SS, SO))  # 21

    f.append(row(11, SO, SB, O, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, O, SB, SO))  # 22

    f.append(row(11, SO, SS, O, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, O, SS, SO))  # 23

    f.append(row(11, SO, SB, O, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, O, SB, SO))  # 24

    f.append(row(12, SO, O, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, O, SO))  # 25

    f.append(row(11, SB, SO, O, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, O, SO, SB))  # 26

    f.append(row(11, SO, SO, O, SO, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, SO, O, SO, SO))  # 27

    f.append(row(15, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO))  # 28

    # --- LEGS rows 29-40 (same as down-facing) ---
    f.append(row(15, SO, SB, SB, SB, SB, SB, SO, O, O, SO, SB, SB, SB, SB, SB, SO))  # 29

    f.append(row(15, SO, SB, SB, SB, SB, SB, SO, O, O, SO, SB, SB, SB, SB, SB, SO))  # 30

    f.append(row(15, SO, SB, SB, SS, SB, SB, SO, O, O, SO, SB, SB, SS, SB, SB, SO))  # 31

    f.append(row(15, SO, SB, SB, SS, SB, SB, SO, O, O, SO, SB, SB, SS, SB, SB, SO))  # 32

    f.append(row(14, SO, SB, SB, SB, SS, SB, SB, SO, O, O, SO, SB, SB, SS, SB, SB, SB, SO))  # 33

    f.append(row(14, SO, SB, SB, SB, SS, SB, SB, SO, O, O, SO, SB, SB, SS, SB, SB, SB, SO))  # 34

    f.append(row(15, SO, SB, SB, SS, SB, SB, SO, O, O, SO, SB, SB, SS, SB, SB, SO))  # 35

    f.append(row(15, SO, SB, SB, SS, SB, SB, SO, O, O, SO, SB, SB, SS, SB, SB, SO))  # 36

    f.append(row(15, SO, SB, SS, SS, SB, SB, SO, O, O, SO, SB, SB, SS, SS, SB, SO))  # 37

    f.append(row(15, SO, SB, SB, SS, SB, SB, SO, O, O, SO, SB, SB, SS, SB, SB, SO))  # 38

    f.append(row(15, SO, SB, SB, SB, SB, SB, SO, O, O, SO, SB, SB, SB, SB, SB, SO))  # 39

    f.append(row(15, SO, SB, SB, SB, SB, SB, SO, O, O, SO, SB, SB, SB, SB, SB, SO))  # 40

    # --- FEET rows 41-44 ---
    f.append(row(14, SO, SB, SB, SB, SB, SB, SB, SO, O, O, SO, SB, SB, SB, SB, SB, SB, SO))  # 41

    f.append(row(14, SO, SB, SB, SB, SB, SB, SB, SO, O, O, SO, SB, SB, SB, SB, SB, SB, SO))  # 42

    f.append(row(14, SO, SS, SS, SS, SS, SS, SS, SO, O, O, SO, SS, SS, SS, SS, SS, SS, SO))  # 43

    f.append(row(14, SO, SO, SO, SO, SO, SO, SO, SO, O, O, SO, SO, SO, SO, SO, SO, SO, SO))  # 44

    # Rows 45-47: bottom padding
    f.append(empty_row())  # 45
    f.append(empty_row())  # 46
    f.append(empty_row())  # 47

    return f


# ---------------------------------------------------------------------------
# Walk frames — derived from idle by modifying legs, arms, and vertical bounce
# ---------------------------------------------------------------------------

def bounce_up(frame):
    """Shift the entire body up by 1 row (walk bounce).

    Row 0 stays empty. Rows 1..46 shift up by 1. Row 47 becomes empty.
    Effectively the character is 1px higher in the frame.
    """
    f = copy.deepcopy(frame)
    # Shift everything up by 1 row
    for i in range(0, SIZE - 1):
        f[i] = copy.deepcopy(frame[i + 1])
    f[SIZE - 1] = empty_row()
    return f


def build_walk_1(idle_frame, direction):
    """Walk frame 1: left leg forward, right leg back.

    Body bounces up 1px. Legs spread wider during stride.
    Arm swing is subtle (1px shift).
    """
    f = bounce_up(idle_frame)

    if direction == "down":
        # Legs with stride: left leg forward (extends down-left), right leg back (shorter)
        # Body shifted up 1, so leg rows are effectively 28-43
        # Left leg forward, right leg back with wider spread

        f[28] = row(14, SO, SB, SB, SB, SB, SB, SO, O, O, O, O, SO, SB, SB, SB, SB, SO)  # 28
        f[29] = row(13, SO, SB, SB, SB, SB, SB, SB, SO, O, O, O, O, O, SO, SB, SB, SB, SO)  # 29
        f[30] = row(13, SO, SB, SB, SS, SB, SB, SB, SO, O, O, O, O, O, SO, SB, SO)  # 30
        f[31] = row(13, SO, SB, SB, SS, SB, SB, SB, SO, O, O, O, O, O, SO, SB, SO)  # 31
        f[32] = row(13, SO, SB, SB, SS, SB, SB, SO, O, O, O, O, O, O, SO, SO)  # 32
        f[33] = row(13, SO, SB, SB, SS, SB, SB, SO)  # 33
        f[34] = row(13, SO, SB, SS, SS, SB, SB, SO)  # 34
        f[35] = row(13, SO, SB, SB, SS, SB, SB, SO)  # 35
        f[36] = row(13, SO, SB, SB, SB, SB, SB, SO)  # 36
        f[37] = row(13, SO, SB, SB, SB, SB, SB, SO)  # 37
        f[38] = row(12, SO, SB, SB, SB, SB, SB, SB, SB, SO)  # 38 — left foot
        f[39] = row(12, SO, SB, SB, SB, SB, SB, SB, SB, SO)  # 39
        f[40] = row(12, SO, SS, SS, SS, SS, SS, SS, SS, SO)  # 40
        f[41] = row(12, SO, SO, SO, SO, SO, SO, SO, SO, SO)  # 41
        f[42] = empty_row()  # 42
        f[43] = empty_row()  # 43

    elif direction == "left":
        # Profile walk: front leg forward, back leg back
        f[28] = row(17, SO, SB, SB, SB, SB, SB, SB, SB, SB, SO)  # 28
        f[29] = row(16, SO, SB, SB, SS, SB, SB, O, SB, SB, SB, SO)  # 29
        f[30] = row(15, SO, SB, SB, SS, SB, SO, O, O, SB, SB, SB, SO)  # 30
        f[31] = row(14, SO, SB, SB, SS, SB, SO, O, O, O, SB, SB, SO)  # 31
        f[32] = row(14, SO, SB, SS, SB, SO, O, O, O, O, SO, SB, SO)  # 32
        f[33] = row(14, SO, SB, SB, SB, SO, O, O, O, O, O, SO)  # 33
        f[34] = row(13, SO, SB, SB, SS, SB, SO)  # 34
        f[35] = row(13, SO, SB, SB, SS, SB, SO)  # 35
        f[36] = row(13, SO, SB, SB, SB, SB, SO)  # 36
        f[37] = row(13, SO, SB, SB, SB, SB, SB, SO)  # 37
        f[38] = row(12, SO, SB, SB, SB, SB, SB, SB, SO)  # 38
        f[39] = row(12, SO, SB, SB, SB, SB, SB, SB, SO)  # 39
        f[40] = row(12, SO, SS, SS, SS, SS, SS, SS, SO)  # 40
        f[41] = row(12, SO, SO, SO, SO, SO, SO, SO, SO)  # 41
        f[42] = empty_row()  # 42
        f[43] = empty_row()  # 43

    elif direction == "up":
        # Same as down walk structure but back view
        f[28] = row(14, SO, SB, SB, SB, SB, SB, SO, O, O, O, O, SO, SB, SB, SB, SB, SO)  # 28
        f[29] = row(13, SO, SB, SB, SB, SB, SB, SB, SO, O, O, O, O, O, SO, SB, SB, SB, SO)  # 29
        f[30] = row(13, SO, SB, SB, SS, SB, SB, SB, SO, O, O, O, O, O, SO, SB, SO)  # 30
        f[31] = row(13, SO, SB, SB, SS, SB, SB, SB, SO, O, O, O, O, O, SO, SB, SO)  # 31
        f[32] = row(13, SO, SB, SB, SS, SB, SB, SO, O, O, O, O, O, O, SO, SO)  # 32
        f[33] = row(13, SO, SB, SB, SS, SB, SB, SO)  # 33
        f[34] = row(13, SO, SB, SS, SS, SB, SB, SO)  # 34
        f[35] = row(13, SO, SB, SB, SS, SB, SB, SO)  # 35
        f[36] = row(13, SO, SB, SB, SB, SB, SB, SO)  # 36
        f[37] = row(13, SO, SB, SB, SB, SB, SB, SO)  # 37
        f[38] = row(12, SO, SB, SB, SB, SB, SB, SB, SB, SO)  # 38
        f[39] = row(12, SO, SB, SB, SB, SB, SB, SB, SB, SO)  # 39
        f[40] = row(12, SO, SS, SS, SS, SS, SS, SS, SS, SO)  # 40
        f[41] = row(12, SO, SO, SO, SO, SO, SO, SO, SO, SO)  # 41
        f[42] = empty_row()  # 42
        f[43] = empty_row()  # 43

    return f


def build_walk_2(idle_frame, direction):
    """Walk frame 2: mirror of walk_1 -- right leg forward, left leg back.

    Body bounces up 1px. Same stride as walk_1 but mirrored.
    """
    f = bounce_up(idle_frame)

    if direction == "down":
        # Mirror: right leg forward (extends down-right), left leg back (shorter)
        f[28] = row(17, SO, SB, SB, SB, SB, SO, O, O, O, O, SO, SB, SB, SB, SB, SB, SO)  # 28
        f[29] = row(18, SO, SB, SB, SB, SO, O, O, O, O, O, SO, SB, SB, SB, SB, SB, SB, SO)  # 29
        f[30] = row(18, SO, SB, SO, O, O, O, O, O, SO, SB, SB, SS, SB, SB, SB, SO)  # 30
        f[31] = row(18, SO, SB, SO, O, O, O, O, O, SO, SB, SB, SS, SB, SB, SB, SO)  # 31
        f[32] = row(19, SO, SO, O, O, O, O, O, O, SO, SB, SB, SS, SB, SB, SO)  # 32
        f[33] = row(28, SO, SB, SB, SS, SB, SB, SO)  # 33
        f[34] = row(28, SO, SB, SS, SS, SB, SB, SO)  # 34
        f[35] = row(28, SO, SB, SB, SS, SB, SB, SO)  # 35
        f[36] = row(28, SO, SB, SB, SB, SB, SB, SO)  # 36
        f[37] = row(28, SO, SB, SB, SB, SB, SB, SO)  # 37
        f[38] = row(27, SO, SB, SB, SB, SB, SB, SB, SB, SO)  # 38 — right foot
        f[39] = row(27, SO, SB, SB, SB, SB, SB, SB, SB, SO)  # 39
        f[40] = row(27, SO, SS, SS, SS, SS, SS, SS, SS, SO)  # 40
        f[41] = row(27, SO, SO, SO, SO, SO, SO, SO, SO, SO)  # 41
        f[42] = empty_row()  # 42
        f[43] = empty_row()  # 43

    elif direction == "left":
        # Profile walk_2: back leg forward, front leg back
        f[28] = row(17, SO, SB, SB, SB, SB, SB, SB, SB, SB, SO)  # 28
        f[29] = row(17, SO, SB, SB, SB, SB, O, SB, SB, SS, SB, SO)  # 29
        f[30] = row(17, SO, SB, SB, SB, O, O, SO, SB, SS, SB, SO)  # 30
        f[31] = row(17, SO, SB, SB, O, O, O, SO, SB, SS, SB, SO)  # 31
        f[32] = row(18, SO, SB, SO, O, O, O, O, SO, SS, SB, SO)  # 32
        f[33] = row(19, SO, O, O, O, O, O, SO, SB, SB, SB, SO)  # 33
        f[34] = row(27, SO, SB, SB, SS, SB, SO)  # 34
        f[35] = row(27, SO, SB, SB, SS, SB, SO)  # 35
        f[36] = row(27, SO, SB, SB, SB, SB, SO)  # 36
        f[37] = row(27, SO, SB, SB, SB, SB, SB, SO)  # 37
        f[38] = row(26, SO, SB, SB, SB, SB, SB, SB, SO)  # 38
        f[39] = row(26, SO, SB, SB, SB, SB, SB, SB, SO)  # 39
        f[40] = row(26, SO, SS, SS, SS, SS, SS, SS, SO)  # 40
        f[41] = row(26, SO, SO, SO, SO, SO, SO, SO, SO)  # 41
        f[42] = empty_row()  # 42
        f[43] = empty_row()  # 43

    elif direction == "up":
        # Mirror of walk_1 up
        f[28] = row(17, SO, SB, SB, SB, SB, SO, O, O, O, O, SO, SB, SB, SB, SB, SB, SO)  # 28
        f[29] = row(18, SO, SB, SB, SB, SO, O, O, O, O, O, SO, SB, SB, SB, SB, SB, SB, SO)  # 29
        f[30] = row(18, SO, SB, SO, O, O, O, O, O, SO, SB, SB, SS, SB, SB, SB, SO)  # 30
        f[31] = row(18, SO, SB, SO, O, O, O, O, O, SO, SB, SB, SS, SB, SB, SB, SO)  # 31
        f[32] = row(19, SO, SO, O, O, O, O, O, O, SO, SB, SB, SS, SB, SB, SO)  # 32
        f[33] = row(28, SO, SB, SB, SS, SB, SB, SO)  # 33
        f[34] = row(28, SO, SB, SS, SS, SB, SB, SO)  # 34
        f[35] = row(28, SO, SB, SB, SS, SB, SB, SO)  # 35
        f[36] = row(28, SO, SB, SB, SB, SB, SB, SO)  # 36
        f[37] = row(28, SO, SB, SB, SB, SB, SB, SO)  # 37
        f[38] = row(27, SO, SB, SB, SB, SB, SB, SB, SB, SO)  # 38
        f[39] = row(27, SO, SB, SB, SB, SB, SB, SB, SB, SO)  # 39
        f[40] = row(27, SO, SS, SS, SS, SS, SS, SS, SS, SO)  # 40
        f[41] = row(27, SO, SO, SO, SO, SO, SO, SO, SO, SO)  # 41
        f[42] = empty_row()  # 42
        f[43] = empty_row()  # 43

    return f


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
def validate_frame(frame, label):
    """Validate a frame is 48x48 with only valid pixel values."""
    errors = []
    if len(frame) != SIZE:
        errors.append(f"{label}: has {len(frame)} rows, expected {SIZE}")
    for r_idx, r in enumerate(frame):
        if len(r) != SIZE:
            errors.append(f"{label} row {r_idx}: has {len(r)} cols, expected {SIZE}")
        for c_idx, val in enumerate(r):
            if val not in VALID_KEYS:
                errors.append(f"{label} row {r_idx} col {c_idx}: invalid value '{val}'")
    return errors


# ---------------------------------------------------------------------------
# ASCII visualization
# ---------------------------------------------------------------------------
def ascii_viz(frame, title=""):
    """Print an ASCII visualization of a frame."""
    char_map = {
        0:               ".",
        "skin.base":     "S",
        "skin.shadow":   "s",
        "skin.highlight":"H",
        "skin.outline":  "#",
        "hair.base":     "h",
        "hair.shadow":   "d",
        "hair.highlight":"L",
        "hair.outline":  "O",
        "beard.base":    "b",
        "beard.shadow":  "B",
        "eyes.white":    "W",
        "eyes.iris":     "I",
    }

    print(f"\n{'='*52}")
    print(f"  {title}")
    print(f"{'='*52}")
    print(f"     {''.join(str(i % 10) for i in range(SIZE))}")
    print(f"     {''.join('-' for _ in range(SIZE))}")
    for r_idx, r in enumerate(frame):
        line = "".join(char_map.get(v, "?") for v in r)
        print(f"{r_idx:3d} |{line}|")
    print(f"     {''.join('-' for _ in range(SIZE))}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("Generating Captain Metz base body template (48x48, chibi proportions)...")
    print()

    # Build all idle frames
    down_idle = build_down_idle()
    left_idle = build_left_idle()
    up_idle   = build_up_idle()

    # Build walk frames from idle
    down_walk1 = build_walk_1(down_idle, "down")
    down_walk2 = build_walk_2(down_idle, "down")
    left_walk1 = build_walk_1(left_idle, "left")
    left_walk2 = build_walk_2(left_idle, "left")
    up_walk1   = build_walk_1(up_idle,   "up")
    up_walk2   = build_walk_2(up_idle,   "up")

    # Validate all frames
    all_frames = {
        "down.idle":   down_idle,
        "down.walk_1": down_walk1,
        "down.walk_2": down_walk2,
        "left.idle":   left_idle,
        "left.walk_1": left_walk1,
        "left.walk_2": left_walk2,
        "up.idle":     up_idle,
        "up.walk_1":   up_walk1,
        "up.walk_2":   up_walk2,
    }

    all_errors = []
    for label, frame in all_frames.items():
        errors = validate_frame(frame, label)
        all_errors.extend(errors)

    # ASCII visualization of idle frames
    ascii_viz(down_idle, "DOWN-IDLE (front-facing)")
    ascii_viz(left_idle, "LEFT-IDLE (profile)")
    ascii_viz(up_idle, "UP-IDLE (back view)")

    # Print validation summary
    print(f"\n{'='*52}")
    print("  VALIDATION SUMMARY")
    print(f"{'='*52}")
    print(f"  Frames generated: {len(all_frames)}")
    for label in all_frames:
        frame = all_frames[label]
        rows_ok = len(frame) == SIZE
        cols_ok = all(len(r) == SIZE for r in frame)
        status = "OK" if (rows_ok and cols_ok) else "FAIL"
        pixel_count = sum(1 for r in frame for v in r if v != 0)
        print(f"    {label:20s}  {status:4s}  ({len(frame)}x{len(frame[0]) if frame else 0})  pixels: {pixel_count}")

    if all_errors:
        print(f"\n  ERRORS ({len(all_errors)}):")
        for e in all_errors:
            print(f"    - {e}")
        print("\n  *** TEMPLATE GENERATION FAILED ***")
        return
    else:
        print(f"\n  All {len(all_frames)} frames valid (48x48, palette keys only)")

    # Build template JSON
    template = {
        "template_id": "body_metz_48",
        "type": "body",
        "size": [48, 48],
        "palette_type": "master",
        "mirror_right_from_left": True,
        "walk_cycle": ["idle", "walk_1", "idle", "walk_2"],
        "directions": {
            "down": {
                "idle":   down_idle,
                "walk_1": down_walk1,
                "walk_2": down_walk2,
            },
            "left": {
                "idle":   left_idle,
                "walk_1": left_walk1,
                "walk_2": left_walk2,
            },
            "up": {
                "idle":   up_idle,
                "walk_1": up_walk1,
                "walk_2": up_walk2,
            },
        }
    }

    # Write output
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, "..", "templates", "body")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "body_metz_48.json")

    with open(output_path, "w") as fh:
        json.dump(template, fh, indent=2)

    abs_path = os.path.abspath(output_path)
    file_size = os.path.getsize(abs_path)
    print(f"\n  Output: {abs_path}")
    print(f"  Size:   {file_size:,} bytes")
    print(f"\n  Done!")


if __name__ == "__main__":
    main()
