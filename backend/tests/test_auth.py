from datetime import timedelta

import pytest
from flask_jwt_extended import create_access_token

from extensions import db
from models.user import User
from tests.helpers import PASSWORD, login, make_user, register

PROTECTED = [
    ("get", "/api/auth/me"),
    ("patch", "/api/auth/me"),
    ("get", "/api/children"),
    ("post", "/api/children"),
    ("get", "/api/schedules/1"),
    ("post", "/api/schedules"),
    ("get", "/api/tasks/1"),
    ("post", "/api/tasks"),
    ("patch", "/api/tasks/1/complete"),
    ("get", "/api/dashboard/summary"),
    ("get", "/api/progress"),
]


@pytest.mark.parametrize("method,path", PROTECTED)
def test_protected_routes_require_a_token(client, method, path):
    res = getattr(client, method)(path)
    assert res.status_code == 401
    assert res.get_json()["error"]["code"] == "unauthorized"


def test_garbage_token_is_401(client):
    res = client.get("/api/children", headers={"Authorization": "Bearer not-a-token"})
    assert res.status_code == 401


def test_expired_token_is_401(client, app, user_a):
    expired = create_access_token(identity=str(user_a["user"]["id"]), expires_delta=timedelta(seconds=-5))
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired}"})
    assert res.status_code == 401


def test_token_of_a_deleted_user_is_401(client, app, user_a):
    db.session.delete(db.session.get(User, user_a["user"]["id"]))
    db.session.commit()
    assert client.get("/api/auth/me", headers=user_a["headers"]).status_code == 401


def test_register_creates_user_and_hides_password_hash(client):
    res = register(client, email="New.Person@Example.com")
    assert res.status_code == 201
    body = res.get_json()
    assert body["email"] == "new.person@example.com"            # stored lowercase
    assert body["role"] == "caregiver"
    assert "password" not in body and "password_hash" not in body
    assert body["settings"] == {"font_size": "M", "contrast": "normal", "sound_on": True, "language": "en",
                                "notify_daily": False, "notify_task": False, "notify_weekly": False}
    stored = User.query.filter_by(email="new.person@example.com").one()
    assert stored.password_hash.startswith("$2") and PASSWORD not in stored.password_hash


def test_duplicate_email_returns_409_ignoring_case(client):
    assert register(client, email="same@example.com").status_code == 201
    res = register(client, email="SAME@example.com")
    assert res.status_code == 409
    assert res.get_json()["error"]["fields"]["email"]


def test_register_validation_lists_every_bad_field(client):
    res = client.post("/api/auth/register", json={"email": "nope", "password": "short", "role": "admin"})
    assert res.status_code == 400
    body = res.get_json()["error"]
    assert body["code"] == "validation_error"
    assert set(body["fields"]) == {"name", "email", "password", "role"}


def test_password_over_72_chars_is_rejected(client):
    assert register(client, password="a" * 73).status_code == 400
    assert register(client, email="x@example.com", password="a" * 72).status_code == 201


def test_password_limit_counts_bytes_not_characters(client):
    # 37 two-byte characters is only 37 characters but 74 bytes, which bcrypt would silently cut.
    assert register(client, password="é" * 37).status_code == 400


def test_malformed_json_is_400_with_the_standard_shape(client):
    res = client.post("/api/auth/register", data="{not json", content_type="application/json")
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "bad_request"


def test_login_returns_token_and_user(client):
    register(client)
    res = login(client)
    assert res.status_code == 200
    body = res.get_json()
    assert body["access_token"] and body["expires_in"] == 8 * 3600
    assert body["user"]["email"] == "adult.a@example.com"


def test_remember_me_gives_a_longer_session(client):
    register(client)
    assert login(client, remember=True).get_json()["expires_in"] == 7 * 24 * 3600


def test_login_failure_message_is_generic(client):
    """Wrong password and unknown email must look identical."""
    register(client)
    wrong_password = login(client, password="wrong-password-1")
    unknown_email = login(client, email="nobody@example.com")
    assert wrong_password.status_code == unknown_email.status_code == 401
    assert wrong_password.get_json() == unknown_email.get_json()


def test_login_with_a_very_long_password_is_a_plain_401(client):
    register(client)
    assert login(client, password="x" * 500).status_code == 401


def test_login_requires_both_fields(client):
    res = client.post("/api/auth/login", json={"email": "a@example.com"})
    assert res.status_code == 400
    assert "password" in res.get_json()["error"]["fields"]


def test_me_returns_the_signed_in_user(client, user_a):
    res = client.get("/api/auth/me", headers=user_a["headers"])
    assert res.status_code == 200
    assert res.get_json()["id"] == user_a["user"]["id"]


def test_patch_me_updates_profile_and_settings(client, user_a):
    res = client.patch("/api/auth/me", headers=user_a["headers"], json={
        "name": "Renamed", "role": "occupational_therapist",
        "settings": {"font_size": "L", "contrast": "high", "language": "fil", "sound_on": False,
                     "notify_weekly": True}})
    assert res.status_code == 200
    body = res.get_json()
    assert body["name"] == "Renamed" and body["role"] == "occupational_therapist"
    assert body["settings"]["font_size"] == "L" and body["settings"]["contrast"] == "high"
    assert body["settings"]["sound_on"] is False and body["settings"]["notify_weekly"] is True
    # Settings persist: a fresh login sees the same values.
    again = login(client).get_json()["user"]
    assert again["settings"]["contrast"] == "high" and again["settings"]["language"] == "fil"


def test_patch_me_rejects_bad_settings(client, user_a):
    res = client.patch("/api/auth/me", headers=user_a["headers"],
                       json={"settings": {"font_size": "XL", "sound_on": "yes", "theme": "dark"}})
    assert res.status_code == 400
    assert set(res.get_json()["error"]["fields"]) == {"settings.font_size", "settings.sound_on", "settings.theme"}


def test_patch_me_email_taken_is_409_but_own_email_is_fine(client, user_a, user_b):
    taken = client.patch("/api/auth/me", headers=user_a["headers"], json={"email": "adult.b@example.com"})
    assert taken.status_code == 409
    same = client.patch("/api/auth/me", headers=user_a["headers"], json={"email": "ADULT.A@example.com"})
    assert same.status_code == 200


def test_patch_me_cannot_change_the_password_or_id(client, user_a):
    res = client.patch("/api/auth/me", headers=user_a["headers"],
                       json={"password": "hacked-password-1", "id": 999, "password_hash": "x"})
    assert res.status_code == 200
    assert login(client).status_code == 200                        # the old password still works
    assert res.get_json()["id"] == user_a["user"]["id"]
