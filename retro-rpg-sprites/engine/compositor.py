#!/usr/bin/env python3
"""
Retro RPG Sprite Compositor Engine

A JSON-driven pixel art sprite compositor that layers body, clothing, hair,
and accessory templates with configurable palettes to produce composite
sprite sheets for retro RPG characters.

Usage:
    python compositor.py --npc path/to/npc.json [--base-dir ...] [--output ...] [--scale N]
"""

import argparse
import json
import sys
from pathlib import Path

from PIL import Image


# ---------------------------------------------------------------------------
# Palette loading
# ---------------------------------------------------------------------------

def load_palette(palette_id, base_dir):
    """Search all JSON files in palettes/ dir, return the colors dict for *palette_id*.

    Parameters
    ----------
    palette_id : str
        The ``palette_id`` value to match inside the palette JSON arrays.
    base_dir : str | Path
        Root directory of the retro-rpg-sprites project (contains ``palettes/``).

    Returns
    -------
    dict
        Mapping of palette key strings (e.g. ``"base"``, ``"shadow"``) to hex
        colour strings (e.g. ``"#F5D6B8"``).

    Raises
    ------
    FileNotFoundError
        If no palette with the given id is found.
    """
    palettes_dir = Path(base_dir) / "palettes"
    if not palettes_dir.is_dir():
        raise FileNotFoundError(f"Palettes directory not found: {palettes_dir}")

    for json_file in sorted(palettes_dir.glob("*.json")):
        with open(json_file, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        # Each palette file is an array of palette objects.
        if not isinstance(data, list):
            continue
        for entry in data:
            if entry.get("palette_id") == palette_id:
                return entry["colors"]

    raise FileNotFoundError(
        f"Palette '{palette_id}' not found in {palettes_dir}"
    )


# ---------------------------------------------------------------------------
# Template loading
# ---------------------------------------------------------------------------

_TEMPLATE_SUBDIRS = ("bodies", "clothing", "hair", "accessories")


def load_template(template_id, base_dir):
    """Search all JSON files in templates/ subdirs, return the full template dict.

    Parameters
    ----------
    template_id : str
        The ``template_id`` value to match.
    base_dir : str | Path
        Root directory of the retro-rpg-sprites project (contains ``templates/``).

    Returns
    -------
    dict
        The complete template dictionary (with ``directions``, ``size``, etc.).

    Raises
    ------
    FileNotFoundError
        If no template with the given id is found.
    """
    templates_dir = Path(base_dir) / "templates"
    if not templates_dir.is_dir():
        raise FileNotFoundError(f"Templates directory not found: {templates_dir}")

    for subdir in _TEMPLATE_SUBDIRS:
        sub_path = templates_dir / subdir
        if not sub_path.is_dir():
            continue
        for json_file in sorted(sub_path.glob("*.json")):
            with open(json_file, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            if data.get("template_id") == template_id:
                return data

    raise FileNotFoundError(
        f"Template '{template_id}' not found under {templates_dir}"
    )


# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------

def hex_to_rgba(hex_str):
    """Convert a ``#RRGGBB`` hex string to an (R, G, B, 255) tuple.

    Parameters
    ----------
    hex_str : str
        A colour in ``#RRGGBB`` format.

    Returns
    -------
    tuple[int, int, int, int]
    """
    hex_str = hex_str.lstrip("#")
    r = int(hex_str[0:2], 16)
    g = int(hex_str[2:4], 16)
    b = int(hex_str[4:6], 16)
    return (r, g, b, 255)


# ---------------------------------------------------------------------------
# Frame rendering
# ---------------------------------------------------------------------------

TRANSPARENT = (0, 0, 0, 0)


def render_frame(template, palette_colors, direction, frame_name):
    """Render a single frame of a template layer as a flat list of RGBA tuples.

    Parameters
    ----------
    template : dict
        A loaded template dictionary.
    palette_colors : dict
        Mapping of palette key strings to ``#RRGGBB`` hex values.
    direction : str
        One of ``"down"``, ``"left"``, ``"right"``, ``"up"``.
    frame_name : str
        The animation frame key, e.g. ``"idle"``, ``"walk_1"``, ``"walk_2"``.

    Returns
    -------
    list[tuple[int, int, int, int]]
        A flat list of length ``width * height`` containing RGBA tuples.
        Pixel order is row-major (top-left to bottom-right).
    """
    if "size" in template:
        width, height = template["size"]
    elif "dimensions" in template:
        width = template["dimensions"]["width"]
        height = template["dimensions"]["height"]
    else:
        width, height = 16, 24  # default
    mirror = False

    # Determine the source direction for pixel data.
    if direction == "right" and template.get("mirror_right_from_left", False):
        source_direction = "left"
        mirror = True
    else:
        source_direction = direction

    directions = template.get("directions", {})
    if source_direction not in directions:
        # Direction not defined -- return a fully transparent frame.
        return [TRANSPARENT] * (width * height)

    frames = directions[source_direction]
    if frame_name not in frames:
        return [TRANSPARENT] * (width * height)

    pixel_grid = frames[frame_name]  # list of rows, each row is list of values

    # Build a colour lookup cache so we only convert hex once per key.
    colour_cache = {}

    pixels = []
    for row in pixel_grid:
        row_pixels = []
        for value in row:
            if value == 0 or value == "0":
                row_pixels.append(TRANSPARENT)
            else:
                if value not in colour_cache:
                    hex_colour = palette_colors.get(value)
                    if hex_colour is None:
                        # Unknown palette key -- treat as transparent.
                        colour_cache[value] = TRANSPARENT
                    else:
                        colour_cache[value] = hex_to_rgba(hex_colour)
                row_pixels.append(colour_cache[value])

        # Pad or trim row to expected width.
        if len(row_pixels) < width:
            row_pixels.extend([TRANSPARENT] * (width - len(row_pixels)))
        elif len(row_pixels) > width:
            row_pixels = row_pixels[:width]

        if mirror:
            row_pixels = row_pixels[::-1]

        pixels.extend(row_pixels)

    # Pad remaining rows if the grid was shorter than expected.
    total = width * height
    if len(pixels) < total:
        pixels.extend([TRANSPARENT] * (total - len(pixels)))

    return pixels[:total]


# ---------------------------------------------------------------------------
# NPC compositing
# ---------------------------------------------------------------------------

_DIRECTION_ORDER = ("down", "left", "right", "up")


def composite_npc(npc_def, base_dir):
    """Composite all layers of an NPC definition into per-direction frame lists.

    Parameters
    ----------
    npc_def : dict
        A loaded NPC JSON definition.
    base_dir : str | Path
        Root directory of the retro-rpg-sprites project.

    Returns
    -------
    dict[str, list[PIL.Image.Image]]
        Keys are directions (``"down"``, ``"left"``, ``"right"``, ``"up"``),
        values are lists of composite RGBA ``Image`` objects (one per walk-cycle
        frame).
    """
    width, height = npc_def.get("sprite_size", [16, 24])

    # Sort layers by z_order (lowest first = drawn first / furthest back).
    layers = sorted(npc_def["layers"], key=lambda l: l.get("z_order", 0))

    # Pre-load all templates and palettes so we only hit disk once per layer.
    layer_data = []
    for layer in layers:
        tmpl = load_template(layer["template"], base_dir)
        palette = load_palette(layer["palette"], base_dir)
        layer_data.append((tmpl, palette))

    # Determine the walk cycle from the first template (body), falling back to
    # a sensible default.
    walk_cycle = None
    for tmpl, _ in layer_data:
        if "walk_cycle" in tmpl:
            walk_cycle = tmpl["walk_cycle"]
            break
    if walk_cycle is None:
        walk_cycle = ["idle", "walk_1", "idle", "walk_2"]

    frames_dict = {}

    for direction in _DIRECTION_ORDER:
        direction_frames = []

        for frame_name in walk_cycle:
            # Start with a blank RGBA canvas.
            composite = Image.new("RGBA", (width, height), (0, 0, 0, 0))

            for (tmpl, palette) in layer_data:
                pixel_data = render_frame(tmpl, palette, direction, frame_name)

                # Create an image from the pixel data for this layer.
                layer_img = Image.new("RGBA", (width, height))
                layer_img.putdata(pixel_data)

                # Composite: only overwrite where the layer pixel is not
                # fully transparent.  PIL's alpha_composite handles this
                # correctly when both images are RGBA.
                composite = Image.alpha_composite(composite, layer_img)

            direction_frames.append(composite)

        frames_dict[direction] = direction_frames

    return frames_dict


# ---------------------------------------------------------------------------
# Sprite sheet export
# ---------------------------------------------------------------------------

def export_spritesheet(frames_dict, output_path, scale=1):
    """Export composited frames as a single sprite sheet PNG.

    Layout: 4 columns (walk cycle frames) x 4 rows (down, left, right, up).

    Parameters
    ----------
    frames_dict : dict[str, list[Image]]
        Output of :func:`composite_npc`.
    output_path : str | Path
        Destination file path for the PNG.
    scale : int
        Integer upscale factor.  Uses nearest-neighbour interpolation.
    """
    # Derive frame dimensions from the first available frame.
    sample = next(iter(frames_dict.values()))[0]
    frame_w, frame_h = sample.size

    cols = max(len(frames) for frames in frames_dict.values())  # walk cycle length
    rows = len(_DIRECTION_ORDER)  # 4 directions

    sheet_w = frame_w * cols
    sheet_h = frame_h * rows
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))

    for row_idx, direction in enumerate(_DIRECTION_ORDER):
        frames = frames_dict.get(direction, [])
        for col_idx, frame in enumerate(frames):
            x = col_idx * frame_w
            y = row_idx * frame_h
            sheet.paste(frame, (x, y))

    # Upscale if requested.
    if scale > 1:
        new_size = (sheet_w * scale, sheet_h * scale)
        sheet = sheet.resize(new_size, Image.NEAREST)

    # Ensure output directory exists.
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    sheet.save(str(output_path), "PNG")
    print(f"Saved spritesheet to {output_path} "
          f"({sheet.width}x{sheet.height}, scale={scale})")


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main():
    """Command-line interface for the sprite compositor."""
    parser = argparse.ArgumentParser(
        description="Composite retro RPG sprite sheets from JSON templates."
    )
    parser.add_argument(
        "--npc",
        required=True,
        help="Path to the NPC JSON definition file.",
    )
    parser.add_argument(
        "--base-dir",
        default=None,
        help=(
            "Base directory containing templates/ and palettes/ dirs. "
            "Defaults to the parent of the engine/ directory."
        ),
    )
    parser.add_argument(
        "--output",
        default=None,
        help=(
            "Output PNG path. Defaults to output/<npc_id>_spritesheet.png "
            "relative to --base-dir."
        ),
    )
    parser.add_argument(
        "--scale",
        type=int,
        default=1,
        help="Integer scale factor for the output (default: 1).",
    )

    args = parser.parse_args()

    # Resolve base directory.
    if args.base_dir:
        base_dir = Path(args.base_dir).resolve()
    else:
        # Default: parent of the engine/ directory this script lives in.
        base_dir = Path(__file__).resolve().parent.parent

    # Load NPC definition.
    npc_path = Path(args.npc).resolve()
    if not npc_path.is_file():
        print(f"Error: NPC file not found: {npc_path}", file=sys.stderr)
        sys.exit(1)

    with open(npc_path, "r", encoding="utf-8") as fh:
        npc_def = json.load(fh)

    npc_id = npc_def.get("npc_id", "unknown_npc")
    print(f"Compositing NPC: {npc_id}")

    # Composite all frames.
    frames_dict = composite_npc(npc_def, base_dir)

    # Determine output path.
    if args.output:
        output_path = Path(args.output).resolve()
    else:
        output_path = base_dir / "output" / f"{npc_id}_spritesheet.png"

    # Export.
    export_spritesheet(frames_dict, output_path, scale=args.scale)
    print("Done.")


if __name__ == "__main__":
    main()
