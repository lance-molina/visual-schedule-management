"""Speech route. The real Edge service is never called in tests; it is replaced by fakes."""
import pytest

from services import speech


@pytest.fixture(autouse=True)
def clean_cache():
    speech._cache.clear()
    yield
    speech._cache.clear()


def post(client, user, **body):
    return client.post("/api/speech", json=body, headers=user["headers"])


def test_requires_a_token(client):
    assert client.post("/api/speech", json={"text": "Water", "lang": "en"}).status_code == 401


def test_returns_audio_and_picks_the_voice_for_the_language(client, user_a, monkeypatch):
    seen = []

    async def fake(text, voice, rate=None):
        seen.append((text, voice))
        return b"MP3DATA"
    monkeypatch.setattr(speech, "_synthesize", fake)
    res = post(client, user_a, text="  Water ", lang="en")
    assert res.status_code == 200 and res.mimetype == "audio/mpeg" and res.data == b"MP3DATA"
    post(client, user_a, text="Tubig", lang="fil")
    assert seen == [("Water", "en-US-AnaNeural"), ("Tubig", "fil-PH-BlessicaNeural")]


def test_repeat_requests_are_served_from_the_cache(client, user_a, monkeypatch):
    calls = []

    async def fake(text, voice, rate=None):
        calls.append(text)
        return b"X"
    monkeypatch.setattr(speech, "_synthesize", fake)
    post(client, user_a, text="Rice", lang="en")
    post(client, user_a, text="Rice", lang="en")
    assert calls == ["Rice"]


@pytest.mark.parametrize("body,field", [
    ({"lang": "en"}, "text"), ({"text": "", "lang": "en"}, "text"), ({"text": "   ", "lang": "en"}, "text"),
    ({"text": 5, "lang": "en"}, "text"), ({"text": "x" * 201, "lang": "en"}, "text"),
    ({"text": "Hi", "lang": "fr"}, "lang"),
])
def test_bad_input_is_a_400_with_the_field_named(client, user_a, body, field):
    res = post(client, user_a, **body)
    assert res.status_code == 400 and field in res.get_json()["error"]["fields"]


def test_service_failure_is_a_503_so_the_page_can_fall_back(client, user_a, monkeypatch):
    async def boom(text, voice, rate=None):
        raise OSError("no network")
    monkeypatch.setattr(speech, "_synthesize", boom)
    res = post(client, user_a, text="Water", lang="en")
    assert res.status_code == 503 and res.get_json()["error"]["code"] == "speech_unavailable"


def test_empty_audio_is_a_503(client, user_a, monkeypatch):
    async def empty(text, voice, rate=None):
        return b""
    monkeypatch.setattr(speech, "_synthesize", empty)
    assert post(client, user_a, text="Water", lang="en").status_code == 503


def test_missing_package_is_a_503(client, user_a, monkeypatch):
    monkeypatch.setattr(speech, "edge_tts", None)
    assert post(client, user_a, text="Water", lang="en").status_code == 503


def test_can_be_switched_off(app, client, user_a):
    app.config["TTS_ENABLED"] = False
    assert post(client, user_a, text="Water", lang="en").status_code == 503


def test_rate_is_sent_to_the_voice_and_part_of_the_cache_key(client, user_a, monkeypatch):
    rates = []

    async def fake(text, voice, rate="-15%"):
        rates.append(rate)
        return b"X"
    monkeypatch.setattr(speech, "_synthesize", fake)
    post(client, user_a, text="Water", lang="en")                 # default is slightly slow
    post(client, user_a, text="Water", lang="en", rate=1)
    post(client, user_a, text="Water", lang="en", rate=1.2)
    post(client, user_a, text="Water", lang="en", rate=1.2)       # cached
    assert rates == ["-15%", "+0%", "+20%"]


@pytest.mark.parametrize("rate", [0.4, 1.5, "fast", True, [1]])
def test_bad_rate_is_a_400(client, user_a, rate):
    res = post(client, user_a, text="Water", lang="en", rate=rate)
    assert res.status_code == 400 and "rate" in res.get_json()["error"]["fields"]
