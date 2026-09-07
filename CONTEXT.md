# Integrated Architecture Environment

A real-time, AI-assisted space where users collaborate on system design.

## Language

**Project**:
A single collaborative canvas where users design a system. One project is one editable diagram. Created in `prompt` mode (AI generates first) or `blank` mode (empty canvas). Status tracks lifecycle: `generating`, `preview`, `failed`, or `ready`.
_Avoid_: Diagram, room

**User**:
A person who can sign in via Clerk with Google or email + OTP. A Postgres row is created lazily on the user's first authenticated backend request.
_Avoid_: Account, member

**Collaborator**:
A user who has been granted access to a project. Has role `owner` or `editor`.
_Avoid_: Member, participant

**Invite**:
An email-bound link that grants project access after the recipient signs in with a matching email. Redeeming an invite creates a collaborator row.
_Avoid_: Invitation, share link

**Preview**:
An AI-generated canvas proposal shown before it is written to the live canvas. The user can regenerate multiple previews and apply a chosen one to unlock editing.
_Avoid_: Draft, mockup

**Spec**:
A markdown document of a Project's canvas as it was when a User asked for a Spec, plus a gaps summary for anything inferred or missing. The live canvas may change after that moment.
_Avoid_: Specification doc, export

**AI Generation**:
A tracked background job that runs an AI action (`generate` or `export_spec`) against a project. Stores the prompt used (user prompt for generate, click-time canvas summary for export_spec), the LLM model, result, and `applied_at` when a generate preview is written to the live canvas.
_Avoid_: AI job, inference request

**Canvas State**:
The live tldraw document synced in real time via Yjs. Authoritative while a session is active.
_Avoid_: Diagram JSON, document

**Canvas Snapshot**:
The latest persisted copy of canvas state for a project. One row per project, upserted on save (not append-only in v1).
_Avoid_: Save, backup, revision log
