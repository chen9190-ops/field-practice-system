#!/usr/bin/env python3
"""Audit generated home-page PNG assets without modifying them."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "src" / "assets"
REPORT = ROOT / "scripts" / "asset_report.json"

FORMAL_ASSETS = [
    "background/bg_main.png",
    "buttons/btn_primary.png",
    "cards/card_activity.png",
    "cards/card_large.png",
    "cards/card_progress.png",
    "cards/card_records.png",
    "cards/card_signin.png",
    "cards/card_with_map.png",
    "decoration/dec_flower.png",
    "decoration/dec_grass.png",
    "decoration/dec_mushroom.png",
    "decoration/dec_plant.png",
    "decoration/dec_rock.png",
    "decoration/dec_ruin.png",
    "decoration/dec_sign.png",
    "frog/frog_default_1.png",
    "navigation/nav_home.png",
    "navigation/nav_map.png",
    "navigation/nav_observe.png",
    "navigation/nav_profile.png",
    "navigation/nav_record.png",
    "navigation/nav_report.png",
    "progress/progress_vine.png",
    "tags/tag_done.png",
    "tags/tag_new.png",
    "tags/tag_progress.png",
]

PLACEHOLDERS = [
    "decoration/dec_stone.png",
    "frog/frog_backpack.png",
    "frog/frog_default_2.png",
    "frog/frog_default_3.png",
    "frog/frog_focus_1.png",
    "frog/frog_focus_2.png",
    "frog/frog_focus_3.png",
    "frog/frog_sit.png",
    "frog/frog_wave.png",
    "icons/icon_clipboard.png",
    "icons/icon_clover.png",
    "icons/icon_mail.png",
    "icons/icon_map.png",
    "icons/icon_notebook.png",
    "icons/icon_search.png",
]

OPAQUE_ASSETS = {
    "background/bg_main.png",
    "cards/card_activity.png",
    "cards/card_large.png",
    "cards/card_progress.png",
    "cards/card_records.png",
    "cards/card_signin.png",
    "cards/card_with_map.png",
}


def inspect(relative_name: str, kind: str) -> dict:
    path = ASSETS / relative_name
    result = {
        "filename": relative_name,
        "kind": kind,
        "width": 0,
        "height": 0,
        "mode": None,
        "hasAlpha": False,
        "visibleBoundingBox": None,
        "isFullyTransparent": False,
        "status": "error",
    }
    if not path.is_file() or path.stat().st_size == 0:
        result["issues"] = ["missing or empty file"]
        return result

    issues = []
    with Image.open(path) as image:
        image.load()
        result["width"], result["height"] = image.size
        result["mode"] = image.mode
        result["hasAlpha"] = "A" in image.getbands()
        alpha = image.getchannel("A") if result["hasAlpha"] else None
        bbox = alpha.getbbox() if alpha else (0, 0, image.width, image.height)
        result["visibleBoundingBox"] = list(bbox) if bbox else None
        result["isFullyTransparent"] = bbox is None

    if kind == "formal":
        if result["isFullyTransparent"]:
            issues.append("formal asset is fully transparent")
        if relative_name not in OPAQUE_ASSETS and not result["hasAlpha"]:
            issues.append("transparent asset has no alpha channel")
    elif not result["isFullyTransparent"]:
        issues.append("placeholder is expected to be fully transparent")

    result["status"] = "pass" if not issues else "fail"
    if issues:
        result["issues"] = issues
    return result


def main() -> None:
    assets = [
        *(inspect(name, "formal") for name in FORMAL_ASSETS),
        *(inspect(name, "placeholder") for name in PLACEHOLDERS),
    ]
    payload = {
        "summary": {
            "formal": len(FORMAL_ASSETS),
            "placeholders": len(PLACEHOLDERS),
            "passed": sum(item["status"] == "pass" for item in assets),
            "failed": sum(item["status"] == "fail" for item in assets),
        },
        "assets": assets,
    }
    REPORT.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(payload["summary"], ensure_ascii=False))


if __name__ == "__main__":
    main()
