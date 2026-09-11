# Gmail SMTP for Invite emails

Invite emails go out through nodemailer over Gmail SMTP, not Resend. Resend without a verified domain can only deliver to the account owner's mailbox, so it cannot send an Invite to other people. Recipients will see a gmail.com From address; that is good enough for low volume until we have a real sending domain.

The Mailer port and test mailer stay, so CI never talks to Gmail.
