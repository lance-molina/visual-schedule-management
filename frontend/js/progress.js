// Progress: summary cards, three charts (daily bar, weekly line, most/least completed horizontal bar),
// a "View as table" alternative, and a plain CSV export. All figures come from GET /api/progress,
// which uses the same task rows the child view writes, so the screens cannot disagree.
// Completion rate = completed / scheduled, shown as a dash when nothing was scheduled.

import { children as childrenApi, progress } from "./api.js";
import { clear, formatDateShort, h, percent, todayLocal } from "./components.js";
import { initPage } from "./script.js";

const $ = (id) => document.getElementById(id);
const RANGE_LABELS = { today: "Today", week: "The last 7 days", month: "The last 30 days" };
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const state = { childId: null, range: "week", data: null };
const charts = {};

await initPage("progress");

// ------------------------------------------------------------------ helpers

function colors() {
  const css = getComputedStyle(document.documentElement);
  return { bar: css.getPropertyValue("--color-action").trim() || "#2B6CB0",
           text: css.getPropertyValue("--color-text").trim() || "#1F2937",
           grid: css.getPropertyValue("--color-border").trim() || "#D1D5DB" };
}

const pct = (rate) => (rate == null ? null : Math.round(rate * 100));
const detail = (p) => (p.scheduled === 0 ? "No tasks scheduled" : `${p.completed} of ${p.scheduled} tasks (${percent(p.completion_rate)})`);
const shortName = (name) => (name.length > 26 ? `${name.slice(0, 25)}…` : name);
const weekLabel = (w) => `${formatDateShort(w.start)} to ${formatDateShort(w.end)}`;

function setError(message) {
  $("pg-error-text").textContent = message || "";
  $("pg-error").hidden = !message;
}

function chartOptions(c, extra = {}) {
  return {
    responsive: true, maintainAspectRatio: false,
    animation: reducedMotion ? false : undefined,
    plugins: { legend: { display: false }, tooltip: { callbacks: {} } },
    scales: { y: { min: 0, max: 100, ticks: { color: c.text, callback: (v) => `${v}%` }, grid: { color: c.grid } },
              x: { ticks: { color: c.text }, grid: { display: false } } },
    ...extra,
  };
}

function draw(key, canvasId, config) {
  charts[key]?.destroy();
  charts[key] = new window.Chart($(canvasId), config);
}

// ------------------------------------------------------------------ text alternatives

function daySentence(daily) {
  const withTasks = daily.filter((d) => d.scheduled > 0);
  if (!withTasks.length) return "No tasks were scheduled on any day in this range.";
  const best = withTasks.reduce((a, b) => (b.completion_rate > a.completion_rate ? b : a));
  const worst = withTasks.reduce((a, b) => (b.completion_rate < a.completion_rate ? b : a));
  if (withTasks.length === 1) return `Only ${formatDateShort(best.date)} has tasks: ${detail(best)}.`;
  return `Best day: ${formatDateShort(best.date)} at ${percent(best.completion_rate)}. Lowest day: ${formatDateShort(worst.date)} at ${percent(worst.completion_rate)}.`;
}

function weekSentence(weekly) {
  return `Weekly completion, oldest first: ${weekly.map((w) => `${weekLabel(w)} ${percent(w.completion_rate)}`).join("; ")}.`;
}

function taskSentence(tasks) {
  if (!tasks.length) return "No tasks to compare.";
  const best = tasks[0];
  const worst = tasks[tasks.length - 1];
  return `Most completed: ${best.name} (${percent(best.completion_rate)}). Least completed: ${worst.name} (${percent(worst.completion_rate)}).`;
}

function buildTable(caption, headers, rows) {
  return h("table", { class: "table table-sm table-bordered align-middle" },
    h("caption", { class: "text-start fw-semibold" }, caption),
    h("thead", {}, h("tr", {}, headers.map((text) => h("th", { scope: "col" }, text)))),
    h("tbody", {}, rows.map((cells) => h("tr", {}, cells.map((cell, i) => h(i === 0 ? "th" : "td", i === 0 ? { scope: "row" } : {}, cell))))));
}

function renderTables(data) {
  const host = $("chart-table");
  clear(host);
  const row = (label, p) => [label, String(p.completed), String(p.scheduled), percent(p.completion_rate)];
  const heads = (first) => [first, "Completed", "Scheduled", "Completion rate"];
  host.append(
    buildTable("Daily completion", heads("Day"), data.daily.map((d) => row(formatDateShort(d.date), d))),
    buildTable("Weekly trend", heads("Week"), data.weekly.map((w) => row(weekLabel(w), w))),
    buildTable("Completion by task", heads("Task"), data.tasks.map((p) => row(p.name, p))));
}

// ------------------------------------------------------------------ rendering

function render(data) {
  const c = colors();
  const { summary } = data;
  $("m-rate").textContent = percent(summary.completion_rate);
  $("m-completed").textContent = summary.completed;
  $("m-scheduled").textContent = summary.scheduled;

  const empty = summary.scheduled === 0;
  $("pg-empty").hidden = !empty;
  $("charts").hidden = empty;
  $("toggle-table").hidden = empty;
  if (empty) {
    $("chart-table").hidden = true;
    $("chart-summary").textContent = `${RANGE_LABELS[data.range]}: no tasks were scheduled.`;
    Object.values(charts).forEach((chart) => chart.destroy());
    return;
  }

  // Daily completion (bar). A day with nothing scheduled has no bar.
  draw("daily", "daily-chart", {
    type: "bar",
    data: { labels: data.daily.map((d) => formatDateShort(d.date)),
            datasets: [{ data: data.daily.map((d) => pct(d.completion_rate)), backgroundColor: c.bar }] },
    options: { ...chartOptions(c), plugins: { legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => detail(data.daily[ctx.dataIndex]) } } } },
  });

  // Weekly trend (line): always the last four rolling 7-day blocks.
  draw("weekly", "weekly-chart", {
    type: "line",
    data: { labels: data.weekly.map(weekLabel),
            datasets: [{ data: data.weekly.map((w) => pct(w.completion_rate)), borderColor: c.bar, backgroundColor: c.bar,
                         pointRadius: 5, tension: 0.2, spanGaps: false }] },
    options: { ...chartOptions(c), plugins: { legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => detail(data.weekly[ctx.dataIndex]) } } } },
  });

  // Most and least completed tasks (horizontal bar): up to 5 highest and 5 lowest.
  const picks = data.tasks.length <= 10 ? data.tasks : [...data.tasks.slice(0, 5), ...data.tasks.slice(-5)];
  draw("tasks", "tasks-chart", {
    type: "bar",
    data: { labels: picks.map((p) => shortName(p.name)),
            datasets: [{ data: picks.map((p) => pct(p.completion_rate)), backgroundColor: c.bar }] },
    options: { ...chartOptions(c), indexAxis: "y",
      scales: { x: { min: 0, max: 100, ticks: { color: c.text, callback: (v) => `${v}%` }, grid: { color: c.grid } },
                y: { ticks: { color: c.text }, grid: { display: false } } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => detail(picks[ctx.dataIndex]) } } } },
  });

  const dailyText = daySentence(data.daily);
  const weeklyText = weekSentence(data.weekly);
  const tasksText = taskSentence(data.tasks);
  $("daily-chart").setAttribute("aria-label", `Daily completion bar chart. ${dailyText}`);
  $("weekly-chart").setAttribute("aria-label", `Weekly trend line chart. ${weeklyText}`);
  $("tasks-chart").setAttribute("aria-label", `Most and least completed tasks, horizontal bar chart. ${tasksText}`);
  $("chart-summary").textContent =
    `${RANGE_LABELS[data.range]}: ${summary.completed} of ${summary.scheduled} tasks completed (${percent(summary.completion_rate)}). ${dailyText} ${tasksText}`;
  renderTables(data);
}

async function load() {
  setError("");
  $("chart-summary").textContent = "Loading…";
  try {
    state.data = await progress.get({ child_id: state.childId, range: state.range, today: todayLocal() });
    render(state.data);
  } catch (err) {
    state.data = null;
    $("chart-summary").textContent = "";
    setError(`Could not load progress. ${err.message}`);
  }
}

// ------------------------------------------------------------------ CSV export (a plain download, no extra endpoint)

function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;          // stop spreadsheet programs running a cell as a formula
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function exportCsv() {
  const data = state.data;
  if (!data) return;
  const line = (section, label, p) => [section, label, p.scheduled, p.completed, p.completion_rate == null ? "" : pct(p.completion_rate)];
  const rows = [
    ["section", "label", "scheduled", "completed", "completion_rate_percent"],
    ...data.daily.map((d) => line("daily", d.date, d)),
    ...data.weekly.map((w) => line("weekly", `${w.start} to ${w.end}`, w)),
    ...data.tasks.map((p) => line("task", p.name, p)),
  ];
  const csv = "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
  const link = h("a", { href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })),
                        download: `progress-child-${data.child_id}-${data.range}-${todayLocal()}.csv` });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

// ------------------------------------------------------------------ controls

for (const button of document.querySelectorAll("#range-buttons [data-range]")) {
  button.addEventListener("click", () => {
    state.range = button.dataset.range;
    document.querySelectorAll("#range-buttons [data-range]").forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    load();
  });
}
$("pg-child").addEventListener("change", (event) => { state.childId = Number(event.target.value); load(); });
$("pg-retry").addEventListener("click", load);
$("export-report").addEventListener("click", exportCsv);
$("toggle-table").addEventListener("click", () => {
  const table = $("chart-table");
  table.hidden = !table.hidden;
  $("toggle-table").setAttribute("aria-expanded", String(!table.hidden));
  $("toggle-table").textContent = table.hidden ? "View as table" : "Hide table";
});

// ------------------------------------------------------------------ start

let kids = [];
try {
  kids = (await childrenApi.list({ per_page: 100 })).items;
} catch (err) {
  setError(`Could not load your children. ${err.message}`);
}

const select = $("pg-child");
if (!kids.length) {
  select.append(h("option", { value: "" }, "No children yet"));
  $("pg-empty").textContent = "Add a child on the dashboard first.";
  $("pg-empty").hidden = false;
  $("charts").hidden = true;
  $("toggle-table").hidden = true;
  for (const el of [select, $("export-report"), ...document.querySelectorAll("#range-buttons button")]) el.disabled = true;
} else {
  for (const child of kids) select.append(h("option", { value: String(child.id) }, child.name));
  const wanted = Number(new URLSearchParams(window.location.search).get("child"));
  state.childId = kids.some((k) => k.id === wanted) ? wanted : kids[0].id;
  select.value = String(state.childId);
  await load();
}
