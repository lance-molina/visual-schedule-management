# Changelog

Every change since the v1 baseline (`docs/versions/v1-baseline.md`, commit cd1eeee) is listed here, newest first.

## v2k (2026-11-22, on top of v2j): settings column centred

CSS only (`frontend/css/style.css`). No HTML, JavaScript, API or database changes. Why: on wide screens the 40rem settings form sat against the left edge under a full-width title card, which looked lopsided. Verified: pytest 180 passed, Node tests passed, automated contrast, text-size and target-size check on every page at 360, 768 and 1280 px in normal and high-contrast mode.

- The settings form column is centred under the title card (the 40rem maximum width stays, so fields keep a comfortable length); on phones and tablets nothing changes because the form already fills the width
- The Save settings button is centred under the cards instead of sitting on the left edge

## v2j (2026-11-22, on top of v2i): progress and settings swap colours

CSS only (`frontend/css/style.css`). No HTML, JavaScript, API or database changes. Why: teal sits better with the progress page's green and blue tiles and soft bars, and brown is a calmer, more neutral colour for a page of forms. Verified: pytest 180 passed, Node tests passed, automated contrast, text-size and target-size check on every page at 360, 768 and 1280 px in normal and high-contrast mode.

- Progress is Jungle Teal: title card and the three chart-card top bars
- Settings is Chocolate Brown: title card and the four section icon discs
- Docs: `design-decisions.md` "Visual design (v2h)"

## v2i (2026-11-22, on top of v2h): softer chart bars

CSS only (`frontend/css/style.css`, the five `--chart-*` tokens). No HTML, JavaScript, API or database changes. Why: after v2h the stat tiles were half-strength but the bars were still full-strength, so the charts were the loudest part of the progress page, and a bright green bar next to an orange one could read as good versus bad. Verified: pytest 180 passed, Node tests passed, automated contrast, text-size and target-size check on every page at 360, 768 and 1280 px in normal and high-contrast mode.

- Bar fills are now half-strength: Deep Sky Blue #A8E0FA, Electric Green #9DFBAC, Amber Honey #FAD58D, Plum #F0C8EA, Pumpkin Spice #FFC6A1 (each is the v2h colour mixed 50% with white, written as hex because Chart.js cannot read `color-mix()`)
- The Yale Blue outline, the weekly line and the solid black high-contrast bars are unchanged
- Docs: `design-decisions.md` "Visual design (v2h)"

## v2h (2026-11-22, on top of v2g): Yale Blue palette, page colours

CSS plus the fallback colours in `frontend/js/progress.js`. No HTML, API or database changes. Why: the team chose a second palette (Plum, Deep Sky Blue, Electric Green, Amber Honey, Pumpkin Spice; Yale Blue, Jungle Teal, Dusty Lavender, Sage Green, Chocolate Brown) and asked for each page to have its own colour again. Verified: pytest 180 passed, Node tests passed, every page at 360, 768 and 1280 px in normal and high-contrast mode with an automated check (no text under 4.5:1, or 3:1 for large text; no text under 16px; no target under 44px) and no horizontal scroll.

- Palette: Yale Blue #124E78 replaces cerulean for the top bar, primary buttons, links and icons; Deep Sky Blue #51C1F5, Electric Green #3BF75A, Amber Honey #F5AB1B, Plum #E090D4 and Pumpkin Spice #FF8C42 replace the five pale colours (dark text on them); Jungle Teal, Dusty Lavender and Chocolate Brown are accents. Sage Green is #47792A, not #5B9537, because the original is only 3.6:1 with white text (the new one is 5.2:1)
- Page title cards are one colour per page again: dashboard Yale Blue, schedule creator Sage Green, talking board Dusty Lavender, progress Chocolate Brown, settings Jungle Teal (swapped in v2j). The line above the creator toolbar, the talking board sentence box and the three chart cards use the same colour as their title card
- Settings: the four section icon discs are all Jungle Teal
- Talking board: Speak has no fill and a Dusty Lavender outline; Food is Pumpkin Spice, Feelings Amber Honey, Activities Electric Green and Basics Deep Sky Blue (full colour on the tab, a half-strength tint on the cards); word chips have a Dusty Lavender outline
- Talking board selection no longer depends on green: a selected card is white with a thick Yale Blue border and a blue check, and the open tab keeps its own colour with a thick Yale Blue border (it was a dark fill, which made Feelings brown and Activities forest green)
- Big surfaces are softer: new `--lime-soft`, `--yellow-soft`, `--cyan-soft` and `--coral-soft` tokens (half strength) are used for the dashboard and progress tiles, the child view "Now" card and the "Now" task row. Buttons, tabs and small keys keep the full colours
- Dashboard "Schedule" button hover is a darker Deep Sky Blue; the all-done card uses a soft green tint instead of full Electric Green
- Chart bars cycle through the five bright colours with a Yale Blue outline; high contrast is still solid black
- Docs: `design-decisions.md` "Visual design (v2h)"

## v2g (2026-11-21, on top of v2f): team palette

CSS plus one file of JavaScript (`frontend/js/progress.js`, chart colours only). No HTML, API or database changes. Why: the team chose a new palette (cerulean and five pale colours) and asked for fewer, calmer colours. Verified: pytest 180 passed, Node tests passed, browser run of all 16 flows, every page at 360, 768, 1024 and 1280 px with no horizontal scroll, no text under 16px and no target under 44px (automated check), and no text under 4.5:1 (3:1 for large text) in normal or high-contrast mode.

- Palette: cerulean #1F7DA8 for the top bar, page title cards and solid blocks; five pale colours with dark text (cyan #96FFFF, lime #C9FF94, yellow #FFFF94, lavender #C994FF, coral #FF9494). Deep violet #8F1FA8, rust #A84A1F, green #2A7F18 and teal #26805A stay as edges and accents (two were darkened from the team's #38A81F and #2C9364 so white text passes 4.5:1)
- Blue text and primary buttons use #1B7699, a little deeper than the fill cerulean, because #1F7DA8 measured only 4.3:1 on the pale page tint
- Every page title card is cerulean (it was one colour per page); the schedule creator toolbar bar and the three chart-card top bars are cerulean too
- One icon colour: every picture (child view, talking board, schedule creator timeline, avatars) is cerulean. The per-icon colours from v2e (red apple, gold smile) are gone; the picture, the word and the tint behind it carry the meaning
- Dashboard and progress: the blue tile and the "Schedule" link are soft cyan with dark text; child avatars are white discs with a cerulean ring; the child picker uses pale keys
- Schedule creator: category discs and timeline numbers are pastel with dark glyphs (hygiene cyan, food coral, school lavender, play lime)
- Talking board: the sentence strip is cerulean and the word chips are white; Feelings is lavender and Activities yellow, so green is used only for "selected"
- Progress charts: bars cycle through the five pale colours with a cerulean outline (`--chart-1` to `--chart-5`, read by `progress.js`); the weekly line stays cerulean with cyan dots. The bar colour carries no meaning: every value is also on the axis, in the tooltip, in the summary sentence and in the table
- High contrast: every new pale and cerulean token turns white or black, discs stay black with white glyphs
- High contrast charts: bars and dots are solid black (were white with an outline, hard to see)
- Fix: the "+" on a schedule-creator library card turned white on a white background when hovered; it now shows a white "+" on the category's dark colour
- Docs: `design-decisions.md` "Visual design (v2g)"

## v2f (2026-11-21, on top of v2e): colour-forward look

CSS only (`frontend/css/style.css`). No HTML, JavaScript, API or database changes. Why: a person outside the team compared v2e with another team's build page by page; the other build won every page except the talking board, and settings tied. The cause was colour strength: v2e used pale tints on a pale background. Verified: pytest 180 passed, Node tests passed, browser run of all 16 flows, every page at 360, 768, 1024 and 1280 px with no horizontal scroll, an automated check finds no text under 16px and no target under 44px, and a script finds no text under 4.5:1 (3:1 for large text) in normal or high-contrast mode.

- Palette: the PDF's blue, green and yellow are now used at full strength as solid fills, with violet, orange and teal added as accents (new `--blue-solid`, `--lime-solid`, `--yellow-solid`, `--violet-solid`, `--orange-solid`, `--teal-solid` and `--green-deep` tokens, each with an edge colour). Every text and fill pair is 4.5:1 or better: white on blue, violet, orange, teal and deep green; dark ink on lime and yellow
- Main blue is a little deeper (`--color-action` #2B6CB0 to #2769B5) so blue text also reads on the tinted page background (5.0:1)
- Top bar is solid blue with a white brand tile and a white pill for the current page; below 1200px the same bar opens the menu panel
- Every page opens with a solid banner (dashboard blue, schedule creator green, talking board violet, progress orange, settings teal) with a white icon disc and confetti dots; built from the existing `h1`, so no markup changed
- Sign-in: solid blue panel with the done / now / later preview
- Dashboard and progress: solid blue, green and yellow number tiles; child cards have blue, green and yellow action buttons
- Schedule creator: solid category discs with white icons (blue, orange, violet, green), coloured timeline bars, a green bar on the toolbar
- Progress charts: coloured top bar on each chart card (chart bars stay blue, and are read from `--color-action`)
- Settings: coloured heading discs per group
- Child view: blue greeting band, yellow "Now" card, lime celebration card, solid yellow "Now" row, soft green finished rows, solid-colour child picker
- Talking board: violet outline and shadow on the sentence strip, yellow word chips
- High contrast still turns every fill white and every edge, icon and border black; confetti dots are hidden there and below 480px
- Kept: Nunito, toy-key press effect, `html.fs-S/M/L`, focus rings, reduced motion, 44px and 64px targets, every HTML id, `data-*` attribute and JS-targeted class
- Docs: `design-decisions.md` "Visual design (v2f)"

## v2e (2026-11-13, on top of v2d): look and feel

CSS and HTML, plus one line in progress.js (chart font). No API or database changes. Verified: pytest 180 passed, Node tests passed, browser run of all 16 flows, every page checked at 360, 768, 1024 and 1280 px with no horizontal scroll.

- New stylesheet: Nunito (Google Fonts link added to all 7 pages), tinted canvas, six pastel colour families, tactile "toy key" press effect on the talking board, category tabs, Done button and child picker, pill navigation with a brand tile
- Child view: "Back to adult screens" is now a round icon button (the words show as a tooltip on hover or focus and stay for screen readers)
- Icon colours: each picture has its own colour (water is blue, apple red, smile gold); the old single yellow is gone
- Talking board: the open category tints its cards; selected cards turn green with a check; two columns on phones even at the largest text size
- Schedule creator: library cards and timeline numbers are tinted by category; the timeline is a dashed drop area
- Sign-in page: a small done / now / later preview beside the form
- Small text raised to 16px at every text size (an automated check of the old stylesheet at the Small setting found about 70 text spots under 16px across the pages, as low as 12.8px; the new one finds none); the menu button and brand link now meet 44px (they were 40px)
- Forms: darker field borders (3:1), larger checks and switches, a clearer slider
- Added icons to dashboard and progress labels and settings headings (`aria-hidden`)
- Kept: html.fs-S/M/L, html.contrast-high, focus rings, reduced motion, 44px and 64px targets
- Docs: README libraries note, `design-decisions.md` "Visual design"

## v2d (2026-11-12, on top of v2c)

- Fix: an existing local SQLite file made before v2b made `GET /api/cards` answer 500 ("no such column"), so the Talking board showed "Something went wrong". `run-local.bat` now upgrades the file in place (`backend/database/local_upgrade.py`, called by `seed.py --create-tables`; adds only missing nullable columns, keeps all data). 3 new tests (180 total). MySQL still uses `database/migrations/002_...sql`.

## v2c (2026-11-12, on top of v2b)

Fixes after trying v2b on a real machine. Verified: pytest 177 passed, Node tests passed, browser run of every item.

- Talking board: opening another category now clears the cards and changes the prefix at once ("I feel" for Feelings, "I want" for Food and Activities, none for Basics); clicking the open category does nothing; an empty Basics strip shows "Tap a picture to start."
- Talking board: the "Remove last" button is removed (tap a chosen card again to remove it)
- Settings: Test voice shows what happened ("Online voice.", "This device's own voice...", "No voice is available..."); releasing the speed slider saves the speed and plays a sample, so the change is heard
- Local server: `frontend/serve.py` (no browser caching) replaces `python -m http.server`; `run-local.bat`, README and getting-started updated. Cause: the browser kept old JavaScript files after an update and the login page stopped working

## v2b (2026-11-12, on top of v2)

Added after comparing with another team's build and re-reading the instructor's PDF. Verified: pytest 177 passed, Node tests 2 files passed, Postman 56 requests / 92 assertions, browser run of every item below (30 checks, one test bug fixed).

- **Photo upload for cards** (the PDF: "upload their own photos or use pre-made icons"): browser crops and shrinks to a 256 px JPEG, `board_cards.image` MEDIUMTEXT, server checks prefix/size/base64/JPEG signature, 30 photo cards per user
- **Filipino word per card** (`board_cards.label_fil`): spoken and shown in Filipino mode
- **Sentence rules** (`board-sentence.js`): "I want ..." / "I feel ..." / no prefix for Basics, commas and "and"/"at", 6-word cap, tap again to remove, selected check mark
- **Starter cards**: Snack, Sleepy, Go home, and a new Basics category (More, Stop, Yes, No, Help, All done); 6 more preset icons (33 in all)
- **Speech**: speed slider in Settings (saved on the device, sent as `rate` 0.5 to 1.4), Filipino respellings for TV and CR (`speech-text.js`), spoken messages in the child view (finished, timer almost up, time up) that follow the Sound setting
- **Reminders**: `reminder_minutes` now shows a banner (and a spoken line, once) in the child view (`reminders.js`); still no push/email/SMS
- **Filipino activity names** in the child view
- **Filipino review sheet**: `docs/translations/filipino-review.csv` (96 strings) and a short guide
- Database: new columns, `database/migrations/002_board_cards_photo_and_filipino.sql` (or drop `board_cards` and re-run `schema.sql`)
- Tests: 20 new pytest tests (cards, speech rate), `frontend/tests/*.test.mjs` (Node 22+)

## v2 (in progress)

- Communication: talking board (picture cards, categories, sentence strip, text-to-speech) with caregiver tools to add and delete cards
- Visual countdown timer on the child view (opt-in, never starts by itself)
- System title now "Web-Based Visual Schedule, Task Management and Communication System"
- Documents updated to match; route count corrected from 19 to the real total

Built so far (all verified: pytest 157 passed, Postman 52 requests / 85 assertions, browser checks):

- Backend: `board_cards` table and model, `/api/cards` (list, create, update, delete), card validation, ownership check, 20 new tests
- Frontend: `communication.html` page, `communication.js`, `board-cards.js` (16 starter cards), nav item "Talking board", English and Filipino strings
- Frontend: `timer.js` and its integration in `child-view.js` (opt-in countdown)
- Postman: new folder "6b Talking board cards" (6 requests); collection now 49 requests, 81 assertions
- Docs: README, `docs/api.md` (25 routes plus `/health`; v1 wrongly said 19), `docs/erd.md`, `design-decisions.md`
- Change: talking-board pictures are Font Awesome icons (27 presets), not emoji; `board_cards.icon` is VARCHAR(40)
- Speech: `POST /api/speech` (Edge online voice via `edge-tts==7.3.1`, cached, validated, 503 when unreachable), `speech.js` (online first, browser voice fallback, words-only last), 13 new tests, `TTS_ENABLED` setting. Real Edge audio was not tested in the build sandbox (no access to Microsoft); fallback and mocked paths were.
- Fix: `[hidden]` rule for the timer panel (found in browser testing)

Still to do: .docx and .pptx deliverables, MySQL test run, screenshots.

## v1 (2026-11-11)

Baseline. See `docs/versions/v1-baseline.md`.
