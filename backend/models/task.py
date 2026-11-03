"""tasks table. `position` decides the display order; the SERVER sets completed_at (UTC)."""
from extensions import db
from utils.clock import iso_utc, utcnow

CATEGORIES = ("hygiene", "food", "school", "play")
STATUSES = ("pending", "completed")


class Task(db.Model):
    __tablename__ = "tasks"
    __table_args__ = (
        db.CheckConstraint("duration BETWEEN 5 AND 240", name="ck_tasks_duration"),
        db.CheckConstraint(
            "(status = 'completed' AND completed_at IS NOT NULL) OR (status = 'pending' AND completed_at IS NULL)",
            name="ck_tasks_completed"),
        db.Index("idx_tasks_schedule_position", "schedule_id", "position"),
    )

    id = db.Column(db.Integer, primary_key=True)
    schedule_id = db.Column(db.Integer, db.ForeignKey("schedules.id", ondelete="CASCADE"), nullable=False)
    name = db.Column(db.String(100), nullable=False)          # copy of the activity name at the time of adding
    icon = db.Column(db.String(50), nullable=False)           # Font Awesome class, for example fa-tooth
    category = db.Column(db.Enum(*CATEGORIES, name="task_category"), nullable=False)
    time = db.Column(db.Time, nullable=False)                 # planned wall-clock time, no time zone
    duration = db.Column(db.Integer, nullable=False)          # minutes, 5 to 240
    position = db.Column(db.Integer, nullable=False)          # 1 to n, canonical order
    reminder_minutes = db.Column(db.Integer, nullable=True)   # stored only; nothing is sent
    status = db.Column(db.Enum(*STATUSES, name="task_status"), nullable=False, default="pending")
    completed_at = db.Column(db.DateTime, nullable=True)      # UTC, set by the server

    schedule = db.relationship("Schedule", back_populates="tasks")

    def set_status(self, status):
        """The one place that keeps status and completed_at consistent (the CHECK constraint in the database).

        Completing an already completed task keeps the original completed_at, so repeating the
        request is safe (idempotent).
        """
        if status == "completed":
            if self.status != "completed" or self.completed_at is None:
                self.completed_at = utcnow()
            self.status = "completed"
        else:
            self.status = "pending"
            self.completed_at = None

    def to_dict(self):
        return {
            "id": self.id,
            "schedule_id": self.schedule_id,
            "name": self.name,
            "icon": self.icon,
            "category": self.category,
            "time": self.time.strftime("%H:%M"),
            "duration": self.duration,
            "position": self.position,
            "reminder_minutes": self.reminder_minutes,
            "status": self.status,
            "completed_at": iso_utc(self.completed_at),
        }
