# Web-Based Visual Schedule, Task Management and Communication System

> **Status: all planned features are built and pass the automated checks on SQLite** (180 backend tests, 2 small Node test files, a 56-request
> Postman run). Still to do as a team: run the tests once against MySQL,
> the paper, the manual, the deployment and the demo video. See [Known limitations](#12-known-limitations).

A full-stack web application that helps children with developmental delays follow
visual schedules and finish daily activities. It supports three kinds of adult users
(caregivers, occupational therapists and SPED teachers) who manage child profiles and
schedules, a calm, large-target child view for completing tasks (with an optional visual countdown timer), and a
talking board of picture cards that speak a word or short sentence aloud.

Course project for **Modeling and Simulation** (Finals Activity).

**Final deadline:** November 25, 2026

**Demo video:** TODO paste the link here (unlisted YouTube or Google Drive, "anyone with the link" can view)

---

## 1. Team and roles

| # | Name | GitHub handle | Main role |
|---|------|---------------|-----------|
| 1 | Molina, David Hans Lancelotte M. | [@lance-molina](https://github.com/lance-molina) | Team leader and release manager |
| 2 | Garciano, Ryza Vanna | [@ryzavanna](https://github.com/ryzavanna) | TODO |
| 3 | Gumamit, Clarence Jasper | [@clarencejaspergumamitcvt](https://github.com/clarencejaspergumamitcvt) | TODO |
| 4 | Lagarde, Fitch Gerard | [@fitchlagarde40-afk](https://github.com/fitchlagarde40-afk) | TODO |
| 5 | Lopez, Zarah | [@ZH-ZaraH](https://github.com/ZH-ZaraH) | TODO |
| 6 | Manzano, Reniel Nico | [@CodeCoderGuy](https://github.com/CodeCoderGuy) | TODO |
| 7 | Montaniel, Arman | [@joshuaa999](https://github.com/joshuaa999) | TODO |
| 8 | Paaño, Robert Julien | [@trebsil](https://github.com/trebsil) | TODO |
| 9 | Pagtakhan, Jaden Emsley | [@jadennn20](https://github.com/jadennn20) | TODO |
| 10 | Pecson, Rovin Karl | [@Chewywywy](https://github.com/Chewywywy) | TODO |

## 2. Features

Each box is ticked because the page, the API, the database and an automated test all work together (on SQLite;
see limitations).

- [x] Register, log in, log out (JWT, optional "remember me")
- [x] Child profiles: add, view, edit, delete (preset avatars, no photo upload)
- [x] Visual schedule creator: 16-activity library, drag and drop **and** plus/up/down/remove buttons, per-task settings, preview, save
- [x] Child view: one task at a time, large buttons, Done with a 5-second Undo, sound, exit confirmation (tasks live here, no separate page)
- [x] Progress dashboard and charts: today, week and month, three charts with text alternatives, table view, CSV export
- [x] Talking board (communication): picture cards in Food, Emotions, Activities and Basics (Yes, No, Stop...), a sentence strip that builds "I want Water, Rice and Apple" or "I feel Happy" (max 6 words, tap a chosen card again to remove it), spoken aloud (natural Edge online voice first, the browser's own voice as fallback; English or Filipino, speed set in Settings); adults add their own cards with a preset icon or their own photo, plus an optional Filipino word, and delete them
- [x] Optional countdown timer on the child view: starts only when pressed, uses the task's duration, shows colour and words, never completes a task by itself
- [x] Spoken messages in the child view (task finished, timer almost up and up) when Sound is on, and an on-screen reminder banner (spoken once) when a task with a reminder is near or at its start time
- [x] Activity names show in Filipino in the child view when the language is Filipino
- [x] Accessibility settings: font size, high contrast, sound, language (English / Filipino), saved to the database and cached in the browser
- [x] Role stored per user (all roles share the same permissions in the MVP)

The seeded data uses invented names only. Take screenshots with the demo accounts, save them in `docs/screenshots/` and link one or two here.

## 3. Technology stack

| Layer | Choice |
|-------|--------|
| Frontend | HTML, CSS, vanilla JavaScript (ES modules), Bootstrap 5.3, Font Awesome, Chart.js, SortableJS |
| Backend | Python, Flask (application factory + blueprints), Flask-JWT-Extended, Flask-CORS, Flask-SQLAlchemy |
| Database | MySQL 8 (utf8mb4) |
| Tests | pytest (180 tests), Node tests (2 files), Postman collection (56 requests, 92 assertions) |
| Hosting | Not chosen yet (see `docs/deployment-plan.md`) |

## 4. Prerequisites

- Python 3.11 or newer
- MySQL 8 (local) or a hosted MySQL connection string
- A code editor with a static server (for example VS Code Live Server on port 5500)
- Git

## 5. Setup

> **New to Git or GitHub?** Follow [`docs/getting-started.md`](docs/getting-started.md): it covers installing everything, cloning, and running the app with one double-click (`run-local.bat`).

```bash
# 1. Clone
git clone https://github.com/lance-molina/visual-schedule-management
cd visual-schedule-system

# 2. Backend environment
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. Configuration (placeholders only in .env.example; put real values in .env, never in Git)
cp .env.example .env
#    then edit .env: SECRET_KEY, JWT_SECRET_KEY, DATABASE_URL

# 4. Database
mysql -u <user> -p -e "CREATE DATABASE visual_schedule CHARACTER SET utf8mb4;"
mysql -u <user> -p visual_schedule < database/schema.sql
python database/seed.py           # fictional demo data only (see "Demo accounts" first)
```

**Already have the v2 database?** The talking board gained two columns (a photo and a Filipino word). Either run `database/migrations/002_board_cards_photo_and_filipino.sql` once, or `DROP TABLE board_cards;` and run `schema.sql` again (the table holds no data worth keeping yet). For the local SQLite demo (`run-local.bat`) nothing is needed: starting it adds the missing columns to your existing `backend\instance\local.db` automatically (`database/local_upgrade.py`). If you ever see `GET /api/cards 500` after an update, this is the cause; restart `run-local.bat` or delete that file.

`.env` is read automatically when you start Flask from `backend/`. `JWT_SECRET_KEY` should be at least 32 random
characters (for example `python -c "import secrets; print(secrets.token_urlsafe(48))"`).

## 6. Running

```bash
# Backend (from backend/)
flask --app app run --debug        # http://127.0.0.1:5000/health

# Frontend (from frontend/), pick one:
#   VS Code Live Server on index.html (port 5500), or
python serve.py 5500                 # http://127.0.0.1:5500 (same as http.server, but the browser never keeps old files)
```

Open the frontend at `http://127.0.0.1:5500` (the login page is `index.html`). The frontend reads the API address from
`frontend/js/config.js` (default `http://127.0.0.1:5000`). The API only accepts calls from the addresses in
`CORS_ORIGINS`; if you serve the frontend on another port, add that address there.

**Throw-away SQLite instead of MySQL (quick local try-out):**

```bash
cd backend
export DATABASE_URL=sqlite:///local.db SECRET_KEY=dev JWT_SECRET_KEY=dev-jwt-secret-that-is-at-least-32-chars
python database/seed.py --create-tables
flask --app app run
```

## 7. Demo accounts

Created by `python database/seed.py`. **Fictional, demo only.** All three use the password `DemoPass123`.

| Email | Role | Children |
|-------|------|----------|
| `caregiver.demo@example.com` | Caregiver | Mika, Ben, Lia |
| `therapist.demo@example.com` | Occupational therapist | Noel |
| `teacher.demo@example.com` | SPED teacher | Ana |

Each child has about two weeks of past schedules with random completions, so the charts have something to show.
`python database/seed.py --reset` deletes the demo accounts (and only them) and re-creates them.

> **Never run the seed against a database that real people use, and delete these accounts from any deployed copy.**
> The password is public in this file.

## 8. Tests

```bash
cd backend
pytest                       # 180 tests
node ../frontend/tests/board-sentence.test.mjs   # sentence and speech-text checks (Node 22+)
node ../frontend/tests/reminders.test.mjs        # reminder-window checks on in-memory SQLite, about 5 seconds
```

To run the same tests on **MySQL**, create an *empty* test database (never the real one) and run
`TEST_DATABASE_URL=mysql+pymysql://user:password@127.0.0.1:3306/visual_schedule_test pytest`.
This has not been done yet; do it once and record the result.

- **Postman:** import `postman/visual-schedule.postman_collection.json`, start the backend, and run the collection. It
  registers fresh fictional users, checks 92 assertions (status codes, validation errors, ownership, progress rules)
  and deletes the child it creates. Command line: `npx newman run postman/visual-schedule.postman_collection.json`.
- Test case table and results for the report: `docs/technical-documentation/` (fill it from these runs; do not invent results).

## 9. API documentation

[`docs/api.md`](docs/api.md). Keep it in sync with the code: change this file in the same
pull request as any route change.

## 10. Project structure

```text
visual-schedule-system/
|-- README.md  .gitignore
|-- docs/               API, ERD, deployment plan, design decisions, paper, manual, screenshots
|-- frontend/           6 pages, css/style.css, js/ (one script per page + shared files)
|-- backend/            Flask app, models, routes, services (progress maths), utils, database/, tests/
`-- postman/            API collection with assertions
```

## 11. Deployment

Not done yet. `backend/Procfile` runs the API with gunicorn and `frontend/` is a static site, so any host that runs
Python plus a MySQL database and serves static files will do. The plan, with the hosting choice still open,
is in [`docs/deployment-plan.md`](docs/deployment-plan.md). Before going live: set real secrets, set `CORS_ORIGINS` to
the frontend address, set `API_BASE_URL` in `frontend/js/config.js`, and do **not** run the seed.

## 12. Known limitations

- **Tests ran on SQLite only.** MySQL (CHECK constraints, ENUM columns, collation) is untested until someone runs `schema.sql`
  and `pytest` with `TEST_DATABASE_URL` on a clean MySQL.
- **Reminders appear only while the child view is open.** The banner and spoken line come from `reminder_minutes`; no push, email or SMS is ever sent, and the notification switches in Settings are stored only.
- **Filipino covers the menu, child view (including activity names), talking board and timer.** The adult pages (dashboard, schedule creator, progress, most of settings) stay English. The wording was written by us and is not yet reviewed; `docs/translations/` has a review sheet.
- **No upload for child profiles.** A child's picture is one of eight preset avatars, and talking-board cards use a preset Font Awesome icon or an adult-chosen photo (shrunk in the browser to a small square JPEG and stored in the database as text; up to 30 photo cards per account). Photos of children or their belongings are personal data: use only photos you may use, and none during testing with real children.
- **Online speech uses an unofficial Microsoft Edge voice service** (`edge-tts`). It needs internet on the server, can change or stop without notice, and the speech text goes to Microsoft. When it fails the board uses the browser's own voice (Filipino voices are often missing there) and, if there is none, shows the words only. Set `TTS_ENABLED=false` to turn the online voice off.
- **Not built (optional in the brief):** rewards, a Monday to Sunday week view, custom activities.
- **No password reset or change.** A forgotten password means a new account (or a database edit).
- **Roles do not change permissions.** Caregivers, therapists and teachers each see only their own children; there is no sharing between adults.
- **"Week" and "month" are rolling 7 and 30 days**, not calendar weeks and months.
- **The token is kept in browser storage** (`localStorage`), which is simple but readable by any script on the page. The pages build all
  user text with `textContent` and load libraries with integrity hashes to limit that risk.
- **The paper and user manual are not part of this code.** They are written as separate documents.

## 13. Privacy and data

- Only fictional children appear in demos, screenshots and the paper.
- Real child data is never committed to this repository.
- Stored per child: first name, whole-number age, delay category, optional short note, preset avatar id.
- Passwords are stored only as bcrypt hashes. Real names, photos or diagnoses should not be entered during testing.

## 14. References and acknowledgements

Libraries used (loaded from a CDN with integrity hashes, except the Python packages and the Nunito font): Bootstrap 5.3.8, Font Awesome Free 6.7.2
(icons CC BY 4.0, fonts SIL OFL, code MIT), Chart.js 4.6.1, SortableJS 1.15.7; the Nunito typeface (SIL OFL) from Google Fonts, which needs internet
(without it the pages use the system font and stay readable);  Flask, Flask-SQLAlchemy, Flask-JWT-Extended,
Flask-CORS, PyMySQL, bcrypt, pytest. Add paper sources here only after you have read and cited them.

---

## Final repository checklist (before tagging `v1.0-submission`)

- [ ] Frontend and backend both run from a fresh clone using only this README (someone who did not write the code should try it)
- [ ] No `.env`, secrets, real personal data or large unneeded files
- [ ] `schema.sql`, `seed.py`, the Postman collection and the pytest suite are included
- [ ] `docs/` holds the API reference, ERD, deployment plan and the documents' source files
- [ ] Every member has commits or a documented contribution
- [ ] The submission tag exists and the repository link opens for the instructor
