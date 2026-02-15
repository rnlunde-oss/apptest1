#!/usr/bin/env python3
"""
Sheet exporter for retro RPG sprite engine.

Provides advanced sprite sheet export options beyond basic compositor output:
- Animated GIF previews per direction
- Contact sheets with labeled frames
- Scaled-up nearest-neighbor output for pixel art clarity

Usage:
    python -m engine.sheet_exporter --input npcs/villager_elara.json --all
    python sheet_exporter.py --input ../npcs/villager_elara.json --gif --scale 4
"""

import argparse
import json
import os
import sys

from PIL import Image, ImageDraw

try:
    from PIL import ImageFont
    _HAS_FONT = True
except ImportError:
    _HAS_FONT = False

# Handle imports for both package and standalone usage
try:
    from . import compositor
except ImportError:
    try:
        import compositor
    except ImportError:
        compositor = None


DIRECTIONS = ["down", "left", "up", "right"]
FRAME_NAMES = ["idle", "walk_1", "idle", "walk_2"]


def create_animation_preview(frames_dict, direction, output_path, scale=4, fps=8):
    """
    Create an animated GIF preview for a single direction.

    Args:
        frames_dict: Dict of direction -> list of PIL Images (one per animation frame).
                     Each image is the raw pixel-art size (e.g. 16x24).
        direction:   One of 'down', 'left', 'up', 'right'.
        output_path: File path to save the animated GIF.
        scale:       Integer scale factor for nearest-neighbor upscaling (default 4).
        fps:         Frames per second for the animation (default 8).

    Returns:
        The output path on success, or None if direction is not in frames_dict.
    """
    if direction not in frames_dict:
        print(f"Warning: Direction '{direction}' not found in frames dict")
        return None

    frames = frames_dict[direction]
    if not frames:
        print(f"Warning: No frames for direction '{direction}'")
        return None

    # Scale up each frame with nearest-neighbor interpolation
    scaled_frames = []
    for frame in frames:
        w, h = frame.size
        scaled = frame.resize(
            (w * scale, h * scale),
            Image.NEAREST
        )
        scaled_frames.append(scaled)

    # Calculate frame duration in milliseconds
    duration_ms = int(1000 / fps)

    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)

    # Save as animated GIF
    # First frame is saved, rest are appended
    scaled_frames[0].save(
        output_path,
        save_all=True,
        append_images=scaled_frames[1:] if len(scaled_frames) > 1 else [],
        duration=duration_ms,
        loop=0,  # 0 = infinite loop
        disposal=2,  # Clear frame before drawing next
        transparency=0,
        optimize=False
    )

    print(f"  Saved animation: {output_path} ({len(scaled_frames)} frames, {fps} fps)")
    return output_path


def create_all_previews(frames_dict, output_dir, npc_id, scale=4, fps=8):
    """
    Create animated GIF previews for all 4 directions.

    Args:
        frames_dict: Dict of direction -> list of PIL Images.
        output_dir:  Directory where GIFs will be saved.
        npc_id:      NPC identifier used in filenames.
        scale:       Integer scale factor (default 4).
        fps:         Frames per second (default 8).

    Returns:
        List of output file paths that were successfully created.
    """
    os.makedirs(output_dir, exist_ok=True)
    created = []

    print(f"Creating animation previews for '{npc_id}'...")

    for direction in DIRECTIONS:
        if direction not in frames_dict:
            continue

        filename = f"{npc_id}_{direction}.gif"
        output_path = os.path.join(output_dir, filename)
        result = create_animation_preview(
            frames_dict, direction, output_path,
            scale=scale, fps=fps
        )
        if result:
            created.append(result)

    print(f"Created {len(created)} animation preview(s)")
    return created


def create_contact_sheet(frames_dict, output_path, scale=4, padding=2,
                         bg_color=(40, 40, 40, 255)):
    """
    Create a labeled contact sheet showing all frames in a grid.

    Layout: 4 columns (one per frame in walk cycle) x 4 rows (one per direction).
    Each cell contains one scaled-up frame with optional direction labels.

    Args:
        frames_dict: Dict of direction -> list of PIL Images.
        output_path: File path to save the contact sheet PNG.
        scale:       Integer scale factor for nearest-neighbor upscaling (default 4).
        padding:     Pixel padding between cells at the scaled size (default 2).
        bg_color:    Background RGBA color tuple (default dark grey).

    Returns:
        The output path on success, or None on failure.
    """
    if not frames_dict:
        print("Warning: Empty frames dict, cannot create contact sheet")
        return None

    # Determine the sprite size from the first available frame
    sample_direction = next(iter(frames_dict))
    sample_frame = frames_dict[sample_direction][0]
    sprite_w, sprite_h = sample_frame.size
    cell_w = sprite_w * scale
    cell_h = sprite_h * scale

    # Determine how many columns we need (max frames across all directions)
    num_cols = max(len(frames) for frames in frames_dict.values())
    num_cols = max(num_cols, 4)  # At least 4 columns for standard walk cycle

    # Space for direction labels on the left
    label_width = 0
    font = None
    if _HAS_FONT:
        try:
            # Try to load a small bitmap font
            font = ImageFont.load_default()
            label_width = 50 * (scale // 2 + 1)  # Scale label area proportionally
        except Exception:
            font = None
            label_width = 0

    # If no font but we still want labels, use a simple fallback width
    if font is None:
        label_width = 0

    # Calculate total sheet dimensions
    # Rows: one per direction present in the data
    directions_present = [d for d in DIRECTIONS if d in frames_dict]
    num_rows = len(directions_present)

    if num_rows == 0:
        print("Warning: No directions found in frames dict")
        return None

    sheet_w = label_width + (cell_w + padding) * num_cols + padding
    sheet_h = (cell_h + padding) * num_rows + padding

    # Add a header row for frame labels
    header_height = 0
    if font is not None:
        header_height = 20 * (scale // 2 + 1)
        sheet_h += header_height

    # Create the contact sheet image
    sheet = Image.new("RGBA", (sheet_w, sheet_h), bg_color)
    draw = ImageDraw.Draw(sheet)

    # Draw header labels (frame names)
    if font is not None and header_height > 0:
        for col_idx in range(num_cols):
            if col_idx < len(FRAME_NAMES):
                label = FRAME_NAMES[col_idx]
            else:
                label = f"frame_{col_idx}"

            x = label_width + padding + col_idx * (cell_w + padding)
            y = padding
            # Center the text in the cell width
            try:
                bbox = font.getbbox(label)
                tw = bbox[2] - bbox[0]
            except AttributeError:
                tw = len(label) * 6  # Rough estimate for default font
            text_x = x + (cell_w - tw) // 2
            draw.text((text_x, y), label, fill=(200, 200, 200, 255), font=font)

    # Draw each direction row
    for row_idx, direction in enumerate(directions_present):
        frames = frames_dict[direction]
        y_offset = header_height + padding + row_idx * (cell_h + padding)

        # Draw direction label
        if font is not None and label_width > 0:
            label = direction.upper()
            try:
                bbox = font.getbbox(label)
                th = bbox[3] - bbox[1]
            except AttributeError:
                th = 10
            text_y = y_offset + (cell_h - th) // 2
            draw.text((padding, text_y), label, fill=(200, 200, 200, 255), font=font)

        # Draw each frame in this direction
        for col_idx, frame in enumerate(frames):
            x_offset = label_width + padding + col_idx * (cell_w + padding)

            # Scale up with nearest-neighbor
            scaled = frame.resize((cell_w, cell_h), Image.NEAREST)

            # Paste onto the contact sheet (use alpha compositing)
            sheet.paste(scaled, (x_offset, y_offset), scaled)

    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)

    sheet.save(output_path)
    print(f"Saved contact sheet: {output_path} ({sheet_w}x{sheet_h})")
    return output_path


def _build_frames_from_npc(npc_path, base_dir):
    """
    Build a frames dict from an NPC JSON file using the compositor.

    This is a helper for CLI usage. It requires compositor.py to be available.

    Args:
        npc_path: Path to the NPC definition JSON file.
        base_dir: Base directory for resolving template/palette paths.

    Returns:
        Tuple of (frames_dict, npc_data) where frames_dict maps
        direction -> list of PIL Images.
    """
    if compositor is None:
        print("Error: compositor module not available.")
        print("Please ensure compositor.py is in the engine/ directory.")
        sys.exit(1)

    with open(npc_path, "r") as f:
        npc_data = json.load(f)

    frames_dict = compositor.composite_npc(npc_data, base_dir)
    return frames_dict, npc_data


def _build_frames_standalone(npc_path, base_dir):
    """
    Fallback frame builder when compositor is not available.

    Loads template and palette data directly and renders frames as PIL Images.
    This provides basic functionality for previewing without the full compositor.

    Args:
        npc_path: Path to the NPC definition JSON file.
        base_dir: Base directory for resolving template/palette paths.

    Returns:
        Tuple of (frames_dict, npc_data).
    """
    with open(npc_path, "r") as f:
        npc_data = json.load(f)

    sprite_w, sprite_h = npc_data.get("sprite_size", [16, 24])
    layers = npc_data.get("layers", [])
    frame_order = npc_data.get("animation", {}).get("frame_order", FRAME_NAMES)

    # Load all templates and palettes for this NPC
    loaded_layers = []
    for layer in sorted(layers, key=lambda l: l.get("z_order", 0)):
        template_id = layer["template"]
        palette_id = layer["palette"]

        # Find and load template
        template_data = _find_template(template_id, base_dir)
        if template_data is None:
            print(f"Warning: Could not find template '{template_id}', skipping layer")
            continue

        # Find and load palette
        palette_colors = _find_palette(palette_id, base_dir)
        if palette_colors is None:
            print(f"Warning: Could not find palette '{palette_id}', skipping layer")
            continue

        loaded_layers.append({
            "template": template_data,
            "palette": palette_colors,
            "z_order": layer.get("z_order", 0)
        })

    # Render frames for each direction
    frames_dict = {}
    for direction in DIRECTIONS:
        direction_frames = []
        for frame_name in frame_order:
            # Create a blank RGBA image for this frame
            img = Image.new("RGBA", (sprite_w, sprite_h), (0, 0, 0, 0))

            # Composite each layer onto the frame
            for layer_info in loaded_layers:
                template = layer_info["template"]
                palette = layer_info["palette"]

                # Get the frame data for this direction
                dir_data = _get_direction_data(template, direction)
                if dir_data is None or frame_name not in dir_data:
                    continue

                pixel_grid = dir_data[frame_name]
                _render_layer(img, pixel_grid, palette)

            direction_frames.append(img)

        if direction_frames:
            frames_dict[direction] = direction_frames

    return frames_dict, npc_data


def _find_template(template_id, base_dir):
    """Search for a template JSON file by its ID."""
    search_dirs = [
        os.path.join(base_dir, "templates", "bodies"),
        os.path.join(base_dir, "templates", "clothing"),
        os.path.join(base_dir, "templates", "hair"),
        os.path.join(base_dir, "templates", "accessories"),
        os.path.join(base_dir, "templates"),
    ]

    for search_dir in search_dirs:
        path = os.path.join(search_dir, f"{template_id}.json")
        if os.path.exists(path):
            with open(path, "r") as f:
                return json.load(f)

    return None


def _find_palette(palette_id, base_dir):
    """Search for a palette by its ID across all palette files."""
    palettes_dir = os.path.join(base_dir, "palettes")
    if not os.path.isdir(palettes_dir):
        return None

    for filename in os.listdir(palettes_dir):
        if not filename.endswith(".json"):
            continue
        filepath = os.path.join(palettes_dir, filename)
        with open(filepath, "r") as f:
            data = json.load(f)

        # Palette files contain arrays of palette objects
        if isinstance(data, list):
            for entry in data:
                if entry.get("palette_id") == palette_id:
                    return entry.get("colors", {})
        elif isinstance(data, dict) and data.get("palette_id") == palette_id:
            return data.get("colors", {})

    return None


def _get_direction_data(template, direction):
    """
    Get frame data for a direction, handling mirror_right_from_left.
    """
    directions = template.get("directions", {})

    if direction in directions:
        return directions[direction]

    # Handle right-from-left mirroring
    if direction == "right" and template.get("mirror_right_from_left", False):
        if "left" in directions:
            # Import mirror utility
            try:
                from . import mirror_util
            except ImportError:
                try:
                    import mirror_util
                except ImportError:
                    return None

            left_data = directions["left"]
            right_data = {}
            for frame_name, frame_pixels in left_data.items():
                right_data[frame_name] = mirror_util.mirror_frame(frame_pixels)
            return right_data

    return None


def _hex_to_rgba(hex_color):
    """Convert a hex color string like '#FF0000' to an RGBA tuple."""
    hex_color = hex_color.lstrip("#")
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)
    return (r, g, b, 255)


def _render_layer(img, pixel_grid, palette):
    """
    Render a single template layer onto an existing PIL Image.

    Each cell in the pixel grid is either 0 (transparent) or a string
    referencing a key in the palette's colors dict.

    Args:
        img:        PIL Image (RGBA) to draw onto.
        pixel_grid: 2D list of pixel values (0 or color key strings).
        palette:    Dict mapping color key names to hex color strings.
    """
    for y, row in enumerate(pixel_grid):
        for x, pixel in enumerate(row):
            if pixel == 0 or pixel is None:
                continue

            # Look up the color in the palette
            color_key = str(pixel)
            hex_color = palette.get(color_key)
            if hex_color is None:
                continue

            rgba = _hex_to_rgba(hex_color)

            # Only draw if within bounds
            if 0 <= x < img.width and 0 <= y < img.height:
                # Alpha-composite: only overwrite if new pixel is opaque
                img.putpixel((x, y), rgba)


def main():
    parser = argparse.ArgumentParser(
        description="Advanced sprite sheet exporter for retro RPG sprites"
    )
    parser.add_argument(
        "--input", required=True,
        help="Path to NPC definition JSON file"
    )
    parser.add_argument(
        "--base-dir", default=None,
        help="Base directory for templates/palettes (default: parent of input file's directory)"
    )
    parser.add_argument(
        "--output-dir", default="output",
        help="Output directory for generated files (default: output/)"
    )
    parser.add_argument(
        "--scale", type=int, default=4,
        help="Scale factor for pixel art upscaling (default: 4)"
    )
    parser.add_argument(
        "--fps", type=int, default=8,
        help="Frames per second for animated GIFs (default: 8)"
    )
    parser.add_argument(
        "--gif", action="store_true",
        help="Create animated GIF previews for each direction"
    )
    parser.add_argument(
        "--sheet", action="store_true",
        help="Create a labeled contact sheet of all frames"
    )
    parser.add_argument(
        "--all", action="store_true",
        help="Create both GIF previews and contact sheet"
    )

    args = parser.parse_args()

    # Resolve base directory
    if args.base_dir:
        base_dir = os.path.abspath(args.base_dir)
    else:
        # Default: assume base_dir is the retro-rpg-sprites root
        # (parent of whichever directory contains the NPC JSON)
        input_abs = os.path.abspath(args.input)
        base_dir = os.path.dirname(os.path.dirname(input_abs))

    # Validate input
    if not os.path.exists(args.input):
        print(f"Error: Input file not found: {args.input}")
        sys.exit(1)

    # Build frames from NPC definition
    print(f"Loading NPC definition: {args.input}")
    print(f"Base directory: {base_dir}")

    if compositor is not None:
        frames_dict, npc_data = _build_frames_from_npc(args.input, base_dir)
    else:
        print("Note: compositor module not found, using standalone renderer")
        frames_dict, npc_data = _build_frames_standalone(args.input, base_dir)

    npc_id = npc_data.get("npc_id", "unknown")
    fps = npc_data.get("animation", {}).get("walk_speed_fps", args.fps)

    if not frames_dict:
        print("Error: No frames were generated")
        sys.exit(1)

    print(f"Generated frames for {len(frames_dict)} direction(s)")

    # Determine what to export
    do_gif = args.gif or args.all
    do_sheet = args.sheet or args.all

    if not do_gif and not do_sheet:
        print("No export format specified. Use --gif, --sheet, or --all")
        parser.print_help()
        sys.exit(1)

    output_dir = os.path.abspath(args.output_dir)

    # Create animated GIFs
    if do_gif:
        gif_dir = os.path.join(output_dir, "previews")
        create_all_previews(
            frames_dict, gif_dir, npc_id,
            scale=args.scale, fps=fps
        )

    # Create contact sheet
    if do_sheet:
        sheet_dir = os.path.join(output_dir, "sheets")
        os.makedirs(sheet_dir, exist_ok=True)
        sheet_path = os.path.join(sheet_dir, f"{npc_id}_contact.png")
        create_contact_sheet(
            frames_dict, sheet_path,
            scale=args.scale
        )

    print("Export complete.")


if __name__ == "__main__":
    main()
