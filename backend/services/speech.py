"""Text-to-speech through Microsoft Edge's online voices (the `edge-tts` package).

This is an UNOFFICIAL, unsupported endpoint (it is what the Edge browser's read-aloud feature uses), so it can change or
stop working without notice. Callers must treat SpeechUnavailable as normal and fall back to something else; the
frontend falls back to the browser's own voices. No text is stored; a small in-memory cache avoids repeat requests.
"""
import asyncio
from collections import OrderedDict

try:
    import edge_tts
except ImportError:          # the package is optional at run time; the API then answers 503
    edge_tts = None

VOICES = {"en": "en-US-AnaNeural", "fil": "fil-PH-BlessicaNeural"}   # Ana is a child-like English voice
RATE = "-15%"                                                         # a little slower is easier to follow
TIMEOUT_SECONDS = 8
CACHE_SIZE = 200

_cache = OrderedDict()


class SpeechUnavailable(Exception):
    pass


async def _synthesize(text, voice):
    audio = bytearray()
    async for chunk in edge_tts.Communicate(text, voice, rate=RATE).stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
    return bytes(audio)


def synthesize(text, lang):
    """Return MP3 bytes for `text`, or raise SpeechUnavailable."""
    key = (lang, text)
    if key in _cache:
        _cache.move_to_end(key)
        return _cache[key]
    if edge_tts is None:
        raise SpeechUnavailable("edge-tts is not installed")
    try:
        audio = asyncio.run(asyncio.wait_for(_synthesize(text, VOICES[lang]), TIMEOUT_SECONDS))
    except Exception as exc:     # network down, endpoint changed, timeout: all mean "use the fallback"
        raise SpeechUnavailable(str(exc)) from exc
    if not audio:
        raise SpeechUnavailable("no audio returned")
    _cache[key] = audio
    if len(_cache) > CACHE_SIZE:
        _cache.popitem(last=False)
    return audio
