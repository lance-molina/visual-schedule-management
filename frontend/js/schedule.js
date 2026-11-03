// Schedule creator: build and edit one child's schedule for one date.
// Three panels: activity library, timeline (drop zone), task settings.
// Every drag action has a button equivalent (plus, Up, Down, Remove) and changes are announced for screen readers.
// Saving: a NEW schedule is one request (POST with its tasks). An EXISTING schedule is saved with per-task
// calls. The draft is kept if anything fails, and retrying is safe.

import { children as childrenApi, schedules, tasks as tasksApi } from "./api.js";
import { ACTIVITIES, CATEGORIES, categoryLabel } from "./activities.js";
import { applyFieldErrors, clear, clearFieldErrors, confirmModal, h, icon, renderTaskCard, setBusy, taskStates,
         todayLocal } from "./components.js";
import { initPage, showToast } from "./script.js";

const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, "0");
const smallScreen = window.matchMedia("(max-width: 991.98px)");

const state = {
  children: [],
  childId: null,
  date: todayLocal(),
  scheduleId: null,
  items: [],          // the working copy of the timeline
  removed: [],        // ids of saved tasks to delete on the next save
  selected: null,     // key of the selected item
  dirty: false,
  chip: "all",
  retry: null,
  focus: null,        // { key, action } to restore keyboard focus after a re-render
};

let keyCounter = 0;
const newKey = () => `k${++keyCounter}`;

// ------------------------------------------------------------------ the working copy of a task

const payloadOf = (item) => ({ name: item.name, icon: item.icon, category: item.category, time: item.time,
                               duration: item.duration, reminder_minutes: item.reminder_minutes });
const signature = (item, index) => JSON.stringify({ ...payloadOf(item), position: index + 1 });

function fromServer(task, index) {
  const item = { key: newKey(), id: task.id, name: task.name, icon: task.icon, category: task.category, time: task.time,
                 duration: task.duration, reminder_minutes: task.reminder_minutes, status: task.status };
  item.orig = signature(item, index);        // used to skip tasks that did not change
  return item;
}

/** A new task starts where the one before it ends (08:00 for the first). */
function startTimeAfter(previous) {
  if (!previous) return "08:00";
  const [hh, mm] = previous.time.split(":").map(Number);
  const total = Math.min(hh * 60 + mm + Number(previous.duration || 0), 23 * 60 + 55);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

function warningsFor(item, index) {
  const notes = [];
  const before = state.items[index - 1];
  if (before && item.time < before.time) notes.push("Earlier than the task before it");
  if (state.items.some((other) => other !== item && other.name === item.name && other.time === item.time)) {
    notes.push("Same activity at the same time as another task");
  }
  return notes;
}

const selectedItem = () => state.items.find((item) => item.key === state.selected) || null;

// ------------------------------------------------------------------ small UI helpers

function announce(message) {
  const region = $("sr-announce");
  region.textContent = "";
  setTimeout(() => { region.textContent = message; }, 30);
}

function showError(message, retry = null) {
  $("sc-error-text").textContent = message;
  $("sc-error").hidden = false;
  $("sc-retry").hidden = !retry;
  state.retry = retry;
}

function hideError() {
  $("sc-error").hidden = true;
}

function markDirty() {
  state.dirty = true;
  $("dirty-badge").hidden = false;
}

function markClean() {
  state.dirty = false;
  $("dirty-badge").hidden = true;
}

window.addEventListener("beforeunload", (event) => {
  if (state.dirty) { event.preventDefault(); event.returnValue = ""; }
});

async function confirmDiscard() {
  if (!state.dirty) return true;
  return confirmModal("You have changes that are not saved. Leave without saving?",
    { title: "Unsaved changes", confirmLabel: "Discard changes", danger: true });
}

// ------------------------------------------------------------------ library

function renderChips() {
  const host = $("category-chips");
  clear(host);
  for (const [id, label] of [["all", "All"], ...CATEGORIES.map((c) => [c.id, c.label])]) {
    host.append(h("button", { type: "button", class: "chip", "aria-pressed": String(state.chip === id),
                              onClick: () => { state.chip = id; renderChips(); renderLibrary(); } }, label));
  }
}

function renderLibrary() {
  const list = $("activity-library");
  clear(list);
  for (const activity of ACTIVITIES.filter((a) => state.chip === "all" || a.category === state.chip)) {
    list.append(h("li", { class: `activity-card cat-${activity.category}`, dataset: { activity: activity.id } },
      h("span", { class: "activity-icon" }, icon(activity.icon)),
      h("span", { class: "activity-text" },
        h("span", { class: "activity-name" }, activity.name),
        h("span", { class: "activity-cat" }, categoryLabel(activity.category))),
      h("button", { type: "button", class: "btn btn-outline-primary btn-sm activity-add", "aria-label": `Add ${activity.name}`,
                    onClick: () => addActivity(activity) }, icon("fa-plus"))));
  }
}

// ------------------------------------------------------------------ timeline

function actionButton(symbol, label, action, disabled, onClick) {
  return h("button", { type: "button", class: "btn btn-outline-secondary btn-sm", "aria-label": label, disabled,
                       dataset: { action }, onClick }, icon(symbol));
}

function timelineItem(item, index) {
  const last = state.items.length - 1;
  const isSelected = item.key === state.selected;
  const reminder = item.reminder_minutes == null ? "" : item.reminder_minutes === 0 ? " · reminder at start" : ` · reminder ${item.reminder_minutes} min before`;
  return h("li", { class: `timeline-item cat-${item.category}${isSelected ? " selected" : ""}`, dataset: { key: item.key } },
    h("span", { class: "drag-handle", "aria-hidden": "true", title: "Drag to reorder" }, icon("fa-grip-vertical")),
    h("span", { class: "position", "aria-hidden": "true" }, String(index + 1)),
    h("button", { type: "button", class: "timeline-main", "aria-pressed": String(isSelected),
                  onClick: () => selectItem(item.key, true) },
      h("span", { class: "task-name-line" }, icon(item.icon, "me-2"), `${index + 1}. ${item.name}`),
      h("span", { class: "task-sub-line" },
        `${item.time} · ${item.duration} min · ${categoryLabel(item.category)}${reminder}${item.status === "completed" ? " · Done" : ""}`),
      warningsFor(item, index).map((note) => h("span", { class: "warn" }, icon("fa-triangle-exclamation", "me-1"), note))),
    h("div", { class: "timeline-actions" },
      actionButton("fa-arrow-up", `Move ${item.name} up`, "up", index === 0, () => moveItem(index, -1)),
      actionButton("fa-arrow-down", `Move ${item.name} down`, "down", index === last, () => moveItem(index, 1)),
      actionButton("fa-xmark", `Remove ${item.name}`, "remove", false, () => removeItem(index))));
}

function renderTimeline() {
  const list = $("timeline");
  clear(list);
  $("timeline-empty").hidden = state.items.length > 0;
  state.items.forEach((item, index) => list.append(timelineItem(item, index)));
  $("delete-schedule").hidden = state.scheduleId === null;

  if (state.focus) {
    const row = list.querySelector(`[data-key="${state.focus.key}"]`);
    const wanted = row && row.querySelector(`[data-action="${state.focus.action}"]`);
    const fallback = row && row.querySelector("[data-action]:not(:disabled)");
    (wanted && !wanted.disabled ? wanted : fallback)?.focus();
    state.focus = null;
  }
}

function addActivity(activity, index = state.items.length) {
  const item = { key: newKey(), id: null, name: activity.name, icon: activity.icon, category: activity.category,
                 time: startTimeAfter(state.items[index - 1]), duration: activity.minutes, reminder_minutes: null,
                 status: "pending", orig: null };
  state.items.splice(index, 0, item);
  state.selected = item.key;
  markDirty();
  hideError();
  renderTimeline();
  fillSettings();
  announce(`${activity.name} added at position ${index + 1}`);
}

function moveItem(index, delta) {
  const target = index + delta;
  if (target < 0 || target >= state.items.length) return;
  const [item] = state.items.splice(index, 1);
  state.items.splice(target, 0, item);
  state.focus = { key: item.key, action: delta < 0 ? "up" : "down" };
  markDirty();
  renderTimeline();
  announce(`${item.name} moved to position ${target + 1}`);
}

function reorder(from, to) {                       // used by drag and drop
  if (from === to) return;
  const [item] = state.items.splice(from, 1);
  state.items.splice(to, 0, item);
  markDirty();
  renderTimeline();
  announce(`${item.name} moved to position ${to + 1}`);
}

function removeItem(index) {
  const [item] = state.items.splice(index, 1);
  if (item.id !== null) state.removed.push(item.id);
  if (state.selected === item.key) state.selected = null;
  const next = state.items[Math.min(index, state.items.length - 1)];
  state.focus = next ? { key: next.key, action: "remove" } : null;
  markDirty();
  renderTimeline();
  fillSettings();
  announce(`${item.name} removed`);
  if (!next) $("tl-h").focus?.();
}

// ------------------------------------------------------------------ task settings (right panel, or a dialog on small screens)

const settingsForm = $("task-settings-form");
const taskModal = window.bootstrap.Modal.getOrCreateInstance($("task-modal"));

function fillSettings() {
  const item = selectedItem();
  $("ts-placeholder").hidden = Boolean(item);
  settingsForm.hidden = !item;
  clearFieldErrors(settingsForm);
  if (!item) return;
  $("ts-icon").className = `fa-solid ${item.icon}`;
  $("ts-name").textContent = item.name;
  $("ts-time").value = item.time;
  $("ts-duration").value = item.duration;
  $("ts-reminder").value = item.reminder_minutes == null ? "" : String(item.reminder_minutes);
}

function selectItem(key, fromClick) {
  state.selected = key;
  renderTimeline();
  fillSettings();
  if (fromClick && smallScreen.matches) {
    $("task-modal-body").append(settingsForm);        // the same form, shown in a dialog
    taskModal.show();
  }
}

$("task-modal").addEventListener("hidden.bs.modal", () => {
  $("task-settings-host").append(settingsForm);        // put the form back in its panel
  fillSettings();
});

function readSettingsForm() {
  const time = $("ts-time").value;
  const durationText = $("ts-duration").value.trim();
  const duration = Number(durationText);
  const problems = {};
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) problems.time = "Choose a time";
  if (!durationText || !Number.isInteger(duration) || duration < 5 || duration > 240) problems.duration = "Enter 5 to 240 minutes";
  const reminder = $("ts-reminder").value;
  return { problems, values: { time, duration, reminder_minutes: reminder === "" ? null : Number(reminder) } };
}

// While typing, only valid values are applied; the error message appears when the field loses focus.
settingsForm.addEventListener("input", () => {
  const item = selectedItem();
  if (!item) return;
  const { problems, values } = readSettingsForm();
  if (Object.keys(problems).length) return;
  clearFieldErrors(settingsForm);
  Object.assign(item, values);
  markDirty();
  renderTimeline();
});

settingsForm.addEventListener("change", () => {
  clearFieldErrors(settingsForm);
  const { problems } = readSettingsForm();
  if (Object.keys(problems).length) applyFieldErrors(settingsForm, problems);
});

settingsForm.addEventListener("submit", (event) => event.preventDefault());

// ------------------------------------------------------------------ loading

async function loadSchedule() {
  hideError();
  state.selected = null;
  state.removed = [];
  state.focus = null;
  if (!state.childId || !state.date) {
    state.scheduleId = null;
    state.items = [];
    markClean();
    renderTimeline();
    fillSettings();
    return;
  }
  try {
    const result = await schedules.forChild(state.childId, { date: state.date });
    const existing = result.items[0] || null;
    state.scheduleId = existing ? existing.id : null;
    state.items = existing ? existing.tasks.map(fromServer) : [];
    markClean();
    renderTimeline();
    fillSettings();
    announce(existing ? `Loaded ${state.items.length} tasks` : "No schedule for this date yet");
  } catch (err) {
    showError(`Could not load the schedule. ${err.message}`, loadSchedule);
  }
}

// ------------------------------------------------------------------ saving

function adopt(schedule) {
  const selectedIndex = state.items.findIndex((item) => item.key === state.selected);
  state.scheduleId = schedule.id;
  state.items = schedule.tasks.map(fromServer);
  state.removed = [];
  state.selected = selectedIndex >= 0 && state.items[selectedIndex] ? state.items[selectedIndex].key : null;
}

async function save() {
  hideError();
  if (!state.childId) return showError("Choose a child first.");
  if (!state.date) return showError("Choose a date.");
  if (settingsForm.querySelector(".is-invalid")) return showError("Fix the task settings first.");
  if (!state.items.length) {
    return showError(state.scheduleId ? "The timeline is empty. Add an activity, or use Delete schedule."
                                      : "Add at least one activity first.");
  }

  const button = $("save-schedule");
  setBusy(button, true);
  try {
    if (state.scheduleId === null) {
      adopt(await schedules.create({ child_id: state.childId, date: state.date,
                                     tasks: state.items.map(payloadOf) }));
    } else {
      for (const id of [...state.removed]) {
        try { await tasksApi.remove(id); } catch (err) { if (err.status !== 404) throw err; }
        state.removed = state.removed.filter((other) => other !== id);
      }
      for (const [index, item] of state.items.entries()) {
        const body = { ...payloadOf(item), position: index + 1 };
        if (item.id === null) {
          item.id = (await tasksApi.create({ ...body, schedule_id: state.scheduleId })).id;
          item.orig = signature(item, index);
        } else if (signature(item, index) !== item.orig) {
          await tasksApi.update(item.id, body);
          item.orig = signature(item, index);
        }
      }
    }
    markClean();
    renderTimeline();
    fillSettings();
    showToast("Schedule saved");
    announce("Schedule saved");
  } catch (err) {
    const detail = err.status === 409
      ? "This child already has a schedule for that date. Reload the page to edit it."
      : `Could not save. ${err.message} Your changes are still here.`;
    showError(detail, save);
  } finally {
    setBusy(button, false);
  }
}

async function deleteSchedule() {
  const ok = await confirmModal("Delete this schedule and all of its tasks? This cannot be undone.",
    { title: "Delete schedule", confirmLabel: "Delete", danger: true });
  if (!ok) return;
  try {
    await schedules.remove(state.scheduleId);
    showToast("Schedule deleted");
    await loadSchedule();
  } catch (err) {
    showError(`Could not delete. ${err.message}`);
  }
}

// ------------------------------------------------------------------ preview

function openPreview() {
  const list = $("preview-list");
  clear(list);
  if (!state.items.length) {
    list.append(h("li", { class: "text-muted" }, "Nothing to preview yet."));
  } else {
    const states = taskStates(state.items);
    state.items.forEach((item, index) => list.append(renderTaskCard(item, { state: states[index] })));
  }
  window.bootstrap.Modal.getOrCreateInstance($("preview-modal")).show();
}

// ------------------------------------------------------------------ child and date selectors

let switching = false;      // ignore a second change while the "unsaved changes" question is still open

async function switchTo(change, revert) {
  if (switching) return;
  switching = true;
  try {
    if (!(await confirmDiscard())) { revert(); return; }
    change();
    await loadSchedule();
  } finally {
    switching = false;
  }
}

$("sc-child").addEventListener("change", (event) => {
  const value = Number(event.target.value) || null;
  switchTo(() => { state.childId = value; }, () => { event.target.value = state.childId ?? ""; });
});

$("sc-date").addEventListener("change", (event) => {
  const value = event.target.value;
  if (!value) { event.target.value = state.date; return; }                    // a cleared date is not allowed
  if (switching) return;
  switchTo(() => { state.date = value; }, () => { event.target.value = state.date; });
});

// ------------------------------------------------------------------ start

$("save-schedule").addEventListener("click", save);
$("preview-schedule").addEventListener("click", openPreview);
$("delete-schedule").addEventListener("click", deleteSchedule);
$("sc-retry").addEventListener("click", () => state.retry && state.retry());

renderChips();
renderLibrary();

// Drag from the library (copies the card) into the timeline; drag inside the timeline to reorder.
window.Sortable.create($("activity-library"), {
  group: { name: "tasks", pull: "clone", put: false }, sort: false, animation: 150,
  filter: ".activity-add", preventOnFilter: false,
});
window.Sortable.create($("timeline"), {
  group: { name: "tasks", pull: false, put: true }, animation: 150, handle: ".drag-handle", ghostClass: "sortable-ghost",
  onAdd(event) {
    const activity = ACTIVITIES.find((a) => a.id === event.item.dataset.activity);
    event.item.remove();                              // the copy is replaced by a real row from the working copy
    if (activity) addActivity(activity, event.newIndex);
  },
  onUpdate(event) { reorder(event.oldIndex, event.newIndex); },
});

await initPage("schedule-creator");

try {
  const result = await childrenApi.list({ per_page: 100 });
  state.children = result.items;
} catch (err) {
  showError(`Could not load your children. ${err.message}`, () => window.location.reload());
}

const select = $("sc-child");
if (!state.children.length) {
  select.append(h("option", { value: "" }, "No children yet"));
  $("timeline-empty").textContent = "Add a child on the dashboard first.";
  for (const id of ["sc-date", "save-schedule", "preview-schedule"]) $(id).disabled = true;
} else {
  for (const child of state.children) select.append(h("option", { value: String(child.id) }, child.name));
  const wanted = Number(new URLSearchParams(window.location.search).get("child"));
  state.childId = state.children.some((c) => c.id === wanted) ? wanted : state.children[0].id;
  select.value = String(state.childId);
  $("sc-date").value = state.date;
  await loadSchedule();
}
