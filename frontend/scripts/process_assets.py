#!/usr/bin/env python3
"""Normalize the supplied home-page artwork into named frontend assets.

Background removal is edge-connected: only regions reachable from the image
border are made transparent. This avoids deleting light colours inside cards,
maps, characters, and icons.
"""

from __future__ import annotations

from pathlib import Path
import argparse

import cv2
import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
INCOMING = ROOT / "src" / "assets" / "incoming"
ASSETS = ROOT / "src" / "assets"
PADDING = 6

# These supplied images have a soft, non-uniform vignette. A conventional
# edge flood can leak through their pale artwork, so their foreground is
# segmented from a conservative centre rectangle instead.
GRABCUT_SOURCES = {
    "dec_flower_source.png": 0.25,
    "dec_grass_source.png": 0.23,
    "dec_mushroom_source.png": 0.25,
    "dec_plant_source.png": 0.28,
    "dec_rock_source.png": 0.27,
    "dec_ruin_source.png": 0.22,
    "dec_sign_source.png": 0.24,
    "nav_record_source.png": 0.25,
    "nav_report_source.png": 0.23,
    "tag_done_source.png": 0.22,
    "tag_new_source.png": 0.22,
    "tag_progress_source.png": 0.22,
}


SOURCE_MAP = {
    "frog_default_1_source.png": ("frog/frog_default_1.png", True),
    "bg_main_source.png": ("background/bg_main.png", False),
    "dec_sign_source.png": ("decoration/dec_sign.png", True),
    "dec_ruin_source.png": ("decoration/dec_ruin.png", True),
    "dec_grass_source.png": ("decoration/dec_grass.png", True),
    "dec_rock_source.png": ("decoration/dec_rock.png", True),
    "dec_plant_source.png": ("decoration/dec_plant.png", True),
    "dec_flower_source.png": ("decoration/dec_flower.png", True),
    "dec_mushroom_source.png": ("decoration/dec_mushroom.png", True),
    "nav_home_source.png": ("navigation/nav_home.png", True),
    "nav_map_source.png": ("navigation/nav_map.png", True),
    "nav_observe_source.png": ("navigation/nav_observe.png", True),
    "nav_record_source.png": ("navigation/nav_record.png", True),
    "nav_report_source.png": ("navigation/nav_report.png", True),
    "nav_profile_source.png": ("navigation/nav_profile.png", True),
    "tag_new_source.png": ("tags/tag_new.png", True),
    "tag_progress_source.png": ("tags/tag_progress.png", True),
    "tag_done_source.png": ("tags/tag_done.png", True),
}


# The supplied component image is a source sheet containing discrete, original
# assets. Coordinates isolate each asset without sampling from a design mockup.
SHEET_CROPS = {
    "cards/card_large.png": ((160, 18, 862, 282), False),
    "cards/card_with_map.png": ((210, 318, 812, 490), False),
    "cards/card_progress.png": ((210, 522, 812, 623), False),
    "cards/card_records.png": ((230, 654, 794, 786), False),
    "cards/card_signin.png": ((218, 808, 802, 944), False),
    "cards/card_activity.png": ((218, 1112, 804, 1248), False),
    "buttons/btn_primary.png": ((230, 1267, 795, 1395), True),
    "progress/progress_vine.png": ((292, 1422, 618, 1482), True),
}


PLACEHOLDERS = [
    "frog/frog_default_2.png",
    "frog/frog_default_3.png",
    "frog/frog_focus_1.png",
    "frog/frog_focus_2.png",
    "frog/frog_focus_3.png",
    "frog/frog_wave.png",
    "frog/frog_sit.png",
    "frog/frog_backpack.png",
    "icons/icon_mail.png",
    "icons/icon_map.png",
    "icons/icon_search.png",
    "icons/icon_notebook.png",
    "icons/icon_clover.png",
    "icons/icon_clipboard.png",
    "decoration/dec_stone.png",
]


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def border_background_mask(rgb: np.ndarray, tolerance: int = 18) -> np.ndarray:
    """Return the edge-connected background mask using tolerant flood fills."""
    height, width = rgb.shape[:2]
    mask = np.zeros((height + 2, width + 2), dtype=np.uint8)
    flood_image = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    flags = 4 | cv2.FLOODFILL_MASK_ONLY | (255 << 8)

    seeds: list[tuple[int, int]] = []
    step = max(8, min(height, width) // 64)
    seeds.extend((x, 0) for x in range(0, width, step))
    seeds.extend((x, height - 1) for x in range(0, width, step))
    seeds.extend((0, y) for y in range(0, height, step))
    seeds.extend((width - 1, y) for y in range(0, height, step))
    seeds.extend(
        [(0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)]
    )

    diff = (tolerance, tolerance, tolerance)
    for x, y in seeds:
        if mask[y + 1, x + 1] == 0:
            cv2.floodFill(
                flood_image,
                mask,
                (x, y),
                None,
                loDiff=diff,
                upDiff=diff,
                flags=flags,
            )
    return mask[1:-1, 1:-1]


def remove_edge_background(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    rgb = np.asarray(rgba.convert("RGB"))
    background = border_background_mask(rgb)

    # Close tiny gaps in the connected background, then feather only the alpha
    # edge so the artwork retains its original colours.
    kernel = np.ones((3, 3), np.uint8)
    background = cv2.morphologyEx(background, cv2.MORPH_CLOSE, kernel)
    alpha = 255 - background
    alpha_image = Image.fromarray(alpha, mode="L").filter(
        ImageFilter.GaussianBlur(radius=0.8)
    )
    rgba.putalpha(alpha_image)

    bbox = rgba.getbbox()
    if bbox is None:
        return Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    cropped = rgba.crop(bbox)
    padded = Image.new(
        "RGBA",
        (cropped.width + PADDING * 2, cropped.height + PADDING * 2),
        (0, 0, 0, 0),
    )
    padded.alpha_composite(cropped, (PADDING, PADDING))
    return padded


def remove_vignette_background(image: Image.Image, margin: float) -> Image.Image:
    original = image.convert("RGB")
    scale = min(1.0, 420 / max(original.size))
    sample = original.resize(
        (round(original.width * scale), round(original.height * scale)),
        Image.Resampling.LANCZOS,
    )
    rgb = np.asarray(sample)
    height, width = rgb.shape[:2]
    margin_x = max(2, round(width * margin))
    margin_y = max(2, round(height * margin))
    mask = np.zeros((height, width), dtype=np.uint8)
    background_model = np.zeros((1, 65), dtype=np.float64)
    foreground_model = np.zeros((1, 65), dtype=np.float64)
    cv2.grabCut(
        cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR),
        mask,
        (
            margin_x,
            margin_y,
            width - margin_x * 2,
            height - margin_y * 2,
        ),
        background_model,
        foreground_model,
        5,
        cv2.GC_INIT_WITH_RECT,
    )
    alpha = np.where(
        (mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0
    ).astype(np.uint8)
    alpha = cv2.GaussianBlur(alpha, (0, 0), 0.65)
    alpha_image = Image.fromarray(alpha).resize(original.size, Image.Resampling.LANCZOS)
    rgba = original.convert("RGBA")
    rgba.putalpha(alpha_image)
    bbox = rgba.getbbox()
    if bbox is None:
        return Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    cropped = rgba.crop(bbox)
    padded = Image.new(
        "RGBA",
        (cropped.width + PADDING * 2, cropped.height + PADDING * 2),
        (0, 0, 0, 0),
    )
    padded.alpha_composite(cropped, (PADDING, PADDING))
    return padded


def save_source(source_name: str, relative_output: str, transparent: bool) -> None:
    source = INCOMING / source_name
    destination = ASSETS / relative_output
    if not source.exists():
        raise FileNotFoundError(f"Missing incoming source: {source}")
    ensure_parent(destination)
    image = Image.open(source)
    if transparent:
        if source_name in GRABCUT_SOURCES:
            processed = remove_vignette_background(
                image, GRABCUT_SOURCES[source_name]
            )
        else:
            processed = remove_edge_background(image)
        processed.save(destination, "PNG", optimize=True)
    else:
        image.convert("RGB").save(destination, "PNG", optimize=True)


def save_sheet_assets() -> None:
    sheet_path = INCOMING / "component_sheet_source.png"
    if not sheet_path.exists():
        raise FileNotFoundError(f"Missing incoming source: {sheet_path}")
    sheet = Image.open(sheet_path)
    for relative_output, (box, transparent) in SHEET_CROPS.items():
        destination = ASSETS / relative_output
        ensure_parent(destination)
        crop = sheet.crop(box)
        if transparent:
            crop = remove_edge_background(crop)
        else:
            crop = crop.convert("RGB")
        crop.save(destination, "PNG", optimize=True)


def save_placeholders() -> None:
    placeholder = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for relative_output in PLACEHOLDERS:
        destination = ASSETS / relative_output
        ensure_parent(destination)
        placeholder.save(destination, "PNG", optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--only-problematic",
        action="store_true",
        help="regenerate only sources that require vignette segmentation",
    )
    args = parser.parse_args()

    selected_sources = (
        {
            name: value
            for name, value in SOURCE_MAP.items()
            if name in GRABCUT_SOURCES
        }
        if args.only_problematic
        else SOURCE_MAP
    )
    for source_name, (relative_output, transparent) in selected_sources.items():
        save_source(source_name, relative_output, transparent)
    if args.only_problematic:
        print(f"Reprocessed {len(selected_sources)} problematic supplied assets.")
    else:
        save_sheet_assets()
        save_placeholders()
        print(f"Processed {len(SOURCE_MAP) + len(SHEET_CROPS)} supplied assets.")
        print(f"Created {len(PLACEHOLDERS)} transparent placeholders.")


if __name__ == "__main__":
    main()
