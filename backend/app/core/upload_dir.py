import os
from pathlib import Path

# backend/app/core/upload_dir.py -> backend/
_BACKEND_ROOT = Path(__file__).resolve().parents[2]
_DEFAULT_ROOT = _BACKEND_ROOT / "uploads"
_FALLBACK_ROOT = Path("/tmp/field-practice-uploads")


def get_uploads_root() -> Path:
    """Return a writable uploads directory.

    Local/dev keeps using <backend>/uploads. Production sandboxes with a
    read-only filesystem (e.g. veFaaS) fall back to /tmp.
    An explicit UPLOADS_DIR environment variable always wins.
    """
    override = os.getenv("UPLOADS_DIR", "").strip().strip('"').strip("'")
    if override:
        root = Path(override)
        root.mkdir(parents=True, exist_ok=True)
        return root

    try:
        _DEFAULT_ROOT.mkdir(parents=True, exist_ok=True)
        probe = _DEFAULT_ROOT / ".write_probe"
        probe.touch()
        probe.unlink()
        return _DEFAULT_ROOT
    except OSError:
        _FALLBACK_ROOT.mkdir(parents=True, exist_ok=True)
        return _FALLBACK_ROOT
