from models.schedule import Schedule
from models.task import Task
from tests.helpers import TODAY, make_child, make_schedule, task_payload


def test_create_schedule_with_tasks_assigns_positions(client, user_a):
    child = make_child(client, user_a)
    body = make_schedule(client, user_a, child["id"], tasks=[
        task_payload(name="Wake up", time="07:00"), task_payload(name="Eat", icon="fa-utensils", category="food"),
        task_payload(name="Go to school", icon="fa-school", category="school")])
    assert body["date"] == TODAY and body["child_id"] == child["id"]
    assert [(t["name"], t["position"], t["status"]) for t in body["tasks"]] == [
        ("Wake up", 1, "pending"), ("Eat", 2, "pending"), ("Go to school", 3, "pending")]


def test_create_schedule_without_tasks_is_allowed(client, user_a):
    child = make_child(client, user_a)
    assert make_schedule(client, user_a, child["id"])["tasks"] == []


def test_second_schedule_same_child_same_date_returns_409(client, user_a):
    child = make_child(client, user_a)
    make_schedule(client, user_a, child["id"])
    res = client.post("/api/schedules", json={"child_id": child["id"], "date": TODAY}, headers=user_a["headers"])
    assert res.status_code == 409
    assert Schedule.query.count() == 1


def test_two_children_can_share_a_date(client, user_a):
    a, b = make_child(client, user_a, name="Mika"), make_child(client, user_a, name="Ben")
    make_schedule(client, user_a, a["id"])
    make_schedule(client, user_a, b["id"])
    assert Schedule.query.count() == 2


def test_create_schedule_validation_and_nothing_saved_on_a_bad_task(client, user_a):
    child = make_child(client, user_a)
    res = client.post("/api/schedules", headers=user_a["headers"], json={
        "child_id": child["id"], "date": TODAY,
        "tasks": [task_payload(), task_payload(duration=1, time="25:00")]})
    assert res.status_code == 400
    fields = res.get_json()["error"]["fields"]
    assert set(fields) == {"tasks[1].duration", "tasks[1].time"}
    assert Schedule.query.count() == 0 and Task.query.count() == 0


def test_create_schedule_rejects_bad_dates(client, user_a):
    child = make_child(client, user_a)
    for bad in ("2026-13-01", "04/11/2026", "20261104", "", None, 5):
        res = client.post("/api/schedules", json={"child_id": child["id"], "date": bad}, headers=user_a["headers"])
        assert res.status_code == 400, bad
        assert "date" in res.get_json()["error"]["fields"]


def test_create_schedule_for_an_unknown_child_is_404(client, user_a):
    res = client.post("/api/schedules", json={"child_id": 999, "date": TODAY}, headers=user_a["headers"])
    assert res.status_code == 404


def test_get_schedules_for_a_date_returns_zero_or_one(client, user_a):
    child = make_child(client, user_a)
    make_schedule(client, user_a, child["id"], date="2026-11-04", tasks=[task_payload()])
    make_schedule(client, user_a, child["id"], date="2026-11-05")
    one = client.get(f"/api/schedules/{child['id']}?date=2026-11-04", headers=user_a["headers"]).get_json()
    assert one["total"] == 1 and len(one["items"][0]["tasks"]) == 1
    none = client.get(f"/api/schedules/{child['id']}?date=2026-12-25", headers=user_a["headers"]).get_json()
    assert none["items"] == [] and none["total"] == 0


def test_get_schedules_lists_newest_first(client, user_a):
    child = make_child(client, user_a)
    for day in ("2026-11-02", "2026-11-04", "2026-11-03"):
        make_schedule(client, user_a, child["id"], date=day)
    items = client.get(f"/api/schedules/{child['id']}", headers=user_a["headers"]).get_json()["items"]
    assert [s["date"] for s in items] == ["2026-11-04", "2026-11-03", "2026-11-02"]


def test_get_schedules_rejects_a_malformed_date(client, user_a):
    child = make_child(client, user_a)
    assert client.get(f"/api/schedules/{child['id']}?date=yesterday", headers=user_a["headers"]).status_code == 400


def test_update_schedule_changes_the_date(client, user_a):
    child = make_child(client, user_a)
    schedule = make_schedule(client, user_a, child["id"], tasks=[task_payload()])
    res = client.put(f"/api/schedules/{schedule['id']}", json={"date": "2026-11-10"}, headers=user_a["headers"])
    assert res.status_code == 200
    body = res.get_json()
    assert body["date"] == "2026-11-10" and len(body["tasks"]) == 1


def test_update_schedule_to_a_taken_date_is_409(client, user_a):
    child = make_child(client, user_a)
    make_schedule(client, user_a, child["id"], date="2026-11-04")
    other = make_schedule(client, user_a, child["id"], date="2026-11-05")
    res = client.put(f"/api/schedules/{other['id']}", json={"date": "2026-11-04"}, headers=user_a["headers"])
    assert res.status_code == 409


def test_update_schedule_to_its_own_date_is_fine(client, user_a):
    child = make_child(client, user_a)
    schedule = make_schedule(client, user_a, child["id"])
    res = client.put(f"/api/schedules/{schedule['id']}", json={"date": TODAY}, headers=user_a["headers"])
    assert res.status_code == 200


def test_update_schedule_refuses_a_tasks_list(client, user_a):
    child = make_child(client, user_a)
    schedule = make_schedule(client, user_a, child["id"])
    res = client.put(f"/api/schedules/{schedule['id']}", headers=user_a["headers"],
                     json={"date": TODAY, "tasks": [task_payload()]})
    assert res.status_code == 400
    assert "tasks" in res.get_json()["error"]["fields"]


def test_delete_schedule_removes_its_tasks(client, user_a):
    child = make_child(client, user_a)
    schedule = make_schedule(client, user_a, child["id"], tasks=[task_payload(), task_payload()])
    assert client.delete(f"/api/schedules/{schedule['id']}", headers=user_a["headers"]).status_code == 204
    assert Schedule.query.count() == 0 and Task.query.count() == 0
    assert client.delete(f"/api/schedules/{schedule['id']}", headers=user_a["headers"]).status_code == 404
