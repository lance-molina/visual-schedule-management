"""users table. Mirrors database/schema.sql. Settings live as columns on the user."""
from extensions import db
from utils.clock import iso_utc, utcnow

ROLES = ("caregiver", "occupational_therapist", "sped_teacher")
FONT_SIZES = ("S", "M", "L")
CONTRASTS = ("normal", "high")
LANGUAGES = ("en", "fil")

# The seven preference columns, exposed to the API as the nested `settings` object.
SETTING_KEYS = ("font_size", "contrast", "sound_on", "language",
                "notify_daily", "notify_task", "notify_weekly")


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), nullable=False, unique=True)   # stored lowercase
    password_hash = db.Column(db.String(255), nullable=False)        # bcrypt, never the plain password
    role = db.Column(db.Enum(*ROLES, name="user_role"), nullable=False)

    font_size = db.Column(db.Enum(*FONT_SIZES, name="font_size"), nullable=False, default="M")
    contrast = db.Column(db.Enum(*CONTRASTS, name="contrast"), nullable=False, default="normal")
    sound_on = db.Column(db.Boolean, nullable=False, default=True)
    language = db.Column(db.Enum(*LANGUAGES, name="language"), nullable=False, default="en")
    notify_daily = db.Column(db.Boolean, nullable=False, default=False)
    notify_task = db.Column(db.Boolean, nullable=False, default=False)
    notify_weekly = db.Column(db.Boolean, nullable=False, default=False)

    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    children = db.relationship("Child", back_populates="user", cascade="all, delete-orphan")
    cards = db.relationship("BoardCard", back_populates="user", cascade="all, delete-orphan")

    def settings_dict(self):
        return {key: getattr(self, key) for key in SETTING_KEYS}

    def to_dict(self):
        """Public view of a user. Never includes password_hash."""
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "settings": self.settings_dict(),
            "created_at": iso_utc(self.created_at),
        }
