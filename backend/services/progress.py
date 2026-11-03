"""Progress calculations, kept apart from the routes so they can be unit-tested.

Rules:
  - Completion rate = completed / scheduled, None (a dash in the UI) when scheduled is 0.
  - A task counts on the day of its schedule (schedules.date), not the day it was completed.
  - "Week" = rolling 7 days and "Month" = rolling 30 days, both ending today (assumed: rolling, not calendar, ranges).
  - `today` comes from the browser so the child's local day is used, not the server's.
  - The weekly trend is always the last four rolling 7-day blocks ending today, whatever the range.
  - Upcoming routines = schedules dated today or later that still have a pending task (assumed definition).
"""
from datetime import timedelta

from sqlalchemy import distinct, func

from extensions import db
from models.child import Child
from models.schedule import Schedule
from models.task import Task

RANGE_DAYS = {"today": 1, "week": 7, "month": 30}
TREND_WEEKS = 4


def completion_rate(completed: int, scheduled: int):
    """Return a float between 0 and 1, or None when nothing was scheduled."""
    if scheduled == 0:
        return None
    return completed / scheduled


def range_window(range_name, today):
    """(start, end) dates of a rolling range that ends today, both inclusive."""
    return today - timedelta(days=RANGE_DAYS[range_name] - 1), today


def _tally(rows):
    """rows are (date, name, status). Returns (scheduled, completed)."""
    scheduled = completed = 0
    for _day, _name, status in rows:
        scheduled += 1
        if status == "completed":
            completed += 1
    return scheduled, completed


def _point(scheduled, completed, **labels):
    return {**labels, "scheduled": scheduled, "completed": completed,
            "completion_rate": completion_rate(completed, scheduled)}


def summarize(rows):
    scheduled, completed = _tally(rows)
    return {"scheduled": scheduled, "completed": completed,
            "completion_rate": completion_rate(completed, scheduled)}


def daily_series(rows, start, end):
    """One point per day from start to end, including days with nothing scheduled."""
    per_day = {}
    for day, _name, status in rows:
        entry = per_day.setdefault(day, [0, 0])
        entry[0] += 1
        entry[1] += status == "completed"
    series, day = [], start
    while day <= end:
        scheduled, completed = per_day.get(day, (0, 0))
        series.append(_point(scheduled, completed, date=day.isoformat()))
        day += timedelta(days=1)
    return series


def weekly_series(rows, today, weeks=TREND_WEEKS):
    """The last `weeks` rolling 7-day blocks ending today, oldest first."""
    series = []
    for back in range(weeks - 1, -1, -1):
        block_end = today - timedelta(days=7 * back)
        block_start = block_end - timedelta(days=6)
        block = [r for r in rows if block_start <= r[0] <= block_end]
        scheduled, completed = _tally(block)
        series.append(_point(scheduled, completed, start=block_start.isoformat(), end=block_end.isoformat()))
    return series


def task_breakdown(rows):
    """Completion per task name (case-insensitive), best completion first."""
    groups = {}
    for _day, name, status in rows:
        key = name.strip().lower()
        entry = groups.setdefault(key, {"name": name, "scheduled": 0, "completed": 0})
        entry["scheduled"] += 1
        entry["completed"] += status == "completed"
    items = [_point(g["scheduled"], g["completed"], name=g["name"]) for g in groups.values()]
    items.sort(key=lambda p: (-p["completion_rate"], p["name"].lower()))
    return items


def progress_for_child(child_id, range_name, today):
    """Everything the progress page needs, from the same rows the child view writes."""
    start, end = range_window(range_name, today)
    fetch_from = min(start, today - timedelta(days=7 * TREND_WEEKS - 1))
    rows = (db.session.query(Schedule.date, Task.name, Task.status)
            .join(Task, Task.schedule_id == Schedule.id)
            .filter(Schedule.child_id == child_id, Schedule.date >= fetch_from, Schedule.date <= end)
            .all())
    rows = [tuple(r) for r in rows]
    in_range = [r for r in rows if start <= r[0] <= end]
    return {
        "child_id": child_id,
        "range": range_name,
        "start": start.isoformat(),
        "end": end.isoformat(),
        "summary": summarize(in_range),
        "daily": daily_series(in_range, start, end),
        "weekly": weekly_series(rows, today),
        "tasks": task_breakdown(in_range),
    }


def dashboard_summary(user_id, today):
    """The three stat cards. Only the signed-in user's children are counted."""
    total_children = Child.query.filter_by(user_id=user_id).count()

    completed_today = (db.session.query(func.count(Task.id))
                       .join(Schedule, Task.schedule_id == Schedule.id)
                       .join(Child, Schedule.child_id == Child.id)
                       .filter(Child.user_id == user_id, Schedule.date == today, Task.status == "completed")
                       .scalar())

    upcoming = (db.session.query(func.count(distinct(Schedule.id)))
                .join(Task, Task.schedule_id == Schedule.id)
                .join(Child, Schedule.child_id == Child.id)
                .filter(Child.user_id == user_id, Schedule.date >= today, Task.status == "pending")
                .scalar())

    return {"total_children": total_children,
            "tasks_completed_today": completed_today or 0,
            "upcoming_routines": upcoming or 0}
