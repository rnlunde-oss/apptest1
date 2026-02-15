#!/usr/bin/env python3
"""
Metz Sprite Engine — Compositor

An enhanced JSON-driven pixel art sprite compositor for Captain Metz's
multi-layer equipment system.  Differs from the simpler retro-rpg-sprites
compositor in three key ways:

1. **Master Palette with dot-notation** — One master palette where template
   pixel values use keys like ``"steel_armor.highlight"`` that resolve to
   ``palette["steel_armor"]["highlight"]``.

2. **Direction-aware z-ordering** — Each template may define
   ``z_order_override`` per direction so layers reorder themselves when the
   character turns (e.g. a cape behind the body when facing down, over the
   body when facing up).

3. **Loadout-based rendering** — Instead of an NPC JSON with pre-defined
   layers, the compositor takes a *loadout* config listing body + equipment
   template IDs and resolves them at composite time.

Usage:
    python compositor.py --loadout config/loadout_act1_start.json [--base-dir ..] [--output ..] [--scale N]
"""

import argparse
import json
import sys
from pathlib import Path

from PIL import Image


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_DIRECTION_ORDER = ("down", "left", "right", "up")

TRANSPARENT = (0, 0, 0, 0)

# Subdirectories searched (in order) when resolving a template_id.
_TEMPLATE_SUBDIRS = (
    "templates/body",
    "templates/equipment/armor",
    "templates/equipment/weapons",
    "templates/equipment/accessories",
)


# ---------------------------------------------------------------------------
# Master palette loading
# ---------------------------------------------------------------------------

def load_master_palette(base_dir):
    """Load the master palette from ``palettes/metz_master_palette.json``.

    Parameters
    ----------
    base_dir : str | Path
        Root directory of the metz-sprite-engine project.

    Returns
    -------
    dict
        The parsed master palette dictionary.  Top-level keys are colour
        groups (e.g. ``"steel_armor"``), each mapping to a dict of shade
        names to hex colour strings.

    Raises
    ------
    FileNotFoundError
        If the master palette file does not exist.
    """
    palette_path = Path(base_dir) / "palettes" / "metz_master_palette.json"
    if not palette_path.is_file():
        raise FileNotFoundError(f"Master palette not found: {palette_path}")

    with open(palette_path, "r", encoding="utf-8") as fh:
        data = json.load(fh)

    return data


# ---------------------------------------------------------------------------
# Dot-notation colour resolution
# ---------------------------------------------------------------------------

def resolve_color(palette, dot_key):
    """Resolve a dot-notation palette key to a hex colour string.

    For example, ``"steel_armor.highlight"`` splits into
    ``palette["steel_armor"]["highlight"]``.

    Parameters
    ----------
    palette : dict
        The loaded master palette dictionary.
    dot_key : str
        A key in ``"group.shade"`` dot-notation.

    Returns
    -------
    str | None
        A ``#RRGGBB`` hex colour string, or ``None`` if the key cannot be
        resolved (missing group or shade).
    """
    parts = dot_key.split(".")
    current = palette
    for part in parts:
        if not isinstance(current, dict) or part not in current:
            return None
        current = current[part]

    # ``current`` should now be a hex string.
    if isinstance(current, str):
        return current
    return None


# ---------------------------------------------------------------------------
# Template loading
# ---------------------------------------------------------------------------

def load_template(template_id, base_dir):
    """Search template subdirectories for a JSON file whose ``template_id``
    matches the requested identifier.

    The following directories are searched under *base_dir*:

    * ``templates/body/``
    * ``templates/equipment/armor/``
    * ``templates/equipment/weapons/``
    * ``templates/equipment/accessories/``

    Parameters
    ----------
    template_id : str
        The ``template_id`` value to match inside a template JSON file.
    base_dir : str | Path
        Root directory of the metz-sprite-engine project.

    Returns
    -------
    dict
        The complete template dictionary (with ``directions``, ``size``,
        ``z_order``, etc.).

    Raises
    ------
    FileNotFoundError
        If no matching template is found.
    """
    base = Path(base_dir)

    for subdir in _TEMPLATE_SUBDIRS:
        search_path = base / subdir
        if not search_path.is_dir():
            continue
        for json_file in sorted(search_path.glob("*.json")):
            with open(json_file, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            if data.get("template_id") == template_id:
                return data

    raise FileNotFoundError(
        f"Template '{template_id}' not found under {base / 'templates'}"
    )


# ---------------------------------------------------------------------------
# Direction-aware z-order
# ---------------------------------------------------------------------------

def get_z_order(template, direction):
    """Return the effective z-order for *template* in a given *direction*.

    If the template defines a ``z_order_override`` dict that contains the
    requested direction, that value takes priority.  Otherwise the base
    ``z_order`` field is returned (defaulting to ``0``).

    Parameters
    ----------
    template : dict
        A loaded template dictionary.
    direction : str
        One of ``"down"``, ``"left"``, ``"right"``, ``"up"``.

    Returns
    -------
    int
        The z-order value for compositing (lower = further back).
    """
    overrides = template.get("z_order_override", {})
    if direction in overrides:
        return overrides[direction]
    return template.get("z_order", 0)


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

def render_frame(template, palette, direction, frame_name):
    """Render a single frame of a template layer as a flat RGBA pixel list.

    Pixel values in the template's grid are dot-notation palette keys
    (e.g. ``"steel_armor.base"``).  These are resolved against the master
    palette via :func:`resolve_color`.

    When *direction* is ``"right"`` and the template sets
    ``mirror_right_from_left`` to ``True``, the ``"left"`` frame data is
    loaded and horizontally flipped.

    Parameters
    ----------
    template : dict
        A loaded template dictionary.
    palette : dict
        The master palette dictionary.
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
    # Determine frame dimensions.
    if "size" in template:
        width, height = template["size"]
    elif "dimensions" in template:
        width = template["dimensions"]["width"]
        height = template["dimensions"]["height"]
    else:
        width, height = 48, 48  # Metz default

    mirror = False

    # Determine the source direction for pixel data.
    if direction == "right" and template.get("mirror_right_from_left", False):
        source_direction = "left"
        mirror = True
    else:
        source_direction = direction

    directions = template.get("directions", {})
    if source_direction not in directions:
        return [TRANSPARENT] * (width * height)

    frames = directions[source_direction]
    if frame_name not in frames:
        return [TRANSPARENT] * (width * height)

    pixel_grid = frames[frame_name]  # list of rows, each row is list of values

    # Build a colour lookup cache so we only resolve once per key.
    colour_cache = {}

    pixels = []
    for row in pixel_grid:
        row_pixels = []
        for value in row:
            if value == 0 or value == "0" or value is None:
                row_pixels.append(TRANSPARENT)
            else:
                str_value = str(value)
                if str_value not in colour_cache:
                    hex_colour = resolve_color(palette, str_value)
                    if hex_colour is None:
                        colour_cache[str_value] = TRANSPARENT
                    else:
                        colour_cache[str_value] = hex_to_rgba(hex_colour)
                row_pixels.append(colour_cache[str_value])

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
# Loadout compositing
# ---------------------------------------------------------------------------

def composite_loadout(loadout, base_dir):
    """Composite all layers of a loadout definition into per-direction frame
    lists with direction-aware z-ordering.

    Parameters
    ----------
    loadout : dict
        A loaded loadout JSON definition.  Must contain ``"body"`` (a single
        template ID string) and ``"equipment"`` (a list of template ID
        strings).
    base_dir : str | Path
        Root directory of the metz-sprite-engine project.

    Returns
    -------
    dict[str, list[PIL.Image.Image]]
        Keys are directions (``"down"``, ``"left"``, ``"right"``, ``"up"``),
        values are lists of composite RGBA ``Image`` objects (one per
        walk-cycle frame).
    """
    palette = load_master_palette(base_dir)

    # Load body template.
    body_id = loadout["body"]
    body_template = load_template(body_id, base_dir)

    # Load all equipment templates.
    equipment_templates = []
    for equip_id in loadout.get("equipment", []):
        try:
            tmpl = load_template(equip_id, base_dir)
            equipment_templates.append(tmpl)
        except FileNotFoundError:
            print(f"Warning: Equipment template '{equip_id}' not found, skipping.")

    # All templates (body first, then equipment).
    all_templates = [body_template] + equipment_templates

    # Determine the walk cycle from the body template, falling back to a
    # sensible default.
    walk_cycle = body_template.get("walk_cycle", None)
    if walk_cycle is None:
        walk_cycle = ["idle", "walk_1", "idle", "walk_2"]

    # Determine frame dimensions from the body template.
    if "size" in body_template:
        width, height = body_template["size"]
    elif "dimensions" in body_template:
        width = body_template["dimensions"]["width"]
        height = body_template["dimensions"]["height"]
    else:
        width, height = 48, 48

    frames_dict = {}

    for direction in _DIRECTION_ORDER:
        direction_frames = []

        # Resolve z-order for this direction and sort ascending.
        sorted_templates = sorted(
            all_templates,
            key=lambda t: get_z_order(t, direction)
        )

        for frame_name in walk_cycle:
            # Start with a blank RGBA canvas.
            composite = Image.new("RGBA", (width, height), (0, 0, 0, 0))

            for tmpl in sorted_templates:
                pixel_data = render_frame(tmpl, palette, direction, frame_name)

                # Create an image from the pixel data for this layer.
                layer_img = Image.new("RGBA", (width, height))
                layer_img.putdata(pixel_data)

                # Alpha composite: layers with higher z-order paint on top.
                composite = Image.alpha_composite(composite, layer_img)

            direction_frames.append(composite)

        frames_dict[direction] = direction_frames

    return frames_dict


# ---------------------------------------------------------------------------
# Single-layer rendering (for paper-doll / isolation views)
# ---------------------------------------------------------------------------

def render_single_layer(template, base_dir, direction="down", frame_name="idle"):
    """Render a single equipment template in isolation.

    This is a convenience wrapper used by the paper-doll exporter to show
    each layer on its own.

    Parameters
    ----------
    template : dict
        A loaded template dictionary.
    base_dir : str | Path
        Root directory of the metz-sprite-engine project (for palette loading).
    direction : str
        Direction to render (default ``"down"``).
    frame_name : str
        Frame to render (default ``"idle"``).

    Returns
    -------
    PIL.Image.Image
        A single RGBA image of the layer.
    """
    palette = load_master_palette(base_dir)

    if "size" in template:
        width, height = template["size"]
    elif "dimensions" in template:
        width = template["dimensions"]["width"]
        height = template["dimensions"]["height"]
    else:
        width, height = 48, 48

    pixel_data = render_frame(template, palette, direction, frame_name)
    img = Image.new("RGBA", (width, height))
    img.putdata(pixel_data)
    return img


# ---------------------------------------------------------------------------
# Sprite sheet export
# ---------------------------------------------------------------------------

def export_spritesheet(frames_dict, output_path, scale=1):
    """Export composited frames as a single sprite sheet PNG.

    Layout: 4 columns (walk cycle frames) x 4 rows (down, left, right, up).
    Uses nearest-neighbour interpolation for pixel-art clarity when scaling.

    Parameters
    ----------
    frames_dict : dict[str, list[Image]]
        Output of :func:`composite_loadout`.
    output_path : str | Path
        Destination file path for the PNG.
    scale : int
        Integer upscale factor (default 1).
    """
    # Derive frame dimensions from the first available frame.
    sample = next(iter(frames_dict.values()))[0]
    frame_w, frame_h = sample.size

    cols = max(len(frames) for frames in frames_dict.values())
    rows = len(_DIRECTION_ORDER)

    sheet_w = frame_w * cols
    sheet_h = frame_h * rows
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))

    for row_idx, direction in enumerate(_DIRECTION_ORDER):
        frames = frames_dict.get(direction, [])
        for col_idx, frame in enumerate(frames):
            x = col_idx * frame_w
            y = row_idx * frame_h
            sheet.paste(frame, (x, y))

    # Upscale if requested (nearest-neighbour preserves pixel art).
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
    """Command-line interface for the Metz sprite compositor."""
    parser = argparse.ArgumentParser(
        description="Composite Metz sprite sheets from loadout configs."
    )
    parser.add_argument(
        "--loadout",
        required=True,
        help="Path to the loadout JSON definition file.",
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
            "Output PNG path. Defaults to "
            "output/sheets/<loadout_id>_spritesheet.png relative to --base-dir."
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

    # Load loadout definition.
    loadout_path = Path(args.loadout).resolve()
    if not loadout_path.is_file():
        print(f"Error: Loadout file not found: {loadout_path}", file=sys.stderr)
        sys.exit(1)

    with open(loadout_path, "r", encoding="utf-8") as fh:
        loadout = json.load(fh)

    loadout_id = loadout.get("loadout_id", "unknown_loadout")
    print(f"Compositing loadout: {loadout_id}")
    if loadout.get("display_name"):
        print(f"  {loadout['display_name']}")

    # Composite all frames.
    frames_dict = composite_loadout(loadout, base_dir)

    # Report frame counts.
    for direction, frames in frames_dict.items():
        print(f"  {direction}: {len(frames)} frame(s)")

    # Determine output path.
    if args.output:
        output_path = Path(args.output).resolve()
    else:
        output_path = base_dir / "output" / "sheets" / f"{loadout_id}_spritesheet.png"

    # Export.
    export_spritesheet(frames_dict, output_path, scale=args.scale)
    print("Done.")


if __name__ == "__main__":
    main()
