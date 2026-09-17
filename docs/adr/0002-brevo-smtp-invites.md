# Brevo SMTP for Invite emails

Invite emails go out through nodemailer over Brevo's SMTP relay. Brevo provides
deliverability to recipients outside the sender account while keeping the
mailer adapter small and provider-independent.

Production requires `BREVO_SMTP_LOGIN`, `BREVO_SMTP_KEY`, and a verified
`BREVO_FROM` sender address. The transport uses `smtp-relay.brevo.com` on port
587 with STARTTLS.

The Mailer port and test mailer stay, so CI never talks to Brevo.