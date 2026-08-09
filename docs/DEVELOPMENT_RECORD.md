# CreyvaPH Development Record

This file documents how the project's Git history can be used as development evidence, and records the repository's creation and milestones. All dates below are read directly from the repository's commit history.

> **Note:** The project was renamed from **CodeSphere** to **CreyvaPH** after the commits below were recorded. The original commit messages and repository name are preserved as-is because Git history is never rewritten; they reference the former brand.

## Repository

- **Repository:** `Codesphere`
- **Remote:** https://github.com/Xyryllpayatot1/Codesphere.git
- **Branch:** `main`
- **First commit timestamp:** 2026-08-08
- **VCS:** Git (no history has been rewritten; commits are preserved as originally created)

## How Git history serves as development evidence

The commit history provides a verifiable, chronological record of when work was done and what it contained:

- Each commit records its author, timestamp, message, and the exact diff of files changed.
- `git log` shows the full timeline; `git show <hash>` reveals the content of any individual commit.
- File-level attribution can be inspected with `git log --follow -- <path>`.
- This history can be used as supporting evidence of ongoing development activity.

## Commits

| Hash | Date | Summary |
| --- | --- | --- |
| `1736cce` | 2026-08-08 | Initial commit: CodeSphere LMS with networking lab and Supabase Postgres (238 files) |
| `88f0927` | 2026-08-08 | Fix seed to use Postgres adapter for Supabase |
| `14db9a0` | 2026-08-08 | Drop SQLite deps and add engines for Render deployment |
| `de1eb1d` | 2026-08-08 | Add Render blueprint |
| `3f489f2` | 2026-08-08 | Make prisma config tolerant of missing DATABASE_URL at build time |
| `035ee1f` | 2026-08-08 | Lazy Prisma init and force-dynamic routes so build works without env |
| `35edc8c` | 2026-08-08 | Add mobile/PWA experience: bottom nav, learn hub, dashboard, touch-first Netlab |
| `55d618a` | 2026-08-08 | Mobile cable-type selection and course page Prisma reliability fixes |
| `d55cf2d` | 2026-08-08 | Add minimal `/health` and `/api/health` endpoints for uptime monitoring |
| `f025d84` | 2026-08-08 | Parallelize page queries, remove duplicate structure query and dashboard transaction |

## Major development milestones

- **Initial platform** — LMS foundation with learning system, networking lab, and Supabase Postgres (`1736cce`)
- **Deployment readiness** — Postgres adapter switch, Render blueprint, env-tolerant builds (`88f0927` → `035ee1f`)
- **Mobile / PWA experience** — bottom nav, learn hub, touch-first Netlab (`35edc8c`, `55d618a`)
- **Operational tooling** — health endpoints, query parallelization (`d55cf2d`, `f025d84`)
- **Rebranding** — product renamed from CodeSphere to CreyvaPH (user-visible branding, metadata, documentation)

## Release versions

No formal release tags have been created yet. The current development version tracked in `package.json` is **v0.1.0** — an early, pre-production stage. Formal releases will be tagged here as they occur.

**Copyright © 2026 Jhon Xyryll Samoy. All rights reserved.**
