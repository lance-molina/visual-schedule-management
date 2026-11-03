import pytest

from extensions import db
from models.child import Child
from models.schedule import Schedule
from models.task import Task
from tests.helpers import child_payload, make_child, make_schedule, task_payload


def test_create_child_returns_201_and_the_record(client, user_a):
    res = client.post("/api/children", json=child_payload(photo_url="bear"), headers=user_a["headers"])
    assert res.status_code == 201
    body = res.get_json()
    assert body["name"] == "Mika" and body["age"] == 6 and body["photo_url"] == "bear"
    assert "user_id" not in body


@pytest.mark.parametrize("age,ok", [(0, False), (1, True), (18, True), (19, False), ("6", False), (6.5, False),
                                    (True, False), (None, False)])
def test_create_child_validates_age_1_to_18(client, user_a, age, ok):
    res = client.post("/api/children", json=child_payload(age=age), headers=user_a["headers"])
    assert (res.status_code == 201) is ok
    if not ok:
        assert "age" in res.get_json()["error"]["fields"]


def test_create_child_requires_name_age_and_domain(client, user_a):
    res = client.post("/api/children", json={}, headers=user_a["headers"])
    assert res.status_code == 400
    assert set(res.get_json()["error"]["fields"]) == {"name", "age", "delay_domain"}


def test_create_child_rejects_blank_names_and_long_text(client, user_a):
    assert client.post("/api/children", json=child_payload(name="   "), headers=user_a["headers"]).status_code == 400
    assert client.post("/api/children", json=child_payload(name="x" * 101), headers=user_a["headers"]).status_code == 400
    assert client.post("/api/children", json=child_payload(notes="x" * 501), headers=user_a["headers"]).status_code == 400


def test_photo_url_must_be_a_preset_id_not_a_link(client, user_a):
    res = client.post("/api/children", json=child_payload(photo_url="https://evil.example/x.png"),
                      headers=user_a["headers"])
    assert res.status_code == 400
    assert "photo_url" in res.get_json()["error"]["fields"]


def test_user_id_in_the_body_is_ignored(client, user_a, user_b):
    res = client.post("/api/children", json=child_payload(user_id=user_b["user"]["id"]), headers=user_a["headers"])
    assert res.status_code == 201
    assert db.session.get(Child, res.get_json()["id"]).user_id == user_a["user"]["id"]


def test_list_children_returns_only_own_with_pagination_shape(client, user_a, user_b):
    make_child(client, user_a, name="Mika")
    make_child(client, user_a, name="Ben")
    make_child(client, user_b, name="Zed")
    body = client.get("/api/children", headers=user_a["headers"]).get_json()
    assert [c["name"] for c in body["items"]] == ["Ben", "Mika"]
    assert (body["page"], body["per_page"], body["total"]) == (1, 20, 2)


def test_list_children_paginates_and_rejects_bad_paging(client, user_a):
    for i in range(3):
        make_child(client, user_a, name=f"Kid {i}")
    page2 = client.get("/api/children?per_page=2&page=2", headers=user_a["headers"]).get_json()
    assert len(page2["items"]) == 1 and page2["total"] == 3
    assert client.get("/api/children?per_page=101", headers=user_a["headers"]).status_code == 400
    assert client.get("/api/children?page=abc", headers=user_a["headers"]).status_code == 400


def test_get_child_and_unknown_id(client, user_a):
    child = make_child(client, user_a)
    assert client.get(f"/api/children/{child['id']}", headers=user_a["headers"]).get_json()["name"] == "Mika"
    assert client.get("/api/children/99999", headers=user_a["headers"]).status_code == 404


def test_update_child_replaces_the_editable_fields(client, user_a):
    child = make_child(client, user_a, photo_url="cat")
    res = client.put(f"/api/children/{child['id']}", headers=user_a["headers"],
                     json={"name": "Mika R", "age": 7, "delay_domain": "motor"})
    assert res.status_code == 200
    body = res.get_json()
    assert (body["name"], body["age"], body["delay_domain"]) == ("Mika R", 7, "motor")
    assert body["notes"] is None and body["photo_url"] is None          # omitted optional fields are cleared


def test_update_child_validates(client, user_a):
    child = make_child(client, user_a)
    res = client.put(f"/api/children/{child['id']}", headers=user_a["headers"],
                     json=child_payload(age=30))
    assert res.status_code == 400


def test_delete_child_returns_204_then_404(client, user_a):
    child = make_child(client, user_a)
    assert client.delete(f"/api/children/{child['id']}", headers=user_a["headers"]).status_code == 204
    assert client.get(f"/api/children/{child['id']}", headers=user_a["headers"]).status_code == 404


def test_delete_child_cascades_to_schedules_and_tasks(client, user_a):
    child = make_child(client, user_a)
    make_schedule(client, user_a, child["id"], tasks=[task_payload(), task_payload(name="Eat", icon="fa-utensils")])
    assert Schedule.query.count() == 1 and Task.query.count() == 2
    client.delete(f"/api/children/{child['id']}", headers=user_a["headers"])
    assert Schedule.query.count() == 0 and Task.query.count() == 0
