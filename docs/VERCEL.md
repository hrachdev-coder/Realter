# Vercel deployment

1. In Vercel choose Add New → Project and import hrachdev-coder/Realter, branch main. Framework: Next.js, root: ./, Node.js: 22.x. Leave output directory automatic.
2. Import the local .env.vercel.local file into Production Environment Variables. It contains the existing Supabase URL, publishable key, server service key and analytics secret. It is intentionally ignored by Git. Do not paste these values into issues or chat. Do not expose the service key or analytics secret with a NEXT_PUBLIC_ prefix.
3. Add NEXT_PUBLIC_SITE_URL using the actual production HTTPS domain, without a trailing slash (for example https://YOUR-ACTUAL-PROJECT.vercel.app). Do not copy localhost. If the domain is assigned only after the first deployment, add this variable then redeploy before accepting users.
4. In Supabase → Authentication → URL Configuration, set Site URL to the same production domain and allow its /auth/callback URL in Redirect URLs. Keep the localhost callback only if local development is still needed.
5. Deploy. After any environment change, redeploy. Check /api/health returns {"status":"ok"}; test registration, confirmation, login, password reset, published listings, images, favorites, owner/realtor access and administrator access.

The current Supabase database already has the migrations. Do not rerun setup.sql for this deployment. Vercel hosting does not configure Supabase SMTP or enable payments. Custom SMTP and payment-provider integration remain separate tasks. Use a separate Supabase project and separate credentials for Preview deployments; do not attach production service credentials to untrusted preview code.

Official reference: https://vercel.com/docs/environment-variables
