"""Extract the supplied UI asset sheet into the app's asset folders.

The source sheet is the handoff image supplied with the project. Crops are
pixel-based so the artwork itself is preserved instead of being redrawn.
"""

from collections import deque
from pathlib import Path

from PIL import Image


SOURCE = Path("/Users/effy/ChatGPT Image 2026年7月30日 11_24_58.png")
ASSETS = Path(__file__).resolve().parents[1] / "src" / "assets"


def crop(name: str, box: tuple[int, int, int, int], transparent: bool = False) -> None:
    image = Image.open(SOURCE).convert("RGBA").crop(box)
    if transparent:
        image = remove_connected_white(image)
        bbox = image.getbbox()
        if bbox:
            image = image.crop(bbox)
    target = ASSETS / name
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, optimize=True)


def remove_connected_white(image: Image.Image) -> Image.Image:
    """Make only near-white pixels connected to an edge transparent."""

    pixels = image.load()
    width, height = image.size
    seen = set()
    queue = deque()

    def is_background(x: int, y: int) -> bool:
        red, green, blue, _ = pixels[x, y]
        return red >= 244 and green >= 244 and blue >= 244

    for x in range(width):
        for y in (0, height - 1):
            if is_background(x, y):
                queue.append((x, y))
    for y in range(height):
        for x in (0, width - 1):
            if is_background(x, y):
                queue.append((x, y))

    while queue:
        x, y = queue.popleft()
        if (x, y) in seen or not is_background(x, y):
            continue
        seen.add((x, y))
        red, green, blue, _ = pixels[x, y]
        distance = max(0, 255 - min(red, green, blue))
        pixels[x, y] = (red, green, blue, min(255, distance * 20))
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in seen:
                queue.append((nx, ny))
    return image


def main() -> None:
    crops = {
        "background/bg_main.png": ((17, 38, 614, 412), False),
        "cards/card_large.png": ((18, 497, 249, 601), False),
        "cards/card_with_map.png": ((268, 497, 497, 601), False),
        "cards/card_signin.png": ((18, 769, 191, 870), False),
        "cards/card_records.png": ((211, 769, 383, 870), False),
        "cards/card_activity.png": ((18, 903, 383, 1008), False),
        "buttons/btn_primary.png": ((537, 500, 812, 566), True),
        "frog/frog_default_1.png": ((738, 48, 836, 155), True),
        "frog/frog_focus_1.png": ((738, 194, 833, 301), True),
        "frog/frog_wave.png": ((738, 337, 829, 440), True),
        "frog/frog_backpack.png": ((1070, 336, 1188, 454), True),
        "icons/nav_home.png": ((506, 620, 560, 676), True),
        "icons/nav_map.png": ((574, 620, 628, 676), True),
        "icons/nav_observe.png": ((642, 620, 699, 676), True),
        "icons/nav_record.png": ((710, 620, 765, 676), True),
        "icons/nav_report.png": ((773, 620, 829, 676), True),
        "icons/nav_profile.png": ((838, 620, 891, 676), True),
        "icons/icon_clover.png": ((548, 869, 610, 930), True),
        "icons/icon_clipboard.png": ((649, 868, 704, 933), True),
        "progress/vine_background.png": ((26, 1164, 287, 1195), True),
        "progress/progress_vine.png": ((26, 1164, 230, 1195), True),
    }
    for name, (box, transparent) in crops.items():
        crop(name, box, transparent)


if __name__ == "__main__":
    main()
