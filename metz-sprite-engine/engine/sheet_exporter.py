#!/usr/bin/env python3
"""
Metz Sprite Engine — Sheet Exporter

Enhanced exporter for the Metz multi-layer equipment compositor.  Produces:

* **Preview sprite sheets** — 4x upscaled PNG with all directions and frames.
* **Walk-cycle GIFs** — Per-direction animated GIFs and a combined 2x2 grid
  showing all four directions simultaneously.
* **Paper-doll strip** — Each equipment layer rendered in isolation on its own
  48x48 frame, arranged horizontally with labels underneath.
* **All-in-one export** — A single call that generates everything.

Usage:
    python sheet_exporter.py --loadout config/loadout_act1_start.json --all
    python sheet_exporter.py --loadout config/loadout_act1_start.json --gif --scale 4
"""

import argparse
import json
import os
import sys
from pathlib import Path

from PIL import Image, ImageDraw

try:
    from PIL import ImageFont
    _HAS_FONT = True
except ImportError:
    _HAS_FONT = False

# Handle imports for both package and standalone usage.
try:
    from . import compositor
except ImportError:
    try:
        import compositor
    except ImportError:
        # Fallback: try adding parent directory to path.
        _engine_dir = os.path.dirname(os.path.abspath(__file__))
        if _engine_dir not in sys.path:
            sys.path.insert(0, _engine_dir)
        try:
            import compositor
        except ImportError:
            compositor = None


_DIRECTION_ORDER = ("down", "left", "right", "up")
_DIRECTION_LABELS = {"down": "Down", "left": "Left", "right": "Right", "up": "Up"}


# ---------------------------------------------------------------------------
# Helper: get a default font
# ---------------------------------------------------------------------------

def _get_font(size=10):
    """Return a PIL font object.  Falls back to the built-in default."""
    if not _HAS_FONT:
        return None
    try:
        # Try a common monospace font on macOS / Linux.
        for candidate in ("Menlo.ttc", "DejaVuSansMono.ttf",
                          "Consolas.ttf", "LiberationMono-Regular.ttf"):
            try:
                return ImageFont.truetype(candidate, size)
            except (IOError, OSError):
                continue
        return ImageFont.load_default()
    except Exception:
        return None


# ---------------------------------------------------------------------------
# 1. Preview sprite sheet
# ---------------------------------------------------------------------------

def export_preview(frames_dict, output_dir, name, scale=4):
    """Save a 4x upscaled sprite sheet preview PNG.

    Layout mirrors the standard sprite sheet: 4 columns (walk cycle) x
    4 rows (down, left, right, up).

    Parameters
    ----------
    frames_dict : dict[str, list[Image]]
        Output of ``compositor.composite_loadout``.
    output_dir : str | Path
        Directory to write the preview PNG into.
    name : str
        Base filename (without extension) used for the output.
    scale : int
        Nearest-neighbour upscale factor (default 4).

    Returns
    -------
    str
        The path to the saved preview image.
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

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

    if scale > 1:
        new_size = (sheet_w * scale, sheet_h * scale)
        sheet = sheet.resize(new_size, Image.NEAREST)

    output_path = output_dir / f"{name}_preview.png"
    sheet.save(str(output_path), "PNG")
    print(f"Saved preview: {output_path} ({sheet.width}x{sheet.height})")
    return str(output_path)


# ---------------------------------------------------------------------------
# 2. Walk-cycle animated GIFs
# ---------------------------------------------------------------------------

def _make_gif_frames(pil_frames, scale):
    """Upscale a list of RGBA frames and convert to P-mode for GIF saving."""
    scaled = []
    for frame in pil_frames:
        w, h = frame.size
        up = frame.resize((w * scale, h * scale), Image.NEAREST)
        scaled.append(up)
    return scaled


def _save_animated_gif(frames, output_path, fps=8):
    """Save a list of RGBA PIL Images as an animated GIF with transparency.

    Parameters
    ----------
    frames : list[Image]
        Sequence of RGBA frames.
    output_path : str | Path
        Destination file path.
    fps : int
        Frames per second.
    """
    if not frames:
        return

    duration_ms = int(1000 / fps)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    frames[0].save(
        str(output_path),
        save_all=True,
        append_images=frames[1:] if len(frames) > 1 else [],
        duration=duration_ms,
        loop=0,
        disposal=2,
        transparency=0,
        optimize=False,
    )


def export_walk_gifs(frames_dict, output_dir, name, scale=4, fps=8):
    """Create animated GIFs for each direction and a combined 2x2 grid GIF.

    Five files are generated:
    * ``<name>_walk_down.gif``
    * ``<name>_walk_left.gif``
    * ``<name>_walk_right.gif``
    * ``<name>_walk_up.gif``
    * ``<name>_walk_all.gif`` — 2x2 grid with all four directions.

    Parameters
    ----------
    frames_dict : dict[str, list[Image]]
        Output of ``compositor.composite_loadout``.
    output_dir : str | Path
        Directory to write GIF files into.
    name : str
        Base filename prefix.
    scale : int
        Nearest-neighbour upscale factor (default 4).
    fps : int
        Animation speed in frames per second (default 8).

    Returns
    -------
    list[str]
        Paths to all created GIF files.
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    created = []

    # Per-direction GIFs.
    direction_scaled = {}
    for direction in _DIRECTION_ORDER:
        raw_frames = frames_dict.get(direction, [])
        if not raw_frames:
            continue

        scaled_frames = _make_gif_frames(raw_frames, scale)
        direction_scaled[direction] = scaled_frames

        gif_path = output_dir / f"{name}_walk_{direction}.gif"
        _save_animated_gif(scaled_frames, gif_path, fps=fps)
        print(f"  Saved GIF: {gif_path} ({len(scaled_frames)} frames, {fps} fps)")
        created.append(str(gif_path))

    # Combined 2x2 grid GIF.
    if len(direction_scaled) == 4:
        # Determine per-cell size from the first available direction.
        sample = direction_scaled[_DIRECTION_ORDER[0]][0]
        cell_w, cell_h = sample.size
        padding = max(2, scale)  # small gap between cells
        label_height = 0
        font = _get_font(max(10, scale * 3))
        if font is not None:
            label_height = max(12, scale * 4)

        grid_w = cell_w * 2 + padding
        grid_h = (cell_h + label_height) * 2 + padding

        # All directions must have the same number of frames; use the minimum.
        num_frames = min(len(f) for f in direction_scaled.values())

        grid_frames = []
        # Layout:  down  | right
        #          left  | up
        grid_order = [("down", "right"), ("left", "up")]

        for frame_idx in range(num_frames):
            canvas = Image.new("RGBA", (grid_w, grid_h), (0, 0, 0, 0))
            draw = ImageDraw.Draw(canvas) if font else None

            for row_idx, (dir_left, dir_right) in enumerate(grid_order):
                for col_idx, direction in enumerate((dir_left, dir_right)):
                    x = col_idx * (cell_w + padding)
                    y = row_idx * (cell_h + label_height + padding)

                    # Draw label above the sprite.
                    if draw is not None and font is not None:
                        label = _DIRECTION_LABELS.get(direction, direction)
                        try:
                            bbox = font.getbbox(label)
                            tw = bbox[2] - bbox[0]
                        except AttributeError:
                            tw = len(label) * 6
                        text_x = x + (cell_w - tw) // 2
                        draw.text(
                            (text_x, y),
                            label,
                            fill=(200, 200, 200, 255),
                            font=font,
                        )

                    sprite_y = y + label_height
                    frame_img = direction_scaled[direction][frame_idx]
                    canvas.paste(frame_img, (x, sprite_y), frame_img)

            grid_frames.append(canvas)

        grid_path = output_dir / f"{name}_walk_all.gif"
        _save_animated_gif(grid_frames, grid_path, fps=fps)
        print(f"  Saved combined GIF: {grid_path} ({num_frames} frames)")
        created.append(str(grid_path))

    return created


# ---------------------------------------------------------------------------
# 3. Paper-doll strip
# ---------------------------------------------------------------------------

def export_paper_doll(loadout, base_dir, output_path, scale=4):
    """Render each equipment layer in isolation and arrange horizontally.

    The output is a single PNG strip showing the body and each piece of
    equipment on its own 48x48 canvas (upscaled), with a text label
    underneath each frame.

    Parameters
    ----------
    loadout : dict
        The loadout definition (with ``body`` and ``equipment`` keys).
    base_dir : str | Path
        Root directory of the metz-sprite-engine project.
    output_path : str | Path
        Destination file path for the paper-doll PNG.
    scale : int
        Nearest-neighbour upscale factor (default 4).

    Returns
    -------
    str
        The path to the saved paper-doll image.
    """
    if compositor is None:
        print("Error: compositor module not available for paper-doll export.")
        return None

    base_dir = Path(base_dir)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Collect template IDs: body first, then equipment.
    template_ids = [loadout["body"]] + loadout.get("equipment", [])

    # Load and render each template in isolation (front-facing idle).
    layer_images = []
    layer_labels = []
    for tmpl_id in template_ids:
        try:
            tmpl = compositor.load_template(tmpl_id, base_dir)
        except FileNotFoundError:
            print(f"  Warning: Template '{tmpl_id}' not found, skipping.")
            continue

        img = compositor.render_single_layer(tmpl, base_dir, direction="down",
                                             frame_name="idle")
        layer_images.append(img)
        # Create a human-readable label from the template ID.
        label = tmpl_id.replace("_", " ")
        layer_labels.append(label)

    if not layer_images:
        print("Error: No layers could be rendered for paper-doll.")
        return None

    # Determine dimensions.
    frame_w, frame_h = layer_images[0].size
    cell_w = frame_w * scale
    cell_h = frame_h * scale

    font = _get_font(max(9, scale * 2))
    label_height = max(14, scale * 4) if font else 0
    padding = max(2, scale)

    num_layers = len(layer_images)
    strip_w = num_layers * cell_w + (num_layers - 1) * padding
    strip_h = cell_h + label_height + padding

    # Optionally add a title row.
    title_height = 0
    title_font = _get_font(max(12, scale * 3))
    if title_font:
        title_height = max(18, scale * 5)
        strip_h += title_height

    strip = Image.new("RGBA", (strip_w, strip_h), (30, 30, 35, 255))
    draw = ImageDraw.Draw(strip)

    # Draw title.
    if title_font and title_height > 0:
        title_text = loadout.get("display_name",
                                 loadout.get("loadout_id", "Paper Doll"))
        try:
            bbox = title_font.getbbox(title_text)
            tw = bbox[2] - bbox[0]
        except AttributeError:
            tw = len(title_text) * 8
        draw.text(
            ((strip_w - tw) // 2, padding),
            title_text,
            fill=(220, 210, 190, 255),
            font=title_font,
        )

    # Draw each layer cell.
    for idx, (img, label) in enumerate(zip(layer_images, layer_labels)):
        x = idx * (cell_w + padding)
        y = title_height

        # Upscale the layer image.
        scaled = img.resize((cell_w, cell_h), Image.NEAREST)
        strip.paste(scaled, (x, y), scaled)

        # Draw label below the sprite.
        if font:
            label_y = y + cell_h + 2
            # Truncate long labels.
            max_chars = cell_w // max(1, (scale * 2))
            display_label = label if len(label) <= max_chars else label[:max_chars - 1] + "..."
            try:
                bbox = font.getbbox(display_label)
                lw = bbox[2] - bbox[0]
            except AttributeError:
                lw = len(display_label) * 6
            text_x = x + (cell_w - lw) // 2
            draw.text(
                (text_x, label_y),
                display_label,
                fill=(180, 175, 160, 255),
                font=font,
            )

    strip.save(str(output_path), "PNG")
    print(f"Saved paper-doll: {output_path} ({strip.width}x{strip.height})")
    return str(output_path)


# ---------------------------------------------------------------------------
# 4. Export-all convenience function
# ---------------------------------------------------------------------------

def export_all(loadout, base_dir, output_dir, name, scale=4):
    """Run the full export pipeline: sprite sheet, preview, GIFs, paper doll.

    Parameters
    ----------
    loadout : dict
        The loaded loadout JSON definition.
    base_dir : str | Path
        Root directory of the metz-sprite-engine project.
    output_dir : str | Path
        Root output directory.  Subdirectories ``sheets/``, ``previews/``,
        and ``frames/`` will be created as needed.
    name : str
        Base filename prefix for all outputs.
    scale : int
        Nearest-neighbour upscale factor (default 4).

    Returns
    -------
    dict
        A summary dict mapping output type to file path(s).
    """
    if compositor is None:
        print("Error: compositor module is required for export_all.")
        sys.exit(1)

    base_dir = Path(base_dir)
    output_dir = Path(output_dir)

    print(f"Running full export for '{name}'...")
    print(f"  Base dir:   {base_dir}")
    print(f"  Output dir: {output_dir}")
    print(f"  Scale:      {scale}x")
    print()

    # 1. Composite all frames.
    print("Compositing loadout...")
    frames_dict = compositor.composite_loadout(loadout, base_dir)
    for direction, frames in frames_dict.items():
        print(f"  {direction}: {len(frames)} frame(s)")
    print()

    results = {}

    # 2. Raw 1x sprite sheet.
    sheets_dir = output_dir / "sheets"
    sheets_dir.mkdir(parents=True, exist_ok=True)
    sheet_path = sheets_dir / f"{name}_spritesheet.png"
    compositor.export_spritesheet(frames_dict, sheet_path, scale=1)
    results["spritesheet"] = str(sheet_path)

    # 3. Scaled preview.
    previews_dir = output_dir / "previews"
    preview_path = export_preview(frames_dict, previews_dir, name, scale=scale)
    results["preview"] = preview_path

    # 4. Walk-cycle GIFs.
    print("\nGenerating walk-cycle GIFs...")
    gif_dir = output_dir / "previews"
    gif_paths = export_walk_gifs(frames_dict, gif_dir, name, scale=scale)
    results["gifs"] = gif_paths

    # 5. Paper-doll strip.
    print("\nGenerating paper-doll strip...")
    doll_path = output_dir / "previews" / f"{name}_paper_doll.png"
    doll_result = export_paper_doll(loadout, base_dir, doll_path, scale=scale)
    results["paper_doll"] = doll_result

    print("\n--- Export Summary ---")
    for key, value in results.items():
        if isinstance(value, list):
            for v in value:
                print(f"  {key}: {v}")
        else:
            print(f"  {key}: {value}")
    print("Export complete.")

    return results


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main():
    """Command-line interface for the Metz sprite sheet exporter."""
    parser = argparse.ArgumentParser(
        description="Export Metz sprite sheets, GIF previews, and paper-doll strips."
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
        "--output-dir",
        default=None,
        help=(
            "Root output directory. Defaults to output/ under --base-dir."
        ),
    )
    parser.add_argument(
        "--name",
        default=None,
        help=(
            "Output name prefix for generated files. "
            "Defaults to the loadout_id from the loadout JSON."
        ),
    )
    parser.add_argument(
        "--scale",
        type=int,
        default=4,
        help="Integer scale factor for pixel art upscaling (default: 4).",
    )
    parser.add_argument(
        "--fps",
        type=int,
        default=8,
        help="Frames per second for animated GIFs (default: 8).",
    )
    parser.add_argument(
        "--preview",
        action="store_true",
        help="Export a scaled-up sprite sheet preview PNG.",
    )
    parser.add_argument(
        "--gif",
        action="store_true",
        help="Export animated walk-cycle GIFs for each direction.",
    )
    parser.add_argument(
        "--paper-doll",
        action="store_true",
        help="Export an isolated-layer paper-doll strip.",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Export everything (preview, GIFs, paper-doll, spritesheet).",
    )

    args = parser.parse_args()

    if compositor is None:
        print("Error: compositor module not found.")
        print("Please ensure compositor.py is in the engine/ directory.")
        sys.exit(1)

    # Resolve base directory.
    if args.base_dir:
        base_dir = Path(args.base_dir).resolve()
    else:
        base_dir = Path(__file__).resolve().parent.parent

    # Load the loadout.
    loadout_path = Path(args.loadout).resolve()
    if not loadout_path.is_file():
        print(f"Error: Loadout file not found: {loadout_path}", file=sys.stderr)
        sys.exit(1)

    with open(loadout_path, "r", encoding="utf-8") as fh:
        loadout = json.load(fh)

    loadout_id = loadout.get("loadout_id", "unknown_loadout")
    name = args.name or loadout_id

    # Resolve output directory.
    if args.output_dir:
        output_dir = Path(args.output_dir).resolve()
    else:
        output_dir = base_dir / "output"

    print(f"Loadout: {loadout_id}")
    if loadout.get("display_name"):
        print(f"  {loadout['display_name']}")
    print(f"Base dir:    {base_dir}")
    print(f"Output dir:  {output_dir}")
    print()

    # Determine what to export.
    if args.all:
        export_all(loadout, base_dir, output_dir, name, scale=args.scale)
        return

    do_preview = args.preview
    do_gif = args.gif
    do_paper_doll = args.paper_doll

    if not (do_preview or do_gif or do_paper_doll):
        print("No export format specified. Use --preview, --gif, --paper-doll, or --all.")
        parser.print_help()
        sys.exit(1)

    # Composite frames (needed for preview and GIF exports).
    frames_dict = None
    if do_preview or do_gif:
        print("Compositing loadout...")
        frames_dict = compositor.composite_loadout(loadout, base_dir)
        for direction, frames in frames_dict.items():
            print(f"  {direction}: {len(frames)} frame(s)")
        print()

    if do_preview:
        previews_dir = output_dir / "previews"
        export_preview(frames_dict, previews_dir, name, scale=args.scale)

    if do_gif:
        gif_dir = output_dir / "previews"
        export_walk_gifs(frames_dict, gif_dir, name,
                         scale=args.scale, fps=args.fps)

    if do_paper_doll:
        doll_path = output_dir / "previews" / f"{name}_paper_doll.png"
        export_paper_doll(loadout, base_dir, doll_path, scale=args.scale)

    print("\nExport complete.")


if __name__ == "__main__":
    main()
