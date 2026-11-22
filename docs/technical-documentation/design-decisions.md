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
- **Filipino covers the menu, child view (activity names too), talking board and timer.** The adult pages stay English (*assumption*: the brief asks for an English/Filipino setting, not a fully bilingual adult UI). The wording was written by the team.

- **The talking board is small on purpose.** Cards are text plus a preset Font Awesome icon or an optional photo, stored per adult in `board_cards` (limit 100 cards, 30 with photos; *requirement*: the brief lists uploading photos). A photo is cropped to a square and shrunk to a JPEG of about 45 KB or less in the browser, then stored as a data URL in a `MEDIUMTEXT` column: no file storage to manage and it works on free hosts. The cost is bigger list responses (30 photos is about 1.5 MB at most), which is acceptable at this scale. The server checks the prefix, size, base64 and JPEG signature so nothing else can be stored or rendered. The built-in starter cards live in the frontend so nothing has to be seeded (*recommendation*).
- **Sentences follow simple rules.** The first card decides the prefix ("I want", "I feel" for Emotions, none for Basics such as Yes or Stop), words are joined with commas and "and" (Filipino "at"), at most 6 words, and tapping a chosen card again removes it. A card may carry its own Filipino word; the Filipino voice also gets a few respellings (TV, CR) in `speech-text.js`. These Filipino choices are unreviewed (*assumption*).
- **Speech is online first, browser second.** `POST /api/speech` asks Microsoft Edge's online voices (`edge-tts`, a child-like English voice and a Filipino voice) and the page plays the MP3; on any failure it uses the browser's `speechSynthesis`, and if that is missing it shows the words only. `edge-tts` is unofficial and can break, so it is never the only path (*recommendation*; an official alternative is Azure Speech with a key, *unresolved*).
- **The countdown timer is opt-in.** It uses the task's stored `duration`, starts only when the adult or child presses
  Start, shows colour and the words "Almost time" and "Time's up!", and never completes a task by itself, so it cannot
  create a false completion record (*recommendation*; the brief lists a timer as a sample feature).
- **Not built:** rewards, a Monday to Sunday week view and custom activities.

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

## Visual design (v2e)

- **Colour from the PDF, used as a system.** Blue #4A90D9, green #7ED321 and yellow #F5A623 are kept (brand tile and sky edge,
  the Done button, the "Now" task). Six pastel families (sky, apricot, lilac, mint, rose, sun) each have a tint, an edge and an
  ink colour. Categories always show a word too, so colour is never the only cue.
- **One memorable idea: tactile "toy keys."** Talking-board keys, category tabs, the Done button and the child picker have a
  thick bottom edge and press down. Adult screens stay flat and quiet. Motion is only a response to a tap or hover, and
  `prefers-reduced-motion` switches it off.
- **Corners:** 12px on standard controls (the PDF); 20 to 28px on big child-facing surfaces.
- **Type:** Nunito 500 to 800 from Google Fonts. The smallest text is never under 16px at any text size
  (`--text-sm: max(.89rem, 16px)`). Without internet the system font is used.
- **Icons get their own colours** (water blue, apple red, smile gold) through `--ic` in `style.css`; anything not listed
  uses its family colour. High contrast turns every tint white and every edge and icon black.
- **Exit button in the child view is only an icon**; its words show as a tooltip on hover or keyboard focus and stay
  available to screen readers.
- **Not changed:** every HTML id, `data-*` attribute and JS-targeted class. The only JavaScript change is one line in
  `progress.js` that gives the charts the page font. Chart colours still come from `--color-action`, `--color-text`
  and `--color-border`.

## Visual design (v2f)

- **Why it changed.** A first-impression test with one person outside the team (every page of v2e next to another team's build)
  favoured the other build on all pages except the talking board; settings tied. The difference was colour strength, so v2f
  keeps the v2e layout, type and "toy key" idea and raises the colour. This was one informal comparison, not a usability study.
- **Solid colour, used with rules.** The PDF's blue, green and yellow are now full-strength fills (`--blue-solid`,
  `--lime-solid`, `--yellow-solid`). Violet, orange, teal and a deeper green are accents for categories and page banners.
  Text on blue, violet, orange, teal and deep green is white; text on lime and yellow is the dark ink. Muted grey is never
  placed on a solid fill. Each pair is 4.5:1 or better (checked by script).
- **One banner colour per page.** Dashboard blue, schedule creator green, talking board violet, progress orange, settings teal.
  The banner is the page's existing `h1` restyled in CSS (white icon disc and confetti dots from pseudo-elements), so no HTML
  changed. Confetti dots are decoration only and are hidden at 480px and below and in high contrast.
- **Category colours match everywhere.** Hygiene is blue, food orange, school violet, play green: library cards, timeline bars
  and number discs use the same mapping. The category word is still shown.
- **Main blue was deepened** (#2B6CB0 to #2769B5) because blue text on the tinted page background measured 4.44:1 with the
  first v2f blue; the final value gives 5.0:1 on the tint and 5.6:1 against white text.
- **Bootstrap utilities carry `!important`** (`bg-white`, `border-bottom`, `text-muted`), so the v2f rules that must beat them
  (navbar, stat-tile labels, category-disc icons) use `!important` too, as do the high-contrast resets.
- **Not changed:** HTML, JavaScript, ids, `data-*` attributes, behaviour. Chart bars are still drawn from `--color-action`.

## Visual design (v2g)

- **What v2g replaces.** The palette, the per-icon colours (v2e) and the page-by-page banner colours (v2f) are replaced by the
  rules below. Layout, Nunito, the "toy key" press effect, accessibility settings and every HTML id are unchanged.
- **Palette is the team's.** Cerulean #1F7DA8 is the main colour; five pale colours (cyan, lime, yellow, lavender, coral) carry dark
  text. Deep colours (violet, rust, green, teal) are used for edges and a few accents. The project PDF names blue #4A90D9,
  green #7ED321 and yellow #F5A623 as its soft colours; v2g keeps the idea (soft blue, green and yellow) but not those exact
  values. Confirm this is acceptable before submission.
- **Dark text on light colour is the default.** White text is only used on cerulean, violet, rust, green and teal, each at
  4.5:1 or better. Two of the team's greens (#38A81F, #2C9364) were 3.1:1 and 3.8:1 with white text, so darker versions are used.
- **Blue text is #1B7699, not the fill cerulean.** #1F7DA8 on the pale page tint was 4.3:1, so text, links, outline buttons and
  primary buttons use the slightly deeper #1B7699 (4.6 to 5.1:1 everywhere). The top bar and title cards keep #1F7DA8.
- **One colour for pictures.** All activity pictures are cerulean (`--icon-color`). This is calmer, but a red apple no longer
  looks red; the word is always shown beside the picture. If caregivers find colour helps, restore per-icon colours for the
  Feelings cards only.
- **Green means selected.** Activities is yellow and Feelings lavender so the green "selected" state is not confused with a category.
- **Chart bars cycle through the pastel set.** Colour is decoration only; the outline (cerulean, 2px) keeps each bar at 3:1 against white.
  `progress.js` reads `--chart-1` to `--chart-5`, so high contrast turns every bar solid black.
- **Not changed:** HTML, API, database, ids, `data-*` attributes. JavaScript changed in one place: the chart colours in `progress.js`.

## Visual design (v2h)

- **What v2h changes.** Only colour values and where they are used. v2g's structure (dark text on light colour, one icon colour,
  pastel discs, varied chart bars) stays; layout, HTML ids and accessibility settings are unchanged.
- **Palette is the team's second palette.** Yale Blue #124E78 is the main colour. Plum, Deep Sky Blue, Electric Green, Amber Honey
  and Pumpkin Spice carry dark text. Jungle Teal, Dusty Lavender, Chocolate Brown and Sage Green carry white text.
- **Sage Green is deepened.** The team's #5B9537 is 3.62:1 with white text, so #47792A (5.2:1) is used for the schedule creator title card.
- **Each page has its own title card colour again** (dashboard Yale Blue, creator Sage Green, talking board Dusty Lavender,
  progress Chocolate Brown, settings Jungle Teal). The matching accent (creator toolbar bar, sentence box, chart card tops, settings
  discs) uses the same colour. The title cards read `--hero` from `body[data-page]`, which uses the same tokens as v2f.
- **Selection does not use a category colour.** Activities is Electric Green, so a selected talking board card is white with a thick
  Yale Blue border and a blue check, and the open category tab keeps its colour with a thick Yale Blue border. This works in every
  category and in high contrast (the border turns black).
- **Big surfaces use half-strength colours.** Electric Green and Amber Honey are loud over large areas, so the dashboard and progress
  tiles, talking board cards, the child view "Now" card and the "Now" task row use `--lime-soft`, `--yellow-soft`, `--cyan-soft` and
  `--coral-soft` (50% colour, 50% white). Buttons, tabs and small keys keep the full colours. If testers still find it tiring,
  lower the percentage in `:root`.
- **Not changed:** HTML, API, database, ids, `data-*` attributes. JavaScript: only the fallback colours in `progress.js`.

## Tooling

- **Libraries are pinned and loaded from a CDN with integrity hashes:** Bootstrap 5.3.8, Font Awesome 6.7.2,
  Chart.js 4.6.1, SortableJS 1.15.7.
- **Automated tests run on in-memory SQLite.** MySQL behaviour (CHECK constraints, ENUM columns) has not been tested
  yet. Run `schema.sql` on an empty MySQL database, then run `pytest` with `TEST_DATABASE_URL` pointing at it, and
  record the result here.
