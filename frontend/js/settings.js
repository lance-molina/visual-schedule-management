// Settings: profile, notifications (stored only), accessibility, language. One Save button.
// Text size and contrast preview instantly; they persist (database plus local cache) on Save.

import { auth } from "./api.js";
import { applyFieldErrors, clearFieldErrors, icon, setBusy } from "./components.js";
import { applySettings, cacheSettings, getCachedSettings, initPage, showToast } from "./script.js";

const form = document.getElementById("settings-form");
const $ = (id) => document.getElementById(id);

function fill(user) {
  $("set-name").value = user.name;
  $("set-email").value = user.email;
  $("set-role").value = user.role;
  const s = user.settings;
  $("set-font").value = s.font_size;
  $("set-contrast").value = s.contrast;
  $("set-sound").checked = s.sound_on;
  $("set-language").value = s.language;
  $("set-notify-daily").checked = s.notify_daily;
  $("set-notify-task").checked = s.notify_task;
  $("set-notify-weekly").checked = s.notify_weekly;
}

function readSettings() {
  return {
    font_size: $("set-font").value,
    contrast: $("set-contrast").value,
    sound_on: $("set-sound").checked,
    language: $("set-language").value,
    notify_daily: $("set-notify-daily").checked,
    notify_task: $("set-notify-task").checked,
    notify_weekly: $("set-notify-weekly").checked,
  };
}

// Instant preview of the two visual settings (not saved until the button is pressed).
for (const id of ["set-font", "set-contrast"]) {
  $(id).addEventListener("change", () => applySettings({ ...getCachedSettings(), ...readSettings() }));
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFieldErrors(form);
  $("settings-error").textContent = "";
  $("settings-status").textContent = "";

  const name = $("set-name").value.trim();
  const email = $("set-email").value.trim();
  const problems = {};
  if (!name) problems.name = "Enter your name";
  if (!email) problems.email = "Enter your email";
  else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) problems.email = "Enter a valid email address";
  if (Object.keys(problems).length) { applyFieldErrors(form, problems); return; }

  const button = $("settings-save");
  setBusy(button, true);
  try {
    const user = await auth.updateMe({ name, email, role: $("set-role").value, settings: readSettings() });
    fill(user);
    cacheSettings(user.settings);
    applySettings(user.settings);
    $("settings-status").replaceChildren(icon("fa-circle-check", "me-1"), "Settings saved.");
    showToast("Settings saved");
    // The menu shows the name, role and language, so reload to refresh it.
    setTimeout(() => window.location.reload(), 700);
  } catch (err) {
    const unmatched = applyFieldErrors(form, err.fields || {});
    if (unmatched.length || !Object.keys(err.fields || {}).length) {
      $("settings-error").replaceChildren(icon("fa-circle-exclamation", "me-1"), unmatched.join(" ") || err.message);
    }
    setBusy(button, false);
  }
});

const user = await initPage("settings");
if (user) fill(user);
