// speech.js: says a word or sentence aloud. First choice is the online Edge voice from the backend (natural, and it has
// a Filipino voice). If that fails for any reason (offline, endpoint down, blocked, slow), the browser's own voice is
// used instead, and if there is none the caller is told so it can keep the words on screen.

import { speech as speechApi } from "./api.js";
import { prepareForSpeech } from "./speech-text.js";

const blobs = new Map();            // "lang|text" -> object URL, so a repeated word plays instantly
const RETRY_ONLINE_AFTER_MS = 60000;
let onlineDownUntil = 0;            // after a failure, skip the online voice for a minute so taps stay quick
let current = null;                 // the audio element now playing
let ticket = 0;                     // a newer request cancels an older one that is still loading

// Speech speed (1 = normal). Kept on this device, set in Settings. Out-of-range values fall back to the default.
const RATE_KEY = "vs_voice_rate";
export const RATE_DEFAULT = 0.85, RATE_MIN = 0.5, RATE_MAX = 1.4;
export function getVoiceRate() {
  try {
    const value = parseFloat(localStorage.getItem(RATE_KEY));
    if (value >= RATE_MIN && value <= RATE_MAX) return Math.round(value * 100) / 100;
  } catch { /* storage blocked: use the default */ }
  return RATE_DEFAULT;
}
export function setVoiceRate(value) {
  try { localStorage.setItem(RATE_KEY, String(value)); } catch { /* the setting just will not persist */ }
}

const browserCanSpeak = () => "speechSynthesis" in window;

export function stop() {
  ticket += 1;
  if (current) { current.pause(); current = null; }
  if (browserCanSpeak()) window.speechSynthesis.cancel();
}

function speakInBrowser(text, lang, rate) {
  if (!browserCanSpeak()) return false;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === "fil" ? "fil-PH" : "en-US";
  utterance.rate = rate;
  window.speechSynthesis.speak(utterance);
  return true;
}

async function speakOnline(text, lang, rate, mine) {
  const key = `${lang}|${rate}|${text}`;
  let url = blobs.get(key);
  if (!url) {
    url = URL.createObjectURL(await speechApi.say(text, lang, rate));
    blobs.set(key, url);
  }
  if (mine !== ticket) return;                      // a newer tap replaced this one while it loaded
  const audio = new Audio(url);
  current = audio;
  await audio.play();
}

/** Resolves to "online", "browser" or "none" (nothing could speak). */
export async function speak(rawText, lang, rate = getVoiceRate()) {
  const text = prepareForSpeech(rawText || "", lang);
  if (!text) return "none";
  stop();
  const mine = ticket;
  if (Date.now() >= onlineDownUntil) {
    try { await speakOnline(text, lang, rate, mine); return "online"; }
    catch { onlineDownUntil = Date.now() + RETRY_ONLINE_AFTER_MS; }
    if (mine !== ticket) return "online";           // replaced meanwhile; stay quiet
  }
  return speakInBrowser(text, lang, rate) ? "browser" : "none";
}
