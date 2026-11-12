// Rebuilds filipino-review.csv from the strings in the app. Run from the repo root (Node 22 or newer):
//   node docs/translations/export-filipino-review.mjs
// It keeps nothing from the old file, so copy the reviewer columns over (or edit the new file in a spreadsheet) first.
import { writeFileSync } from "node:fs";
import { STRINGS } from "../../frontend/js/i18n.js";
import { BUILT_IN } from "../../frontend/js/board-cards.js";
import { ACTIVITIES } from "../../frontend/js/activities.js";

const rows = [];
for (const key of Object.keys(STRINGS.en)) {
  rows.push(["Screen text", key, STRINGS.en[key], STRINGS.fil[key] || ""]);
}
for (const c of BUILT_IN) rows.push(["Talking board card", `${c.category}: ${c.label}`, c.label, c.fil || ""]);
for (const a of ACTIVITIES) rows.push(["Activity name", a.id, a.name, a.fil || ""]);

const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
const header = ["Area", "Key", "English", "Filipino now", "Suggested Filipino", "Reviewed by", "Date", "Status (ok / changed / question)", "Notes"];
const csv = [header, ...rows.map((r) => [...r, "", "", "", "", ""])].map((r) => r.map(q).join(",")).join("\r\n") + "\r\n";
writeFileSync(new URL("./filipino-review.csv", import.meta.url), "﻿" + csv);   // BOM so Excel reads the accents correctly
console.log(`${rows.length} rows written to docs/translations/filipino-review.csv`);
