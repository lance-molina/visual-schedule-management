"""Schedule routes. Chain: schedule -> child -> user.

GET    /api/schedules/<child_id>  schedules of a child, newest date first; ?date= returns zero or one (tasks included)
POST   /api/schedules             create (child_id, date, tasks?) -> 201 | 409 if that child+date exists
PUT    /api/schedules/<id>        change the date only (tasks use their own endpoints)
DELETE /api/schedules/<id>        delete schedule and its tasks -> 204
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from extensions import db
from models.schedule import Schedule
from models.task import Task
from utils.errors import ApiError
from utils.ownership import current_user_id, get_child_or_404, get_schedule_or_404
from utils.pagination import paginate
from utils.validators import json_body, query_date, validate_schedule, validate_schedule_update

bp = Blueprint("schedules", __name__)


def _date_conflict():
    return ApiError(409, "conflict", "This child already has a schedule for that date",
                    {"date": "Already has a schedule"})


@bp.get("/<int:child_id>")
@jwt_required()
def schedules_for_child(child_id):
    get_child_or_404(child_id, current_user_id())
    query = Schedule.query.filter_by(child_id=child_id)
    if request.args.get("date"):
        query = query.filter(Schedule.date == query_date("date"))
    query = query.options(selectinload(Schedule.tasks)).order_by(Schedule.date.desc())
    return jsonify(paginate(query, lambda schedule: schedule.to_dict()))


@bp.post("")
@jwt_required()
def create_schedule():
    data = validate_schedule(json_body())
    get_child_or_404(data["child_id"], current_user_id())
    if Schedule.query.filter_by(child_id=data["child_id"], date=data["date"]).first():
        raise _date_conflict()

    schedule = Schedule(child_id=data["child_id"], date=data["date"])
    for index, task in enumerate(data["tasks"], start=1):
        schedule.tasks.append(Task(
            name=task["name"], icon=task["icon"], category=task["category"], time=task["time"],
            duration=task["duration"], position=task.get("position", index),
            reminder_minutes=task.get("reminder_minutes")))
    db.session.add(schedule)
    try:
        db.session.commit()          # the schedule and all its tasks are saved together or not at all
    except IntegrityError:           # a second request created the same child+date a moment earlier
        db.session.rollback()
        raise _date_conflict()
    return jsonify(schedule.to_dict()), 201


@bp.put("/<int:schedule_id>")
@jwt_required()
def update_schedule(schedule_id):
    schedule = get_schedule_or_404(schedule_id, current_user_id())
    data = validate_schedule_update(json_body())
    clash = Schedule.query.filter(Schedule.child_id == schedule.child_id, Schedule.date == data["date"],
                                  Schedule.id != schedule.id).first()
    if clash:
        raise _date_conflict()
    schedule.date = data["date"]
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise _date_conflict()
    return jsonify(schedule.to_dict())


@bp.delete("/<int:schedule_id>")
@jwt_required()
def delete_schedule(schedule_id):
    schedule = get_schedule_or_404(schedule_id, current_user_id())
    db.session.delete(schedule)
    db.session.commit()
    return "", 204
