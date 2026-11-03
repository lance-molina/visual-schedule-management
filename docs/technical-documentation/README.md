# Technical documentation

> Outline. Keep it short. Final deliverable: a PDF built from `technical-documentation.md` or `.docx` in this folder.

1. Purpose and scope
2. Requirements summary
3. Architecture (diagram: browser, API, database, hosting)
4. Modeling artifacts (expected for a Modeling and Simulation course; confirm with the instructor)
   - Use case diagram (actors: caregiver, occupational therapist, SPED teacher, child)
   - Workflow diagram: register, add child, build schedule, child completes tasks, view progress
   - ERD (from `../erd.md`)
   - API model (from `../api.md`)
5. Database design and normalization
6. API reference (link to `../api.md`) and the validation table
7. Security and privacy (JWT, password hashing, ownership checks, data minimization)
8. Frontend structure and accessibility decisions (WCAG 2.2 AA as a reference)
9. Testing: test case table, pytest summary, Postman collection, bug list (only real results)
10. Deployment and configuration
11. Design decisions and assumptions (from `design-decisions.md`)
12. Limitations and future work
