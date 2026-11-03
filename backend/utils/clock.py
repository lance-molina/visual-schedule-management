"""Time helpers. The database stores UTC without a time zone; the API shows it with a trailing Z."""
from datetime import datetime, timezone


def utcnow():
    """Current time as a naive UTC datetime (what the DATETIME columns hold)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def iso_utc(value):
    """Format a stored (naive UTC) datetime as ISO 8601 with a trailing Z, or None."""
    if value is None:
        return None
    return value.replace(microsecond=0).isoformat() + "Z"
