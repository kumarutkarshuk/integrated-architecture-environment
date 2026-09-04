## Agent skills

### Issue tracker

Issues live in GitHub Issues for this repo. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical triage labels map 1:1 to GitHub label strings. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### UI components

Prefer established component libraries over custom UI. In the frontend, use **shadcn/ui** (`frontend/components/ui/`) for buttons, forms, dialogs, cards, and other common patterns. Add new shadcn components with `bunx shadcn@latest add <component>` rather than building equivalents from scratch. Reuse existing layout and theme tokens in `frontend/app/globals.css`.
