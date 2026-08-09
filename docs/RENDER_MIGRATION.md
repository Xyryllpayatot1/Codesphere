# Render Migration Guide — CodeSphere → CreyvaPH

The app previously deployed as **`codesphere-lms`** at **`https://codesphere-lms.onrender.com`**. As part of the rebrand to **CreyvaPH**, the deployment is moving to a new Render service named **`creyvaph-lms`**.

This guide deliberately does **not** hardcode the new public URL. Render generates the production URL for a new service automatically (typically `https://creyvaph-lms.onrender.com`), and the correct value is the live `RENDER_EXTERNAL_URL` your service reports. If a custom domain is added later, update `APP_URL` in the Render dashboard to match.

---

## What changed in `render.yaml`

- Service `name` → **`creyvaph-lms`**
- Header comment → "Render Blueprint — CreyvaPH LMS"
- The hardcoded `APP_URL` value (`https://codesphere-lms.onrender.com`) was **removed** and replaced with the Render-provided environment variable:

```yaml
- key: APP_URL
  value: ${RENDER_EXTERNAL_URL}
```

`${RENDER_EXTERNAL_URL}` is auto-set by Render to the service's public URL, so the blueprint no longer pins an outdated domain.

> Note: the Supabase `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` values and the `sync:false` secrets (`DATABASE_URL`, `AUTH_SECRET`) are unchanged. The anon key in the file is a public key by Supabase design; `DATABASE_URL` and `AUTH_SECRET` are filled in once per service in the Render dashboard.

## New: `NEXT_PUBLIC_SITE_URL` (required for SEO)

The app uses `NEXT_PUBLIC_SITE_URL` for canonical URLs, Open Graph, the sitemap, `robots.txt`, and JSON-LD (see `src/lib/site-url.ts`). `NEXT_PUBLIC_*` variables are **inlined at build time**, so:

1. **Set it as a build-time environment variable** in the Render service (Environment tab → add `NEXT_PUBLIC_SITE_URL` with the service's public origin, e.g. `https://creyvaph-lms.onrender.com`).
2. Do **not** rely on the `sync:false` first-deploy fill pattern for this variable — if it is empty at build time, the built output falls back to `http://localhost:3000` for all canonical/OG/sitemap URLs.
3. If a custom domain is added, update `NEXT_PUBLIC_SITE_URL` (and `APP_URL`) and **re-deploy**, because the value is baked into the build.

## Steps to migrate

1. **Create the new service.** In the Render Dashboard → New → Blueprint, point at this repo. The blueprint now provisions a web service named `creyvaph-lms`.
2. **Set secrets.** After the first (failing) deploy, under the new service's Environment tab, fill in `DATABASE_URL` and `AUTH_SECRET` (`sync:false` — they are not in this file).
3. **Set `NEXT_PUBLIC_SITE_URL`** to the service's public origin **before** the next build (see above). Verify it appears in the service's build logs as a `NEXT_PUBLIC_` value.
4. **Confirm `APP_URL`.** It is derived from `RENDER_EXTERNAL_URL`. Verify the value shown in the service dashboard is the new URL (no `codesphere-lms` prefix).
5. **Verify health.** After deploy, check `GET <new-url>/health` and `GET <new-url>/api/health` — both return `{ "ok": true, "service": "creyvaph" }`.
6. **Verify SEO.** `GET <new-url>/sitemap.xml` returns the sitemap with the correct origin; `GET <new-url>/robots.txt` lists the correct `Sitemap:` line; the homepage `<head>` has the canonical, Open Graph, and JSON-LD tags using the same origin.
7. **Cut over.** Update DNS / bookmarks / any external links from the old `codesphere-lms.onrender.com` URL to the new one.
8. **Decommission the old service** once the new service is verified (optional).

## Notes

- The app is **stateless** except for the database. The old `codesphere-lms` service held no user data locally, so nothing needs to be copied from it.
- Sessions, accounts, achievements and titles survive the move because the identifiers listed in `BRAND.md` §3 were kept stable, and `AUTH_SECRET` must be set to the **same value** as before if you want existing sessions to remain valid after the move. If you set a new `AUTH_SECRET`, existing sessions are invalidated (users re-login) — the data itself is preserved.
- The realtime room hub is in-memory per server process; switching services only affects in-progress rooms, not stored data.
