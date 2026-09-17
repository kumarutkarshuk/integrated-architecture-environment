# Brevo SMTP for Invite emails

Invite emails go out through nodemailer over Brevo SMTP (`smtp-relay.brevo.com`), not Resend. Resend without a verified domain can only deliver to the account owner's mailbox, so it cannot send an Invite to other people. Brevo lets us send from a verified sender address at low volume without operating our own mail stack.

The Mailer port and test mailer stay, so CI never talks to Brevo.
