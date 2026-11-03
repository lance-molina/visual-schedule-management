"""Task routes. Chain: task -> schedule -> child -> user.

GET    /api/tasks/<schedule_id>        tasks in position order (default per_page 100)
POST   /api/tasks                      add a task (position defaults to the end)
PUT    /api/tasks/<id>                 edit any subset of fields, including status (this is how undo works)
DELETE /api/tasks/<id>                 remove -> 204
PATCH  /api/tasks/<id>/complete        mark complete; the SERVER sets completed_at (UTC)
"""
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import func

from extensions import db
from models.task import Task
from utils.ownership import current_user_id, get_schedule_or_404, get_task_or_404
from utils.pagination import paginate
from utils.validators import json_body, validate_task

bp = Blueprint("tasks", __name__)

EDITABLE = ("name", "icon", "category", "time", "duration", "position", "reminder_minutes")


@bp.get("/<int:schedule_id>")
@jwt_required()
def tasks_for_schedule(schedule_id):
    get_schedule_or_404(schedule_id, current_user_id())
    query = Task.query.filter_by(schedule_id=schedule_id).order_by(Task.position, Task.id)
    return jsonify(paginate(query, lambda task: task.to_dict(), default_per_page=100))


@bp.post("")
@jwt_required()
def create_task():
    data = validate_task(json_body())
    schedule = get_schedule_or_404(data["schedule_id"], current_user_id())
    position = data.get("position")
    if position is None:
        last = db.session.query(func.max(Task.position)).filter(Task.schedule_id == schedule.id).scalar()
        position = (last or 0) + 1
    task = Task(schedule_id=schedule.id, name=data["name"], icon=data["icon"], category=data["category"],
                time=data["time"], duration=data["duration"], position=position,
                reminder_minutes=data.get("reminder_minutes"))
    db.session.add(task)
    db.session.commit()
    return jsonify(task.to_dict()), 201


@bp.put("/<int:task_id>")
@jwt_required()
def update_task(task_id):
    task = get_task_or_404(task_id, current_user_id())
    data = validate_task(json_body(), partial=True, allow_status=True)
    for key in EDITABLE:
        if key in data:
            setattr(task, key, data[key])
    if "status" in data:
        task.set_status(data["status"])       # keeps completed_at consistent; the client never sends it
    db.session.commit()
    return jsonify(task.to_dict())


@bp.delete("/<int:task_id>")
@jwt_required()
def delete_task(task_id):
    task = get_task_or_404(task_id, current_user_id())
    db.session.delete(task)
    db.session.commit()
    return "", 204


@bp.patch("/<int:task_id>/complete")
@jwt_required()
def complete_task(task_id):
    task = get_task_or_404(task_id, current_user_id())
    task.set_status("completed")
    db.session.commit()
    return jsonify(task.to_dict())
