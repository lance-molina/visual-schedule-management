// speech.js: says a word or sentence aloud. First choice is the online Edge voice from the backend (natural, and it has
// a Filipino voice). If that fails for any reason (offline, endpoint down, blocked, slow), the browser's own voice is
// used instead, and if there is none the caller is told so it can keep the words on screen.

import { speech as speechApi } from "./api.js";

const blobs = new Map();            // "lang|text" -> object URL, so a repeated word plays instantly
const RETRY_ONLINE_AFTER_MS = 60000;
let onlineDownUntil = 0;            // after a failure, skip the online voice for a minute so taps stay quick
let current = null;                 // the audio element now playing
let ticket = 0;                     // a newer request cancels an older one that is still loading

const browserCanSpeak = () => "speechSynthesis" in window;

export function stop() {
  ticket += 1;
  if (current) { current.pause(); current = null; }
  if (browserCanSpeak()) window.speechSynthesis.cancel();
}

function speakInBrowser(text, lang) {
  if (!browserCanSpeak()) return false;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === "fil" ? "fil-PH" : "en-US";
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
  return true;
}

async function speakOnline(text, lang, mine) {
  const key = `${lang}|${text}`;
  let url = blobs.get(key);
  if (!url) {
    url = URL.createObjectURL(await speechApi.say(text, lang));
    blobs.set(key, url);
  }
  if (mine !== ticket) return;                      // a newer tap replaced this one while it loaded
  const audio = new Audio(url);
  current = audio;
  await audio.play();
}

/** Resolves to "online", "browser" or "none" (nothing could speak). */
export async function speak(text, lang) {
  if (!text) return "none";
  stop();
  const mine = ticket;
  if (Date.now() >= onlineDownUntil) {
    try { await speakOnline(text, lang, mine); return "online"; }
    catch { onlineDownUntil = Date.now() + RETRY_ONLINE_AFTER_MS; }
    if (mine !== ticket) return "online";           // replaced meanwhile; stay quiet
  }
  return speakInBrowser(text, lang) ? "browser" : "none";
}
