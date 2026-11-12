"""Speech route. Signed-in users only; the text is validated and capped so the endpoint cannot be used as a free relay.

POST /api/speech   {"text": "I want water", "lang": "en" | "fil"}  ->  200 audio/mpeg
                   503 code "speech_unavailable" when the online voice cannot be reached (the page then uses the browser voice)
"""
from flask import Blueprint, Response, current_app, request
from flask_jwt_extended import jwt_required

from services import speech
from utils.errors import ApiError
from utils.validators import json_body

bp = Blueprint("speech", __name__)

MAX_CHARS = 200


@bp.post("")
@jwt_required()
def speak():
    data = json_body()
    fields = {}
    text = data.get("text")
    lang = data.get("lang", "en")
    if not isinstance(text, str) or not text.strip():
        fields["text"] = "Required"
    elif len(text.strip()) > MAX_CHARS:
        fields["text"] = f"At most {MAX_CHARS} characters"
    if lang not in speech.VOICES:
        fields["lang"] = "Must be en or fil"
    if fields:
        raise ApiError(400, "validation_error", "Please fix the highlighted fields.", fields)
    if not current_app.config.get("TTS_ENABLED", True):
        raise ApiError(503, "speech_unavailable", "Online speech is switched off.")
    try:
        audio = speech.synthesize(text.strip(), lang)
    except speech.SpeechUnavailable as exc:
        current_app.logger.warning("Online speech unavailable: %s", exc)
        raise ApiError(503, "speech_unavailable", "Online speech is not available right now.")
    return Response(audio, mimetype="audio/mpeg", headers={"Cache-Control": "private, max-age=3600"})
