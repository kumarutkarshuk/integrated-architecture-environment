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
  deleted_at    timestamptz

project
  id            uuid PK
  name          text NOT NULL
  owner_id      uuid FK → user.id NOT NULL
  mode          text NOT NULL  -- 'prompt' | 'blank'
  status        text NOT NULL  -- 'generating' | 'preview' | 'failed' | 'ready'
  created_at    timestamptz NOT NULL
  deleted_at    timestamptz

collaborator
  project_id    uuid FK → project.id
  user_id       uuid FK → user.id
  role          text NOT NULL  -- 'owner' | 'editor'
  deleted_at    timestamptz
  PRIMARY KEY (project_id, user_id)
  -- owner row inserted on project create
  -- editor row inserted when project_invite is redeemed

project_invite
  id            uuid PK
  project_id    uuid FK → project.id NOT NULL
  email         text NOT NULL
  token         text UNIQUE NOT NULL
  role          text NOT NULL DEFAULT 'editor'
  send_count    integer NOT NULL DEFAULT 1
  created_at    timestamptz NOT NULL
  last_sent_at  timestamptz NOT NULL
  expires_at    timestamptz NOT NULL
  redeemed_at   timestamptz
  deleted_at    timestamptz
  -- one pending invite per (project_id, email); max 3 emails; 5 minute wait between sends

canvas_snapshot
  project_id    uuid PK FK → project.id
  tldraw_json   jsonb NOT NULL
  created_at    timestamptz NOT NULL
  updated_at    timestamptz NOT NULL
  deleted_at    timestamptz
  -- one row per project, upserted on debounced save (not append-only in v1)

ai_generation
  id            uuid PK
  project_id    uuid FK → project.id NOT NULL  -- Restrict (not cascade)
  user_id       uuid FK → user.id NOT NULL     -- Restrict (not cascade)
  type          text NOT NULL  -- 'generate' | 'export_spec'
  status        text NOT NULL  -- 'pending' | 'running' | 'completed' | 'failed'
  prompt        text           -- generate: user prompt; export_spec: canvas summary at click
  result        jsonb          -- tldraw shapes (generate) or { markdown, gaps_summary } (export_spec)
  plan          jsonb          -- generate: parsed Plan { flows: [{ id, label, components, connections }] }; a single-path Plan is one Flow; null for export_spec
  prompt_version text          -- generate-diagram.v3 or export-spec.v1
  provider      text           -- groq
  model         text           -- LLM id used for the job
  tokens_used   integer
  applied_at    timestamptz    -- set when user applies a generate preview to canvas
  created_at    timestamptz NOT NULL
  deleted_at    timestamptz
```

Rows are hidden from the product when `deleted_at` is set. `DELETE /api/projects/:id` sets `deleted_at` on the project, its collaborators, invites, and canvas snapshot. `ai_generation` rows are left as they are so usage can be audited.

### Project status lifecycle

| status | When | Canvas editable? |
| --- | --- | --- |
| `generating` | Generate job running (prompt mode) | No |
| `preview` | One or more completed previews; user picking / tweaking prompt | No |
| `failed` | Latest generate failed and there is no completed unapplied preview | No |
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

GET    /api/projects/:id/collaborators  -- owner only; joined + pending Invite status
POST   /api/projects/:id/invites        -- { email }; rejects duplicate pending / joined
POST   /api/projects/:id/invites/:inviteId/resend  -- owner only; max 3 sends; 5 minute wait

POST   /api/invites/:token/redeem

POST   /api/projects/:id/ai/generate     -- { prompt }; sets status → generating
GET    /api/projects/:id/ai/previews     -- completed, unapplied generate jobs
POST   /api/projects/:id/ai/apply        -- { aiGenerationId }; sets status → ready
GET    /api/projects/:id/ai/:jobId       -- job status + result; generate jobs include plan; all jobs include prompt_version and provider
POST   /api/projects/:id/ai/export-spec  -- stores click-time canvas summary; starts spec job

WS     /ws/projects/:id           -- Yjs sync; Clerk JWT in handshake
```

### Prompt-mode creation flow

1. `POST /api/projects` with `{ name, mode: "prompt", prompt }` → status `generating`.
2. Trigger.dev runs generate job; stores `prompt`, `model`, `prompt_version`, `provider`, parsed `plan`, and tldraw `result` on `ai_generation` row.
3. On complete → project status `preview`; preview appears in picker.
4. On first-job fail (no completed unapplied preview) → project status `failed`.
5. User tweaks prompt → `POST .../ai/generate` again (new row, new prompt). If a later job fails but a completed unapplied preview still exists, status stays `preview`.
6. User picks preview → `POST .../ai/apply { aiGenerationId }` → status `ready`, canvas unlocked.

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
| 8 | Invites (Gmail SMTP + redeem → collaborator row) |
| 9 | Upstash rate limiting |
| 10 | Right sidebar (iteration pre-apply; dormant post-apply) |
