#!/usr/bin/env python3
"""
generate_body.py — Programmatically generates Captain Metz's 48x48 base body template.

Outputs: templates/body/body_metz_48.json

Captain Metz is a broad-shouldered military captain rendered in a slightly chibi
RPG style (Fire Emblem / FFT proportions). This is the NAKED BASE BODY — no
armor or clothing. Equipment layers are composited separately.

Palette keys used (dot-notation):
  skin.base, skin.shadow, skin.highlight, skin.outline
  hair.base, hair.shadow, hair.highlight, hair.outline
  beard.base, beard.shadow, beard.highlight
  eyes.white, eyes.iris, eyes.pupil
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
BH = "beard.highlight"
EW = "eyes.white"
EI = "eyes.iris"
EP = "eyes.pupil"

SIZE = 48

# Valid palette keys for validation
VALID_KEYS = {
    0,
    "skin.base", "skin.shadow", "skin.highlight", "skin.outline",
    "hair.base", "hair.shadow", "hair.highlight", "hair.outline",
    "beard.base", "beard.shadow", "beard.highlight",
    "eyes.white", "eyes.iris", "eyes.pupil",
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
# DOWN-IDLE (front-facing)
# ---------------------------------------------------------------------------
def build_down_idle():
    """Captain Metz facing down (toward viewer), idle stance."""
    f = []

    # Row 0-1: top padding
    f.append(empty_row())  # 0
    f.append(empty_row())  # 1

    # --- HEAD rows 2-13 ---
    # Hair rows 2-4: short military crop, swept upward at front
    # Hair is ~12px wide, centered around cols 18-29
    # Row 2: top of hair — narrower tuft swept up
    f.append(row(20, HO, HH, HB, HB, HH, HB, HO))  # 2 — top crest

    # Row 3: fuller hair row
    f.append(row(18, HO, HB, HH, HB, HB, HB, HB, HH, HB, HO))  # 3

    # Row 4: hair meeting forehead
    f.append(row(17, HO, HS, HB, HB, HH, HB, HB, HB, HB, HS, HO))  # 4

    # Row 5: forehead + brow area — scar/shadow on one brow pixel
    f.append(row(17, SO, SH, SH, SH, SH, SS, SH, SH, SH, SH, SO))  # 5 — brow; col23 is scar (SS)

    # Row 6: eyes row
    #   Centered in head: cols 18-29 (12 wide)
    #   Each eye is 2px (white+iris), 4px gap between
    #   Layout: outline, skin, [white,iris], skin,skin,skin,skin, [white,iris], skin, outline
    f.append(row(17, SO, SB, EW, EI, SB, SB, SB, SB, EW, EI, SB, SO))  # 6

    # Row 7: nose hint — center pixel is skin.shadow
    f.append(row(17, SO, SB, SB, SB, SB, SS, SB, SB, SB, SB, SO))  # 7 — nose at col22

    # Row 8: upper beard/stubble area — jawline
    f.append(row(17, SO, SB, SB, BB, BB, SB, SB, BB, BB, SB, SO))  # 8

    # Row 9: lower beard/stubble — chin area
    f.append(row(18, SO, SB, BB, BDS, BB, BB, BDS, BB, SB, SO))  # 9

    # Row 10: chin outline
    f.append(row(18, SO, SB, BB, BDS, BDS, BDS, BB, SB, SO))  # 10

    # Row 11: lower chin / jaw narrowing
    f.append(row(19, SO, SB, SB, SS, SS, SB, SB, SO))  # 11

    # Row 12: bottom of head
    f.append(row(20, SO, SO, SB, SB, SB, SO, SO))  # 12

    # --- NECK rows 13-15 ---
    # Neck: 4px wide, centered (cols 22-25)
    f.append(row(22, SB, SS, SS, SB))  # 13
    f.append(row(22, SB, SS, SS, SB))  # 14
    f.append(row(21, SS, SB, SB, SB, SB, SS))  # 15 — neck widens at base

    # --- SHOULDERS & TORSO rows 16-28 ---
    # Row 16: shoulders — widest point ~20px (cols 14-33)
    f.append(row(14, SO, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, SO))  # 16 — 18px shoulder span +2 outline = 20

    # Row 17: upper torso + arm start (arms are 3px wide each, 1px gap from torso)
    # Left arm: cols 11-13, gap: 14, torso: 15-32, gap: 33, right arm: 34-36
    f.append(row(11, SS, SB, SO,  O,  SO, SB, SS, SB, SB, SH, SH, SB, SB, SB, SB, SH, SH, SB, SB, SS, SB, SO,  O,  SO, SB, SS))  # 17

    # Row 18: chest area
    f.append(row(11, SB, SB, SS,  O,  SO, SS, SB, SB, SH, SH, SH, SH, SB, SB, SH, SH, SH, SH, SB, SB, SS, SO,  O,  SS, SB, SB))  # 18

    # Row 19: mid-chest
    f.append(row(11, SB, SS, SO,  O,  SO, SS, SB, SB, SB, SH, SH, SB, SB, SB, SH, SH, SB, SB, SB, SS, SO,  O,  SO, SS, SB))  # 19  -- 25 px content

    # Row 20: torso mid
    f.append(row(11, SS, SB, SO,  O,  SO, SS, SB, SB, SB, SB, SH, SB, SB, SB, SH, SB, SB, SB, SB, SS, SO,  O,  SO, SB, SS))  # 20

    # Row 21: torso
    f.append(row(11, SB, SS, SO,  O,  SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO,  O,  SO, SS, SB))  # 21

    # Row 22: torso narrowing
    f.append(row(12, SB, SO,  O,  SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO,  O,  SO, SB))  # 22 — arms end start narrowing

    # Row 23: lower torso
    f.append(row(12, SS, SO,  O,  SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO,  O,  SO, SS))  # 23

    # Row 24: torso narrowing more — arms narrower
    f.append(row(12, SB, SO,  O,  SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO,  O,  SO, SB))  # 24

    # Row 25: lower torso — arms ending
    f.append(row(13, SO,  O,  SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO,  O,  SO))  # 25

    # Row 26: waist — no arms below here, torso narrows to ~12px
    f.append(row(13, SO,  O,  SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO,  O,  SO))  # 26

    # Row 27: waist
    f.append(row(14, SO, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, SO))  # 27

    # Row 28: hips / waist bottom
    f.append(row(15, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO))  # 28

    # --- ARMS continue as hands (rows 29-31) ---
    # Row 29: hands at sides — fingertip zone + top of legs
    # Hands: cols 13-14 (left), cols 33-34 (right)
    # Leg split begins
    f.append(row(13, SB, SO,  O, O, SO, SS, SB, SB, SB, SS, O, O, SS, SB, SB, SB, SS, SO,  O, O,  SO, SB))  # 29

    # Row 30: hands ending + legs
    f.append(row(13, SO, SO,  O, O, SO, SB, SB, SB, SB, SO,  O, O,  SO, SB, SB, SB, SB, SO,  O, O,  SO, SO))  # 30

    # Row 31: last hand row + legs
    f.append(row(17, SO, SB, SB, SB, SB, SO,  O, O,  SO, SB, SB, SB, SB, SO))  # 31

    # --- LEGS rows 32-41 ---
    # Each leg ~5px wide, 2px gap between, centered
    # Left leg: cols 17-21, gap: 22-23, right leg: 24-28
    f.append(row(17, SO, SB, SB, SB, SB, SO,  O, O,  SO, SB, SB, SB, SB, SO))  # 32

    f.append(row(17, SO, SB, SB, SB, SB, SO,  O, O,  SO, SB, SB, SB, SB, SO))  # 33

    f.append(row(17, SO, SB, SB, SS, SB, SO,  O, O,  SO, SB, SS, SB, SB, SO))  # 34

    f.append(row(17, SO, SB, SB, SS, SB, SO,  O, O,  SO, SB, SS, SB, SB, SO))  # 35

    f.append(row(17, SO, SB, SB, SS, SB, SO,  O, O,  SO, SB, SS, SB, SB, SO))  # 36

    f.append(row(17, SO, SB, SB, SS, SB, SO,  O, O,  SO, SB, SS, SB, SB, SO))  # 37

    f.append(row(17, SO, SB, SS, SS, SB, SO,  O, O,  SO, SB, SS, SS, SB, SO))  # 38

    f.append(row(17, SO, SB, SS, SS, SB, SO,  O, O,  SO, SB, SS, SS, SB, SO))  # 39

    f.append(row(17, SO, SB, SB, SS, SB, SO,  O, O,  SO, SB, SS, SB, SB, SO))  # 40

    f.append(row(17, SO, SB, SB, SB, SB, SO,  O, O,  SO, SB, SB, SB, SB, SO))  # 41

    # --- FEET rows 42-46 ---
    # Feet: slightly wider than legs, 5px each, 2px gap
    f.append(row(16, SO, SB, SB, SB, SB, SB, SO, O, O, SO, SB, SB, SB, SB, SB, SO))  # 42 — feet tops

    f.append(row(16, SO, SB, SB, SB, SB, SB, SO, O, O, SO, SB, SB, SB, SB, SB, SO))  # 43

    f.append(row(16, SO, SB, SB, SS, SB, SB, SO, O, O, SO, SB, SB, SS, SB, SB, SO))  # 44

    f.append(row(16, SO, SS, SS, SS, SS, SS, SO, O, O, SO, SS, SS, SS, SS, SS, SO))  # 45 — soles

    f.append(row(16, SO, SO, SO, SO, SO, SO, SO, O, O, SO, SO, SO, SO, SO, SO, SO))  # 46 — bottom outline

    # Row 47: bottom padding
    f.append(empty_row())  # 47

    return f


# ---------------------------------------------------------------------------
# LEFT-IDLE (profile, facing left)
# ---------------------------------------------------------------------------
def build_left_idle():
    """Captain Metz facing left, idle stance."""
    f = []

    # Row 0-1: top padding
    f.append(empty_row())  # 0
    f.append(empty_row())  # 1

    # --- HEAD rows 2-13: narrower profile ~9px wide ---
    # Hair on back of head is visible; face in profile
    # Centered around cols 19-27

    # Row 2: top hair tuft
    f.append(row(20, HO, HH, HB, HB, HO))  # 2

    # Row 3: hair fuller
    f.append(row(19, HO, HB, HH, HB, HB, HB, HO))  # 3

    # Row 4: hair lower — extends back
    f.append(row(18, HO, HS, HB, HB, HH, HB, HB, HS, HO))  # 4

    # Row 5: forehead/brow in profile
    f.append(row(18, HO, SH, SH, SH, SS, SB, SB, SB, SO))  # 5 — brow scar visible

    # Row 6: eye row — one eye visible in profile, nose protrudes
    f.append(row(17, SO, SB, EW, EI, SB, SB, SB, SB, SO))  # 6 — nose protrudes 1px left

    # Row 7: nose protrudes
    f.append(row(16, SO, SS, SB, SB, SB, SB, SB, SB, SB, SO))  # 7 — nose extends 1px further left

    # Row 8: upper beard
    f.append(row(17, SO, SB, SB, BB, BB, SB, SB, SB, SO))  # 8

    # Row 9: beard/chin
    f.append(row(17, SO, SB, BB, BDS, BB, SB, SB, SO))  # 9

    # Row 10: chin
    f.append(row(18, SO, SB, BB, BDS, SB, SB, SO))  # 10

    # Row 11: lower jaw
    f.append(row(19, SO, SB, SS, SB, SB, SO))  # 11

    # Row 12: bottom of head
    f.append(row(20, SO, SB, SB, SB, SO))  # 12

    # --- NECK rows 13-15 ---
    f.append(row(21, SS, SB, SB, SS))  # 13
    f.append(row(21, SS, SB, SB, SS))  # 14
    f.append(row(20, SS, SB, SB, SB, SS))  # 15

    # --- SHOULDERS & TORSO rows 16-28 (profile) ---
    # Profile torso is narrower — ~12px wide
    # Back arm slightly visible behind, front arm in front
    f.append(row(16, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO))  # 16 — shoulders

    # Row 17: upper torso + arms
    # Back arm behind (1px), torso, front arm in front
    f.append(row(14, SO, SB, SO,  O,  SO, SS, SB, SB, SB, SH, SB, SB, SS, SO,  O,  SO, SB, SO))  # 17

    f.append(row(14, SB, SS, SO,  O,  SO, SS, SB, SB, SH, SH, SB, SB, SS, SO,  O,  SO, SS, SB))  # 18

    f.append(row(14, SB, SO, SO,  O,  SO, SS, SB, SB, SB, SH, SB, SB, SS, SO,  O,  SO, SO, SB))  # 19

    f.append(row(14, SS, SB, SO,  O,  SO, SS, SB, SB, SB, SB, SB, SB, SS, SO,  O,  SO, SB, SS))  # 20

    f.append(row(14, SB, SS, SO,  O,  SO, SS, SB, SB, SB, SB, SB, SB, SS, SO,  O,  SO, SS, SB))  # 21

    f.append(row(15, SB, SO,  O,  SO, SS, SB, SB, SB, SB, SB, SB, SS, SO,  O,  SO, SB))  # 22

    f.append(row(15, SS, SO,  O,  SO, SS, SB, SB, SB, SB, SB, SB, SS, SO,  O,  SO, SS))  # 23

    f.append(row(15, SB, SO,  O,  SO, SS, SB, SB, SB, SB, SB, SB, SS, SO,  O,  SO, SB))  # 24

    f.append(row(16, SO,  O,  SO, SS, SB, SB, SB, SB, SB, SB, SS, SO,  O,  SO))  # 25

    f.append(row(16, SO,  O,  SO, SS, SB, SB, SB, SB, SB, SB, SS, SO,  O,  SO))  # 26

    f.append(row(17, SO, SO, SS, SB, SB, SB, SB, SB, SB, SS, SO, SO))  # 27

    f.append(row(18, SO, SS, SB, SB, SB, SB, SB, SB, SS, SO))  # 28

    # --- HANDS + LEG START rows 29-31 ---
    f.append(row(16, SB, SO,  O, SO, SS, SB, SB, SB, SB, SS, SO,  O, SO, SB))  # 29

    f.append(row(16, SO, SO,  O, SO, SB, SB, SB, SB, SB, SB, SO,  O, SO, SO))  # 30

    f.append(row(19, SO, SB, SB, SB, SB, SB, SB, SO))  # 31

    # --- LEGS rows 32-41 (profile — legs overlap, ~7px wide) ---
    f.append(row(19, SO, SB, SB, SB, SB, SB, SB, SO))  # 32

    f.append(row(19, SO, SB, SB, SS, SB, SB, SB, SO))  # 33

    f.append(row(19, SO, SB, SB, SS, SB, SB, SB, SO))  # 34

    f.append(row(19, SO, SB, SB, SS, SB, SB, SB, SO))  # 35

    f.append(row(19, SO, SB, SB, SS, SB, SB, SB, SO))  # 36

    f.append(row(19, SO, SB, SS, SS, SB, SB, SB, SO))  # 37

    f.append(row(19, SO, SB, SS, SS, SB, SB, SB, SO))  # 38

    f.append(row(19, SO, SB, SB, SS, SB, SB, SB, SO))  # 39

    f.append(row(19, SO, SB, SB, SB, SB, SB, SB, SO))  # 40

    f.append(row(19, SO, SB, SB, SB, SB, SB, SB, SO))  # 41

    # --- FEET rows 42-46 ---
    f.append(row(18, SO, SB, SB, SB, SB, SB, SB, SB, SO))  # 42

    f.append(row(18, SO, SB, SB, SB, SB, SB, SB, SB, SO))  # 43

    f.append(row(18, SO, SB, SB, SS, SB, SB, SB, SB, SO))  # 44

    f.append(row(18, SO, SS, SS, SS, SS, SS, SS, SS, SO))  # 45

    f.append(row(18, SO, SO, SO, SO, SO, SO, SO, SO, SO))  # 46

    # Row 47: bottom padding
    f.append(empty_row())  # 47

    return f


# ---------------------------------------------------------------------------
# UP-IDLE (back view)
# ---------------------------------------------------------------------------
def build_up_idle():
    """Captain Metz facing up (away from viewer), idle stance."""
    f = []

    # Row 0-1: top padding
    f.append(empty_row())  # 0
    f.append(empty_row())  # 1

    # --- HEAD rows 2-13: back of head — all hair ---
    f.append(row(20, HO, HB, HB, HB, HB, HB, HO))  # 2

    f.append(row(18, HO, HB, HS, HB, HB, HB, HB, HS, HB, HO))  # 3

    f.append(row(17, HO, HS, HB, HB, HB, HB, HB, HB, HB, HS, HO))  # 4

    f.append(row(17, HO, HB, HB, HH, HB, HB, HB, HH, HB, HB, HO))  # 5

    f.append(row(17, HO, HB, HB, HB, HS, HB, HS, HB, HB, HB, HO))  # 6

    f.append(row(17, HO, HB, HS, HB, HB, HB, HB, HB, HS, HB, HO))  # 7

    f.append(row(17, HO, HB, HB, HB, HB, HB, HB, HB, HB, HB, HO))  # 8

    f.append(row(17, HO, HB, HB, HS, HB, HB, HB, HS, HB, HB, HO))  # 9

    f.append(row(18, HO, HB, HB, HB, HB, HB, HB, HB, HO))  # 10

    f.append(row(19, HO, HB, HB, HS, HS, HB, HB, HO))  # 11

    f.append(row(20, HO, HO, HB, HB, HB, HO, HO))  # 12

    # --- NECK rows 13-15 ---
    f.append(row(22, SB, SS, SS, SB))  # 13
    f.append(row(22, SB, SS, SS, SB))  # 14
    f.append(row(21, SS, SB, SB, SB, SB, SS))  # 15

    # --- SHOULDERS & TORSO rows 16-28 (back view — same proportions as front, less detail) ---
    f.append(row(14, SO, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, SO))  # 16

    # Arms + torso — no chest highlights on back, just flat skin
    f.append(row(11, SS, SB, SO,  O,  SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO,  O,  SO, SB, SS))  # 17  -- 24 content

    f.append(row(11, SB, SB, SS,  O,  SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO,  O,  SS, SB, SB))  # 18

    f.append(row(11, SB, SS, SO,  O,  SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO,  O,  SO, SS, SB))  # 19

    f.append(row(11, SS, SB, SO,  O,  SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO,  O,  SO, SB, SS))  # 20

    f.append(row(11, SB, SS, SO,  O,  SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO,  O,  SO, SS, SB))  # 21

    f.append(row(12, SB, SO,  O,  SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO,  O,  SO, SB))  # 22

    f.append(row(12, SS, SO,  O,  SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO,  O,  SO, SS))  # 23

    f.append(row(12, SB, SO,  O,  SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO,  O,  SO, SB))  # 24

    f.append(row(13, SO,  O,  SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO,  O,  SO))  # 25

    f.append(row(13, SO,  O,  SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO,  O,  SO))  # 26

    f.append(row(14, SO, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO, SO))  # 27

    f.append(row(15, SO, SS, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SB, SS, SO))  # 28

    # --- HANDS + LEG START rows 29-31 ---
    f.append(row(13, SB, SO,  O, O, SO, SS, SB, SB, SB, SS, O, O, SS, SB, SB, SB, SS, SO,  O, O,  SO, SB))  # 29

    f.append(row(13, SO, SO,  O, O, SO, SB, SB, SB, SB, SO,  O, O,  SO, SB, SB, SB, SB, SO,  O, O,  SO, SO))  # 30

    f.append(row(17, SO, SB, SB, SB, SB, SO,  O, O,  SO, SB, SB, SB, SB, SO))  # 31

    # --- LEGS rows 32-41 ---
    f.append(row(17, SO, SB, SB, SB, SB, SO,  O, O,  SO, SB, SB, SB, SB, SO))  # 32

    f.append(row(17, SO, SB, SB, SB, SB, SO,  O, O,  SO, SB, SB, SB, SB, SO))  # 33

    f.append(row(17, SO, SB, SB, SS, SB, SO,  O, O,  SO, SB, SS, SB, SB, SO))  # 34

    f.append(row(17, SO, SB, SB, SS, SB, SO,  O, O,  SO, SB, SS, SB, SB, SO))  # 35

    f.append(row(17, SO, SB, SB, SS, SB, SO,  O, O,  SO, SB, SS, SB, SB, SO))  # 36

    f.append(row(17, SO, SB, SB, SS, SB, SO,  O, O,  SO, SB, SS, SB, SB, SO))  # 37

    f.append(row(17, SO, SB, SS, SS, SB, SO,  O, O,  SO, SB, SS, SS, SB, SO))  # 38

    f.append(row(17, SO, SB, SS, SS, SB, SO,  O, O,  SO, SB, SS, SS, SB, SO))  # 39

    f.append(row(17, SO, SB, SB, SS, SB, SO,  O, O,  SO, SB, SS, SB, SB, SO))  # 40

    f.append(row(17, SO, SB, SB, SB, SB, SO,  O, O,  SO, SB, SB, SB, SB, SO))  # 41

    # --- FEET rows 42-46 ---
    f.append(row(16, SO, SB, SB, SB, SB, SB, SO, O, O, SO, SB, SB, SB, SB, SB, SO))  # 42

    f.append(row(16, SO, SB, SB, SB, SB, SB, SO, O, O, SO, SB, SB, SB, SB, SB, SO))  # 43

    f.append(row(16, SO, SB, SB, SS, SB, SB, SO, O, O, SO, SB, SB, SS, SB, SB, SO))  # 44

    f.append(row(16, SO, SS, SS, SS, SS, SS, SO, O, O, SO, SS, SS, SS, SS, SS, SO))  # 45

    f.append(row(16, SO, SO, SO, SO, SO, SO, SO, O, O, SO, SO, SO, SO, SO, SO, SO))  # 46

    # Row 47: bottom padding
    f.append(empty_row())  # 47

    return f


# ---------------------------------------------------------------------------
# Walk frames — derived from idle by modifying legs, arms, and vertical bounce
# ---------------------------------------------------------------------------

def shift_up(frame, top_rows, bottom_rows):
    """Shift the upper body up by 1 row (walk bounce).

    Rows 0 through top_rows-1 get shifted up, row 0 becomes empty,
    and the freed row gets an empty row inserted.
    """
    f = copy.deepcopy(frame)
    # Shift rows 1..top_rows up by removing row 0 content
    # Row 0 is already empty (padding). We shift rows 2-top_rows up by 1.
    # Insert an empty row just before legs start to maintain 48 total.
    # Effectively: delete row 0, shift everything up, add empty row at bottom_rows
    f[0] = empty_row()  # stays empty
    # Shift rows 2 through top_rows up by 1: row[1] = old row[2], etc.
    for i in range(1, top_rows):
        f[i] = copy.deepcopy(frame[i + 1]) if (i + 1) <= top_rows else empty_row()
    f[top_rows] = empty_row()
    return f


def build_walk_1(idle_frame, direction):
    """Walk frame 1: left leg forward, right leg back, arms swapped.

    Body bounces up 1px. Upper body (rows 0-15) shifts up by 1 row.
    """
    f = copy.deepcopy(idle_frame)

    # --- Vertical bounce: shift upper body rows up by 1 ---
    # Save row 1 (will become row 0 content)
    # Move rows 2..15 up by 1, insert empty at row 15
    old = copy.deepcopy(f)
    f[1] = old[2]
    for i in range(2, 16):
        f[i] = old[i + 1] if i + 1 < len(old) else empty_row()
    f[15] = empty_row()  # freed row from shift

    if direction == "down":
        # --- Legs: left forward, right back ---
        # Left leg extends lower-left by 2-3px, right leg shortens
        # Rows 29-46: modify leg positions

        # Walk stride: left leg steps forward (lower & slightly left)
        # Right leg steps back (slightly higher)
        f[29] = row(15, SO, SS, SB, SB, SB, SS, O, O, O, O, SS, SB, SB, SB, SS, SO)
        f[30] = row(15, SO, SB, SB, SB, SB, SO, O, O, O, O, SO, SB, SB, SB, SO)     # right leg shortens (pulled up)
        f[31] = row(15, SO, SB, SB, SS, SB, SO, O, O, O, O, SO, SB, SB, SB, SO)
        f[32] = row(15, SO, SB, SB, SS, SB, SO, O, O, O, O, O, SO, SB, SO)
        f[33] = row(15, SO, SB, SB, SS, SB, SO, O, O, O, O, O, SO, SB, SO)
        f[34] = row(15, SO, SB, SB, SS, SB, SO, O, O, O, O, O, SO, SB, SO)
        f[35] = row(15, SO, SB, SB, SS, SB, SO)
        f[36] = row(15, SO, SB, SS, SS, SB, SO)
        f[37] = row(15, SO, SB, SS, SS, SB, SO)
        f[38] = row(15, SO, SB, SB, SS, SB, SO)
        f[39] = row(15, SO, SB, SB, SB, SB, SO)
        f[40] = row(15, SO, SB, SB, SB, SB, SO)
        f[41] = row(14, SO, SB, SB, SB, SB, SB, SO)
        f[42] = row(14, SO, SB, SB, SB, SB, SB, SO)
        f[43] = row(14, SO, SB, SB, SS, SB, SB, SO)
        f[44] = row(14, SO, SS, SS, SS, SS, SS, SO)
        f[45] = row(14, SO, SO, SO, SO, SO, SO, SO)
        f[46] = empty_row()

        # --- Arms: swap swing ---
        # Left arm swings back (smaller), right arm swings forward (longer)
        # Modify arm columns in rows 17-26 (shifted up by 1, so rows 16-25 now)
        # We simplify by modifying the visible arm rows
        # Row 16 (was 17): right arm extends further down
        # For simplicity, arm swing is subtle — just offset arm inner shadow
        # Left arm (back): slightly shorter / closer to body
        # Right arm (front): slightly extended

    elif direction == "left":
        # Profile walk: front leg extends forward, back leg extends back
        f[29] = row(17, SO, SB, SB, SB, SB, SB, SB, SO)
        f[30] = row(17, SO, SB, SB, SS, SB, SB, SB, SO)
        f[31] = row(16, SO, SB, SB, SS, SB, O, SB, SB, SO)
        f[32] = row(15, SO, SB, SB, SS, SB, O, O, SB, SB, SO)
        f[33] = row(15, SO, SB, SB, SS, SB, O, O, O, SB, SO)
        f[34] = row(15, SO, SB, SS, SB, SO, O, O, O, SB, SO)
        f[35] = row(15, SO, SB, SB, SB, SO, O, O, O, SO, SO)
        f[36] = row(15, SO, SB, SB, SB, SO)
        f[37] = row(14, SO, SB, SB, SS, SB, SO)
        f[38] = row(14, SO, SB, SB, SS, SB, SO)
        f[39] = row(14, SO, SB, SB, SB, SB, SO)
        f[40] = row(13, SO, SB, SB, SB, SB, SB, SO)
        f[41] = row(13, SO, SB, SB, SB, SB, SB, SO)
        f[42] = row(13, SO, SB, SB, SS, SB, SB, SO)
        f[43] = row(13, SO, SS, SS, SS, SS, SS, SO)
        f[44] = row(13, SO, SO, SO, SO, SO, SO, SO)
        f[45] = empty_row()
        f[46] = empty_row()

    elif direction == "up":
        # Same as down walk structure but back view
        f[29] = row(15, SO, SS, SB, SB, SB, SS, O, O, O, O, SS, SB, SB, SB, SS, SO)
        f[30] = row(15, SO, SB, SB, SB, SB, SO, O, O, O, O, SO, SB, SB, SB, SO)
        f[31] = row(15, SO, SB, SB, SS, SB, SO, O, O, O, O, SO, SB, SB, SB, SO)
        f[32] = row(15, SO, SB, SB, SS, SB, SO, O, O, O, O, O, SO, SB, SO)
        f[33] = row(15, SO, SB, SB, SS, SB, SO, O, O, O, O, O, SO, SB, SO)
        f[34] = row(15, SO, SB, SB, SS, SB, SO, O, O, O, O, O, SO, SB, SO)
        f[35] = row(15, SO, SB, SB, SS, SB, SO)
        f[36] = row(15, SO, SB, SS, SS, SB, SO)
        f[37] = row(15, SO, SB, SS, SS, SB, SO)
        f[38] = row(15, SO, SB, SB, SS, SB, SO)
        f[39] = row(15, SO, SB, SB, SB, SB, SO)
        f[40] = row(15, SO, SB, SB, SB, SB, SO)
        f[41] = row(14, SO, SB, SB, SB, SB, SB, SO)
        f[42] = row(14, SO, SB, SB, SB, SB, SB, SO)
        f[43] = row(14, SO, SB, SB, SS, SB, SB, SO)
        f[44] = row(14, SO, SS, SS, SS, SS, SS, SO)
        f[45] = row(14, SO, SO, SO, SO, SO, SO, SO)
        f[46] = empty_row()

    return f


def build_walk_2(idle_frame, direction):
    """Walk frame 2: mirror of walk_1 — right leg forward, left leg back."""
    f = copy.deepcopy(idle_frame)

    # --- Vertical bounce: shift upper body rows up by 1 ---
    old = copy.deepcopy(f)
    f[1] = old[2]
    for i in range(2, 16):
        f[i] = old[i + 1] if i + 1 < len(old) else empty_row()
    f[15] = empty_row()

    if direction == "down":
        # Mirror of walk_1: right leg forward, left leg back
        f[29] = row(15, SS, SB, SB, SB, SS, O, O, O, O, SS, SB, SB, SB, SS, SO)
        f[30] = row(17, SO, SB, SB, SB, SO, O, O, O, O, SO, SB, SB, SB, SB, SO)
        f[31] = row(17, SO, SB, SB, SB, SO, O, O, O, O, SO, SB, SS, SB, SB, SO)
        f[32] = row(18, SO, SB, SO, O, O, O, O, SO, SB, SS, SB, SB, SO)
        f[33] = row(18, SO, SB, SO, O, O, O, O, SO, SB, SS, SB, SB, SO)
        f[34] = row(18, SO, SB, SO, O, O, O, O, SO, SB, SS, SB, SB, SO)
        f[35] = row(27, SO, SB, SS, SB, SB, SO)
        f[36] = row(27, SO, SB, SS, SS, SB, SO)
        f[37] = row(27, SO, SB, SS, SS, SB, SO)
        f[38] = row(27, SO, SB, SS, SB, SB, SO)
        f[39] = row(27, SO, SB, SB, SB, SB, SO)
        f[40] = row(27, SO, SB, SB, SB, SB, SO)
        f[41] = row(26, SO, SB, SB, SB, SB, SB, SO)
        f[42] = row(26, SO, SB, SB, SB, SB, SB, SO)
        f[43] = row(26, SO, SB, SB, SS, SB, SB, SO)
        f[44] = row(26, SO, SS, SS, SS, SS, SS, SO)
        f[45] = row(26, SO, SO, SO, SO, SO, SO, SO)
        f[46] = empty_row()

    elif direction == "left":
        # Profile walk_2: back leg forward, front leg back (opposite of walk_1)
        f[29] = row(19, SO, SB, SB, SB, SB, SB, SB, SO)
        f[30] = row(19, SO, SB, SB, SS, SB, SB, SB, SO)
        f[31] = row(19, SO, SB, SB, SS, SB, O, SB, SB, SO)
        f[32] = row(19, SO, SB, SB, SS, SO, O, O, SB, SB, SO)
        f[33] = row(20, SO, SB, SS, SO, O, O, O, SB, SO)
        f[34] = row(20, SO, SB, SO, O, O, O, O, SB, SO)
        f[35] = row(21, SO, SO, O, O, O, O, SO, SB, SO)
        f[36] = row(27, SO, SB, SB, SO)
        f[37] = row(26, SO, SB, SB, SS, SB, SO)
        f[38] = row(26, SO, SB, SB, SS, SB, SO)
        f[39] = row(26, SO, SB, SB, SB, SB, SO)
        f[40] = row(25, SO, SB, SB, SB, SB, SB, SO)
        f[41] = row(25, SO, SB, SB, SB, SB, SB, SO)
        f[42] = row(25, SO, SB, SB, SS, SB, SB, SO)
        f[43] = row(25, SO, SS, SS, SS, SS, SS, SO)
        f[44] = row(25, SO, SO, SO, SO, SO, SO, SO)
        f[45] = empty_row()
        f[46] = empty_row()

    elif direction == "up":
        # Mirror of walk_1 up
        f[29] = row(15, SS, SB, SB, SB, SS, O, O, O, O, SS, SB, SB, SB, SS, SO)
        f[30] = row(17, SO, SB, SB, SB, SO, O, O, O, O, SO, SB, SB, SB, SB, SO)
        f[31] = row(17, SO, SB, SB, SB, SO, O, O, O, O, SO, SB, SS, SB, SB, SO)
        f[32] = row(18, SO, SB, SO, O, O, O, O, SO, SB, SS, SB, SB, SO)
        f[33] = row(18, SO, SB, SO, O, O, O, O, SO, SB, SS, SB, SB, SO)
        f[34] = row(18, SO, SB, SO, O, O, O, O, SO, SB, SS, SB, SB, SO)
        f[35] = row(27, SO, SB, SS, SB, SB, SO)
        f[36] = row(27, SO, SB, SS, SS, SB, SO)
        f[37] = row(27, SO, SB, SS, SS, SB, SO)
        f[38] = row(27, SO, SB, SS, SB, SB, SO)
        f[39] = row(27, SO, SB, SB, SB, SB, SO)
        f[40] = row(27, SO, SB, SB, SB, SB, SO)
        f[41] = row(26, SO, SB, SB, SB, SB, SB, SO)
        f[42] = row(26, SO, SB, SB, SB, SB, SB, SO)
        f[43] = row(26, SO, SB, SB, SS, SB, SB, SO)
        f[44] = row(26, SO, SS, SS, SS, SS, SS, SO)
        f[45] = row(26, SO, SO, SO, SO, SO, SO, SO)
        f[46] = empty_row()

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
    # Map palette keys to single characters
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
        "beard.highlight":"l",
        "eyes.white":    "W",
        "eyes.iris":     "I",
        "eyes.pupil":    "P",
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
    print("Generating Captain Metz base body template (48x48)...")
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

    # ASCII visualization of down-idle
    ascii_viz(down_idle, "DOWN-IDLE (front-facing)")

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
