# Changelog

Every change since the v1 baseline (`docs/versions/v1-baseline.md`, commit cd1eeee) is listed here, newest first.

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
