# REST API contract

This file describes the API as it is **actually built**. Every example below was produced by running
the code with fictional demo data. If you change a route or a rule, change this file in the same pull
request.

## Conventions

- Base URL: `http://127.0.0.1:5000` locally. The frontend reads it from `frontend/js/config.js`.
  Production URL: set after deployment (see `docs/deployment-plan.md`).
- All API routes start with `/api`, except `GET /health`.
- JSON bodies (`Content-Type: application/json`). Unknown keys in a body are ignored.
- Every request except register, login and `/health` carries `Authorization: Bearer <token>`.
- Dates `YYYY-MM-DD`, times `HH:MM` (24-hour), timestamps ISO 8601 in UTC with a trailing `Z`.
- Resources are nouns. PUT, DELETE and PATCH complete can be repeated safely (idempotent).
- Lists return `{ "items": [], "page": 1, "per_page": 20, "total": 0 }`.
  Default `per_page` is 20 and the maximum is 100. Tasks default to 100 so one call loads a whole day.
- The server never trusts the client for `user_id`, `completed_at` or ownership. The user comes from the token.

### Error body (used everywhere)

```json
{ "error": { "code": "validation_error", "message": "Invalid input", "fields": { "email": "Invalid email" } } }
```

`fields` appears only on validation errors. Field names for nested data use `tasks[0].name` and
`settings.font_size`. The frontend shows each message next to the input whose `data-field` matches.

### Status codes

| Status | Meaning |
|--------|---------|
| 200 | Success with a body |
| 201 | Created; body is the new record |
| 204 | Deleted; no body |
| 400 | Validation failed or malformed JSON; `fields` lists the bad inputs |
| 401 | Missing, invalid or expired token, or wrong login. All token problems give the same 401 |
| 404 | The record does not exist **or is not yours** (same answer, so IDs cannot be probed) |
| 409 | Conflict: email already registered, or a schedule already exists for that child and date |
| 500 | Unexpected error; generic message only, details go to the server log |

### Ownership chain

A task belongs to a schedule, a schedule to a child, a child to a user. Every query joins up this chain
to the signed-in user, so a request for another user's record returns 404, not 403.

## Endpoints

| Method and route | Purpose | Request | Success | Errors | Ownership |
|------------------|---------|---------|---------|--------|-----------|
| `POST /api/auth/register` | Create account | name, email, password, role | 201 user | 400, 409 | none |
| `POST /api/auth/login` | Sign in | email, password, optional `remember` | 200 access_token, expires_in, user | 400, 401 | none |
| `GET /api/auth/me` | Current user and settings | token | 200 user | 401 | own record |
| `PATCH /api/auth/me` | Update profile and settings | any of name, email, role, settings | 200 user | 400, 401, 409 | own record |
| `GET /api/children` | List own children | page, per_page | 200 items | 401 | filtered by user |
| `POST /api/children` | Create child | name, age, delay_domain, notes, photo_url | 201 child | 400, 401 | user from token |
| `GET /api/children/<id>` | One child | none | 200 child | 401, 404 | id and user |
| `PUT /api/children/<id>` | Replace the editable fields | name, age, delay_domain, notes, photo_url | 200 child | 400, 401, 404 | id and user |
| `DELETE /api/children/<id>` | Delete child, schedules, tasks | none | 204 | 401, 404 | id and user |
| `GET /api/schedules/<child_id>` | Schedules of a child, with tasks (`?date=` gives zero or one) | date, page, per_page | 200 items | 400, 401, 404 | child must be yours |
| `POST /api/schedules` | Create a schedule, optionally with tasks, all or nothing | child_id, date, tasks | 201 schedule | 400, 401, 404, 409 | child must be yours |
| `PUT /api/schedules/<id>` | Change the **date only** | date | 200 schedule | 400, 401, 404, 409 | schedule, child, user |
| `DELETE /api/schedules/<id>` | Delete schedule and its tasks | none | 204 | 401, 404 | schedule, child, user |
| `GET /api/tasks/<schedule_id>` | Tasks in position order | page, per_page | 200 items | 401, 404 | schedule must be yours |
| `POST /api/tasks` | Add a task | schedule_id, name, icon, category, time, duration, position, reminder_minutes | 201 task | 400, 401, 404 | schedule must be yours |
| `PUT /api/tasks/<id>` | Edit any subset of fields, including `status` (this is how Undo works) | any editable field, status | 200 task | 400, 401, 404 | task, schedule, child, user |
| `DELETE /api/tasks/<id>` | Remove a task | none | 204 | 401, 404 | same chain |
| `PATCH /api/tasks/<id>/complete` | Mark complete; **the server sets `completed_at`** | none | 200 task | 401, 404 | same chain |
| `GET /api/dashboard/summary` | Counts for the three stat cards | `today` | 200 totals | 400, 401 | own children only |
| `GET /api/progress` | Data for all charts and cards | child_id, range, today | 200 summary, daily, weekly, tasks | 400, 401, 404 | child must be yours |
| `GET /api/cards` | List own talking-board cards (ordered by category, label) | page, per_page | 200 items | 401 | filtered by user |
| `POST /api/cards` | Add a card (at most 100 per user) | label, category, icon | 201 card | 400, 401, 409 | user from token |
| `PUT /api/cards/<id>` | Replace label, category and icon | label, category, icon | 200 card | 400, 401, 404 | id and user |
| `DELETE /api/cards/<id>` | Delete a card | none | 204 | 401, 404 | id and user |
| `POST /api/speech` | Text to speech (MP3). 503 `speech_unavailable` means use the browser voice | text (1 to 200 characters), lang `en` or `fil` | 200 `audio/mpeg` | 400, 401, 503 | token required |
| `GET /health` | Deployment smoke test | none | 200 `{"status":"ok"}` | none | public |

### Behaviour worth knowing

- **PUT replaces, it does not merge, for children.** Leave out `notes` or `photo_url` and they become `null`.
- **PUT for tasks is partial.** Send only the fields you want to change. Sending `"status": "pending"` undoes a
  completion and clears `completed_at`. Sending `"status": "completed"` sets it. Repeating either is harmless.
- **`completed_at` is never accepted from the client.** The server sets it (UTC) and keeps `status` and
  `completed_at` consistent (a database CHECK enforces the same rule).
- **Schedules:** one schedule per child per date. A second `POST` for the same date gives 409. `PUT` changes the
  date only and sending `tasks` there is rejected with a 400; tasks have their own endpoints.
- **Saving in the creator:** a new schedule is one `POST /api/schedules` with its tasks (all or nothing). An
  existing schedule is saved with one task call per change, and unchanged tasks are skipped. If a call fails the
  draft stays on screen and pressing Save again is safe.
- **Positions** start at 1. A new task with no `position` goes to the end (max + 1).
- **Login:** the same 401 message is returned for an unknown email and a wrong password. `remember: true` extends the
  token from `JWT_ACCESS_TOKEN_HOURS` (default 8) to `JWT_REMEMBER_DAYS` (default 7).
- **Passwords** cannot be changed through `PATCH /api/auth/me` (no password-reset flow in this version).

## Validation rules (single source for tests and frontend)

Code: `backend/utils/validators.py` (`LIMITS`). Database: `backend/database/schema.sql`.
Text is trimmed before it is checked. An optional text field that is blank becomes `null`.

| Field | Rule |
|-------|------|
| `name` (user, child, task) | Required, 1 to 100 characters |
| `email` | Required, valid format, up to 255 characters, stored lowercase, unique |
| `password` | Required on register and login, 8 to 72 **bytes** (bcrypt reads only the first 72 bytes) |
| `role` | `caregiver`, `occupational_therapist` or `sped_teacher` |
| `age` | Whole number 1 to 18 |
| `delay_domain` | Required text up to 50 characters. The UI offers: `speech`, `motor`, `cognitive`, `social_emotional`, `adaptive`, `global`, `other` |
| `notes` | Optional, up to 500 characters |
| `photo_url` | Optional preset avatar id (letters, digits, `_`, `-`, up to 50), never a URL. The UI offers: `cat`, `dog`, `fish`, `dragon`, `paw`, `rocket`, `star`, `train` |
| `date` | `YYYY-MM-DD`, between 2000-01-01 and 2100-12-31 |
| `tasks` (inside a schedule) | A list of at most 50 task objects |
| `icon` | A Font Awesome class name such as `fa-tooth` (`fa-` plus lowercase letters, digits, hyphens) |
| `category` | `hygiene`, `food`, `school` or `play` |
| `time` | `HH:MM`, 00:00 to 23:59 |
| `duration` | Whole number of minutes, 5 to 240 |
| `position` | Whole number 1 to 1000 |
| `reminder_minutes` | Optional whole number 0 to 60, or `null`. **Stored only; no notification is sent** |
| `card.label` | Required, 1 to 30 characters (the spoken word) |
| `card.category` | Required, 1 to 30 characters; the UI offers Food, Emotions, Activities or a new name |
| `card.icon` | One of 27 preset Font Awesome icon (see `CARD_ICONS` in `backend/models/card.py`) |
| `status` | `pending` or `completed` (only on `PUT /api/tasks/<id>`) |
| `settings.font_size` | `S`, `M` or `L` |
| `settings.contrast` | `normal` or `high` |
| `settings.language` | `en` or `fil` |
| `settings.sound_on`, `notify_daily`, `notify_task`, `notify_weekly` | `true` or `false` |
| `page` / `per_page` | Whole numbers; `per_page` at most 100 |
| `range` | `today`, `week` or `month` (default `week`) |
| `today` | `YYYY-MM-DD`, sent by the browser so "today" is the child's local day |

## Progress rules

- **Completion rate** = completed tasks divided by scheduled tasks. It is `null` (not 0) when nothing was scheduled.
- **Which day a task counts for** is the schedule's `date`, not the time it was ticked off.
- `range=today` is 1 day, `week` is the rolling 7 days and `month` the rolling 30 days, all ending on `today`
  (an assumption: "week" could also mean a calendar week; confirm with the instructor).
- `weekly` is always the last four rolling 7-day blocks, oldest first, whatever `range` is.
- `upcoming_routines` on the dashboard counts schedules dated `today` or later that still have a pending task
  (an assumption).

## Examples (fictional data only)

All requests below except register and login need the header `Authorization: Bearer <token>`.

### Register and login

```json
POST /api/auth/register
{ "name": "Demo Caregiver", "email": "caregiver.demo@example.com", "password": "DemoPass123", "role": "caregiver" }

201
{ "id": 1, "name": "Demo Caregiver", "email": "caregiver.demo@example.com", "role": "caregiver",
  "settings": { "font_size": "M", "contrast": "normal", "sound_on": true, "language": "en",
                "notify_daily": false, "notify_task": false, "notify_weekly": false },
  "created_at": "2026-11-01T18:06:40Z" }
```

```json
POST /api/auth/login
{ "email": "caregiver.demo@example.com", "password": "DemoPass123", "remember": true }

200
{ "access_token": "<jwt>", "expires_in": 604800, "user": { "id": 1, "name": "Demo Caregiver", "...": "same shape as above" } }

401 (wrong password or unknown email, identical on purpose)
{ "error": { "code": "invalid_credentials", "message": "Email or password is incorrect" } }
```

Registering an email that already exists:

```json
409
{ "error": { "code": "conflict", "message": "That email is already registered", "fields": { "email": "Already registered" } } }
```

A missing or bad token on any protected route gives `401` with code `unauthorized` ("Authentication required",
or "Session expired" for an expired token).

### Settings

```json
PATCH /api/auth/me
{ "settings": { "font_size": "L" } }

200   the full user object with "font_size": "L"; settings you did not send are unchanged
```

### Children

```json
POST /api/children
{ "name": "Mika", "age": 6, "delay_domain": "speech", "notes": "Likes trains", "photo_url": "train" }

201
{ "id": 1, "name": "Mika", "age": 6, "delay_domain": "speech", "notes": "Likes trains",
  "photo_url": "train", "created_at": "2026-11-01T18:06:40Z" }
```

`GET /api/children` returns `{ "items": [child, ...], "page": 1, "per_page": 20, "total": 3 }`.

### Schedules (create with tasks, all or nothing)

```json
POST /api/schedules
{ "child_id": 3, "date": "2026-12-01",
  "tasks": [
    { "name": "Brush teeth", "icon": "fa-tooth", "category": "hygiene", "time": "07:30", "duration": 10, "reminder_minutes": 5 },
    { "name": "Play time", "icon": "fa-puzzle-piece", "category": "play", "time": "08:00", "duration": 30 } ] }

201
{ "id": 77, "child_id": 3, "date": "2026-12-01", "created_at": "2026-11-01T18:07:39Z",
  "tasks": [
    { "id": 455, "schedule_id": 77, "name": "Brush teeth", "icon": "fa-tooth", "category": "hygiene", "time": "07:30",
      "duration": 10, "position": 1, "reminder_minutes": 5, "status": "pending", "completed_at": null },
    { "id": 456, "schedule_id": 77, "name": "Play time", "icon": "fa-puzzle-piece", "category": "play", "time": "08:00",
      "duration": 30, "position": 2, "reminder_minutes": null, "status": "pending", "completed_at": null } ] }
```

Validation errors name the exact task and field, and nothing is saved:

```json
400
{ "error": { "code": "validation_error", "message": "Invalid input", "fields": {
    "tasks[0].name": "Required",
    "tasks[0].category": "Must be one of: hygiene, food, school, play",
    "tasks[0].duration": "Must be between 5 and 240",
    "tasks[0].time": "Use the format HH:MM" } } }
```

`GET /api/schedules/3?date=2026-12-01` returns the same schedule inside `items` (an empty list if there is none).

### Tasks

```json
PATCH /api/tasks/456/complete        (no body)

200
{ "id": 456, "schedule_id": 77, "name": "Play time", "status": "completed", "completed_at": "2026-12-01T00:05:12Z", "...": "other fields as above" }
```

```json
PUT /api/tasks/456                   (Undo)
{ "status": "pending" }

200   same task with "status": "pending" and "completed_at": null
```

### Talking board cards

```json
POST /api/cards
{ "label": "Juice", "category": "Food", "icon": "fa-glass-water" }

201
{ "id": 5, "label": "Juice", "category": "Food", "icon": "fa-glass-water", "created_at": "2026-11-12T03:10:00Z" }
```

The 101st card answers `409 conflict`. Another user's card id answers `404`.

### Speech

```json
POST /api/speech
{ "text": "I want Water", "lang": "en" }

200  audio/mpeg bytes
503  { "error": { "code": "speech_unavailable", "message": "Online speech is not available right now." } }
```

Voices: `en-US-AnaNeural` and `fil-PH-BlessicaNeural` through the unofficial `edge-tts` package. Results are cached in memory (200 entries). The page falls back to the browser voice on any non-200.

### Dashboard and progress

```json
GET /api/dashboard/summary?today=2026-11-02

200
{ "total_children": 3, "tasks_completed_today": 0, "upcoming_routines": 3 }
```

```json
GET /api/progress?child_id=2&range=week&today=2026-11-02

200
{ "child_id": 2, "range": "week", "start": "2026-10-27", "end": "2026-11-02",
  "summary": { "scheduled": 42, "completed": 24, "completion_rate": 0.5714285714285714 },
  "daily":  [ { "date": "2026-10-27", "scheduled": 6, "completed": 3, "completion_rate": 0.5 }, "... one entry per day in range" ],
  "weekly": [ { "start": "2026-10-06", "end": "2026-10-12", "scheduled": 0, "completed": 0, "completion_rate": null },
              "... four rolling 7-day blocks, oldest first" ],
  "tasks":  [ { "name": "Wash hands", "scheduled": 7, "completed": 6, "completion_rate": 0.8571428571428571 },
              "... one entry per task name, best first" ] }
```

### Health

```json
GET /health

200
{ "status": "ok" }
```
