# IAE v1 Design (agent reference)

Synthesized from design sessions. Human intent lives in [`prompt.md`](../prompt.md). Domain terms in [`CONTEXT.md`](../CONTEXT.md). Schema and API detail in [`schema-api.md`](./schema-api.md).

## UI

- VS Code–inspired layout
- Left sidebar: user's projects
- Center: tldraw canvas
- Right sidebar: AI iteration panel (prompt mode, pre-apply only); dormant post-apply until v2
- Top toolbar: Export Spec button

## v1 scope

| In | Out (v2+) |
| --- | --- |
| Clerk auth (Google + email magic link) | Live cursors |
| Project CRUD (`prompt` + `blank` modes) | User chat |
| Multi-user canvas (owner + editor) | Canvas comments |
| Email-bound invites via Resend | AI modify selection |
| AI generate: preview → tweak prompt → regenerate → pick → apply | Full AI chat sidebar |
| AI export spec (best-effort + gaps summary) | Templates |
| Yjs real-time sync on Express WS | Regenerate entire canvas after apply |
| Snapshot persist (upsert, not append-only) | |

## Sidebar behavior

- **Prompt mode, pre-apply:** prompt box, regenerate (prompt tweak stored on `ai_generation.prompt`), preview picker, apply
- **Prompt mode, post-apply:** chat area disabled ("Coming in v2")
- **Blank mode:** canvas editable immediately; sidebar dormant from start

## Auth and users

- Clerk: Google + magic link only (email always present)
- Lazy user upsert in backend auth middleware on first authenticated request
- Frontend calls `GET /api/users/me` when Clerk session becomes active

## Collaboration

- Roles: `owner`, `editor` (no viewer in v1)
- Email-bound invite link sent via Resend
- Redeem: Clerk sign-in → verify email match → `collaborator` row created

## AI

- Generate: Trigger.dev job; preview before apply; user picks which preview (`aiGenerationId`)
- Export spec: toolbar action; result on `ai_generation.result` as `{ markdown, gaps_summary }`
- Rate limits (Upstash Redis, per user global): 5 generates + 10 spec exports / day

## Project status

| status | meaning |
| --- | --- |
| `generating` | AI job running (prompt mode) |
| `preview` | Previews available; canvas locked |
| `ready` | Editable (blank at create, or after apply) |

## Tech additions (beyond prompt.md)

- Upstash Redis — rate limiting
- Resend — invite emails

## Build tickets

See [schema-api.md](./schema-api.md#v1-build-tickets).
