"""children table. Mirrors database/schema.sql. A child belongs to exactly one user."""
from extensions import db
from utils.clock import iso_utc, utcnow


class Child(db.Model):
    __tablename__ = "children"
    __table_args__ = (db.CheckConstraint("age BETWEEN 1 AND 18", name="ck_children_age"),)

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)          # first name only (privacy)
    age = db.Column(db.Integer, nullable=False)
    delay_domain = db.Column(db.String(50), nullable=False)
    notes = db.Column(db.String(500), nullable=True)
    photo_url = db.Column(db.String(255), nullable=True)      # preset avatar id; real uploads are out of scope
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    user = db.relationship("User", back_populates="children")
    schedules = db.relationship("Schedule", back_populates="child", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "age": self.age,
            "delay_domain": self.delay_domain,
            "notes": self.notes,
            "photo_url": self.photo_url,
            "created_at": iso_utc(self.created_at),
        }
