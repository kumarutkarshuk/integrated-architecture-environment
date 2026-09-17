# Brevo for Invite emails

Invite emails go through Brevo, not Resend. Resend without a verified domain can only deliver to the account owner's mailbox, so it cannot send an Invite to other people. Brevo lets us send from a verified sender address at low volume without operating our own mail stack.

**Production** uses the Brevo transactional email API over HTTPS (`BREVO_API_KEY` + `BREVO_FROM`). That works on platforms that block outbound SMTP (for example Render free tier).

**Local development** can use the same API keys or nodemailer over Brevo SMTP (`SMTP_USER` / `SMTP_PASS`).

The Mailer port and test mailer stay, so CI never talks to Brevo.
