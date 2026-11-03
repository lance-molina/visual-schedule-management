"""schedules table. One schedule per child per date (UNIQUE child_id + date)."""
from extensions import db
from utils.clock import iso_utc, utcnow


class Schedule(db.Model):
    __tablename__ = "schedules"
    __table_args__ = (db.UniqueConstraint("child_id", "date", name="uq_schedules_child_date"),)

    id = db.Column(db.Integer, primary_key=True)
    child_id = db.Column(db.Integer, db.ForeignKey("children.id", ondelete="CASCADE"), nullable=False)
    date = db.Column(db.Date, nullable=False)                 # the child's local calendar day
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    child = db.relationship("Child", back_populates="schedules")
    tasks = db.relationship("Task", back_populates="schedule", cascade="all, delete-orphan",
                            order_by="Task.position, Task.id")

    def to_dict(self, with_tasks=True):
        body = {
            "id": self.id,
            "child_id": self.child_id,
            "date": self.date.isoformat(),
            "created_at": iso_utc(self.created_at),
        }
        if with_tasks:
            body["tasks"] = [t.to_dict() for t in self.tasks]
        return body
