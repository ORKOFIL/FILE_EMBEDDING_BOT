# File Embedding Bot — Chat with Your Documents (RAG)

A full-stack **Retrieval-Augmented Generation (RAG)** web app. Upload a PDF or TXT file, wait for it to be processed in the background, then ask questions about it in a chat. Answers are grounded in the document, and the model can also draw reasoned conclusions when the answer is not stated word for word.

## Features

- Upload `.pdf` and `.txt` documents, list them and delete them
- Background processing with live status (`[1/6] Uploading` → `[6/6] Finished`) and error reporting
- Per-document chat with conversation memory (follow-up questions work)
- Answers that go beyond literal quotes: the model infers from context and says so explicitly
- Plain-text answers, no Markdown noise

## How it works

```
Upload ──► Postgres (file + metadata) ──► BullMQ queue (Redis) ──► Worker
   Worker: extract text → split into chunks → summarize document
           → create embeddings (OpenAI) → store vectors in pgvector

Question ──► rewrite into 3 search queries (uses chat history)
         ──► hybrid search: vector similarity (pgvector) + full-text (tsvector)
         ──► merge results with Reciprocal Rank Fusion (RRF)
         ──► top 8 chunks + document summary ──► LLM ──► answer
```

Key design decisions:

- **Hybrid retrieval.** Vector search finds meaning, full-text search finds exact terms, numbers and names. Results are merged with RRF.
- **Query rewriting.** A short question is expanded into several search queries, which improves recall for vague or conversational questions.
- **Document summary chunk.** Generated at ingestion time and always sent to the LLM, so broad questions ("what is this document about?") work well.
- **Async ingestion.** Heavy work runs in a separate worker process, so the UI and API stay fast.
- **Files stored in PostgreSQL** (`bytea`), so the whole stack is one `docker compose up` with no external storage.

## Tech stack

| Area | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Backend | Next.js API routes, Node.js worker (`tsx`) |
| Database | PostgreSQL 16 + **pgvector**, **Prisma** ORM |
| Queue | BullMQ + Redis |
| AI | OpenAI `text-embedding-3-small`, `gpt-4o-mini` |
| Text processing | LangChain (PDF loader, recursive text splitter) |
| Infrastructure | Docker Compose |

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer (22 recommended)
- [Docker](https://docs.docker.com/get-docker/) with Docker Compose (Docker Desktop on Windows/macOS)
- An [OpenAI API key](https://platform.openai.com/api-keys) (needs a few cents of credit)

### Installation

**1. Clone and install dependencies**

```bash
git clone <repository-url>
cd FILE_EMBEDDING_BOT
npm install
```

**2. Create the environment file**

```bash
cp .env.example .env          # Windows (PowerShell): copy .env.example .env
```

Open `.env` and set your key:

```env
OPENAI_API_KEY="sk-..."
```

The other values already match the Docker setup, so leave them as they are.

**3. Start PostgreSQL and Redis**

```bash
docker compose up -d
```

PostgreSQL runs on port `5435` and Redis on `6380`. These are deliberately not the defaults, so they do not clash with a database you may already have installed. Wait a few seconds for the containers to start.

**4. Create the database tables**

```bash
npx prisma migrate deploy
```

**5. Run the app (two terminals)**

Terminal 1, web app:

```bash
npm run dev
```

Terminal 2, background worker:

```bash
npm run worker:embedding
```

**6. Open <http://localhost:3000>**

Upload a PDF or TXT file, wait until its status is `[6/6] Finished`, select it, and start asking questions.

### Troubleshooting

| Problem | Fix |
|---|---|
| `port is already allocated` | Change the left-hand port in `docker-compose.yml` and update `DATABASE_URL` / `REDIS_URL` in `.env` to match |
| Document stays in a `[n/6]` status | The worker is not running. Start `npm run worker:embedding` |
| Status `ERROR` | Check the worker terminal for the error. Most often `OPENAI_API_KEY` is missing or has no credit |
| Reset everything | `docker compose down -v` (deletes all data), then repeat steps 3–4 |

## Project structure

```
prisma/                  Schema and SQL migrations (incl. pgvector and full-text index)
src/app/api/             REST endpoints: upload, files, status, delete, chat
src/workers/             Background ingestion worker (BullMQ)
src/lib/                 Prisma client and queue setup
src/components/, hooks/  React UI and client logic
docker-compose.yml       PostgreSQL (pgvector) + Redis
```

## Useful commands

| Command | Description |
|---|---|
| `npm run dev` | Start the web app in development mode |
| `npm run worker:embedding` | Start the ingestion worker |
| `npm run build && npm start` | Production build and run |
| `npx prisma studio` | Browse the database in a GUI |
| `docker compose down` | Stop PostgreSQL and Redis (data is kept) |
