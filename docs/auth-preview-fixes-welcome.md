# Auth Preview fixes + welcome copy

18 ottobre2026. Branch codex/soma-schema-v2-staging; baseline
445574a46f6272f8dfe00dfc0b35704ed9ef0aa6. Staging only:
zjinjtkekmaqtxsuyvho. No migration/RLS/API change, no ORA/PHOTO logic change,
no new provider, no main/Production/Vercel Production modification.

## Audit and root causes

- Public Auth settings: Google=false, Email=true, Confirm email ON.
  Staging dashboard Google provider OFF; Client IDs and Secret not configured.
  This prevents Google login before any Google-side callback can succeed.
  No Google/GCP resource has been accessed or modified in this task. Only the
  approved Soma project rare-array-510414-d9 may supply credentials; Luigi
  excluded. Founder was asked to configure credentials directly in staging;
  no credential requested in chat or copied from production.
- Supabase staging URL Configuration: Site URL http://localhost:3000 and
  **no Redirect URLs**. Frontend was correctly sending its Preview origin,
  but it was not allowed; the server falls back to localhost. This explains
  the reported email-link routing failure on a phone. Actual private link/
  headers were not collected, so an additional expired/consumed-link cause
  is not excluded without an inbox-assisted fresh-link test.
- Founder clarified “password recovery” meant email sign-in link, not a
  password-reset button. No new password flow is introduced.
- Email delivery uses default service/templates. Dashboard explicitly says
  custom SMTP is required to edit subjects and bodies. No SMTP sender is
  configured; the actual From header was not independently inspected. The
  founder observed Supabase branding. Custom From/display branding is not
  claimed completed.
- Preview is protected by Vercel Authentication independently of Soma Auth;
  this protection remains enabled. Existing authenticated browser loads app.

## Changes

- Welcome value proposition: “Trova le tue crush nella tua università.”,
  first in the existing welcome subtitle. Existing styles/logo/layout kept.
- Dedicated src/auth-preview.js: same-origin Auth redirect builder, preserves
  pending QR only, never forwards previous OAuth errors/tokens/query fields.
  Expired/replayed-link errors now give actionable Italian text and scrub
  error params; callback with only error/error_code is handled too.
- Staging Google button first checks minimal public /auth/v1/settings using
  boundedFetch, no secrets. Disabled/missing config produces an inline error
  and preserves email access instead of blindly opening a failing endpoint.
  OAuth options/scopes and SDK session persistence/auto-refresh/URL detection
  are unchanged. This check does NOT configure or prove Google OAuth.
- Email link instructions now explain expiry/retry. Optional existing code
  input is wired behind VITE_AUTH_EMAIL_OTP=false by default; never promise a
  code that default email template does not include. Code path ready for
  approved SMTP/template activation, without new backend or provider.
- Branded signup + magic-link/OTP templates and subjects prepared under
  supabase/templates/auth, with .Token and .ConfirmationURL, no external font,
  image, tracking or script. Sender address deliberately null, not fabricated.
- Live staging Site URL changed to existing Preview and exact-host /** added:
  https://spot-krp1m3dqz-fedegrasso1994-1482.vercel.app/
  No broad wildcard across Vercel tenants. New Preview origin must be added
  after deployment and set as current staging fallback. Confirm email unchanged.

## Verification

407/407 tests PASS (396 baseline +11), including welcome, provider-readiness
failure/success, redirect/QR, callback errors/expiry, email SDK options,
optional code UI, onboarding and existing ORA/Tribe regressions. Build,
typecheck, release/secret/font scan PASS. All new Auth tests are local/mocked
except the explicitly documented live public-settings and console checks.
No real Google login or inbox-assisted email return is claimed PASS yet.
No synthetic Auth account or product data created by these checks.

## Manual gates

1. Configure staging Google Client IDs/Secret from approved Soma OAuth
   project and authorize staging Supabase callback. Keep nonce checks enabled
   and do not allow missing emails. Then real Google login, callback, refresh,
   session persistence and account/onboarding gate must pass.
2. Select/approve custom SMTP/domain separately; verify sender DNS, credentials,
   delivery, retention/log/privacy requirements; install prepared templates.
   No new provider/domain/billing action performed here.
3. Fresh email link after redirect fix, in a controlled inbox; user opens link
   directly (no token copied into report/chat), verify return + refresh on
   desktop/mobile. Until templates are installed, email remains provider-branded
   and VITE_AUTH_EMAIL_OTP remains OFF.
4. Existing PHOTO admission stays PAUSED: Auth smoke should stop at legitimate
   AGE/profile gates; do not change photos or reopen PHOTO just for testing.

## Gate

GO WITH CONDITIONS for repository fixes; **NO-GO to declare real Auth closure**
until Google configuration + real provider/inbox smoke pass. No Spot v2 or
other roadmap task started. Runtime/deploy/evidence checkpoint appended after
publication. No legal sufficiency or pilot readiness claim.

Primary references:
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/auth-email-templates
