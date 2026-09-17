# Integrated Architecture Environment (IAE)

A real-time, AI-assisted web app for collaborative system design. Each **project** is one shared canvas where teammates draw architecture diagrams, generate layouts from prompts, and export markdown **specs** from the live design.

Inspired by the VS Code layout: projects on the left, canvas in the center, AI tools on the right.

## Features

- **Authentication** — Sign in with Clerk (Google or email + OTP).
- **Projects** — Create blank canvases or prompt-mode projects where AI proposes an initial diagram.
- **Preview & apply** — Review AI-generated previews before writing them to the live canvas.
- **Real-time collaboration** — Multi-user editing over Yjs with live cursors on ready projects.
- **Invites** — Email-bound collaborator invites (owner / editor roles).
- **Spec export** — AI-generated markdown from the canvas, including a gaps summary.
- **Rate limits** — Per-user daily caps on AI generate and spec export (Upstash Redis in production).

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js, React, Tailwind, shadcn/ui, tldraw |
| Backend | Express, Prisma, PostgreSQL |
| Real-time | Yjs over WebSockets |
| Auth | Clerk |
| AI jobs | Trigger.dev (Groq for inference) |
| Analytics | PostHog (optional) |

Frontend deploys to Vercel; the backend ships as a Docker image (see `.github/workflows/ci.yml`).

## Prerequisites

- [Bun](https://bun.sh) 1.3.x (see `packageManager` in `frontend/package.json` and `backend/package.json`)
- [Docker](https://www.docker.com/) (for local Postgres)
- [Clerk](https://clerk.com) application (Google + Email with OTP; disable magic link)
- [Groq](https://groq.com) API key(s) for AI features
- [Trigger.dev](https://trigger.dev) project for background generate / export jobs
- Brevo API key (`BREVO_API_KEY` + `BREVO_FROM`) or SMTP credentials for invite emails locally

Optional: Upstash Redis (required in production for rate limits), PostHog keys.

## Local development

### 1. Database

```bash
docker compose up -d
```

Postgres listens on `localhost:5432` with user/password/database `iae` / `iae` / `iae`.

### 2. Environment

Copy the examples and fill in secrets:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

See comments in those files for Clerk, Groq, Trigger.dev, SMTP, and Redis.

### 3. Backend

```bash
cd backend
bun install
bun run db:migrate
bun run dev
```

API defaults to `http://localhost:4000`.

### 4. Trigger.dev worker (AI jobs)

In a second terminal, from `backend/`:

```bash
bun run trigger:dev
```

Match env vars in the Trigger.dev dashboard with your local `backend/.env` (database URL, Groq keys, models).

### 5. Frontend

```bash
cd frontend
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). Set `NEXT_PUBLIC_API_URL` to the backend URL if it is not `http://localhost:4000`.

## Tests

```bash
# Backend (integration tests; needs Postgres — CI uses iae_test)
cd backend && bun run test

# Frontend
cd frontend && bun run test
```

CI on pull requests runs backend typecheck and tests (see `.github/workflows/ci.yml`).

## Repository layout

```
frontend/     Next.js app (landing, workspace, canvas UI)
backend/      Express API, Prisma schema, WebSocket sync, Trigger tasks
docs/         ADRs, API/schema notes, agent docs
CONTEXT.md    Domain glossary (product language)
docker/       Postgres init scripts
```

## Documentation

- [CONTEXT.md](./CONTEXT.md) — Canonical domain terms (Project, Preview, Spec, etc.)
- [docs/specs/iae-v1.md](./docs/specs/iae-v1.md) — v1 product spec and architecture decisions
- [docs/schema-api.md](./docs/schema-api.md) — API overview
- [docs/adr/](./docs/adr/) — Architecture decision records
- [AGENTS.md](./AGENTS.md) — Notes for coding agents working in this repo

## License

License not yet published in this repository. See `prompt.md` todos if you are looking for an OSS license addition.
