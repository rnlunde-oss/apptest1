#!/usr/bin/env python3
"""
Mirror utility for retro RPG sprite templates.

Generates right-facing frames by horizontally flipping left-facing frames.
Can also be used to verify template symmetry and fix mirroring issues.
"""

import json
import os
import sys
import argparse


def mirror_row(row):
    """Horizontally flip a single row of pixel data."""
    return list(reversed(row))


def mirror_frame(frame):
    """Horizontally flip an entire frame (2D array of rows)."""
    return [mirror_row(row) for row in frame]


def add_right_direction(template_data):
    """
    Given a template dict with 'left' direction frames,
    generate 'right' direction frames by horizontal mirroring.
    Returns the modified template dict.
    """
    directions = template_data.get("directions", {})
    if "left" not in directions:
        print("Warning: No 'left' direction found in template")
        return template_data

    right_frames = {}
    for frame_name, frame_data in directions["left"].items():
        right_frames[frame_name] = mirror_frame(frame_data)

    directions["right"] = right_frames
    template_data["directions"] = directions
    return template_data


def verify_mirror(template_data):
    """
    Verify that right-facing frames are proper mirrors of left-facing frames.
    Returns True if correct, False with details if not.
    """
    directions = template_data.get("directions", {})
    if "left" not in directions or "right" not in directions:
        print("Cannot verify: need both 'left' and 'right' directions")
        return False

    all_match = True
    for frame_name in directions["left"]:
        if frame_name not in directions["right"]:
            print(f"  Missing right/{frame_name}")
            all_match = False
            continue

        left_frame = directions["left"][frame_name]
        right_frame = directions["right"][frame_name]
        expected = mirror_frame(left_frame)

        for row_idx, (exp_row, act_row) in enumerate(zip(expected, right_frame)):
            if exp_row != act_row:
                print(f"  Mismatch in {frame_name} row {row_idx}")
                all_match = False

    return all_match


def expand_template(template_path, output_path=None):
    """
    Load a template JSON, generate right-facing frames from left,
    and save the expanded version.
    """
    with open(template_path, "r") as f:
        data = json.load(f)

    if not data.get("mirror_right_from_left", False):
        print(f"Template {template_path} does not use mirroring, skipping")
        return

    data = add_right_direction(data)
    # Mark that right is now explicit
    data["mirror_right_from_left"] = False

    out = output_path or template_path.replace(".json", "_expanded.json")
    with open(out, "w") as f:
        json.dump(data, f, indent=2)
    print(f"Expanded template saved to {out}")


def check_symmetry(frame):
    """
    Check if a frame is horizontally symmetric (useful for front/back views).
    Returns a symmetry score from 0.0 to 1.0.
    """
    total_pixels = 0
    matching_pixels = 0

    for row in frame:
        width = len(row)
        for i in range(width // 2):
            left_px = row[i]
            right_px = row[width - 1 - i]
            if left_px != 0 or right_px != 0:
                total_pixels += 1
                if left_px == right_px:
                    matching_pixels += 1

    if total_pixels == 0:
        return 1.0
    return matching_pixels / total_pixels


def report_symmetry(template_path):
    """Print symmetry report for all frames in a template."""
    with open(template_path, "r") as f:
        data = json.load(f)

    print(f"Symmetry report for: {data.get('template_id', template_path)}")
    print("-" * 50)

    for direction, frames in data.get("directions", {}).items():
        for frame_name, frame_data in frames.items():
            score = check_symmetry(frame_data)
            status = "symmetric" if score > 0.95 else "asymmetric"
            print(f"  {direction}/{frame_name}: {score:.1%} ({status})")


def main():
    parser = argparse.ArgumentParser(description="Mirror utility for sprite templates")
    parser.add_argument("template", help="Path to template JSON file")
    parser.add_argument("--expand", action="store_true",
                        help="Generate explicit right-facing frames from left")
    parser.add_argument("--verify", action="store_true",
                        help="Verify right frames match mirrored left frames")
    parser.add_argument("--symmetry", action="store_true",
                        help="Report frame symmetry scores")
    parser.add_argument("--output", help="Output path for expanded template")

    args = parser.parse_args()

    if args.symmetry:
        report_symmetry(args.template)
    elif args.verify:
        with open(args.template, "r") as f:
            data = json.load(f)
        if verify_mirror(data):
            print("All right-facing frames correctly mirror left-facing frames")
        else:
            print("Mirror verification FAILED")
            sys.exit(1)
    elif args.expand:
        expand_template(args.template, args.output)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
