import pytest

from extensions import db
from models.card import CARD_ICONS, BoardCard


def card_payload(**overrides):
    body = {"label": "Juice", "category": "Food", "icon": "fa-glass-water"}
    body.update(overrides)
    return body


def make_card(client, user, **overrides):
    res = client.post("/api/cards", json=card_payload(**overrides), headers=user["headers"])
    assert res.status_code == 201, res.get_json()
    return res.get_json()


def test_every_card_route_needs_a_token(client):
    assert client.get("/api/cards").status_code == 401
    assert client.post("/api/cards", json=card_payload()).status_code == 401
    assert client.put("/api/cards/1", json=card_payload()).status_code == 401
    assert client.delete("/api/cards/1").status_code == 401


def test_create_card_returns_201_without_user_id(client, user_a):
    res = client.post("/api/cards", json=card_payload(), headers=user_a["headers"])
    assert res.status_code == 201
    body = res.get_json()
    assert (body["label"], body["category"], body["icon"]) == ("Juice", "Food", "fa-glass-water")
    assert "user_id" not in body and body["id"]


def test_create_card_trims_text_and_ignores_user_id_in_the_body(client, user_a, user_b):
    res = client.post("/api/cards", json=card_payload(label="  Cup  ", user_id=user_b["user"]["id"]),
                      headers=user_a["headers"])
    assert res.status_code == 201
    assert res.get_json()["label"] == "Cup"
    assert db.session.get(BoardCard, res.get_json()["id"]).user_id == user_a["user"]["id"]


def test_create_card_requires_all_three_fields(client, user_a):
    res = client.post("/api/cards", json={}, headers=user_a["headers"])
    assert res.status_code == 400
    assert set(res.get_json()["error"]["fields"]) == {"label", "category", "icon"}


@pytest.mark.parametrize("field,value", [("label", "   "), ("label", "x" * 31), ("label", 5),
                                         ("category", ""), ("category", "y" * 31),
                                         ("icon", "x"), ("icon", "<script>"), ("icon", 7)])
def test_create_card_rejects_bad_values(client, user_a, field, value):
    res = client.post("/api/cards", json=card_payload(**{field: value}), headers=user_a["headers"])
    assert res.status_code == 400
    assert field in res.get_json()["error"]["fields"]


def test_every_preset_icon_is_accepted(client, user_a):
    for icon in CARD_ICONS[:5]:
        assert client.post("/api/cards", json=card_payload(icon=icon), headers=user_a["headers"]).status_code == 201


def test_list_returns_only_own_cards_in_category_label_order(client, user_a, user_b):
    make_card(client, user_a, label="Milk", category="Food")
    make_card(client, user_a, label="Happy", category="Emotions", icon="fa-face-smile")
    make_card(client, user_a, label="Bread", category="Food", icon="fa-bread-slice")
    make_card(client, user_b, label="Secret", category="Food")
    body = client.get("/api/cards", headers=user_a["headers"]).get_json()
    assert [c["label"] for c in body["items"]] == ["Happy", "Bread", "Milk"]
    assert (body["page"], body["per_page"], body["total"]) == (1, 100, 3)


def test_update_replaces_the_three_fields(client, user_a):
    card = make_card(client, user_a)
    res = client.put(f"/api/cards/{card['id']}", json=card_payload(label="Water", icon="fa-droplet"),
                     headers=user_a["headers"])
    assert res.status_code == 200
    assert (res.get_json()["label"], res.get_json()["icon"]) == ("Water", "fa-droplet")


def test_update_validates_like_create(client, user_a):
    card = make_card(client, user_a)
    res = client.put(f"/api/cards/{card['id']}", json=card_payload(icon="nope"), headers=user_a["headers"])
    assert res.status_code == 400


def test_delete_removes_the_card(client, user_a):
    card = make_card(client, user_a)
    assert client.delete(f"/api/cards/{card['id']}", headers=user_a["headers"]).status_code == 204
    assert client.get("/api/cards", headers=user_a["headers"]).get_json()["total"] == 0


def test_another_users_card_is_404_for_update_and_delete(client, user_a, user_b):
    card = make_card(client, user_a)
    assert client.put(f"/api/cards/{card['id']}", json=card_payload(label="Hacked"),
                      headers=user_b["headers"]).status_code == 404
    assert client.delete(f"/api/cards/{card['id']}", headers=user_b["headers"]).status_code == 404
    assert db.session.get(BoardCard, card["id"]).label == "Juice"      # untouched


def test_missing_card_is_404(client, user_a):
    assert client.delete("/api/cards/9999", headers=user_a["headers"]).status_code == 404


def test_a_user_can_keep_at_most_100_cards(client, user_a):
    for i in range(100):
        db.session.add(BoardCard(user_id=user_a["user"]["id"], label=f"Card {i}", category="Food", icon="fa-apple-whole"))
    db.session.commit()
    res = client.post("/api/cards", json=card_payload(), headers=user_a["headers"])
    assert res.status_code == 409
    assert res.get_json()["error"]["code"] == "conflict"


# ---------------------------------------------------------------- photo and Filipino word (v2b)

import base64


def jpeg_url(size=200):
    """A tiny stand-in with the JPEG signature; the API checks prefix, size, base64 and signature only."""
    raw = b"\xff\xd8\xff\xe0" + b"0" * size + b"\xff\xd9"
    return "data:image/jpeg;base64," + base64.b64encode(raw).decode()


def test_card_can_have_a_photo_and_a_filipino_word(client, user_a):
    card = make_card(client, user_a, label_fil="  Gatas ", image=jpeg_url())
    assert card["label_fil"] == "Gatas" and card["image"] == jpeg_url()
    listed = client.get("/api/cards", headers=user_a["headers"]).get_json()["items"][0]
    assert listed["image"] == jpeg_url() and listed["label_fil"] == "Gatas"


def test_photo_and_filipino_word_are_optional(client, user_a):
    card = make_card(client, user_a)
    assert card["image"] is None and card["label_fil"] is None
    card = make_card(client, user_a, label_fil="  ", image="")
    assert card["image"] is None and card["label_fil"] is None


@pytest.mark.parametrize("image", [
    "http://example.com/x.jpg", "data:image/png;base64,AAAA", "data:image/jpeg;base64,not base64!!",
    "data:text/html;base64,PHNjcmlwdD4=", 12, "javascript:alert(1)",
    "data:image/jpeg;base64," + base64.b64encode(b"GIF89a-not-a-jpeg").decode(),     # wrong signature
])
def test_photo_must_be_a_jpeg_data_url(client, user_a, image):
    res = client.post("/api/cards", json=card_payload(image=image), headers=user_a["headers"])
    assert res.status_code == 400 and "image" in res.get_json()["error"]["fields"]


def test_photo_over_the_size_limit_is_rejected(client, user_a):
    res = client.post("/api/cards", json=card_payload(image=jpeg_url(size=60000)), headers=user_a["headers"])
    assert res.status_code == 400 and "image" in res.get_json()["error"]["fields"]


def test_filipino_word_too_long_is_rejected(client, user_a):
    res = client.post("/api/cards", json=card_payload(label_fil="x" * 31), headers=user_a["headers"])
    assert res.status_code == 400 and "label_fil" in res.get_json()["error"]["fields"]


def test_put_replaces_photo_and_filipino_word_and_missing_means_cleared(client, user_a):
    card = make_card(client, user_a, label_fil="Gatas", image=jpeg_url())
    res = client.put(f"/api/cards/{card['id']}", json=card_payload(label_fil="Tubig"), headers=user_a["headers"])
    assert res.status_code == 200
    assert res.get_json()["label_fil"] == "Tubig" and res.get_json()["image"] is None


def test_photo_cards_are_capped_at_30_per_user_but_plain_cards_are_not_counted(client, user_a, user_b):
    for i in range(30):
        make_card(client, user_a, label=f"P{i}", image=jpeg_url())
    over = client.post("/api/cards", json=card_payload(image=jpeg_url()), headers=user_a["headers"])
    assert over.status_code == 409
    assert client.post("/api/cards", json=card_payload(), headers=user_a["headers"]).status_code == 201
    assert client.post("/api/cards", json=card_payload(image=jpeg_url()), headers=user_b["headers"]).status_code == 201


def test_adding_a_photo_through_put_also_respects_the_cap(client, user_a):
    for i in range(30):
        make_card(client, user_a, label=f"P{i}", image=jpeg_url())
    plain = make_card(client, user_a, label="Plain")
    res = client.put(f"/api/cards/{plain['id']}", json=card_payload(label="Plain", image=jpeg_url()),
                     headers=user_a["headers"])
    assert res.status_code == 409
