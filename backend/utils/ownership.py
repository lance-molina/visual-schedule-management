"""Ownership checks live INSIDE the queries (filter by the signed-in user), not after loading.

Chain: task -> schedule -> child -> user. A foreign or missing row both return 404, so a user
cannot probe which ids exist.
"""
from flask_jwt_extended import get_jwt_identity

from extensions import db
from models.card import BoardCard
from models.child import Child
from models.schedule import Schedule
from models.task import Task
from models.user import User
from utils.errors import ApiError, not_found


def current_user_id():
    """The id stored in the token. The token subject is always a string, so convert it back."""
    return int(get_jwt_identity())


def current_user():
    user = db.session.get(User, current_user_id())
    if user is None:     # a valid token for an account that no longer exists
        raise ApiError(401, "unauthorized", "Authentication required")
    return user


def get_child_or_404(child_id, user_id):
    child = Child.query.filter_by(id=child_id, user_id=user_id).first()
    if child is None:
        raise not_found()
    return child


def get_schedule_or_404(schedule_id, user_id):
    schedule = (Schedule.query
                .join(Child, Schedule.child_id == Child.id)
                .filter(Schedule.id == schedule_id, Child.user_id == user_id)
                .first())
    if schedule is None:
        raise not_found()
    return schedule


def get_task_or_404(task_id, user_id):
    task = (Task.query
            .join(Schedule, Task.schedule_id == Schedule.id)
            .join(Child, Schedule.child_id == Child.id)
            .filter(Task.id == task_id, Child.user_id == user_id)
            .first())
    if task is None:
        raise not_found()
    return task


def get_card_or_404(card_id, user_id):
    card = BoardCard.query.filter_by(id=card_id, user_id=user_id).first()
    if card is None:
        raise not_found()
    return card
