# Tun / Realtor

A JavaScript-only Next.js App Router real estate marketplace and realtor CRM. Built in the requested Desktop/Realtor folder. Uses Tailwind CSS, Supabase Auth/Postgres/private Storage, and Row Level Security.

## Run locally

Requires Node.js 20.9 or later (Node 24 recommended).

1. Open a terminal in this folder.
2. Run `npm install` (or `npm ci` after cloning the lockfile).
3. Run `npm run dev` and open http://127.0.0.1:3000.

With no Supabase configuration, the app runs in **demo mode** with 24 illustrative listings, 3 clients, 2 leads, and 2 tasks. CRM changes work in memory while navigating within the dashboard, and reset when reloading or leaving it. Demo does not authenticate, send inquiries, upload files, or persist changes. Public demo pages use the original fixtures; publishing across public/CRM views is available in connected mode.

## Connect Supabase

1. Create a Supabase project. In its SQL editor, execute `supabase/migrations/202609140001_initial.sql` once (or use Supabase CLI migrations).
2. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the project's Connect dialog. Legacy anon keys also work in this variable.
3. Under Auth URL Configuration, set the Site URL to your app origin and allow `http://127.0.0.1:3000/auth/callback` for development. For production, set the HTTPS origin and callback URL. Leave email confirmation enabled, configure production SMTP, and use the confirmation template's standard confirmation URL for the PKCE callback.
4. Restart the development server. Register a realtor, confirm their email, and log in. Authenticated dashboard access is checked on the server; API operations also independently validate the user.
5. Add a property, upload photos, save as draft, then change its status to published. It appears in public search. An inquiry submitted from its public page appears in the owner's Leads page.

No service-role secret is used by the web application. Never put one in a NEXT_PUBLIC variable.

## Optional database demo seed

Register a separate demo realtor first. Set `SEED_REALTOR_ID` to its Auth user UUID and set `SUPABASE_SERVICE_ROLE_KEY` locally. Run `npm run seed`. This privileged script refuses an account that already has properties; remove the service-role key from your environment afterward. It adds 24 properties, 3 clients, 2 leads and 2 tasks. Do not run demo seed on a real realtor account. It inserts sequentially; if interrupted, clean up that demo account before retrying. In-memory fixtures live in `lib/demo.js`.

## Structure

- `app/`: server-rendered marketplace routes, protected dashboard, Auth callback and API handlers.
- `components/`: reusable UI, forms, gallery, search and CRM state provider.
- `lib/supabase/`: browser/server clients; `proxy.js` refreshes cookies.
- `lib/validation.js`: shared allowlisted Zod input schemas.
- `lib/matching.js`: isolated deterministic matching suitable for a later scoring/AI adapter.
- `supabase/migrations/`: schema, indexes, RLS, inquiry RPC and private image bucket.
- `scripts/seed.mjs`: optional local seed utility.
- `tests/`: meaningful matching and input-boundary tests.

## MVP behavior and security

Public visitors can read only published properties. CRM clients, leads, tasks and full profiles are owner-only. A narrowly scoped public realtor RPC exposes only the realtor's display name, phone, biography and city, and only while that realtor has a published listing. Foreign keys include realtor IDs so tasks cannot reference another owner's client or lead. Profile edits are column-restricted; lead writes from clients may only change status.

Inquiries use a SECURITY DEFINER RPC with a fixed empty search_path. It resolves the owner from the published property, validates lengths/email, locks rate-limit keys, and limits submissions to 3/email/hour and 50/property/hour. Anonymous users cannot insert or read leads directly. The web endpoint additionally checks Origin, payload size and a honeypot. Email-based limits are an MVP deterrent, not comprehensive anti-bot protection; add a verified CAPTCHA and edge IP limits before high-traffic public launch.

Property images use a private 5 MB/image bucket (JPEG/PNG/WebP). Owners can upload into their UUID folder. Public read permission requires a published property referencing that object. Image requests obtain five-minute signed URLs. Previously issued URLs can remain usable until expiry after unpublishing. Removed or abandoned uploads are not automatically garbage-collected: schedule cleanup of unreferenced objects before long-term production operation.

Delete permanently removes a property; archive keeps it out of the marketplace. Related lead contact details remain, with property_id set null. Deleting clients unlinks their tasks. Account deletion cascades database CRM records; storage cleanup is a separate maintenance task.

The MVP supports **USD, AMD, EUR, and RUB** and m². Matching compares the same currency only; conversion is deliberately absent. Search defaults to USD, with a currency filter under More filters. UI is English with Armenian-capable system font fallbacks, UTF-8 text and locale-ready formatters. Armenian/Russian translations are not yet supplied.

Search uses server-side database filters, exact result counts, 9-item pagination, price/area/newest sorting and grid/list views. Rental searches distinguish daily, monthly and yearly prices. CRM client rental budgets currently match monthly listings only. CRM initial data is loaded per authenticated owner; Supabase API row limits apply. Dashboard state is optimistic only after a successful server response; reload to see external changes. Realtime collaboration and agency permissions are out of scope.

## Verify and deploy

Run `npm test` and `npm run build`, then `npm start`. Deploy using a Node-compatible Next.js host (for example Vercel or a Node server) and configure the two public Supabase variables plus NEXT_PUBLIC_SITE_URL for the canonical HTTPS origin. The requested Next.js server runtime is retained; this is not converted into a static Sites export. Configure the production HTTPS auth redirect before inviting users.

Live verification checklist with a configured Supabase project:

1. Register two users; verify each sees only their own CRM data, including direct API requests with foreign IDs.
2. Upload a draft photo: anonymous access must fail. Publish it and confirm public detail/photo access; unpublish and verify after signed URL expiry.
3. Submit a public inquiry, verify owner association and the email limit; confirm the other realtor cannot read or change it.
4. Create/edit/archive/delete properties, create/edit/delete clients and tasks, advance lead stages, and verify matching boundaries.
5. Confirm logout, session refresh, email confirmation, mobile layouts and expired sessions.

The migration is also executed in embedded PostgreSQL during npm test with minimal Auth/Storage schema fixtures. These tests verify RLS, foreign keys, ownership, inquiry rate limits, and image visibility. Hosted Supabase Auth, SMTP, cookie refresh and Storage service behavior still require live verification with your project credentials. Build/tests and demo route checks run independently.

## Demo image attribution

Illustrative interior photos are loaded from images.unsplash.com (photo IDs in lib/demo.js). They are not verified images of Armenian properties. Listing descriptions label them as illustrative and addresses as fictional. Replace with your own licensed listing photos before publishing real inventory. No generated photos are presented as actual properties.

## Account flows

The public header uses the same authentication state as the whole app. Logged-in users see their dashboard, property creation, profile, and logout; mobile navigation keeps login and registration accessible. Protected navigation preserves its original destination through login and registration. Other tabs respond to authentication changes, and cached CRM data is hidden as soon as the account changes.

Login accepts existing passwords without imposing the new-account minimum. Registration and password updates require matching passwords of at least 12 characters. Configure the same minimum in Supabase Auth settings. Forgot-password, email-confirmation resend (60-second UI cooldown), expired-link feedback, and password recovery pages are included. Supabase enforces actual request rate limits.

Allow the app's /auth/callback URL and callback query variants in Supabase Redirect URLs. Set NEXT_PUBLIC_SITE_URL to the canonical production HTTPS origin. For confirmation emails usable across browsers, use the following link in Supabase's Confirm signup template:

    {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email

For Reset password use:

    {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery

The standard ConfirmationURL template also works with the PKCE flow when the email is opened in the same browser that initiated the request. Token-hash links support opening in another browser. Deploy the site and configure production SMTP before inviting real users. Account forms are explicitly unavailable when Supabase is not configured; demo access never creates a real account.

Auth tests use mocked SDK responses to verify payloads, return destinations, validation, PKCE/token-hash callbacks, recovery and failures. They do not replace live tests against Supabase email delivery and authentication.

## September marketplace update

For the currently empty connected database, run supabase/setup.sql once in Supabase SQL Editor. It includes both migrations atomically and backfills profiles for accounts registered before setup. If the original migration was already applied, run only supabase/migrations/202609160002_marketplace.sql. Do not run the combined setup against an initialized project.

Registration now offers Homeowner and Realtor workspaces. Homeowners see listing management and inquiries; realtors also see clients and tasks. This is a presentation preference, not agency permission management. Both use the same strict owner-based RLS. Change workspace type in Profile.

Search is now database-filtered and paginated in groups of nine. Expanded filters cover keywords, sale/rent, type, location, currency, price, total rooms, bedrooms, bathrooms, living/plot area, floor range, excluded first/top floors, construction years, building type, condition, furnishing, self-declared owner/realtor, photos, and amenities. Rentals additionally support daily/monthly/yearly pricing, maximum deposit, pets, and availability. Prices from different rental periods are never compared in a rent search. A missing value does not satisfy a selected filter.

The property editor and database contain the corresponding fields. Search URLs preserve active filters for sharing/reloading. The new SQL migration is required before these filters work against live inventory. The header/auth flows remain shared across both account types.

## Languages

Armenian (default), Russian and English are available in the public header and workspace header. The selected language is saved in a one-year SameSite cookie, read on the server for initial HTML and metadata, and shared through React context. Switching preserves the current route and filters. UI labels, enum display names, feedback and accessibility labels are translated; stored enum values and user-authored listings, names and messages stay unchanged. Currency and date display follow the selected locale. Add UI copy to lib/messages.js.

## TOP advertising (prepared, payments not connected)

Core features remain free. Packages: AMD 1,200 / 3 days; AMD 1,500 / 7 days. Apply only supabase/migrations/202609190003_top.sql to the existing database. Do not re-run setup.sql. Owners can prepare pending orders; changing package cancels the previous pending order. Pending orders expire after 24 hours. There is no payment checkout or public activation endpoint yet. A provider adapter must verify a signed notification and independently query payment status, amount, currency and merchant/order binding before invoking service-only activate_top_order. Repeated receipt notifications must use the same reference; activation is idempotent. Store provider secrets only on the server. Failed/late payments and refunds require reconciliation before launching payment acceptance. Paid visibility expires by database time even without a cron job. Hidden/sold listings are excluded; their paid period does not pause. Up to three matching sponsored listings appear separately; ordinary sorting and pagination remain free and unchanged. Never present pending orders as paid.

Sponsored placement rotates on a five-minute database-time hash, so more than three paid listings can share available slots. Expiration is checked on each request; an already-open page refreshes on navigation/search. The site does not claim guaranteed impressions.
