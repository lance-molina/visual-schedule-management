"""Data isolation: user A must never see or change user B's data.

Every probe of someone else's record must answer 404, exactly like a record that does not exist,
so ids cannot be used to discover what other accounts hold.
"""
import pytest

from extensions import db
from models.child import Child
from models.task import Task
from tests.helpers import TODAY, child_payload, make_child, make_schedule, task_payload


@pytest.fixture()
def world(client, user_a, user_b):
    """User A owns a child with one schedule and two tasks. User B owns nothing yet."""
    child = make_child(client, user_a)
    schedule = make_schedule(client, user_a, child["id"], tasks=[task_payload(), task_payload(name="Eat")])
    return {"child": child, "schedule": schedule, "task": schedule["tasks"][0], "a": user_a, "b": user_b}


def test_user_b_gets_404_for_user_a_child(client, world):
    path, headers = f"/api/children/{world['child']['id']}", world["b"]["headers"]
    assert client.get(path, headers=headers).status_code == 404
    assert client.put(path, json=child_payload(name="Hijack"), headers=headers).status_code == 404
    assert client.delete(path, headers=headers).status_code == 404
    assert db.session.get(Child, world["child"]["id"]).name == "Mika"            # untouched


def test_user_b_never_sees_user_a_children_in_a_list(client, world):
    make_child(client, world["b"], name="Zed")
    names = [c["name"] for c in client.get("/api/children", headers=world["b"]["headers"]).get_json()["items"]]
    assert names == ["Zed"]


def test_user_b_cannot_read_or_create_schedules_for_user_a_child(client, world):
    headers, child_id = world["b"]["headers"], world["child"]["id"]
    assert client.get(f"/api/schedules/{child_id}", headers=headers).status_code == 404
    res = client.post("/api/schedules", json={"child_id": child_id, "date": "2026-12-01"}, headers=headers)
    assert res.status_code == 404


def test_user_b_cannot_edit_or_delete_user_a_schedule(client, world):
    path, headers = f"/api/schedules/{world['schedule']['id']}", world["b"]["headers"]
    assert client.put(path, json={"date": "2026-12-01"}, headers=headers).status_code == 404
    assert client.delete(path, headers=headers).status_code == 404
    assert client.get(f"/api/tasks/{world['schedule']['id']}", headers=headers).status_code == 404


def test_user_b_cannot_touch_user_a_tasks(client, world):
    headers, task_id = world["b"]["headers"], world["task"]["id"]
    assert client.put(f"/api/tasks/{task_id}", json={"name": "Hijack"}, headers=headers).status_code == 404
    assert client.delete(f"/api/tasks/{task_id}", headers=headers).status_code == 404
    added = client.post("/api/tasks", json={**task_payload(), "schedule_id": world["schedule"]["id"]},
                        headers=headers)
    assert added.status_code == 404
    assert Task.query.count() == 2 and db.session.get(Task, task_id).name == "Brush teeth"


def test_user_b_cannot_complete_user_a_task(client, world):
    res = client.patch(f"/api/tasks/{world['task']['id']}/complete", headers=world["b"]["headers"])
    assert res.status_code == 404
    assert db.session.get(Task, world["task"]["id"]).status == "pending"


def test_user_b_progress_for_user_a_child_returns_404(client, world):
    res = client.get(f"/api/progress?child_id={world['child']['id']}&range=week&today={TODAY}",
                     headers=world["b"]["headers"])
    assert res.status_code == 404


def test_a_foreign_id_looks_the_same_as_a_missing_id(client, world):
    foreign = client.get(f"/api/children/{world['child']['id']}", headers=world["b"]["headers"])
    missing = client.get("/api/children/99999", headers=world["b"]["headers"])
    assert foreign.status_code == missing.status_code == 404
    assert foreign.get_json() == missing.get_json()


def test_dashboard_counts_only_own_data(client, world):
    client.patch(f"/api/tasks/{world['task']['id']}/complete", headers=world["a"]["headers"])
    mine = client.get(f"/api/dashboard/summary?today={TODAY}", headers=world["a"]["headers"]).get_json()
    theirs = client.get(f"/api/dashboard/summary?today={TODAY}", headers=world["b"]["headers"]).get_json()
    assert mine == {"total_children": 1, "tasks_completed_today": 1, "upcoming_routines": 1}
    assert theirs == {"total_children": 0, "tasks_completed_today": 0, "upcoming_routines": 0}
