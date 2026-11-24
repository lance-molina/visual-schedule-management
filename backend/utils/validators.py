"""Input validation. Limits here must match docs/api.md and database/schema.sql.

Every validate_* function returns cleaned data, or raises
ApiError(400, "validation_error", "Invalid input", fields) where `fields` maps field name -> message.
Unknown keys in a request body are ignored.
"""
import base64
import binascii
import datetime as dt
import re

from flask import request

from models.card import CARD_ICONS
from models.task import CATEGORIES, STATUSES
from models.user import CONTRASTS, FONT_SIZES, LANGUAGES, ROLES
from utils.errors import ApiError

LIMITS = {
    "name_max": 100,
    "email_max": 255,
    "age_min": 1,
    "age_max": 18,
    "domain_max": 50,
    "duration_min": 5,
    "duration_max": 240,
    "notes_max": 500,
    "password_min": 8,
    "password_max": 72,          # bcrypt only uses the first 72 BYTES, so longer passwords are rejected
    "position_min": 1,
    "position_max": 1000,
    "reminder_max": 60,
    "tasks_per_schedule_max": 50,
    "card_label_max": 30,
    "card_category_max": 30,
    "cards_per_user_max": 100,
    "card_photos_per_user_max": 30,
    "card_image_max_chars": 60000,   # about 45 KB of JPEG; the browser shrinks photos to fit
    "speech_rate_min": 0.5,
    "speech_rate_max": 1.4,
}

_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_TIME = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
_IMAGE_PREFIX = "data:image/jpeg;base64,"
_ICON = re.compile(r"^fa-[a-z0-9-]{1,45}$")          # a Font Awesome class name, nothing else
_AVATAR = re.compile(r"^[a-z0-9_-]{1,50}$")          # a preset avatar id, never a URL
_MIN_DATE, _MAX_DATE = dt.date(2000, 1, 1), dt.date(2100, 12, 31)

SETTING_BOOLS = ("sound_on", "notify_daily", "notify_task", "notify_weekly")


def _fail(fields):
    raise ApiError(400, "validation_error", "Invalid input", fields)


def json_body():
    """The request body as a dict, or a 400 for missing or malformed JSON."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError(400, "bad_request", "Request body must be a JSON object")
    return data


# ---------------------------------------------------------------- field helpers

def _str(data, key, fields, out, *, max_len, required=True, nullable=False):
    """Trimmed text. A blank optional (nullable) value becomes None."""
    if key not in data:
        if required:
            fields[key] = "Required"
        return
    value = data[key]
    if value is None:
        if nullable:
            out[key] = None
        else:
            fields[key] = "Required"
        return
    if not isinstance(value, str):
        fields[key] = "Must be text"
        return
    value = value.strip()
    if not value:
        if nullable:
            out[key] = None
        else:
            fields[key] = "Required"
        return
    if len(value) > max_len:
        fields[key] = f"Use at most {max_len} characters"
        return
    out[key] = value


def _int(data, key, fields, out, *, lo, hi, required=True, nullable=False):
    if key not in data:
        if required:
            fields[key] = "Required"
        return
    value = data[key]
    if value is None:
        if nullable:
            out[key] = None
        else:
            fields[key] = "Required"
        return
    if isinstance(value, bool) or not isinstance(value, int):
        fields[key] = "Must be a whole number"
        return
    if not lo <= value <= hi:
        fields[key] = f"Must be between {lo} and {hi}"
        return
    out[key] = value


def _choice(data, key, fields, out, *, options, required=True):
    if key not in data:
        if required:
            fields[key] = "Required"
        return
    if data[key] not in options:
        fields[key] = "Must be one of: " + ", ".join(options)
        return
    out[key] = data[key]


def parse_date(value):
    """'YYYY-MM-DD' -> date, or None when it is not a real date in a sensible range."""
    if not isinstance(value, str) or not _DATE.match(value):
        return None
    try:
        parsed = dt.date.fromisoformat(value)
    except ValueError:
        return None
    return parsed if _MIN_DATE <= parsed <= _MAX_DATE else None


def _date(data, key, fields, out, *, required=True):
    if key not in data or data[key] is None:
        if required:
            fields[key] = "Required"
        return
    parsed = parse_date(data[key])
    if parsed is None:
        fields[key] = "Use the format YYYY-MM-DD"
        return
    out[key] = parsed


def _email(data, key, fields, out, *, required=True):
    clean = {}
    _str(data, key, fields, clean, max_len=LIMITS["email_max"], required=required)
    if key in clean:
        email = clean[key].lower()
        if not _EMAIL.match(email):
            fields[key] = "Enter a valid email address"
        else:
            out[key] = email


# ---------------------------------------------------------------- auth

def validate_register(data):
    fields, out = {}, {}
    _str(data, "name", fields, out, max_len=LIMITS["name_max"])
    _email(data, "email", fields, out)
    _choice(data, "role", fields, out, options=ROLES)

    password = data.get("password")
    if not isinstance(password, str) or not password:
        fields["password"] = "Required"
    elif len(password) < LIMITS["password_min"] or len(password.encode("utf-8")) > LIMITS["password_max"]:
        fields["password"] = f"Use {LIMITS['password_min']} to {LIMITS['password_max']} characters"
    else:
        out["password"] = password

    if fields:
        _fail(fields)
    return out


def validate_login(data):
    fields, out = {}, {}
    _email(data, "email", fields, out)
    if not isinstance(data.get("password"), str) or not data["password"]:
        fields["password"] = "Required"
    else:
        out["password"] = data["password"]
    remember = data.get("remember", False)
    if not isinstance(remember, bool):
        fields["remember"] = "Must be true or false"
    out["remember"] = remember is True
    if fields:
        _fail(fields)
    return out


def _settings(raw, fields, out):
    if not isinstance(raw, dict):
        fields["settings"] = "Must be an object"
        return
    clean, problems = {}, {}
    for key, options in (("font_size", FONT_SIZES), ("contrast", CONTRASTS), ("language", LANGUAGES)):
        _choice(raw, key, problems, clean, options=options, required=False)
    for key in SETTING_BOOLS:
        if key in raw:
            if isinstance(raw[key], bool):
                clean[key] = raw[key]
            else:
                problems[key] = "Must be true or false"
    known = {"font_size", "contrast", "language", *SETTING_BOOLS}
    for key in raw:
        if key not in known:
            problems[key] = "Unknown setting"
    for key, message in problems.items():
        fields[f"settings.{key}"] = message   # reported with a "settings." prefix
    out["settings"] = clean


def validate_profile(data):
    """PATCH /api/auth/me: any of name, email, role, settings."""
    fields, out = {}, {}
    _str(data, "name", fields, out, max_len=LIMITS["name_max"], required=False)
    _email(data, "email", fields, out, required=False)
    _choice(data, "role", fields, out, options=ROLES, required=False)
    if "settings" in data:
        _settings(data["settings"], fields, out)
    if fields:
        _fail(fields)
    return out


# ---------------------------------------------------------------- children

def validate_child(data):
    """Create or replace a child. name, age and delay_domain are required; notes and photo_url optional."""
    fields, out = {}, {}
    _str(data, "name", fields, out, max_len=LIMITS["name_max"])
    _int(data, "age", fields, out, lo=LIMITS["age_min"], hi=LIMITS["age_max"])
    _str(data, "delay_domain", fields, out, max_len=LIMITS["domain_max"])
    _str(data, "notes", fields, out, max_len=LIMITS["notes_max"], required=False, nullable=True)
    _str(data, "photo_url", fields, out, max_len=LIMITS["domain_max"], required=False, nullable=True)
    if out.get("photo_url") and not _AVATAR.match(out["photo_url"]):
        fields["photo_url"] = "Must be a preset avatar id"
    if fields:
        _fail(fields)
    return out


# ---------------------------------------------------------------- tasks

def _task_into(data, fields, out, *, prefix="", partial=False, allow_status=False):
    """Validate one task body. `prefix` labels the errors when the task sits inside a schedule."""
    local, clean = {}, {}
    required = not partial
    _str(data, "name", local, clean, max_len=LIMITS["name_max"], required=required)
    _str(data, "icon", local, clean, max_len=50, required=required)
    if "icon" in clean and not _ICON.match(clean["icon"]):
        local["icon"] = "Must be a Font Awesome class such as fa-tooth"
    _choice(data, "category", local, clean, options=CATEGORIES, required=required)

    if "time" in data or required:
        if not isinstance(data.get("time"), str) or not _TIME.match(data["time"]):
            local["time"] = "Use the format HH:MM"
        else:
            clean["time"] = dt.time.fromisoformat(data["time"])

    _int(data, "duration", local, clean, lo=LIMITS["duration_min"], hi=LIMITS["duration_max"], required=required)
    _int(data, "position", local, clean, lo=LIMITS["position_min"], hi=LIMITS["position_max"], required=False)
    _int(data, "reminder_minutes", local, clean, lo=0, hi=LIMITS["reminder_max"], required=False, nullable=True)
    if allow_status:
        _choice(data, "status", local, clean, options=STATUSES, required=False)

    for key, message in local.items():
        fields[f"{prefix}{key}"] = message
    out.update(clean)


def validate_task(data, *, partial=False, allow_status=False):
    """POST /api/tasks needs the full set; PUT /api/tasks/<id> (partial=True) accepts any subset."""
    fields, out = {}, {}
    _task_into(data, fields, out, partial=partial, allow_status=allow_status)
    if not partial:
        _int(data, "schedule_id", fields, out, lo=1, hi=2**31 - 1)
    if fields:
        _fail(fields)
    return out


# ---------------------------------------------------------------- schedules

def validate_schedule(data):
    """POST /api/schedules: child_id, date and an optional list of tasks."""
    fields, out = {}, {}
    _int(data, "child_id", fields, out, lo=1, hi=2**31 - 1)
    _date(data, "date", fields, out)

    out["tasks"] = []
    raw_tasks = data.get("tasks", [])
    if raw_tasks is None:
        raw_tasks = []
    if not isinstance(raw_tasks, list):
        fields["tasks"] = "Must be a list"
    elif len(raw_tasks) > LIMITS["tasks_per_schedule_max"]:
        fields["tasks"] = f"At most {LIMITS['tasks_per_schedule_max']} tasks per schedule"
    else:
        for index, raw in enumerate(raw_tasks):
            if not isinstance(raw, dict):
                fields[f"tasks[{index}]"] = "Must be an object"
                continue
            clean = {}
            _task_into(raw, fields, clean, prefix=f"tasks[{index}].")
            out["tasks"].append(clean)
    if fields:
        _fail(fields)
    return out


def validate_schedule_update(data):
    """PUT /api/schedules/<id> changes the date only. Tasks have their own endpoints."""
    fields, out = {}, {}
    _date(data, "date", fields, out)
    if "tasks" in data:
        fields["tasks"] = "Change tasks with the task endpoints"
    if fields:
        _fail(fields)
    return out


# ---------------------------------------------------------------- query strings

def query_int(name, *, default=None, lo=1, hi=2**31 - 1):
    raw = request.args.get(name)
    if raw is None or raw == "":
        if default is None:
            _fail({name: "Required"})
        return default
    if not re.fullmatch(r"\d{1,10}", raw) or not lo <= int(raw) <= hi:
        _fail({name: f"Must be a whole number between {lo} and {hi}"})
    return int(raw)


def query_date(name, *, default=None):
    raw = request.args.get(name)
    if raw is None or raw == "":
        if default is None:
            _fail({name: "Required"})
        return default
    parsed = parse_date(raw)
    if parsed is None:
        _fail({name: "Use the format YYYY-MM-DD"})
    return parsed


def query_choice(name, options, *, default):
    raw = request.args.get(name)
    if raw is None or raw == "":
        return default
    if raw not in options:
        _fail({name: "Must be one of: " + ", ".join(options)})
    return raw


def validate_card(data):
    """Talking-board card: label (spoken word), category, and one preset icon."""
    fields, out = {}, {}
    _str(data, "label", fields, out, max_len=LIMITS["card_label_max"])
    _str(data, "category", fields, out, max_len=LIMITS["card_category_max"])
    _choice(data, "icon", fields, out, options=CARD_ICONS)
    _str(data, "label_fil", fields, out, max_len=LIMITS["card_label_max"], required=False, nullable=True)
    _card_image(data, fields, out)
    if fields:
        _fail(fields)
    return out


def _card_image(data, fields, out):
    """Optional photo. Only a small JPEG data URL is accepted: the prefix, the size, valid base64 and the JPEG
    signature are all checked, so nothing else can be stored or later rendered as an image source."""
    value = data.get("image")
    if value is None or value == "":
        out["image"] = None
        return
    if not isinstance(value, str) or not value.startswith(_IMAGE_PREFIX):
        fields["image"] = "Must be a JPEG picture"
        return
    if len(value) > LIMITS["card_image_max_chars"]:
        fields["image"] = "The picture is too big; use a smaller one"
        return
    try:
        raw = base64.b64decode(value[len(_IMAGE_PREFIX):], validate=True)
    except (binascii.Error, ValueError):
        fields["image"] = "Must be a JPEG picture"
        return
    if not raw.startswith(b"\xff\xd8\xff"):
        fields["image"] = "Must be a JPEG picture"
        return
    out["image"] = value


def validate_speech_rate(value):
    """Speech speed as a multiplier (1 = normal). Missing means the default slightly slow speed."""
    if value is None:
        return 0.85
    lo, hi = LIMITS["speech_rate_min"], LIMITS["speech_rate_max"]
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not lo <= value <= hi:
        _fail({"rate": f"A number from {lo} to {hi}"})
    return round(float(value), 2)
