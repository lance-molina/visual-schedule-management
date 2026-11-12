# Changelog

Every change since the v1 baseline (`docs/versions/v1-baseline.md`, commit cd1eeee) is listed here, newest first.

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
