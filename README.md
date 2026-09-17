# Integrated Architecture Environment

Integrated Architecture Environment (IAE) is a real-time, AI-assisted space
where users collaborate on system design.

## Backend setup

The backend sends Invite emails through Brevo's SMTP relay. Create a Brevo SMTP
key and verify the sender address in Brevo, then configure these backend
environment variables:

```text
BREVO_SMTP_LOGIN=your-brevo-account-login
BREVO_SMTP_KEY=your-brevo-smtp-key
BREVO_FROM=verified-sender@example.com
```

Brevo uses `smtp-relay.brevo.com` on port `587` with STARTTLS. The sender must
be a verified Brevo sender. Tests use the in-memory mailer and do not contact
Brevo.
