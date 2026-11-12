# Design decisions and assumptions

Source material for the technical documentation (section "Design decisions") and for the limitations part of the
research paper. Each entry says what was decided and why. Entries marked *assumption* were our own reading of an
unclear point and should be confirmed with the instructor.

## Product

- **Tasks live in the child view.** There is no separate task-management page. Adults create and edit tasks in the
  schedule creator; the child completes them one at a time in the child view.
- **The child view opens from an adult's signed-in session.** A child never has an account or a password. An adult
  opens the page for one child and hands over the device. Leaving the child view asks for confirmation so a child
  cannot wander into the adult pages by accident.
- **The role is chosen at registration and all roles have the same permissions** (caregiver, occupational therapist,
  SPED teacher). Every adult sees only the children they created; there is no sharing between adults.
- **Photos are preset avatars.** A child's picture is one of eight preset avatar ids stored in `photo_url`; real photo
  upload is out of scope, which also avoids storing images of children. The API rejects anything that is not an id.
- **Reminders are shown, not sent.** `reminder_minutes` (minutes before the start time) drives a banner and one spoken line in the child view while it is open (`frontend/js/reminders.js`, from the brief's "customizable reminders"). The notification switches in Settings are saved only; no push, email or SMS is delivered (*recommendation*).
- **Report export is client-side.** The progress page downloads a CSV built in the browser, with a guard against
  spreadsheet formula injection. There is no server-side PDF.
- **Filipino covers the menu, child view (activity names too), talking board and timer.** The adult pages stay English (*assumption*: the brief asks for an English/Filipino setting, not a fully bilingual adult UI). The wording was written by the team and needs a native-speaker review (`docs/translations/`) before it is quoted anywhere.

- **The talking board is small on purpose.** Cards are text plus a preset Font Awesome icon or an optional photo, stored per adult in `board_cards` (limit 100 cards, 30 with photos; *requirement*: the brief lists uploading photos). A photo is cropped to a square and shrunk to a JPEG of about 45 KB or less in the browser, then stored as a data URL in a `MEDIUMTEXT` column: no file storage to manage and it works on free hosts. The cost is bigger list responses (30 photos is about 1.5 MB at most), which is acceptable at this scale. The server checks the prefix, size, base64 and JPEG signature so nothing else can be stored or rendered. The built-in starter cards live in the frontend so nothing has to be seeded (*recommendation*).
- **Sentences follow simple rules.** The first card decides the prefix ("I want", "I feel" for Emotions, none for Basics such as Yes or Stop), words are joined with commas and "and" (Filipino "at"), at most 6 words, and tapping a chosen card again removes it. A card may carry its own Filipino word; the Filipino voice also gets a few respellings (TV, CR) in `speech-text.js`. These Filipino choices are unreviewed (*assumption*).
- **Speech is online first, browser second.** `POST /api/speech` asks Microsoft Edge's online voices (`edge-tts`, a child-like English voice and a Filipino voice) and the page plays the MP3; on any failure it uses the browser's `speechSynthesis`, and if that is missing it shows the words only. `edge-tts` is unofficial and can break, so it is never the only path (*recommendation*; an official alternative is Azure Speech with a key, *unresolved*).
- **The countdown timer is opt-in.** It uses the task's stored `duration`, starts only when the adult or child presses
  Start, shows colour and the words "Almost time" and "Time's up!", and never completes a task by itself, so it cannot
  create a false completion record (*recommendation*; the brief lists a timer as a sample feature).
- **Not built:** rewards, a Monday to Sunday week view and custom activities. The brief marks them optional; confirm
  with the instructor (*unresolved*).

## Progress rules

- **Completion rate** = completed tasks / scheduled tasks. It is shown as a dash (null), never 0%, when nothing was scheduled.
- **A task counts on the day of its schedule**, not the day it was ticked off.
- **"Week" and "month" are rolling 7 and 30 days ending today**, not calendar weeks and months (*assumption*). The
  browser sends its local date as `today`, so the child's day is used, not the server's. The weekly trend chart is
  always the last four rolling 7-day blocks.
- **"Upcoming routines"** on the dashboard counts schedules dated today or later that still have at least one pending
  task (*assumption*).

## API and data

- **Saving a schedule.** A new schedule is one `POST /api/schedules` with its tasks, all or nothing. An existing
  schedule is saved with one task call per change, skipping unchanged tasks. `PUT /api/schedules/<id>` changes the
  date only. If a save fails, the draft stays on screen and saving again is safe.
- **Ownership is enforced in the query** (task, schedule, child, user), and another user's record answers 404, not 403,
  so ids cannot be probed.
- **The server sets `completed_at`** in UTC; the client can never send it. Undo is `PUT /api/tasks/<id>` with
  `status: pending`, which clears it. The database also enforces the pairing with a CHECK constraint.
- **Settings are stored on the user row** (seven columns) and cached in the browser so pages style themselves before
  the first API call returns.
- **Passwords** are stored as bcrypt hashes, limited to 8 to 72 bytes (bcrypt reads only the first 72). Login gives one
  generic error for an unknown email and a wrong password. There is no password reset in this version.

## Tooling

- **Libraries are pinned and loaded from a CDN with integrity hashes:** Bootstrap 5.3.8, Font Awesome 6.7.2,
  Chart.js 4.6.1, SortableJS 1.15.7.
- **Automated tests run on in-memory SQLite.** MySQL behaviour (CHECK constraints, ENUM columns) has not been tested
  yet. Run `schema.sql` on an empty MySQL database, then run `pytest` with `TEST_DATABASE_URL` pointing at it, and
  record the result here.
