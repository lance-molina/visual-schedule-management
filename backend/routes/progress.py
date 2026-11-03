"""Dashboard and progress routes. The calculations live in services/progress.py.

GET /api/dashboard/summary   counts for the three stat cards (?today=YYYY-MM-DD from the browser)
GET /api/progress            data for charts and cards (?child_id=&range=today|week|month&today=)
"""
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from services import progress as progress_service
from utils.clock import utcnow
from utils.ownership import current_user_id, get_child_or_404
from utils.validators import query_choice, query_date, query_int

bp = Blueprint("progress", __name__)


@bp.get("/dashboard/summary")
@jwt_required()
def dashboard_summary():
    # The browser sends its own local date; the server's UTC date is only a fallback.
    today = query_date("today", default=utcnow().date())
    return jsonify(progress_service.dashboard_summary(current_user_id(), today))


@bp.get("/progress")
@jwt_required()
def progress():
    child_id = query_int("child_id")
    range_name = query_choice("range", tuple(progress_service.RANGE_DAYS), default="week")
    today = query_date("today", default=utcnow().date())
    child = get_child_or_404(child_id, current_user_id())     # 404 for another user's child
    return jsonify(progress_service.progress_for_child(child.id, range_name, today))
