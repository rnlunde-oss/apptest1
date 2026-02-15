#!/usr/bin/env python3
"""
Batch generator for retro RPG sprite engine.

Generates multiple unique NPC variants from a generator configuration file,
creating spritesheets and definition files suitable for game integration.

Generator configs define pools of body templates, clothing, hair, accessories,
and color palettes. The batch generator randomly samples from these pools to
produce diverse NPC populations.

Usage:
    python -m engine.batch_generator --generator generators/townfolk.json --count 10 --seed 42
    python batch_generator.py --generator ../generators/townfolk.json --count 20 --output-dir ../output/batch
"""

import argparse
import json
import math
import os
import random
import sys

from PIL import Image

# Handle imports for both package and standalone usage
try:
    from . import compositor
except ImportError:
    try:
        import compositor
    except ImportError:
        compositor = None

try:
    from . import mirror_util
except ImportError:
    try:
        import mirror_util
    except ImportError:
        mirror_util = None

try:
    from .sheet_exporter import (
        _build_frames_standalone,
        _find_template,
        _find_palette,
        _get_direction_data,
        _render_layer,
        DIRECTIONS,
        FRAME_NAMES,
    )
except ImportError:
    try:
        from sheet_exporter import (
            _build_frames_standalone,
            _find_template,
            _find_palette,
            _get_direction_data,
            _render_layer,
            DIRECTIONS,
            FRAME_NAMES,
        )
    except ImportError:
        DIRECTIONS = ["down", "left", "up", "right"]
        FRAME_NAMES = ["idle", "walk_1", "idle", "walk_2"]
        _build_frames_standalone = None


# Counter for generating unique IDs within a batch
_batch_counter = 0


def generate_random_npc(generator_config, rng=None):
    """
    Generate a single random NPC definition from a generator config.

    Randomly selects one option from each category (body, clothing, hair,
    accessory, and their respective palettes) to assemble a unique NPC.

    Args:
        generator_config: Dict loaded from a generator JSON file. Expected keys:
            - generator_id: Base name for generated NPCs
            - base_sprite_size: [width, height] of the sprite
            - body_templates: List of body template IDs
            - clothing_options: List of clothing template IDs
            - hair_options: List of hair template IDs
            - accessory_options: List of accessory template IDs (may include null/None)
            - skin_palettes: List of skin palette IDs
            - hair_palettes: List of hair palette IDs
            - clothing_palettes: List of clothing palette IDs
            - accessory_palettes: List of accessory palette IDs
        rng: Random instance for reproducibility. If None, uses global random.

    Returns:
        Dict matching the NPC JSON format with a unique npc_id.
    """
    global _batch_counter

    if rng is None:
        rng = random

    gen_id = generator_config.get("generator_id", "npc")
    sprite_size = generator_config.get("base_sprite_size", [16, 24])

    # Select random options from each category
    body = rng.choice(generator_config.get("body_templates", ["body_medium"]))
    clothing = rng.choice(generator_config.get("clothing_options", ["tunic_simple"]))
    hair = rng.choice(generator_config.get("hair_options", ["hair_short"]))
    accessory_options = generator_config.get("accessory_options", [None])
    accessory = rng.choice(accessory_options)

    # Select random palettes
    skin_palette = rng.choice(generator_config.get("skin_palettes", ["skin_light"]))
    hair_palette = rng.choice(generator_config.get("hair_palettes", ["hair_brown"]))
    clothing_palette = rng.choice(
        generator_config.get("clothing_palettes", ["clothing_brown"])
    )
    accessory_palette = rng.choice(
        generator_config.get("accessory_palettes", ["accessory_gold"])
    )

    # Generate unique ID
    _batch_counter += 1
    npc_id = f"{gen_id}_{_batch_counter:03d}"

    # Build layers list (sorted by z_order)
    layers = [
        {
            "template": body,
            "palette": skin_palette,
            "z_order": 0
        },
        {
            "template": clothing,
            "palette": clothing_palette,
            "z_order": 1
        },
        {
            "template": hair,
            "palette": hair_palette,
            "z_order": 2
        },
    ]

    # Only add accessory layer if one was selected (not None)
    if accessory is not None:
        layers.append({
            "template": accessory,
            "palette": accessory_palette,
            "z_order": 3
        })

    # Build the NPC definition
    npc_def = {
        "npc_id": npc_id,
        "display_name": npc_id.replace("_", " ").title(),
        "sprite_size": sprite_size,
        "layers": layers,
        "animation": {
            "walk_speed_fps": 8,
            "idle_bob": False,
            "frame_order": ["idle", "walk_1", "idle", "walk_2"]
        },
        "metadata": {
            "generator": gen_id,
            "body": body,
            "clothing": clothing,
            "hair": hair,
            "accessory": accessory,
            "skin_palette": skin_palette,
            "hair_palette": hair_palette,
            "clothing_palette": clothing_palette,
            "accessory_palette": accessory_palette if accessory else None,
            "tags": ["generated"]
        }
    }

    return npc_def


def generate_batch(generator_config, count, seed=None):
    """
    Generate a batch of unique NPC definitions.

    Uses a seeded random number generator for reproducibility. Each NPC
    receives a unique ID within the batch (e.g. townfolk_001, townfolk_002, ...).

    Args:
        generator_config: Dict loaded from a generator JSON file.
        count:            Number of NPCs to generate.
        seed:             Random seed for reproducibility. If None, non-deterministic.

    Returns:
        List of NPC definition dicts.
    """
    global _batch_counter
    _batch_counter = 0  # Reset counter for each batch

    rng = random.Random(seed)

    npcs = []
    seen_combos = set()

    # Attempt to generate unique NPCs (avoid exact duplicates)
    max_attempts = count * 10  # Safety limit to prevent infinite loops
    attempts = 0

    while len(npcs) < count and attempts < max_attempts:
        attempts += 1
        npc = generate_random_npc(generator_config, rng)

        # Create a signature from the layer choices to detect duplicates
        sig_parts = []
        for layer in npc["layers"]:
            sig_parts.append(f"{layer['template']}:{layer['palette']}")
        signature = "|".join(sig_parts)

        if signature not in seen_combos:
            seen_combos.add(signature)
            npcs.append(npc)
        else:
            # Duplicate detected, decrement the counter and try again
            _batch_counter -= 1

    if len(npcs) < count:
        print(
            f"Warning: Could only generate {len(npcs)} unique NPCs "
            f"out of {count} requested (not enough unique combinations)"
        )

    return npcs


def _compose_npc_frames(npc_def, base_dir):
    """
    Compose sprite frames for a single NPC definition.

    Tries to use the compositor module first, falls back to the standalone
    renderer from sheet_exporter.

    Args:
        npc_def:  NPC definition dict (matching NPC JSON format).
        base_dir: Base directory for resolving template/palette paths.

    Returns:
        Dict mapping direction -> list of PIL Images, or None on failure.
    """
    if compositor is not None:
        try:
            return compositor.composite_npc(npc_def, base_dir)
        except Exception as e:
            print(f"  Compositor error for {npc_def['npc_id']}: {e}")
            print("  Falling back to standalone renderer...")

    # Standalone rendering (inline implementation for robustness)
    return _render_npc_standalone(npc_def, base_dir)


def _render_npc_standalone(npc_def, base_dir):
    """
    Standalone NPC frame renderer that does not depend on compositor.py.

    Loads templates and palettes, composites layers, and returns frames.

    Args:
        npc_def:  NPC definition dict.
        base_dir: Base directory for templates/palettes.

    Returns:
        Dict mapping direction -> list of PIL Images.
    """
    sprite_w, sprite_h = npc_def.get("sprite_size", [16, 24])
    layers_cfg = npc_def.get("layers", [])
    frame_order = npc_def.get("animation", {}).get(
        "frame_order", FRAME_NAMES
    )

    # Load all layer data
    loaded_layers = []
    for layer_cfg in sorted(layers_cfg, key=lambda l: l.get("z_order", 0)):
        template_id = layer_cfg["template"]
        palette_id = layer_cfg["palette"]

        template_data = _find_template_local(template_id, base_dir)
        if template_data is None:
            print(f"    Warning: template '{template_id}' not found, skipping")
            continue

        palette_colors = _find_palette_local(palette_id, base_dir)
        if palette_colors is None:
            print(f"    Warning: palette '{palette_id}' not found, skipping")
            continue

        loaded_layers.append({
            "template": template_data,
            "palette": palette_colors,
        })

    # Render frames per direction
    frames_dict = {}
    for direction in DIRECTIONS:
        direction_frames = []
        for frame_name in frame_order:
            img = Image.new("RGBA", (sprite_w, sprite_h), (0, 0, 0, 0))

            for layer_info in loaded_layers:
                template = layer_info["template"]
                palette = layer_info["palette"]

                dir_data = _get_direction_data_local(template, direction)
                if dir_data is None or frame_name not in dir_data:
                    continue

                pixel_grid = dir_data[frame_name]
                _render_layer_onto(img, pixel_grid, palette)

            direction_frames.append(img)

        if direction_frames:
            frames_dict[direction] = direction_frames

    return frames_dict


def _find_template_local(template_id, base_dir):
    """Search for a template JSON file by its ID across known directories."""
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


def _find_palette_local(palette_id, base_dir):
    """Search for a palette entry by ID across all palette JSON files."""
    palettes_dir = os.path.join(base_dir, "palettes")
    if not os.path.isdir(palettes_dir):
        return None

    for filename in os.listdir(palettes_dir):
        if not filename.endswith(".json"):
            continue
        filepath = os.path.join(palettes_dir, filename)
        with open(filepath, "r") as f:
            data = json.load(f)

        if isinstance(data, list):
            for entry in data:
                if entry.get("palette_id") == palette_id:
                    return entry.get("colors", {})
        elif isinstance(data, dict) and data.get("palette_id") == palette_id:
            return data.get("colors", {})

    return None


def _get_direction_data_local(template, direction):
    """Get frame data for a direction, handling mirror_right_from_left."""
    directions = template.get("directions", {})

    if direction in directions:
        return directions[direction]

    if direction == "right" and template.get("mirror_right_from_left", False):
        if "left" in directions:
            left_data = directions["left"]
            right_data = {}
            for frame_name, frame_pixels in left_data.items():
                # Mirror each row
                right_data[frame_name] = [
                    list(reversed(row)) for row in frame_pixels
                ]
            return right_data

    return None


def _hex_to_rgba(hex_color):
    """Convert hex color string to RGBA tuple."""
    hex_color = hex_color.lstrip("#")
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)
    return (r, g, b, 255)


def _render_layer_onto(img, pixel_grid, palette):
    """Render a template layer's pixel grid onto a PIL Image using a palette."""
    for y, row in enumerate(pixel_grid):
        for x, pixel in enumerate(row):
            if pixel == 0 or pixel is None:
                continue
            color_key = str(pixel)
            hex_color = palette.get(color_key)
            if hex_color is None:
                continue
            rgba = _hex_to_rgba(hex_color)
            if 0 <= x < img.width and 0 <= y < img.height:
                img.putpixel((x, y), rgba)


def _create_spritesheet(frames_dict, sprite_size):
    """
    Create a standard spritesheet image from a frames dict.

    Layout: 4 columns (frames) x 4 rows (directions) in the order:
    down, left, up, right.

    Args:
        frames_dict: Dict of direction -> list of PIL Images.
        sprite_size: Tuple of (width, height) for each frame.

    Returns:
        PIL Image containing the full spritesheet.
    """
    sprite_w, sprite_h = sprite_size
    num_cols = 4  # Standard walk cycle: idle, walk_1, idle, walk_2
    num_rows = 4  # Standard directions: down, left, up, right

    sheet_w = sprite_w * num_cols
    sheet_h = sprite_h * num_rows
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))

    for row_idx, direction in enumerate(DIRECTIONS):
        if direction not in frames_dict:
            continue
        frames = frames_dict[direction]
        for col_idx, frame in enumerate(frames):
            if col_idx >= num_cols:
                break
            x = col_idx * sprite_w
            y = row_idx * sprite_h
            sheet.paste(frame, (x, y), frame)

    return sheet


def _create_mega_sheet(all_sheets, sprite_size, count):
    """
    Create a combined mega-sheet containing all NPC spritesheets.

    Arranges individual spritesheets in a grid, trying to keep the
    result roughly square.

    Args:
        all_sheets: List of PIL Images (individual spritesheets).
        sprite_size: Tuple of (width, height) for each sprite frame.
        count:       Total number of NPCs (used for grid calculation).

    Returns:
        PIL Image containing the mega-sheet.
    """
    if not all_sheets:
        return None

    # Each individual sheet is 4 frames wide x 4 directions tall
    single_w = sprite_size[0] * 4
    single_h = sprite_size[1] * 4

    # Calculate grid dimensions (aim for roughly square layout)
    cols = max(1, math.ceil(math.sqrt(count)))
    rows = max(1, math.ceil(count / cols))

    mega_w = single_w * cols
    mega_h = single_h * rows
    mega = Image.new("RGBA", (mega_w, mega_h), (0, 0, 0, 0))

    for idx, sheet in enumerate(all_sheets):
        col = idx % cols
        row = idx // cols
        x = col * single_w
        y = row * single_h
        mega.paste(sheet, (x, y), sheet)

    return mega


def batch_export(generator_path, count, output_dir, base_dir, scale=1, seed=None):
    """
    Full batch export pipeline: generate NPCs, render spritesheets, save all outputs.

    For each generated NPC:
    - Renders a 4x4 spritesheet (4 directions x 4 animation frames)
    - Saves the individual sheet as a PNG
    - Optionally scales up with nearest-neighbor

    Also produces:
    - A combined mega-sheet with all NPCs
    - A JSON file with all NPC definitions for game integration

    Args:
        generator_path: Path to the generator config JSON file.
        count:          Number of NPCs to generate.
        output_dir:     Directory for output files.
        base_dir:       Base directory for templates/palettes.
        scale:          Scale factor for output images (default 1).
        seed:           Random seed for reproducibility.

    Returns:
        Dict with keys 'npcs', 'sheets', 'mega_sheet', 'definitions_path'.
    """
    # Load generator config
    with open(generator_path, "r") as f:
        generator_config = json.load(f)

    gen_id = generator_config.get("generator_id", "batch")
    sprite_size = tuple(generator_config.get("base_sprite_size", [16, 24]))

    print(f"Generator: {gen_id}")
    print(f"Sprite size: {sprite_size[0]}x{sprite_size[1]}")
    print(f"Generating {count} NPCs (seed={seed})...")

    # Generate NPC definitions
    npcs = generate_batch(generator_config, count, seed=seed)
    print(f"Generated {len(npcs)} unique NPC definition(s)")

    # Prepare output directories
    sheets_dir = os.path.join(output_dir, "sheets")
    os.makedirs(sheets_dir, exist_ok=True)

    # Render and export each NPC
    all_sheets = []
    sheet_paths = []

    for idx, npc_def in enumerate(npcs):
        npc_id = npc_def["npc_id"]
        print(f"  [{idx + 1}/{len(npcs)}] Rendering {npc_id}...")

        # Compose frames
        frames_dict = _compose_npc_frames(npc_def, base_dir)
        if not frames_dict:
            print(f"    Warning: No frames generated for {npc_id}, skipping")
            continue

        # Create individual spritesheet
        sheet = _create_spritesheet(frames_dict, sprite_size)

        # Scale up if requested
        if scale > 1:
            scaled_w = sheet.width * scale
            scaled_h = sheet.height * scale
            sheet = sheet.resize((scaled_w, scaled_h), Image.NEAREST)

        # Save individual sheet
        sheet_path = os.path.join(sheets_dir, f"{npc_id}.png")
        sheet.save(sheet_path)
        sheet_paths.append(sheet_path)
        all_sheets.append(sheet)

    # Create mega-sheet combining all NPCs
    mega_path = None
    if all_sheets:
        print("Creating combined mega-sheet...")
        # For the mega-sheet, use the (potentially scaled) individual sheets
        actual_sprite_size = (sprite_size[0] * scale, sprite_size[1] * scale)
        mega = _create_mega_sheet(all_sheets, actual_sprite_size, len(all_sheets))
        if mega:
            mega_path = os.path.join(output_dir, f"{gen_id}_mega_sheet.png")
            mega.save(mega_path)
            print(f"  Mega-sheet saved: {mega_path} ({mega.width}x{mega.height})")

    # Save NPC definitions as JSON for game integration
    definitions = {
        "generator_id": gen_id,
        "seed": seed,
        "count": len(npcs),
        "sprite_size": list(sprite_size),
        "scale": scale,
        "npcs": npcs
    }

    definitions_path = os.path.join(output_dir, f"{gen_id}_definitions.json")
    with open(definitions_path, "w") as f:
        json.dump(definitions, f, indent=2)
    print(f"  Definitions saved: {definitions_path}")

    result = {
        "npcs": npcs,
        "sheets": sheet_paths,
        "mega_sheet": mega_path,
        "definitions_path": definitions_path,
    }

    print(f"\nBatch export complete: {len(sheet_paths)} spritesheet(s) generated")
    return result


def main():
    parser = argparse.ArgumentParser(
        description="Batch NPC sprite generator for retro RPG sprites"
    )
    parser.add_argument(
        "--generator", required=True,
        help="Path to generator config JSON file"
    )
    parser.add_argument(
        "--count", type=int, default=10,
        help="Number of NPCs to generate (default: 10)"
    )
    parser.add_argument(
        "--output-dir", default="output/batch",
        help="Output directory for generated files (default: output/batch/)"
    )
    parser.add_argument(
        "--base-dir", default=None,
        help="Base directory for templates/palettes (default: parent of generator file's directory)"
    )
    parser.add_argument(
        "--scale", type=int, default=1,
        help="Scale factor for output images (default: 1)"
    )
    parser.add_argument(
        "--seed", type=int, default=None,
        help="Random seed for reproducible generation"
    )

    args = parser.parse_args()

    # Resolve base directory
    if args.base_dir:
        base_dir = os.path.abspath(args.base_dir)
    else:
        # Default: assume base_dir is the retro-rpg-sprites root
        gen_abs = os.path.abspath(args.generator)
        base_dir = os.path.dirname(os.path.dirname(gen_abs))

    # Validate inputs
    if not os.path.exists(args.generator):
        print(f"Error: Generator config not found: {args.generator}")
        sys.exit(1)

    if args.count < 1:
        print("Error: Count must be at least 1")
        sys.exit(1)

    output_dir = os.path.abspath(args.output_dir)

    print(f"Base directory: {base_dir}")
    print(f"Output directory: {output_dir}")
    print()

    result = batch_export(
        generator_path=args.generator,
        count=args.count,
        output_dir=output_dir,
        base_dir=base_dir,
        scale=args.scale,
        seed=args.seed,
    )

    # Summary
    print(f"\nSummary:")
    print(f"  NPCs generated:  {len(result['npcs'])}")
    print(f"  Sheets created:  {len(result['sheets'])}")
    if result["mega_sheet"]:
        print(f"  Mega-sheet:      {result['mega_sheet']}")
    print(f"  Definitions:     {result['definitions_path']}")


if __name__ == "__main__":
    main()
