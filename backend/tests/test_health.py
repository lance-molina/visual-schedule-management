def test_health_returns_ok(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.get_json() == {"status": "ok"}


def test_unknown_route_uses_standard_error_shape(client):
    res = client.get("/nope")
    assert res.status_code == 404
    assert res.get_json()["error"]["code"] == "not_found"
