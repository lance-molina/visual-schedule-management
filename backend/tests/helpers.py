"""Small builders shared by the tests. All data is fictional."""

TODAY = "2026-11-04"          # the date the progress tests pretend it is
PASSWORD = "correct-horse-1"


def task_payload(**overrides):
    body = {"name": "Brush teeth", "icon": "fa-tooth", "category": "hygiene", "time": "08:00", "duration": 10}
    body.update(overrides)
    return body


def child_payload(**overrides):
    body = {"name": "Mika", "age": 6, "delay_domain": "speech", "notes": "Likes trains"}
    body.update(overrides)
    return body


def register(client, email="adult.a@example.com", password=PASSWORD, name="Adult A", role="caregiver"):
    return client.post("/api/auth/register",
                       json={"name": name, "email": email, "password": password, "role": role})


def login(client, email="adult.a@example.com", password=PASSWORD, **extra):
    return client.post("/api/auth/login", json={"email": email, "password": password, **extra})


def make_user(client, email="adult.a@example.com", **kwargs):
    """Register and log in. Returns {"headers", "user", "token"}."""
    assert register(client, email=email, **kwargs).status_code == 201
    body = login(client, email=email).get_json()
    return {"headers": {"Authorization": f"Bearer {body['access_token']}"},
            "user": body["user"], "token": body["access_token"]}


def make_child(client, user, **overrides):
    res = client.post("/api/children", json=child_payload(**overrides), headers=user["headers"])
    assert res.status_code == 201, res.get_json()
    return res.get_json()


def make_schedule(client, user, child_id, date=TODAY, tasks=None):
    body = {"child_id": child_id, "date": date}
    if tasks is not None:
        body["tasks"] = tasks
    res = client.post("/api/schedules", json=body, headers=user["headers"])
    assert res.status_code == 201, res.get_json()
    return res.get_json()
