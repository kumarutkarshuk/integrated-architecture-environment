# Schema and API (v1)

Finalized from design sessions. Human intent: [`prompt.md`](../prompt.md). Agent reference: [`design-v1.md`](./design-v1.md). Domain terms: [`CONTEXT.md`](../CONTEXT.md).

## Postgres schema

```sql
user
  id            uuid PK
  clerk_id      text UNIQUE NOT NULL
  email         text NOT NULL
  display_name  text
  created_at    timestamptz NOT NULL

project
  id            uuid PK
  name          text NOT NULL
  owner_id      uuid FK → user.id NOT NULL
  mode          text NOT NULL  -- 'prompt' | 'blank'
  status        text NOT NULL  -- 'generating' | 'preview' | 'ready'
  created_at    timestamptz NOT NULL

collaborator
  project_id    uuid FK → project.id
  user_id       uuid FK → user.id
  role          text NOT NULL  -- 'owner' | 'editor'
  PRIMARY KEY (project_id, user_id)
  -- owner row inserted on project create
  -- editor row inserted when project_invite is redeemed

project_invite
  id            uuid PK
  project_id    uuid FK → project.id NOT NULL
  email         text NOT NULL
  token         text UNIQUE NOT NULL
  role          text NOT NULL DEFAULT 'editor'
  expires_at    timestamptz NOT NULL
  redeemed_at   timestamptz

canvas_snapshot
  project_id    uuid PK FK → project.id
  tldraw_json   jsonb NOT NULL
  created_at    timestamptz NOT NULL
  updated_at    timestamptz NOT NULL
  -- one row per project, upserted on debounced save (not append-only in v1)

ai_generation
  id            uuid PK
  project_id    uuid FK → project.id NOT NULL
  user_id       uuid FK → user.id NOT NULL
  type          text NOT NULL  -- 'generate' | 'export_spec'
  status        text NOT NULL  -- 'pending' | 'running' | 'completed' | 'failed'
  prompt        text           -- set for type=generate; stores prompt used (supports tweak + regenerate)
  result        jsonb          -- tldraw shapes (generate) or { markdown, gaps_summary } (export_spec)
  applied_at    timestamptz    -- set when user applies a generate preview to canvas
  created_at    timestamptz NOT NULL
```

### Project status lifecycle

| status | When | Canvas editable? |
| --- | --- | --- |
| `generating` | Generate job running (prompt mode) | No |
| `preview` | One or more completed previews; user picking / tweaking prompt | No |
| `ready` | Blank project at create, or after user applies a preview | Yes |

### Invite redeem

1. User opens `/invite/{token}` and signs in via Clerk (Google or email + OTP).
2. Backend verifies Clerk email matches `project_invite.email`.
3. Set `redeemed_at`, insert `collaborator(project_id, user_id, role)`.

### User upsert

No dedicated `POST /users/me`. Auth middleware upserts `user` on every authenticated request. Frontend calls `GET /api/users/me` once when Clerk session becomes active.

## REST API

```
GET    /api/users/me
GET    /api/projects
POST   /api/projects              -- { name, mode, prompt? }
GET    /api/projects/:id
DELETE /api/projects/:id          -- owner only

POST   /api/projects/:id/invites  -- { email }; sends link via Resend

POST   /api/invites/:token/redeem

POST   /api/projects/:id/ai/generate     -- { prompt }; sets status → generating
GET    /api/projects/:id/ai/previews     -- completed, unapplied generate jobs
POST   /api/projects/:id/ai/apply        -- { aiGenerationId }; sets status → ready
GET    /api/projects/:id/ai/:jobId       -- poll job status + result
POST   /api/projects/:id/ai/export-spec  -- starts spec export job

WS     /ws/projects/:id           -- Yjs sync; Clerk JWT in handshake
```

### Prompt-mode creation flow

1. `POST /api/projects` with `{ name, mode: "prompt", prompt }` → status `generating`.
2. Trigger.dev runs generate job; stores `prompt` on `ai_generation` row.
3. On complete → project status `preview`; preview appears in picker.
4. User tweaks prompt → `POST .../ai/generate` again (new row, new prompt).
5. User picks preview → `POST .../ai/apply { aiGenerationId }` → status `ready`, canvas unlocked.

## Rate limiting

Upstash Redis. Per user, global across projects:

- 5 `generate` jobs / day
- 10 `export_spec` jobs / day

Checked before enqueueing Trigger.dev jobs.

## v1 build tickets

| # | Ticket |
| --- | --- |
| 1 | Backend scaffold (Express, Prisma, Clerk middleware, Docker) |
| 2 | User upsert middleware + project CRUD |
| 3 | Frontend auth + project list sidebar |
| 4 | tldraw blank canvas + Yjs WS on Express |
| 5 | canvas_snapshot persist (debounced upsert) |
| 6 | Trigger.dev + generate + preview/apply flow |
| 7 | Export spec job + toolbar button |
| 8 | Invites (Resend + redeem → collaborator row) |
| 9 | Upstash rate limiting |
| 10 | Right sidebar (iteration pre-apply; dormant post-apply) |
