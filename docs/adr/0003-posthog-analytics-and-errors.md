# PostHog for product analytics and errors

PostHog is the one place for product events, exceptions, and error-level logs. A separate error vendor such as Sentry would split what Users did from when the app broke. Session replay stays off. Alerts are created later in the PostHog UI, so Slack and webhook secrets never enter the app.

API actions (create Project, Invite, generate, apply Preview, export Spec) are captured on the backend with the Clerk id. Client-only actions that never hit the API — copying MCP config, allowing an agent, and WebMCP tool use — are captured from the signed-in frontend. Event payloads omit emails, prompts, and canvas labels.
