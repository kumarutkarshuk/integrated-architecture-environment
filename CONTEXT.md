# Integrated Architecture Environment

A real-time, AI-assisted space where users collaborate on system design.

## Language

**Project**:
A single collaborative canvas where users design a system. One project is one editable diagram. Created in `prompt` mode (AI generates first) or `blank` mode (empty canvas). Status tracks lifecycle: `generating`, `preview`, `failed`, or `ready`.
_Avoid_: Diagram, room

**Active Project**:
The ready Project whose tab the User has allowed agent edits on. Only one exists per browser at a time; if another tab would arm, the User picks which tab to keep.
_Avoid_: Screen, current diagram, focused room

**User**:
A person who can sign in via Clerk with Google or email + OTP. A Postgres row is created lazily on the user's first authenticated backend request.
_Avoid_: Account, member

**Collaborator**:
A user who has been granted access to a project. Has role `owner` or `editor`. A coding agent that edits the canvas is this Collaborator, not a separate person.
_Avoid_: Member, participant, agent

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
A tracked background job that runs an AI action (`generate` or `export_spec`) against a project. It records the prompt used (user prompt for generate, click-time canvas summary for export_spec), which prompt version produced it, the LLM model, the result, and `applied_at` when a generate Preview is written to the live canvas. A generate job also stores a Plan. A failed job records why it failed, and whether a prompt was blocked by code or the classifier. Users may attach a Rating to a completed job.
_Avoid_: AI job, inference request

**Plan**:
The LLM's list of Flows for a generate AI Generation, before layout turns it into canvas records. A Plan with one path is one Flow.
_Avoid_: Raw JSON, LLM output, diagram JSON

**Flow**:
A named cluster of components (with kind) and connections (with style) inside a Plan. Distinct request paths (insert vs retrieve) are separate Flows, even when they use the same kinds of services.
_Avoid_: Group, swimlane, subgraph

**Rating**:
A thumbs-up or thumbs-down the User who started an AI Generation gives to that job. At most one Rating per User per AI Generation. It can be switched between up and down, but not cleared. Applying a Preview is not a Rating. Only that User can create or see the Rating in the product.
_Avoid_: Feedback, vote, thumbs

**Canvas State**:
The live tldraw document synced in real time via Yjs. Authoritative while a session is active. This is the canvas (what people call the screen).
_Avoid_: Diagram JSON, document, screen

**Canvas Snapshot**:
The latest persisted copy of canvas state for a project. One row per project, upserted on save (not append-only in v1).
_Avoid_: Save, backup, revision log
