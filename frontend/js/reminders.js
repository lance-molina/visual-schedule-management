// reminders.js: decides whether the child view should show a reminder for a task. Pure (no page access), so it can be
// tested with plain Node: node frontend/tests/reminders.test.mjs
//
// reminder_minutes means "this many minutes BEFORE the task's start time" (0 = at the start time).
//   soon: from reminder_minutes before the start until the start   -> "Coming up: Brush teeth in 5 min"
//   now:  from the start until 30 minutes after it (still pending) -> "Time for: Brush teeth"
// Nothing is shown before the window, after it, for finished tasks, or when no reminder was set.

export const NOW_WINDOW_MINUTES = 30;

export function reminderFor(task, nowMinutes) {
  if (!task || task.status === "completed" || task.reminder_minutes == null || !/^\d\d:\d\d/.test(task.time || "")) return null;
  const start = Number(task.time.slice(0, 2)) * 60 + Number(task.time.slice(3, 5));
  const until = start - nowMinutes;                      // minutes until the start (negative after it)
  if (until > task.reminder_minutes) return null;
  if (until > 0) return { kind: "soon", minutes: Math.ceil(until) };
  if (until >= -NOW_WINDOW_MINUTES) return { kind: "now" };
  return null;
}
