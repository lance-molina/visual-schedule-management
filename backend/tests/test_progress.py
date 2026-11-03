"""Progress maths (pure functions) and the dashboard and progress endpoints."""
from datetime import date, timedelta

import pytest

from services.progress import (completion_rate, daily_series, range_window, summarize, task_breakdown,
                               weekly_series)
from tests.helpers import TODAY, make_child, make_schedule, task_payload

T = date.fromisoformat(TODAY)


def day(offset):
    return (T + timedelta(days=offset)).isoformat()


# ------------------------------------------------------------------ pure functions

def test_completion_rate_is_none_when_nothing_scheduled():
    assert completion_rate(0, 0) is None


def test_completion_rate_basic():
    assert completion_rate(3, 4) == 0.75
    assert completion_rate(0, 5) == 0.0
    assert completion_rate(5, 5) == 1.0


def test_range_windows_are_rolling_and_end_today():
    assert range_window("today", T) == (T, T)
    assert range_window("week", T) == (T - timedelta(days=6), T)
    assert range_window("month", T) == (T - timedelta(days=29), T)


def test_daily_series_includes_empty_days_as_none():
    rows = [(T, "a", "completed"), (T, "b", "pending")]
    series = daily_series(rows, T - timedelta(days=2), T)
    assert [p["date"] for p in series] == [day(-2), day(-1), day(0)]
    assert series[0]["completion_rate"] is None and series[0]["scheduled"] == 0
    assert series[2]["completion_rate"] == 0.5


def test_weekly_series_is_four_blocks_ending_today():
    rows = [(T, "a", "completed"), (T - timedelta(days=7), "a", "pending"), (T - timedelta(days=27), "a", "completed")]
    series = weekly_series(rows, T)
    assert len(series) == 4
    assert series[-1]["end"] == TODAY and series[-1]["start"] == day(-6)
    assert [p["scheduled"] for p in series] == [1, 0, 1, 1]
    assert series[0]["start"] == day(-27)


def test_task_breakdown_groups_names_case_insensitively_best_first():
    rows = [(T, "Brush teeth", "completed"), (T, "brush teeth", "completed"), (T, "Eat", "pending"),
            (T, "Eat", "completed"), (T, "Bath", "pending")]
    result = task_breakdown(rows)
    assert [(p["name"], p["scheduled"], p["completed"]) for p in result] == [
        ("Brush teeth", 2, 2), ("Eat", 2, 1), ("Bath", 1, 0)]


def test_summarize_counts_each_task_once():
    assert summarize([(T, "a", "completed"), (T, "b", "pending"), (T, "c", "completed")]) == {
        "scheduled": 3, "completed": 2, "completion_rate": 2 / 3}


# ------------------------------------------------------------------ endpoints

def seed_day(client, user, child_id, offset, statuses):
    """A schedule `offset` days from TODAY whose tasks end up with the given statuses."""
    tasks = [task_payload(name=f"Task {i + 1}", time=f"{8 + i:02d}:00") for i in range(len(statuses))]
    schedule = make_schedule(client, user, child_id, date=day(offset), tasks=tasks)
    for task, status in zip(schedule["tasks"], statuses):
        if status == "completed":
            client.patch(f"/api/tasks/{task['id']}/complete", headers=user["headers"])
    return schedule


def get_progress(client, user, child_id, range_name):
    res = client.get(f"/api/progress?child_id={child_id}&range={range_name}&today={TODAY}", headers=user["headers"])
    assert res.status_code == 200, res.get_json()
    return res.get_json()


@pytest.fixture()
def child(client, user_a):
    return make_child(client, user_a)


def test_today_range_figures(client, user_a, child):
    seed_day(client, user_a, child["id"], 0, ["completed", "completed", "pending"])
    body = get_progress(client, user_a, child["id"], "today")
    assert body["summary"] == {"scheduled": 3, "completed": 2, "completion_rate": 2 / 3}
    assert len(body["daily"]) == 1 and body["start"] == body["end"] == TODAY


def test_week_range_is_rolling_seven_days(client, user_a, child):
    seed_day(client, user_a, child["id"], 0, ["completed", "completed", "pending"])
    seed_day(client, user_a, child["id"], -6, ["completed", "pending"])     # first day of the window
    seed_day(client, user_a, child["id"], -7, ["pending"])                  # one day outside
    week = get_progress(client, user_a, child["id"], "week")
    assert week["summary"]["scheduled"] == 5 and week["summary"]["completed"] == 3
    assert len(week["daily"]) == 7 and week["daily"][0]["date"] == day(-6)
    assert week["daily"][1]["completion_rate"] is None                        # a day with nothing scheduled
    month = get_progress(client, user_a, child["id"], "month")
    assert month["summary"]["scheduled"] == 6 and len(month["daily"]) == 30


def test_the_schedule_date_decides_the_day_not_the_completion_time(client, user_a, child):
    # Yesterday's task is completed just now (today). It must still count on yesterday.
    seed_day(client, user_a, child["id"], -1, ["completed"])
    body = get_progress(client, user_a, child["id"], "week")
    by_date = {p["date"]: p for p in body["daily"]}
    assert by_date[day(-1)]["completed"] == 1 and by_date[TODAY]["completed"] == 0


def test_future_schedules_are_not_counted(client, user_a, child):
    seed_day(client, user_a, child["id"], 1, ["completed"])
    assert get_progress(client, user_a, child["id"], "week")["summary"]["scheduled"] == 0


def test_no_tasks_scheduled_gives_a_null_rate(client, user_a, child):
    body = get_progress(client, user_a, child["id"], "week")
    assert body["summary"] == {"scheduled": 0, "completed": 0, "completion_rate": None}
    assert body["tasks"] == [] and len(body["weekly"]) == 4


def test_task_breakdown_and_weekly_trend_from_the_database(client, user_a, child):
    seed_day(client, user_a, child["id"], 0, ["completed", "pending"])
    seed_day(client, user_a, child["id"], -8, ["completed", "completed"])
    body = get_progress(client, user_a, child["id"], "today")
    assert [t["name"] for t in body["tasks"]] == ["Task 1", "Task 2"]
    assert body["weekly"][-1]["scheduled"] == 2 and body["weekly"][-2]["scheduled"] == 2   # trend ignores the range


def test_progress_validates_its_query(client, user_a, child):
    h = user_a["headers"]
    assert client.get("/api/progress", headers=h).status_code == 400                             # child_id missing
    assert client.get(f"/api/progress?child_id={child['id']}&range=year", headers=h).status_code == 400
    assert client.get(f"/api/progress?child_id={child['id']}&today=04-11-2026", headers=h).status_code == 400
    assert client.get("/api/progress?child_id=abc", headers=h).status_code == 400
    assert client.get("/api/progress?child_id=99999", headers=h).status_code == 404


def test_dashboard_summary_figures(client, user_a):
    kid, other = make_child(client, user_a, name="Mika"), make_child(client, user_a, name="Ben")
    seed_day(client, user_a, kid["id"], 0, ["completed", "pending"])      # today: 1 done, still has a pending task
    seed_day(client, user_a, other["id"], 0, ["completed"])              # today: everything done
    seed_day(client, user_a, kid["id"], 2, ["pending"])                  # future with a pending task
    seed_day(client, user_a, kid["id"], -3, ["pending"])                 # past: not upcoming
    body = client.get(f"/api/dashboard/summary?today={TODAY}", headers=user_a["headers"]).get_json()
    assert body == {"total_children": 2, "tasks_completed_today": 2, "upcoming_routines": 2}


def test_dashboard_summary_rejects_a_bad_date(client, user_a):
    assert client.get("/api/dashboard/summary?today=nope", headers=user_a["headers"]).status_code == 400
