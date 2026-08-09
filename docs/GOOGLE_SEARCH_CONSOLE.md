# Google Search Console — CreyvaPH

This guide covers verifying CreyvaPH with Google Search Console and confirming the SEO foundation (canonical URLs, sitemap, robots, structured data) once the site is deployed.

> **Important:** This document makes **no** claims that the site is currently indexed or ranked. "Not indexed" is the expected starting state until the owner submits it and Google crawls it. Nothing here should be phrased as a live ranking or traffic claim.

---

## 1. Prerequisites

- A live deployment with a public URL (see `RENDER_MIGRATION.md` — the production origin comes from `NEXT_PUBLIC_SITE_URL`, set before `npm run build`).
- The homepage serving the canonical / Open Graph / JSON-LD tags described in `BRAND.md` §1a.
- `https://` served by the deployment (Render provides this automatically for the auto-generated URL).

## 2. Add the property

1. Go to [Google Search Console](https://search.google.com/search-console).
2. Add a new **property** for the exact public origin of the deployment (e.g. `https://creyvaph-lms.onrender.com` or the custom domain once configured).
3. Choose a **verification method**. Recommended: **HTML tag verification** or **HTML file upload**.
   - HTML file upload: Google gives you a file named like `google<code>.html`; put it in `public/` and deploy.
   - DNS verification: add the `TXT` record at your DNS provider if a custom domain is used.
   - Note: the app's metadata does **not** invent a verification meta tag, so use one of the standard upload/DNS methods.

## 3. Submit the sitemap

1. In Search Console, open **Sitemaps**.
2. Submit `sitemap.xml`.
3. Confirm the sitemap URL reported matches the origin and lists `/`, `/about`, `/courses`, `/credits`, and the published `/courses/<slug>` pages.
4. Note: the sitemap is generated at runtime from published courses (`src/app/sitemap.ts`), so it stays in sync with the database without a rebuild.

## 4. Verify crawling & robots

- `robots.txt` is generated from `src/app/robots.ts`:
  - Public marketing pages are allowed (`/`, `/about`, `/courses`, `/credits`).
  - Auth-gated app pages (`/admin`, `/api`, `/dashboard`, `/learn`, `/networking`, `/playground`, `/games`, `/projects`, `/certificates`, `/profile`, `/missions`, `/achievements`, `/leaderboard`, `/progress`, `/study-plan`, `/store`, `/prompts`, `/practice`, `/room`, `/whats-new`, `/worlds`, `/onboarding`) are disallowed.
- Use **URL Inspection** in Search Console to ask Google to crawl the homepage and a course page, then check the rendered canonical and title.
- If a "duplicate without user-selected canonical" warning appears, confirm each public page emits its own `<link rel="canonical">` (set in `src/app/layout.tsx` + the marketing pages).

## 5. Structured data check

- The root layout emits JSON-LD for an `Organization` and a `WebSite` (`src/app/layout.tsx`). It intentionally contains **no** invented social profiles (`sameAs`), logo URLs, ratings, or review claims.
- Validate with the [Rich Results Test](https://search.google.com/test/rich-results) or the [Schema Markup Validator](https://validator.schema.org/) using the production URL.

## 6. What is NOT claimed

- CreyvaPH is not "the #1" or "top" anything on Google.
- It is not verified, indexed, or ranked as a matter of record — indexing only happens after submission and crawling.
- No custom domain, trademark registration, or official Google partnership is assumed. Verify each once it actually exists.

## 7. Owner-only notes

- Keep verification ownership with the site owner's Google account.
- If a custom domain is added later, add a new property for it and update `NEXT_PUBLIC_SITE_URL` + `APP_URL`, then re-deploy (the value is baked in at build time).
- Use Search Console's **Enhancements** tabs only after the site has been crawled; do not report results before they exist.
