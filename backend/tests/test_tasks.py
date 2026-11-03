import pytest

from extensions import db
from models.task import Task
from tests.helpers import make_child, make_schedule, task_payload


@pytest.fixture()
def schedule(client, user_a):
    child = make_child(client, user_a)
    return make_schedule(client, user_a, child["id"], tasks=[
        task_payload(name="First"), task_payload(name="Second"), task_payload(name="Third")])


def test_tasks_returned_in_position_order(client, user_a, schedule):
    ids = {t["name"]: t["id"] for t in schedule["tasks"]}
    # Put "Third" first by giving it position 1 and moving the others down.
    client.put(f"/api/tasks/{ids['Third']}", json={"position": 1}, headers=user_a["headers"])
    client.put(f"/api/tasks/{ids['First']}", json={"position": 2}, headers=user_a["headers"])
    client.put(f"/api/tasks/{ids['Second']}", json={"position": 3}, headers=user_a["headers"])
    body = client.get(f"/api/tasks/{schedule['id']}", headers=user_a["headers"]).get_json()
    assert [t["name"] for t in body["items"]] == ["Third", "First", "Second"]
    assert body["per_page"] == 100                      # a whole day loads in one call


def test_post_task_defaults_to_the_end_of_the_list(client, user_a, schedule):
    res = client.post("/api/tasks", json={**task_payload(name="Fourth"), "schedule_id": schedule["id"]},
                      headers=user_a["headers"])
    assert res.status_code == 201
    assert res.get_json()["position"] == 4 and res.get_json()["status"] == "pending"


@pytest.mark.parametrize("duration,ok", [(4, False), (5, True), (240, True), (241, False), ("10", False),
                                         (None, False)])
def test_duration_must_be_5_to_240(client, user_a, schedule, duration, ok):
    res = client.post("/api/tasks", json={**task_payload(duration=duration), "schedule_id": schedule["id"]},
                      headers=user_a["headers"])
    assert (res.status_code == 201) is ok
    if not ok:
        assert "duration" in res.get_json()["error"]["fields"]


@pytest.mark.parametrize("value,ok", [("08:00", True), ("23:59", True), ("00:00", True), ("24:00", False),
                                      ("8:00", False), ("08:60", False), ("noon", False), (800, False)])
def test_time_must_be_hh_mm(client, user_a, schedule, value, ok):
    res = client.post("/api/tasks", json={**task_payload(time=value), "schedule_id": schedule["id"]},
                      headers=user_a["headers"])
    assert (res.status_code == 201) is ok


def test_icon_category_and_reminder_are_validated(client, user_a, schedule):
    def post(**over):
        return client.post("/api/tasks", json={**task_payload(**over), "schedule_id": schedule["id"]},
                           headers=user_a["headers"])
    assert post(icon="<script>").status_code == 400
    assert post(icon="tooth").status_code == 400
    assert post(category="chores").status_code == 400
    assert post(reminder_minutes=-1).status_code == 400
    assert post(reminder_minutes=61).status_code == 400
    assert post(reminder_minutes=0).status_code == 201          # "at the start"
    assert post(reminder_minutes=None).status_code == 201       # no reminder
    assert post(name="x" * 101).status_code == 400


def test_task_name_is_trimmed_and_html_is_stored_as_plain_text(client, user_a, schedule):
    res = client.post("/api/tasks", json={**task_payload(name="  <b>Eat</b>  "), "schedule_id": schedule["id"]},
                      headers=user_a["headers"])
    assert res.get_json()["name"] == "<b>Eat</b>"               # the frontend renders it with textContent


def test_complete_sets_completed_at_on_the_server(client, user_a, schedule):
    task_id = schedule["tasks"][0]["id"]
    res = client.patch(f"/api/tasks/{task_id}/complete", headers=user_a["headers"],
                       json={"completed_at": "1999-01-01T00:00:00Z"})      # the client cannot choose it
    assert res.status_code == 200
    body = res.get_json()
    assert body["status"] == "completed"
    assert body["completed_at"].endswith("Z") and not body["completed_at"].startswith("1999")


def test_complete_is_idempotent(client, user_a, schedule):
    task_id = schedule["tasks"][0]["id"]
    first = client.patch(f"/api/tasks/{task_id}/complete", headers=user_a["headers"]).get_json()
    second = client.patch(f"/api/tasks/{task_id}/complete", headers=user_a["headers"]).get_json()
    assert first["completed_at"] == second["completed_at"]


def test_undo_clears_completed_at(client, user_a, schedule):
    task_id = schedule["tasks"][0]["id"]
    client.patch(f"/api/tasks/{task_id}/complete", headers=user_a["headers"])
    res = client.put(f"/api/tasks/{task_id}", json={"status": "pending"}, headers=user_a["headers"])
    assert res.status_code == 200
    assert res.get_json()["status"] == "pending" and res.get_json()["completed_at"] is None
    assert db.session.get(Task, task_id).completed_at is None


def test_put_status_completed_also_sets_completed_at(client, user_a, schedule):
    task_id = schedule["tasks"][0]["id"]
    body = client.put(f"/api/tasks/{task_id}", json={"status": "completed"}, headers=user_a["headers"]).get_json()
    assert body["status"] == "completed" and body["completed_at"]


def test_put_ignores_completed_at_sent_by_the_client(client, user_a, schedule):
    task_id = schedule["tasks"][0]["id"]
    body = client.put(f"/api/tasks/{task_id}", json={"completed_at": "2000-01-01T00:00:00Z"},
                      headers=user_a["headers"]).get_json()
    assert body["completed_at"] is None and body["status"] == "pending"


def test_put_changes_only_the_fields_sent(client, user_a, schedule):
    task = schedule["tasks"][1]
    body = client.put(f"/api/tasks/{task['id']}", json={"time": "09:30", "duration": 20, "reminder_minutes": 10},
                      headers=user_a["headers"]).get_json()
    assert (body["time"], body["duration"], body["reminder_minutes"]) == ("09:30", 20, 10)
    assert body["name"] == task["name"] and body["position"] == task["position"]


def test_put_rejects_a_bad_status(client, user_a, schedule):
    res = client.put(f"/api/tasks/{schedule['tasks'][0]['id']}", json={"status": "skipped"},
                     headers=user_a["headers"])
    assert res.status_code == 400


def test_a_task_cannot_be_moved_to_another_schedule(client, user_a, schedule):
    task_id = schedule["tasks"][0]["id"]
    client.put(f"/api/tasks/{task_id}", json={"schedule_id": 999}, headers=user_a["headers"])
    assert db.session.get(Task, task_id).schedule_id == schedule["id"]


def test_delete_task(client, user_a, schedule):
    task_id = schedule["tasks"][0]["id"]
    assert client.delete(f"/api/tasks/{task_id}", headers=user_a["headers"]).status_code == 204
    assert client.delete(f"/api/tasks/{task_id}", headers=user_a["headers"]).status_code == 404
    assert Task.query.count() == 2


def test_post_task_for_an_unknown_schedule_is_404(client, user_a):
    res = client.post("/api/tasks", json={**task_payload(), "schedule_id": 999}, headers=user_a["headers"])
    assert res.status_code == 404


def test_post_task_requires_schedule_id_and_fields(client, user_a):
    res = client.post("/api/tasks", json={}, headers=user_a["headers"])
    assert res.status_code == 400
    assert set(res.get_json()["error"]["fields"]) == {"name", "icon", "category", "time", "duration", "schedule_id"}
