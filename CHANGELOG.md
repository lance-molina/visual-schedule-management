# Changelog

Every change since the v1 baseline (`docs/versions/v1-baseline.md`, commit cd1eeee) is listed here, newest first.

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
