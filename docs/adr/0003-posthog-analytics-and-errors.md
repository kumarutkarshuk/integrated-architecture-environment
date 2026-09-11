# PostHog for product analytics and errors

PostHog is the one place for product events, exceptions, and error-level logs. A separate error vendor such as Sentry would split what Users did from when the app broke. Session replay stays off. Alerts are created later in the PostHog UI, so Slack and webhook secrets never enter the app.
