---
name: run
description: Start and verify the ai_app local development environment with Docker Compose. Use when asked to run, start, restart, or confirm the application is running locally.
---

# Local startup rules

## Critical rules

Always:

- Run Docker Compose from the repository root.
- Wait until the application is actually ready before reporting success.
- Verify both the backend and frontend after startup.
- Ask the user if required environment variables are missing.

Never:

- Assume containers are ready immediately after `docker compose up`.
- Invent API keys or credentials.
- Treat running containers as proof that the application works.

---

## Start

Run from the repository root:

```bash
docker compose up --build
```

The first startup can take several minutes because the backend container installs
Python dependencies, initializes the database, and then starts Uvicorn.

---

## Required environment

Both services share a single repository-root `.env`.

Required variables include:

- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_ROOT_PASSWORD`
- `MYSQL_DATABASE`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `DATABASE_URL`
- `JWT_SECRET`
- `PERSIST_DIRECTORY`
- `OPENAI_API_KEY`
- `COHERE_API_KEY`
- `FASTAPI_URL`

If required values are missing or obviously placeholders, stop and ask the user
instead of inventing credentials or API keys.

---

## Verify startup

Verify readiness in this order.

1. Containers

```bash
docker compose ps
```

`rdb` should be healthy.

2. FastAPI

```bash
curl -s http://localhost:8000/api/system/health
```

Expected:

```json
{"status":"success",...}
```

3. Database

```bash
curl -s http://localhost:8000/api/system/db-test
```

Expected:

```json
{"status":"success",...}
```

5. Frontend

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
http://localhost:3000
```

Expected:

```
200
```

6. If startup appears stalled

```bash
docker compose logs backend
```

Look for:

```
Uvicorn running
```

---

## Functional verification

This Skill only verifies that the application starts correctly.

For end-to-end verification (upload → ingest → chat → persistence),
use the `verify` Skill.

---

## Authentication

Protected pages require the httpOnly `session_token` cookie.

Calling FastAPI endpoints directly bypasses the Next.js route handler that
adds request headers. Use the browser UI when validating user-facing behavior.

---

## Shutdown

Use:

```bash
docker compose down
```

Before using:

```bash
docker compose down -v
```

warn the user that the local MySQL volume will be deleted.

---

## API key behavior

Invalid `OPENAI_API_KEY` or `COHERE_API_KEY` does not prevent startup.

The application only validates those keys during embedding, reranking, or chat
requests.

A successful startup is not proof that the API keys are valid.

Use the `verify` Skill to confirm end-to-end functionality.
