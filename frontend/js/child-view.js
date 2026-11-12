// Child view: today's routine, one thing at a time. Tasks are completed HERE.
// Rules: a large picture with a short word, one primary button in the same place, a calm check mark,
// no flashing, a 5-second Undo, an exit that needs a confirmation, and an OPTIONAL countdown (js/timer.js) that
// only starts when someone presses Start.
// The SERVER sets completed_at; Undo uses PUT /api/tasks/<id> with status "pending".

import { children as childrenApi, schedules, tasks as tasksApi } from "./api.js";
import { clear, confirmModal, formatDateLong, formatTime12, h, icon, renderAvatar, renderTaskCard, setBusy, taskStates,
         todayLocal } from "./components.js";
import { t } from "./i18n.js";
import { getCachedSettings, initPage, playChime } from "./script.js";
import { createTimer } from "./timer.js";

const $ = (id) => document.getElementById(id);
const UNDO_MS = 5000;

await initPage("child-view");
const lang = getCachedSettings().language;

const state = { childId: null, child: null, tasks: [], undoTimer: null, undoTaskId: null, timer: null };
const main = $("cv-main");

$("exit-label").textContent = t("back_adult", lang);

function live(message) {
  $("cv-live").textContent = "";
  setTimeout(() => { $("cv-live").textContent = message; }, 30);
}

// ------------------------------------------------------------------ states

function stateCard(symbolClass, title, sub, extra = null) {
  return h("div", { class: "state-card" },
    h("div", { class: symbolClass, "aria-hidden": "true" }, icon(symbolClass.includes("big-check") ? "fa-circle-check" : "fa-calendar-days")),
    h("p", { class: "task-name" }, title),
    sub ? h("p", { class: "task-time" }, sub) : null,
    extra);
}

function renderError() {
  hideUndo();
  $("strip-section").hidden = true;
  clear(main);
  main.append(h("div", { class: "state-card" },
    h("p", { class: "task-name" }, t("error_load", lang)),
    h("button", { type: "button", class: "btn btn-primary btn-child mt-3", onClick: load },
      icon("fa-rotate-right", "me-2"), t("try_again", lang))));
}

function render() {
  state.timer?.dispose();                                  // a new render means a new current task: stop the old countdown
  state.timer = null;
  const states = taskStates(state.tasks);
  const nowIndex = states.indexOf("now");
  clear(main);

  $("cv-avatar-host").replaceChildren(renderAvatar(state.child.photo_url, "avatar-lg"));
  $("cv-name").textContent = state.child.name;
  $("cv-date").textContent = formatDateLong(todayLocal(), lang);
  $("cv-header").hidden = false;

  if (!state.tasks.length) {
    $("strip-section").hidden = true;
    main.append(stateCard("big-icon", t("no_routine", lang), t("no_routine_sub", lang)));
    return;
  }

  if (nowIndex === -1) {                                   // everything is done: a calm, static message
    main.append(stateCard("big-check", t("all_done", lang), t("all_done_sub", lang)));
  } else {
    const task = state.tasks[nowIndex];
    const button = h("button", { id: "done-btn", type: "button", class: "btn btn-success btn-child",
                                 onClick: () => markDone(task, button) },
      icon("fa-check", "me-2"), t("done", lang));
    main.append(h("section", { class: "now-card", "aria-label": `${t("now", lang)}: ${task.name}` },
      h("p", { class: "fw-semibold mb-1" }, icon("fa-circle-dot", "me-1"), t("now", lang)),
      h("div", { class: "task-icon", "aria-hidden": "true" }, icon(task.icon)),
      h("p", { class: "task-name" }, task.name),
      h("p", { class: "task-time" }, formatTime12(task.time)),
      (state.timer = createTimer({ minutes: task.duration, lang, onStatus: live })).el,
      button));
  }

  const strip = $("task-strip");
  clear(strip);
  state.tasks.forEach((task, index) => strip.append(renderTaskCard(task, { state: states[index], lang })));
  $("strip-section").hidden = false;
}

// ------------------------------------------------------------------ actions

function replaceTask(updated) {
  state.tasks = state.tasks.map((task) => (task.id === updated.id ? updated : task));
}

async function markDone(task, button) {
  setBusy(button, true);                                   // one tap, one request
  try {
    const updated = await tasksApi.complete(task.id);
    replaceTask(updated);
    playChime();
    render();
    live(`${task.name} ${t("marked_done", lang)}`);
    showUndo(updated);
    $("done-btn")?.focus();
  } catch {
    renderError();
  }
}

function showUndo(task) {
  clearTimeout(state.undoTimer);
  state.undoTaskId = task.id;
  $("undo-text").textContent = `${task.name}: ${t("marked_done", lang)}`;
  $("undo-btn").textContent = t("undo", lang);
  $("undo-bar").hidden = false;
  document.querySelector(".child-view").classList.add("has-undo");
  state.undoTimer = setTimeout(hideUndo, UNDO_MS);
}

function hideUndo() {
  clearTimeout(state.undoTimer);
  state.undoTaskId = null;
  $("undo-bar").hidden = true;
  document.querySelector(".child-view")?.classList.remove("has-undo");
}

$("undo-btn").addEventListener("click", async () => {
  const id = state.undoTaskId;
  if (id === null) return;
  hideUndo();
  try {
    replaceTask(await tasksApi.update(id, { status: "pending" }));
    render();
    $("done-btn")?.focus();
  } catch {
    renderError();
  }
});

$("exit-child-view").addEventListener("click", async () => {
  const leave = await confirmModal(t("exit_body", lang),
    { title: t("exit_title", lang), confirmLabel: t("exit_confirm", lang), cancelLabel: t("cancel", lang) });
  if (leave) window.location.href = "dashboard.html";
});

// ------------------------------------------------------------------ loading

function renderPicker(children) {
  clear(main);
  $("cv-header").hidden = true;
  $("strip-section").hidden = true;
  if (!children.length) {
    main.append(h("p", { class: "task-name text-center" }, t("no_children", lang)));
    return;
  }
  main.append(
    h("h2", { class: "h3 mb-3" }, t("choose_child", lang)),
    h("ul", { class: "picker-list" }, children.map((child) =>
      h("li", {}, h("a", { href: `child-view.html?child=${child.id}` }, renderAvatar(child.photo_url, "avatar-lg"), child.name)))));
}

async function load() {
  try {
    if (!state.childId) {
      const result = await childrenApi.list({ per_page: 100 });
      if (result.items.length !== 1) { renderPicker(result.items); return; }
      state.childId = result.items[0].id;
    }
    const [child, schedule] = await Promise.all([
      childrenApi.get(state.childId),
      schedules.forChild(state.childId, { date: todayLocal() }),
    ]);
    state.child = child;
    state.tasks = schedule.items[0] ? schedule.items[0].tasks : [];
    render();
  } catch {
    renderError();
  }
}

state.childId = Number(new URLSearchParams(window.location.search).get("child")) || null;
await load();
