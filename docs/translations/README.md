# Filipino wording: review sheet

Every Filipino string in the app was written by the team without a native-speaker review. `filipino-review.csv` lists all of
them (screen text, talking-board starter cards, activity names) so someone fluent can check them and sign off. Open it in Excel
or Google Sheets, fill the last five columns, then have a developer apply the changes (`frontend/js/i18n.js`,
`frontend/js/board-cards.js`, `frontend/js/activities.js`).

**Record who reviewed it.** The research paper and the user manual should name the reviewer, or say plainly that the wording
was not reviewed. Do not describe the translations as verified until the Status column is filled.

## What to check (rules of thumb from the Mozilla Tagalog style guide and the Microsoft Filipino style guide)

Source: <https://mozilla-l10n.github.io/styleguides/tl/> (read on 2026-11-12). Check the Microsoft guide and the KWF Diksiyonaryo
yourself too; they were not read for this list.

- Natural, short, neutral wording; not word-for-word English and not old or deep Tagalog.
- Buttons: the guide uses the `i-` + verb pattern for most actions (`i-Paste`), with exceptions such as `Kopyahin`. Keep buttons to one or two words.
- Leave out "the" and other small words where space is tight.
- Keep terms that Filipinos normally say in English (the guide also says not to transliterate).
- `mga` before a plural noun.
- Placeholders such as `{task}` and `{n}` must stay exactly as they are, in a sensible place in the sentence.
- Filipino text is often 15 to 30 percent longer than English, so check that buttons and the child view still fit.
- For the talking board, the word must sound right when spoken by the Filipino voice (`fil-PH-BlessicaNeural`), not only look right.

## Regenerate the sheet

`node docs/translations/export-filipino-review.mjs` (Node 22 or newer). It overwrites the CSV, so copy any reviewer notes first.
