# Deployment plan

> Outline for the 1 to 2 page deployment plan, which is submitted even if you deploy live. It answers the six questions
> below. If you do not deploy live, submit it as a PDF together with a working local system (frontend + backend +
> database). Hosting plans change; check pricing and limits on the provider's own page.

**Chosen option:** TODO (A: live deployment / B: local system + this plan)

## The six questions

### 1. Which hosting service for the backend, and why?

TODO: host, reasons (Git-based deploys, Python support, environment settings, managed HTTPS),
the trade-off (for example a sleeping free server), one alternative.

### 2. Which database service, and why?

TODO: service, why it fits MySQL and `schema.sql`, its limits (storage, powering off), one alternative.
(Services such as Railway, Render or a managed MySQL are examples; check current plans before choosing.)

### 3. How will the frontend connect to the backend?

TODO: static site calls the API's HTTPS address from `frontend/js/config.js`; CORS allows only the
frontend origin; token sent in the `Authorization` header.

### 4. What environment variables are needed?

| Name | Purpose |
|------|---------|
| `SECRET_KEY` | Flask secret |
| `JWT_SECRET_KEY` | Signs access tokens |
| `JWT_ACCESS_TOKEN_HOURS` | Token lifetime |
| `JWT_REMEMBER_DAYS` | Remember-me lifetime |
| `DATABASE_URL` | `mysql+pymysql://user:password@host:port/dbname` |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins, no wildcard |
| `TTS_ENABLED` | `true` (default) uses the online Edge voice for the talking board; `false` uses browser voices only |
| `LOG_LEVEL` | `INFO` in production |

Set them in the host's dashboard. Never commit real values.

### 5. What are the deployment steps?

1. TODO: create the database and run `schema.sql` (and the fictional seed) from your own computer.
2. TODO: create the API service from the repository, set the variables, deploy.
3. TODO: confirm `GET /health` returns `{"status":"ok"}` (allow for a cold start).
4. TODO: set `CORS_ORIGINS` to the frontend address; set `API_BASE_URL` in `config.js`; deploy the frontend.
5. TODO: smoke test: register, add a fictional child, save a schedule, complete a task, view progress, log out.
6. TODO: tag the release (`v1.0-submission`).

### 6. What are the potential issues and how will you address them?

| Issue | Fix |
|-------|-----|
| Free server waking up | Open the health route a minute before the demo |
| Free database powered off or wrong connection string | Power it on; recheck host, port and encryption options |
| `CORS_ORIGINS` does not match the frontend address | Correct it and redeploy |
| HTTPS frontend calling an HTTP API (mixed content) | Use the API's HTTPS address |
| Missing environment variable or different dependency version | Compare `.env.example` with the host settings; pin versions |
| Schema never run on the hosted database | Run `schema.sql` against it |

## SSL / HTTPS note

TODO: say that the host provides HTTPS, that the frontend and the API must both be served over HTTPS in
production, and that the development server is never exposed publicly (gunicorn via the `Procfile`).

## Rollback

TODO: redeploy the previous tag.
