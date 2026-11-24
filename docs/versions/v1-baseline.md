# v1 baseline (frozen 2026-11-11)

Purpose: a fixed snapshot of every required document and the whole codebase, so that every later change can be traced against it. Later versions are listed in `CHANGELOG.md`.

| Item | Value |
|---|---|
| Repository | https://github.com/lance-molina/visual-schedule-management |
| Code snapshot | branch `main`, commit `cd1eeee` (2026-11-05) |
| Final submission deadline | **November 25, 2026** (confirmed by the instructor in class; the PDF says 18 or 20) |
| Instructor source | Updated PDF of 2026-11-11 (title now includes "Communication System"; new Sample System Features slides) |
| Verified at freeze | 124 pytest tests passed; Postman 43 requests, 71 assertions, 0 failures (SQLite) |

## A. Required deliverables at v1

Scope decisions from the instructor (verbal, not in the PDF): usability test report is dropped; research paper stops at Chapter 3; no participants of any kind; APA 7th edition; demo video may be submitted as a link only.

| # | Deliverable | Required form | v1 file (frozen copy) | Size | sha256 (first 12) | Status at v1 |
|---|---|---|---|---|---|---|
| 01 | Deployment plan | PDF (if not deployed); 1 to 2 pages | `01-deployment-plan.docx` | 2 pages | `b0e403f7a6a6` | Facts filled; hosting choice and team details still [placeholders]; not deployed |
| 02 | Technical documentation | PDF: architecture, API docs, database schema | `02-technical-documentation.docx` | 8 pages | `0fb19da96f1f` | Facts filled; section, team, MySQL result, contrast and responsive tables still [placeholders] |
| 03 | User manual | PDF: step-by-step guide for caregivers and OTs | `03-user-manual.docx` | 5 pages | `58512f86e697` | Written; 6 screenshot boxes empty; contact and URL placeholders |
| 05 | Research paper | PDF + .docx/.md source; scope cut by instructor to Chapters 1 to 3, APA 7th | `05-research-paper.docx` | 9 pages | `e7aca2b0a333` | Template with real system facts; Chapter 2 is prompts only; cover page NOT yet in the EAC format |
| 06 | Presentation | 10 to 15 slides | `06-presentation.pptx` | 12 slides | `b89219b02d42` | Template with notes; placeholders for names, screenshots, test numbers |
| 07 | Demo video script | Video 3 to 5 minutes (a link is accepted) | `07-demo-video-script.docx` | 3 pages (script only) | `8dd60d9ef6a7` | Script ready; video NOT recorded |
| 04 | Usability test report | PDF | none | none | none | **Dropped** by the instructor (the PDF still lists it; get this in writing) |
| 08 | GitHub repository link | Link, pasted into Brightspace | repository above | 74 tracked files | see manifest | Public; team table partly filled |
| 09 | Live URL | Link, or the deployment plan | none | none | none | Not deployed; deployment plan is the fallback |

The v1 copies of the documents are kept in `deliverables/v1/` (outside the repository).

## B. Codebase at v1

| Area | Content | Count |
|---|---|---|
| Frontend pages | index (login and register), dashboard, schedule-creator, child-view, progress, settings | 6 HTML files |
| Frontend scripts | api.js (the only fetch caller), components, config, i18n, activities, one script per page | 11 JS files, 1,780 lines |
| Backend routes | auth, children, schedules, tasks, progress | 20 API routes plus `/health` |
| Database | users, children, schedules, tasks (MySQL 8 `schema.sql`; SQLite for tests) | 4 tables |
| Backend tests | auth 30, children 20, health 2, isolation 9, progress 16, schedules 15, seed 3, tasks 29 | 124 pytest tests |
| Postman | one collection, run with newman | 43 requests, 71 assertions |
| Docs in repo | api, erd, deployment-plan, getting-started, design-decisions, README outlines | see manifest |
| Helpers | run-local.bat (Windows one-click start), .gitattributes, .gitignore | 3 files |

Features at v1: register and log in (JWT); child profiles; visual schedule creator with 16 fixed activities; child view with one task at a time and Undo; progress dashboard with 3 charts, table view and CSV; accessibility settings (text size, contrast, sound, English or Filipino).

Full file list with sha256 hashes: `docs/versions/v1-manifest.sha256` (74 files at the commit above).

## C. Known gaps and discrepancies at v1

- **Sample features not built:** talking board and text-to-speech, visual countdown timer, rewards, weekly Monday to Sunday view, custom activities and images. (Board and timer are planned for v2; rewards, week view and photo upload are not.)
- **The documents say "19 documented routes"; the code has 20 plus `/health`.** The documents must be corrected in v2.
- Tests ran on SQLite only; MySQL is untested.
- The PDF still lists usability testing (10% rubric, learning outcome 5, week 6) and paper Chapters 4 and 5; the instructor said these are dropped.
- The PDF's two submission tables disagree (one omits the research paper).
- The research paper cover is not yet in the EAC format shown in the PDF; the system title does not yet include "and Communication".
- Reminders are stored but never shown or sent; no password reset; roles share permissions; Filipino wording not reviewed by a native speaker.

## D. How to compare later

```bash
git tag v1-baseline cd1eeee      # once, then: git push origin v1-baseline
git diff --stat v1-baseline..HEAD  # every changed file since v1
```

For documents, compare the sha256 values in section A with the new files (`sha256sum file`), and read the matching entry in `CHANGELOG.md`.
