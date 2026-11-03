// script.js: shared app shell, loaded by every page (the login logic at the bottom runs only on index.html).
//
//   initPage(name)   every signed-in page calls this first: checks the token, applies the saved settings,
//                    builds the navbar, and returns the signed-in user
//   applySettings()  sets html classes fs-S/M/L and contrast-high, and the page language
//   showToast(msg)   small status message (textContent, never innerHTML with user data)
//   playChime()      the one soft completion sound (only when the user's sound setting is on)
//   logout()         clear token and settings cache, go to index.html

import { auth, clearToken, getToken, setToken } from "./api.js";
import { applyFieldErrors, clearFieldErrors, h, icon, renderShell, setBusy } from "./components.js";

const SETTINGS_KEY = "vs_settings";      // a cache only: the database is the source of truth
const DEFAULT_SETTINGS = { font_size: "M", contrast: "normal", sound_on: true, language: "en" };

// ------------------------------------------------------------------ settings cache

export function getCachedSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function cacheSettings(settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* storage blocked: ignore */ }
}

export function applySettings(settings = {}) {
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  const root = document.documentElement;
  root.classList.remove("fs-S", "fs-M", "fs-L", "contrast-high");
  root.classList.add(`fs-${merged.font_size}`);
  if (merged.contrast === "high") root.classList.add("contrast-high");
  root.lang = merged.language === "fil" ? "fil" : "en";
}

// Apply the cached look immediately so the page does not flash the default size or contrast.
applySettings(getCachedSettings());

// ------------------------------------------------------------------ page start-up and logout

export function requireAuth() {
  if (!getToken()) {
    window.location.href = "index.html";
    return false;
  }
  return true;
}

export function logout() {
  clearToken();
  try { localStorage.removeItem(SETTINGS_KEY); } catch { /* ignore */ }
  window.location.href = "index.html";
}

/** Call first on every signed-in page. Returns the user, or null when the server could not be reached. */
export async function initPage(activePage) {
  if (!requireAuth()) return new Promise(() => {});      // a redirect is under way; never run the page
  let user = null;
  try {
    user = await auth.me();
    cacheSettings(user.settings);
    applySettings(user.settings);
  } catch (err) {
    if (err.status !== 401) showToast(err.message, "error");   // a 401 is already redirected by api.js
  }
  renderShell(activePage, { lang: getCachedSettings().language, user, onLogout: logout });
  return user;
}

// ------------------------------------------------------------------ feedback

export function showToast(message, type = "success") {
  const area = document.getElementById("toast-area");
  if (!area) return;
  const symbol = type === "error" ? "fa-circle-exclamation" : "fa-circle-check";
  const el = h("div", { class: `app-toast app-toast-${type}`, role: type === "error" ? "alert" : "status" },
    icon(symbol, "me-2"), h("span", {}, message));        // h() uses text nodes: safe for any message
  area.append(el);
  setTimeout(() => el.remove(), 5000);
}

let audioContext = null;

/** One short, soft two-note chime. Silent when sound is off, and never throws if audio is blocked. */
export function playChime() {
  if (getCachedSettings().sound_on === false) return;
  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;
    const tone = audioContext.createOscillator();
    const volume = audioContext.createGain();
    tone.type = "sine";
    tone.frequency.setValueAtTime(660, now);
    tone.frequency.setValueAtTime(880, now + 0.14);
    volume.gain.setValueAtTime(0.0001, now);
    volume.gain.exponentialRampToValueAtTime(0.12, now + 0.04);
    volume.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    tone.connect(volume).connect(audioContext.destination);
    tone.start(now);
    tone.stop(now + 0.55);
  } catch { /* audio unavailable: the visual feedback is enough */ }
}

// ------------------------------------------------------------------ login and register (index.html only)

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

function showFormError(id, message) {
  const box = document.getElementById(id);
  if (!box) return;
  box.replaceChildren();
  if (message) box.append(icon("fa-circle-exclamation", "me-1"), message);
}

if (loginForm || registerForm) {
  const params = new URLSearchParams(window.location.search);
  if (getToken() && !params.has("expired")) {
    window.location.href = "dashboard.html";             // already signed in
  }
  if (params.has("expired")) {
    const notice = document.getElementById("login-notice");
    if (notice) notice.textContent = "Your session ended. Please log in again.";
  }
}

async function signIn(email, password, remember) {
  const result = await auth.login({ email, password, remember });
  setToken(result.access_token);
  cacheSettings(result.user.settings);
  window.location.href = "dashboard.html";
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFieldErrors(loginForm);
    showFormError("login-error", "");
    const email = loginForm.querySelector("#login-email").value.trim();
    const password = loginForm.querySelector("#login-password").value;
    const remember = loginForm.querySelector("#login-remember").checked;

    const problems = {};
    if (!email) problems.email = "Enter your email";
    else if (!EMAIL_PATTERN.test(email)) problems.email = "Enter a valid email address";
    if (!password) problems.password = "Enter your password";
    if (Object.keys(problems).length) { applyFieldErrors(loginForm, problems); return; }

    const button = loginForm.querySelector("button[type=submit]");
    setBusy(button, true);
    try {
      await signIn(email, password, remember);
    } catch (err) {
      // ONE generic message for any wrong email or password, so the page never reveals which one was wrong.
      showFormError("login-error", err.status === 401 ? "Email or password is incorrect." : err.message);
      setBusy(button, false);
    }
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFieldErrors(registerForm);
    showFormError("register-error", "");
    const name = registerForm.querySelector("#reg-name").value.trim();
    const email = registerForm.querySelector("#reg-email").value.trim();
    const password = registerForm.querySelector("#reg-password").value;
    const role = registerForm.querySelector("#reg-role").value;

    const problems = {};
    if (!name) problems.name = "Enter your name";
    if (!email) problems.email = "Enter your email";
    else if (!EMAIL_PATTERN.test(email)) problems.email = "Enter a valid email address";
    if (password.length < 8) problems.password = "Use at least 8 characters";
    else if (new TextEncoder().encode(password).length > 72) problems.password = "Use at most 72 characters";
    if (Object.keys(problems).length) { applyFieldErrors(registerForm, problems); return; }

    const button = registerForm.querySelector("button[type=submit]");
    setBusy(button, true);
    try {
      await auth.register({ name, email, password, role });
      await signIn(email, password, false);              // log in straight away
    } catch (err) {
      const unmatched = applyFieldErrors(registerForm, err.fields || {});
      if (unmatched.length || !Object.keys(err.fields || {}).length) showFormError("register-error", unmatched.join(" ") || err.message);
      setBusy(button, false);
    }
  });
}
