# Spec: IAE v1 — collaborative system design canvas

> Publish target: GitHub issue with label `ready-for-agent`. Created from `/to-spec` design sessions.

## Problem Statement

Teams designing software systems need a shared space to draw architecture diagrams, iterate with AI, and turn designs into written specs — without juggling separate whiteboard, chat, and doc tools. Today there is no product in this repo that provides authenticated multi-user canvas collaboration, AI-assisted diagram generation, or spec export from a live design.

## Solution

Build **Integrated Architecture Environment (IAE) v1**: a VS Code–inspired web app where signed-in users create **Projects** (each project is one collaborative canvas), invite **Collaborators**, edit together in real time, use AI to generate an initial diagram from a prompt (with preview/apply flow), and export a **Spec** (markdown + gaps summary) from the canvas.

## User Stories

1. As a visitor, I want to sign in with Google or email + OTP, so that I can access my projects securely.
2. As a signed-in user, I want my account created automatically on first use, so that I don't need a separate registration step.
3. As a signed-in user, I want to see a list of my projects in a left sidebar, so that I can navigate between designs quickly.
4. As a signed-in user, I want to create a blank project, so that I can start drawing manually without AI.
5. As a signed-in user, I want a blank project's canvas to be editable immediately, so that I can begin designing without waiting.
6. As a signed-in user, I want to create a prompt-mode project by describing what I want designed, so that AI can propose an initial architecture.
7. As a project owner, I want the canvas locked while AI is generating, so that no edits conflict with an in-progress generation.
8. As a project owner, I want to see a preview of the AI-generated diagram before it is applied, so that I can evaluate it first.
9. As a project owner, I want to tweak my prompt and regenerate, so that I can iterate toward a better preview.
10. As a project owner, I want each generation to remember the prompt used, so that I can compare what I asked for across previews.
11. As a project owner, I want to see a list of completed previews, so that I can choose among past generations.
12. As a project owner, I want to apply a selected preview to the canvas, so that the design I prefer becomes the live diagram.
13. As a project owner, I want the canvas to unlock after I apply a preview, so that I can edit collaboratively.
14. As a project owner, I want the right sidebar iteration panel to become dormant after apply, so that the UI reflects that chat features come later.
15. As a collaborator with editor role, I want to edit the canvas on a ready project, so that I can contribute to the design.
16. As a collaborator, I want my edits to appear for other connected users in real time, so that we are truly collaborating.
17. As a project owner, I want to invite someone by email with an email-bound link, so that only the intended recipient gets access.
18. As an invite recipient without an account, I want to sign in via the invite link and land on the project, so that onboarding is seamless.
19. As an invite recipient, I want my email to match the invite, so that invite links cannot be hijacked by another account.
20. As a project owner, I want the app to send the invite email for me, so that I don't have to copy links manually.
21. As a signed-in user, I want to export a spec from the toolbar, so that I can get a written description of the current canvas.
22. As a signed-in user, I want the exported spec to include a gaps summary, so that I know what the AI inferred vs what was missing from the diagram.
23. As a signed-in user, I want canvas state to persist across sessions, so that I don't lose work when I disconnect.
24. As a returning user, I want the latest canvas loaded when I reopen a project, so that I continue where I left off.
25. As a project owner, I want to delete my project, so that I can remove designs I no longer need.
26. As a signed-in user, I want rate limits on AI usage, so that the service stays sustainable.
27. As a signed-in user, I want to be told when I've hit a rate limit, so that I understand why a request was rejected.
28. As a developer, I want the backend to verify Clerk JWTs on every request, so that API access is authenticated.
29. As a developer, I want WebSocket connections to require authentication, so that Yjs rooms are not publicly writable.
30. As a developer, I want AI generation jobs tracked in the database, so that users can poll status and results reliably.

## Implementation Decisions

### Architecture

- **Frontend**: Next.js + Tailwind in `frontend/`, deployed to Vercel.
- **Backend**: Express in `backend/`, Docker image built and pushed to Docker Hub on push to `main`.
- **Auth**: Clerk (Google + email + OTP; no magic link). Backend verifies JWT on every HTTP request and WebSocket handshake. Lazy **User** upsert in auth middleware (no dedicated POST endpoint). Frontend calls `GET /api/users/me` when Clerk session becomes active.
- **Real-time**: Yjs CRDT over WebSocket on Express (ADR-0001). **Canvas State** is authoritative while connected; **Canvas Snapshot** (one upserted row per project with `updated_at`) is persisted on debounced save for cold start and backup.
- **Canvas library**: tldraw.
- **AI jobs**: Trigger.dev background tasks. OpenRouter/Groq for inference.
- **Database**: Supabase/Postgres via Prisma.
- **Rate limiting**: Upstash Redis — 5 `generate` and 10 `export_spec` jobs per user per day (global across projects).
- **Email**: Resend for invite delivery.

### Domain model

Entities (see `docs/schema-api.md`):

- `user` — lazy-created from Clerk claims
- `project` — `mode`: `prompt` | `blank`; `status`: `generating` | `preview` | `failed` | `ready`
- `collaborator` — `role`: `owner` | `editor`; owner row on create; editor row on invite redeem
- `project_invite` — email-bound token with expiry and `redeemed_at`
- `canvas_snapshot` — one row per project, upserted (not append-only in v1)
- `ai_generation` — tracks `generate` and `export_spec` jobs; stores `prompt`, `model`, `result`, `applied_at`

Project status lifecycle:

```
prompt mode:  generating → preview → ready
              generating → failed
blank mode:   ready (immediate)
```

### UI layout

- Left sidebar: project list
- Center: tldraw canvas
- Right sidebar: AI iteration panel (prompt box, regenerate, preview picker, apply) — active only in prompt mode pre-apply; dormant post-apply with "Coming in v2" for chat
- Top toolbar: Export Spec button

### API contracts

```
GET    /api/users/me
GET    /api/projects
POST   /api/projects              { name, mode, prompt? }
GET    /api/projects/:id
DELETE /api/projects/:id

POST   /api/projects/:id/invites  { email }
POST   /api/invites/:token/redeem

POST   /api/projects/:id/ai/generate     { prompt }
GET    /api/projects/:id/ai/previews
POST   /api/projects/:id/ai/apply        { aiGenerationId }
GET    /api/projects/:id/ai/:jobId
POST   /api/projects/:id/ai/export-spec

WS     /ws/projects/:id
```

Prompt-mode flow:

1. Create project with prompt → status `generating`, enqueue generate job.
2. Job completes → status `preview`; preview available in picker.
3. First job fails with no completed unapplied preview → status `failed`.
4. User tweaks prompt → new generate job (new `ai_generation` row with new `prompt`).
5. User selects preview → apply → writes to Yjs canvas, sets `applied_at`, status `ready`.

Apply validates: job belongs to project, type is `generate`, status is `completed`, not yet applied.

Export spec result shape on `ai_generation.result`:

```json
{ "markdown": "...", "gaps_summary": "..." }
```

### Modules to build

- **Backend scaffold**: Express app, Prisma schema, Clerk auth middleware, Docker + GitHub Actions CI.
- **User + Project module**: CRUD, collaborator checks, status transitions.
- **Invite module**: create invite, send via Resend, redeem with email verification.
- **Canvas sync module**: Yjs provider on Express WS, room auth scoped to project collaborators, snapshot persist hook.
- **AI module**: Trigger.dev tasks for generate and export_spec, job polling endpoints, apply-preview logic.
- **Rate limit module**: Upstash counter checks before job enqueue.
- **Frontend shell**: Clerk provider, project sidebar, VS Code–like layout, toolbar.
- **Frontend canvas**: tldraw + Yjs client binding.
- **Frontend AI panel**: iteration UI for prompt mode pre-apply; export spec trigger in toolbar.

### Build order (ticket-wise PRs)

1. Backend scaffold
2. User upsert + project CRUD
3. Frontend auth + project list sidebar
4. tldraw blank canvas + Yjs WS
5. canvas_snapshot persist
6. Trigger.dev + generate + preview/apply
7. Export spec job + toolbar button
8. Invites (Resend + redeem)
9. Upstash rate limiting
10. Right sidebar iteration UI

## Testing Decisions

### Proposed test seam

**Primary seam: backend HTTP integration tests** — exercise authenticated REST endpoints against a test Postgres database. External boundaries stubbed/mocked at the highest point:

- Clerk JWT verification (inject test claims)
- Trigger.dev job enqueue (capture payload, don't run)
- Resend (capture email, don't send)
- Upstash Redis (in-memory or test instance)
- OpenRouter/Groq (return fixture responses)

This single seam covers: user upsert, project CRUD + status transitions, invite create/redeem, AI job lifecycle (generate, previews, apply, export-spec), and rate limit rejection — without coupling tests to internal module layout.

**Secondary seam (only where HTTP cannot reach): WebSocket integration tests** for Yjs room join authorization and snapshot persist trigger. Keep these minimal; do not duplicate business logic coverage already exercised via HTTP.

### What makes a good test

- Assert **observable behavior**: HTTP status codes, response bodies, DB state, and side effects at stubbed boundaries (e.g. "enqueue was called", "email was sent to X").
- Do **not** assert internal call order, private functions, or implementation-specific structure.
- Use domain vocabulary from `CONTEXT.md` in test descriptions.

### Prior art

Greenfield — no existing test patterns in repo. Establish integration test harness with the backend scaffold (ticket 1).

## Out of Scope (v2+)

- Live cursors
- User chat (full AI chat sidebar)
- Canvas comments
- System design templates
- AI modify selection on canvas
- Regenerate entire canvas after apply
- Append-only canvas snapshot history
- Viewer (read-only) collaborator role
- Open invite links (non-email-bound)

## Further Notes

- Human product intent: `prompt.md` (do not overwrite).
- Agent design reference: `docs/design-v1.md`, `docs/schema-api.md`, `CONTEXT.md`.
- ADR-0001: Yjs as live canvas state.
- Frontend is currently a default Next.js scaffold; backend does not exist yet.
- Follow modular codebase conventions, Tailwind color tokens, ticket-wise PRs to `main`.
