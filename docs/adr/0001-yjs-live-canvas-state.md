# Yjs as live canvas state

Canvas State lives in a Yjs CRDT document synced over WebSocket while users are connected. Postgres stores a Canvas Snapshot (one upserted row per project) for cold start and backup. We picked this over Postgres-as-source-of-truth because tldraw and Yjs are built for CRDT sync, and it avoids write conflicts when multiple editors are on the canvas.

Considered: writing AI-generated previews directly to Postgres only (rejected — real-time collaboration would bypass the CRDT). Considered: append-only snapshot history (deferred to v2).
