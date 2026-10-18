# Soma Auth email templates — candidate, not installed

Staging only: zjinjtkekmaqtxsuyvho. No production config, SMTP provider,
credential, DNS record or domain is created by these files.

Hosted dashboard currently says: “Set up custom SMTP to edit templates”.
Default templates remain active until custom SMTP is explicitly configured.
Do not bypass that requirement or spoof an unverified From address.

After a provider/sender is approved and configured manually:

1. Use a verified sender address under a controlled domain; display name Soma.
   Configure provider SPF/DKIM/DMARC and TLS as required. Keep SMTP credentials
   only in the server-side provider console, never VITE_ / browser / Git.
2. Install confirm-signup.html as Confirm sign up and magic-link.html as
   Magic link or OTP. Subjects are in subjects.json. Keep both .Token and
   .ConfirmationURL; do not build links using .SiteURL alone.
3. Verify receipt, From, subject, code and link with one controlled inbox.
   Verify expiry, single use, wrong code, rate limit and retry. No tracking.
4. Only after templates are installed and tested, compile staging with
   VITE_AUTH_EMAIL_OTP=true to show the existing code input automatically.
   Until then the flag stays false and UI accurately requests an email link.

The reported “password recovery” issue was clarified by the founder as an
email login link failure. Soma has no password login/reset UI; this task
introduces neither passwords nor reset-password endpoints/templates.

For each immutable Preview hostname, authorize only that exact origin and
its /** path/query pattern in Supabase staging Redirect URLs; never allow all
*.vercel.app tenants. Site URL should be the current intended staging origin.
The Google authorized callback is the Supabase endpoint, not the Preview URL:
https://zjinjtkekmaqtxsuyvho.supabase.co/auth/v1/callback

Google credentials must come only from approved Soma project
rare-array-510414-d9. Never use Luigi or copy production secrets. Normal
Google scope remains managed by existing Supabase Google OAuth integration.

A custom SMTP sender does not by itself hide the Supabase hostname inside
Auth links/technical headers. A custom Auth domain is a separate decision.
