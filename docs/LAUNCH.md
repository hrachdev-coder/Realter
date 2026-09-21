# Launch runbook

The application is not publicly launched. Domain, hosting, SMTP and payment merchant credentials are still required.

## Database

Apply migrations in order. Existing installations with the TOP migration need only 202609190004_production.sql, once. It grants the approved first administrator account membership. Do not rerun setup.sql on an existing installation. Verify /api/health returns 200 after migration.

## Hosting

Use a Node.js 22 host with npm ci, npm test and npm run build. Start with npx next start --hostname 0.0.0.0 behind the host's HTTPS proxy. The local npm start command intentionally binds loopback. Set NEXT_PUBLIC_SITE_URL to the actual HTTPS domain before building, plus the Supabase URL and publishable key. Store SUPABASE_SERVICE_ROLE_KEY and ANALYTICS_HASH_SECRET only as server secrets. Never use NEXT_PUBLIC_ prefixes for secrets. Generate a random analytics secret with at least 32 bytes.

Set Supabase Auth Site URL and callback allowlist to the real domain /auth/callback URL. Test fresh signup confirmation, login, password recovery, owner and realtor accounts on that domain before launch.

## Email

Connect custom SMTP in Supabase Auth using a sending domain you control and configure the provider's SPF/DKIM records. Do not disable email confirmation to fix delivery. Test delivery to an ordinary non-team address, including spam placement. An already-confirmed account should use login or password recovery; repeat registration does not imply a fresh confirmation email.

## Monitoring and backups

Point an external uptime monitor at /api/health; it returns 503 if the public database view is unavailable. Request errors produce structured server logs without request headers, bodies or raw error messages. Connect hosting logs and alerts to your chosen monitoring provider; this repository alone does not send alerts.

Enable database backups appropriate to the selected Supabase plan, define retention and recovery targets, and test restoration into a separate staging project. Back up Storage objects separately: database backups alone are not a copy of uploaded images. Record the restore date and results before launch. No backup or restore has been performed by this runbook.

## Payments

TOP packages are 1200 AMD / 3 days and 1500 AMD / 7 days. Orders remain pending until verified payment. Connect the chosen Armenian merchant provider only after obtaining its contract and integration specification. Verify signed callbacks, amount, currency and duplicate delivery before calling activate_top_order. Never activate based on browser success redirects.

## Remaining acceptance work

Run live moderation/favorites/search tests after the new migration. Add payment integration, SMTP and domain setup. Saved-search email alerts are not implemented. Listing view counts are approximate browser-based analytics, not audited unique-person metrics. Obtain operator identity, contact details and retention decisions before publishing legal pages. Schedule conservative storage cleanup only after its retention policy is agreed.
