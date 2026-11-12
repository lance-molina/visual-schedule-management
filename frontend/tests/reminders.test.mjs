// Run with: node frontend/tests/reminders.test.mjs
import assert from "node:assert/strict";
import { reminderFor } from "../js/reminders.js";

const task = (extra = {}) => ({ time: "07:30", reminder_minutes: 5, status: "pending", ...extra });
const at = (h, m) => h * 60 + m;

assert.equal(reminderFor(task(), at(7, 20)), null);                                   // too early
assert.deepEqual(reminderFor(task(), at(7, 25)), { kind: "soon", minutes: 5 });
assert.deepEqual(reminderFor(task(), at(7, 29)), { kind: "soon", minutes: 1 });
assert.deepEqual(reminderFor(task(), at(7, 30)), { kind: "now" });
assert.deepEqual(reminderFor(task(), at(7, 59)), { kind: "now" });
assert.equal(reminderFor(task(), at(8, 1)), null);                                    // the window has passed
assert.deepEqual(reminderFor(task({ reminder_minutes: 0 }), at(7, 30)), { kind: "now" });
assert.equal(reminderFor(task({ reminder_minutes: 0 }), at(7, 29)), null);            // 0 = only at the start
assert.equal(reminderFor(task({ reminder_minutes: null }), at(7, 29)), null);
assert.equal(reminderFor(task({ status: "completed" }), at(7, 29)), null);
assert.equal(reminderFor(task({ time: "" }), at(7, 29)), null);
assert.equal(reminderFor(null, at(7, 29)), null);
assert.deepEqual(reminderFor(task({ time: "07:30:00" }), at(7, 28)), { kind: "soon", minutes: 2 });
console.log("reminders checks passed");
