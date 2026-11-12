// timer.js: an optional visual countdown for the current task (child view).
// It only starts when someone presses Start, never completes the task by itself, and changes with a colour AND
// a word near the end (not colour alone). The pie is redrawn once a second: no animation, so nothing flashes.

import { h, icon } from "./components.js";
import { t } from "./i18n.js";
import { playChime } from "./script.js";

const WARN_MS = 60000;                       // "almost time" in the last minute (or the last fifth of a short task)

const mmss = (ms) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

/** Returns { el, dispose }. `minutes` is the task's duration; `onStatus(text)` lets the page announce key moments; `onAlert("almost" | "up")` lets the page speak them. */
export function createTimer({ minutes, lang = "en", onStatus = () => {}, onAlert = () => {} }) {
  const total = minutes * 60000;
  const warnAt = Math.min(WARN_MS, total * 0.2);
  let remaining = total, endAt = null, interval = null, warned = false, lastShown = "";

  const startBtn = h("button", { type: "button", class: "btn btn-outline-primary btn-lg timer-start", onClick: start },
    icon("fa-hourglass-start", "me-2"), `${t("timer_start", lang)} (${minutes} ${t("timer_min", lang)})`);
  const pie = h("div", { class: "timer-pie", "aria-hidden": "true" });
  const time = h("span", { class: "timer-time", role: "timer" });
  const status = h("span", { class: "timer-status", "aria-live": "polite" });
  const pauseBtn = h("button", { type: "button", class: "btn btn-outline-secondary", onClick: togglePause });
  const resetBtn = h("button", { type: "button", class: "btn btn-outline-secondary", onClick: reset },
    icon("fa-rotate-left", "me-1"), t("timer_reset", lang));
  const panel = h("div", { class: "timer-panel", hidden: true }, pie, time, status,
    h("div", { class: "timer-buttons" }, pauseBtn, resetBtn));
  const el = h("div", { class: "timer" }, startBtn, panel);

  function draw() {
    const share = total ? Math.min(1, Math.max(0, remaining / total)) : 0;
    pie.style.setProperty("--pie-angle", `${Math.round(share * 360)}deg`);
    pie.classList.toggle("timer-warn", warned);
    const shown = mmss(remaining);
    if (shown !== lastShown) { time.textContent = shown; lastShown = shown; }
  }

  function setStatus(text) {
    status.textContent = text;
    if (text) onStatus(text);
  }

  function tick() {
    remaining = Math.max(0, endAt - Date.now());
    if (!warned && remaining <= warnAt && remaining > 0) {
      warned = true;
      setStatus(t("timer_almost", lang));
      playChime();
      onAlert("almost");
    }
    draw();
    if (remaining === 0) {
      stop();
      setStatus(t("timer_up", lang));
      playChime();
      onAlert("up");
      pauseBtn.hidden = true;
    }
  }

  function stop() { clearInterval(interval); interval = null; }

  function run() {
    endAt = Date.now() + remaining;
    interval = setInterval(tick, 250);
    pauseBtn.replaceChildren(icon("fa-pause", "me-1"), t("timer_pause", lang));
  }

  function start() {
    startBtn.hidden = true;
    panel.hidden = false;
    pauseBtn.hidden = false;
    remaining = total; warned = false; lastShown = "";
    setStatus("");
    draw();
    run();
  }

  function togglePause() {
    if (interval) {                       // pause
      remaining = Math.max(0, endAt - Date.now());
      stop();
      pauseBtn.replaceChildren(icon("fa-play", "me-1"), t("timer_resume", lang));
    } else {
      run();
    }
    draw();
  }

  function reset() {
    stop();
    remaining = total; warned = false; lastShown = "";
    status.textContent = "";
    panel.hidden = true;
    startBtn.hidden = false;
    startBtn.focus();
  }

  return { el, dispose: stop };
}
