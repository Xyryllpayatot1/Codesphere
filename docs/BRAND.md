# CreyvaPH — Brand Reference

**Product name:** CreyvaPH
**Created & led by:** Jhon Xyryll Samoy
**Copyright:** © 2026 CreyvaPH
**Former name:** CodeSphere (used until the rebrand)

This document is the single source of truth for the brand and for identifiers that must stay stable so the rebrand never resets user data.

---

## 1. User-facing branding

- **Product name:** `CreyvaPH`
- **Default metadata:** `CreyvaPH — Interactive Technology Learning Platform`
- **PWA name / short_name:** `CreyvaPH` (see `src/app/manifest.ts`)
- **Tagline:** "Create. Learn. Evolve."
- **Meta description:** "CreyvaPH is a learning platform for programming, web development, and networking. Lessons are interactive, exercises are hands-on, and you practice in a live browser — no installs, no video-only lectures." (see `src/lib/brand.ts` → `BRAND_DESCRIPTION`)
- **Footer/About links:** "About CreyvaPH"
- **Search dialog:** "Search CreyvaPH"

### Where the brand lives in code

- `src/lib/constants.ts` — `APP_NAME = "CreyvaPH"`
- `src/lib/brand.ts` — brand identity strings (tagline, description, mission, vision, creator notes)
- `src/app/layout.tsx` — metadata + document title template + JSON-LD
- `src/app/manifest.ts` — PWA manifest
- `src/components/shared/logo.tsx` — wordmark (renders `APP_NAME`)

## 1a. SEO / public URLs

- The public origin is **not hardcoded**. It comes from the `NEXT_PUBLIC_SITE_URL` environment variable (set before `npm run build`; local dev falls back to `http://localhost:3000`). See `src/lib/site-url.ts`.
- `src/app/sitemap.ts` — dynamic sitemap of public routes (`/`, `/about`, `/courses`, `/credits` + published course pages).
- `src/app/robots.ts` — allows public marketing pages and disallows auth-gated app pages (`/admin`, `/api`, `/dashboard`, `/learn`, `/networking`, `/playground`, `/games`, `/projects`, `/certificates`, `/profile`, `/missions`, `/achievements`, `/leaderboard`, `/progress`, `/study-plan`, `/store`, `/prompts`, `/practice`, `/room`, `/whats-new`, `/worlds`, `/onboarding`).
- Canonical + Open Graph/Twitter metadata live in the root layout and per marketing page (`/`, `/about`, `/courses`, `/courses/[slug]`, `/credits`).
- JSON-LD (Organization + WebSite) is emitted in the root layout. It makes no claims that are not true (no invented social profiles, no logo, no registered-trademark claims).
- See `docs/GOOGLE_SEARCH_CONSOLE.md` for the verification workflow.

## 2. Internal identifiers (brand-prefixed)

These are wire protocols / storage keys. They were renamed together on every reader + writer, so the change is internally consistent:

| Identifier | Old | New |
| --- | --- | --- |
| Lesson progress CustomEvent | `codesphere:progress` | `creyvaph:progress` |
| Theme preference cookie | `codesphere_theme` | `creyvaph_theme` |
| Realtime room hub global | `__codesphereRoomHub` | `__creyvaphRoomHub` |
| Postgres connection `application_name` | `codesphere` | `creyvaph` |
| Health check `service` value | `codesphere` | `creyvaph` |
| PWA service-worker cache | `codesphere-v1` | `creyvaph-v1` |

## 3. Deliberately kept stable (do not rename)

These still contain `codesphere`. Renaming any of them would **log users out, orphan accounts, or orphan gamification data**. They are internal/technical and never shown as the product name:

| Identifier | File | Why it is kept |
| --- | --- | --- |
| `SESSION_COOKIE = "codesphere_session"` | `src/lib/jwt.ts` | Renaming invalidates every active session |
| `AUTH_SECRET` value (`codesphere-dev-secret-2026` in `.env`) | `.env` (dev) | Secret value; changing signs users out and is not branding |
| `admin@codesphere.dev`, `demo@codesphere.dev` | `prisma/seed.ts` | Account emails are the upsert identity — changing them orphans the existing accounts |
| Achievement key `worlds-mastered-10` ("Grandmaster of CreyvaPH") | `prisma/seed.ts` | Key is the unique identifier for a user-earned achievement |
| Title key `codesphere-legend` ("CreyvaPH Legend") | `prisma/seed.ts` | Key is the unique identifier for a user-owned title |
| Git repo/remote name (`Codesphere`) | repository | Git history is never rewritten |

If a future rename of these is ever required, it must ship with a data migration (e.g. rewrite `User.equipped`, `UserAchievement` rows, `Achievement`/`Title` keys, and cookie/session invalidation for all users).

## 4. Historical records (kept under the old name)

- `docs/DEVELOPMENT_HISTORY.md`, `docs/DEVELOPMENT_RECORD.md` — development history (a rebrand milestone entry was added; past entries are unchanged)
- Release entries in `prisma/seed.ts` (What's New) — release titles published under the old brand remain as historical record
- `scratch/` — throwaway analysis files

## 5. Renaming checklist

- [x] `APP_NAME` + brand identity strings
- [x] All metadata titles/descriptions + PWA manifest
- [x] All UI copy (About, footer, search, playground, certificates, What's New, release views)
- [x] File header comments / copyright blocks
- [x] Internal identifiers above (renamed together)
- [x] Docs + README
- [x] `render.yaml` service name + removed hardcoded old Render URL (see `RENDER_MIGRATION.md`)
- [x] `package.json` / `package-lock.json` package name (`creyvaph-lms`)
- [x] SEO foundation: `NEXT_PUBLIC_SITE_URL`, canonical/OG/Twitter metadata, `sitemap.ts`, `robots.ts`, JSON-LD
- [x] Final brand sweep — remaining `codesphere` matches are only the deliberate keeps in section 3 (verified after `npm run lint` + `npm run build`) plus historical records in section 4
