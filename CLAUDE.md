# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RAG-based internal knowledge search platform. Users upload documents → embeddings stored in Chroma → SSE-streamed Q&A via a Self-RAG (LangGraph) pipeline. Stack: Next.js 16 frontend, FastAPI backend, MySQL 8.4, Chroma vector DB, deployed on AWS ECS Fargate via CDK.

## Development Commands

### Local Development (Docker Compose)
```bash
docker compose up --build    # Start all services (frontend :3000, backend :8000, MySQL :3306)
```

### Frontend (`src/frontend/`)
```bash
npm run dev           # Dev server
npm run build         # Production build
npm run lint          # ESLint
npm run format:check  # Prettier check
```

### Backend (`src/backend/`)
```bash
poetry install                              # Install dependencies
poetry run uvicorn main:app --reload        # Dev server
poetry run pytest                           # All tests
poetry run pytest tests/test_chats.py      # Single test file
poetry run ruff check .                     # Lint
poetry run ruff format --check .            # Format check
```

### CDK (`cdk/`)
```bash
npm run build         # Compile TypeScript
npm run test          # Run CDK tests
npm run diff:dev      # Preview infra changes (dev)
npm run deploy:dev    # Deploy infra (dev)
npm run diff:prod     # Preview infra changes (prod)
npm run deploy:prod   # Deploy infra (prod)
```

## Architecture

### Request Flow

**Chat (SSE streaming)**:
```
Browser → Next.js Route Handler (/api/chat-stream)
  → validates JWT cookie → adds X-User-Id / X-Request-ID headers
  → FastAPI POST /api/chats/stream
  → LangGraph workflow (StateGraph) streams updates
  → Browser parses SSE events and updates UI in real-time
  → Final state saved to MySQL (chat_histories + chat_details)
```

**Document ingestion**:
```
Browser → Next.js Server Action (file-actions.ts)
  → uploads file, extracts text, saves to MySQL (status: uploaded)
  → FastAPI POST /api/documents/{id}/embeddings
  → splits text → OpenAI embeddings → stored in Chroma
  → updates MySQL (status: ingested)
```

**Auth**: Server Actions validate credentials against MySQL, hash passwords with argon2, issue JWT set in an httpOnly `session_token` cookie. `getUserIdFromToken()` in `lib/auth.ts` guards every protected page.

### LangGraph Self-RAG Workflow (`src/backend/services/rag/`)

```
generate_queries_node   → multi-query generation (LLM)
retrieve_contexts_node  → Chroma retrieval + RRF fusion + Cohere rerank
generate_answer_node    → LLM answer generation
grade_answer_node       → evaluate: "useful" | "useless" | "hallucination"
  ├─ useful → END
  ├─ retry_count < 1 → back to generate_queries_node (with feedback)
  └─ retry_count >= 1 → analyze_failure_node → END
```

Key files: `workflows.py` (StateGraph), `nodes.py` (node implementations), `chains.py` (LLM chains), `prompts.py` (Japanese prompts).

### Frontend Structure (`src/frontend/`)

- `app/` — Next.js App Router pages and API routes
- `app/api/chat-stream/route.ts` — proxies SSE from FastAPI to browser
- `app/actions/` — Server Actions for auth and file uploads
- `components/features/rag/ChatConsole.tsx` — SSE consumer, renders workflow progress in real-time
- `lib/` — utilities: `auth.ts` (JWT), `db.ts` (MySQL for Server Actions), `file.ts` (S3), `env.ts`, `logger.ts`

### Backend Structure (`src/backend/`)

- `main.py` — FastAPI app; initializes MySQL pool, Chroma client, Cohere reranker via lifespan
- `api/endpoints/` — `chats.py` (streaming), `documents.py` (ingestion), `deps.py` (DI)
- `services/rag/` — LangGraph workflow (see above)
- `core/chroma.py` — document chunking (500 chars / 50 overlap) → OpenAI embeddings → Chroma
- `init_db.py` — creates tables: `users`, `docs`, `chat_histories`, `chat_details`
- `config.py` — Pydantic settings (env vars)

### AWS Infrastructure (`cdk/`)

Six CDK stacks deployed in order: `VpcStack → EfsStack → RdsStack → S3Stack → EcsStack → IamStack`

- **ECS Fargate**: backend (port 8000) + frontend (port 3000), SPOT instances, ALB
- **EFS**: mounted at `/chroma` inside the backend container for Chroma persistence (access point UID 1000)
- **RDS MySQL 8.4**: isolated subnet, credentials in Secrets Manager
- **GitHub OIDC**: `IamStack` provisions the OIDC provider for CI/CD assume-role

### Environment Variables

Both services share a single `.env` at repo root for local Docker Compose. Key variables:
- `OPENAI_API_KEY`, `COHERE_API_KEY` — LLM/reranking
- `JWT_SECRET` — token signing
- `MYSQL_*` / `DATABASE_URL` — database connection
- `FASTAPI_URL` — backend URL used by Next.js Server Actions (default: `http://backend:8000/api`)
- `PERSIST_DIRECTORY` — Chroma local path (default: `./chroma_db`)

In production, secrets are injected from AWS SSM Parameter Store into ECS task definitions.
