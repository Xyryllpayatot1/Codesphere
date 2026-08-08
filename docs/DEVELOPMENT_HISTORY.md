# CodeSphere Development History

This document records the development history of CodeSphere. It is intended to be **maintained over time** as the project evolves.

> **Guideline:** only add entries that can be verified from the repository, commit history, or actual project milestones. Do not invent dates or events.

## Legend

- Each major section covers a development phase.
- Bullet items under a phase describe the work that was done.
- Dates are recorded only when known (e.g. from the Git commit history).

---

## 2026

### Initial concept

- CodeSphere conceived as an educational technology platform: practical programming, web development, networking, and digital technology education.
- Product identity established (mission, vision, brand).

### Project architecture

- Next.js App Router project initialized with TypeScript.
- Prisma + PostgreSQL (Supabase Postgres via `@prisma/adapter-pg`) data layer.
- Deterministic learning design: exercises graded against defined outcomes, testable study planner and networking engine.

### Learning platform

- Interactive lessons with concept blocks, examples, and inline practice.
- Course, module, and lesson content structure.
- Auto-graded exercises and quizzes with hints and test cases.

### Course system

- Course catalog and enrollment flow.
- Content stored as curriculum seed data (see `prisma/seed.ts`).

### Gamification

- XP, levels, streaks, achievements, titles, and leaderboard progression.
- Certificates and store/missions progression systems.

### Networking Laboratory

- Virtual networking simulation engine (`src/lib/net/`): devices, cables, packets, routing.
- Networking missions and troubleshooting projects with auto-grading.

### Live code playground & projects

- Browser-based code playground using Monaco Editor with in-browser sandboxing.
- Project submissions with review workflow.

### Mobile / PWA experience

- Mobile-first PWA support: bottom navigation, learn hub, dashboard, touch-first Netlab.
- PWA assets generation script (`scripts/generate-pwa-assets.mjs`).

### Performance & reliability

- Lazy Prisma initialization and force-dynamic routes so builds work without a live `DATABASE_URL`.
- Prisma config tolerant of a missing `DATABASE_URL` at build time.
- Parallelized page queries; removed duplicate course-structure query.
- Health-check endpoints (`/health`, `/api/health`) for uptime monitoring.

### Deployment preparation

- Render blueprint (`render.yaml`) with Supabase environment configuration.
- Switched from SQLite to Postgres adapter; removed SQLite dependencies.

---

## How to maintain this file

When new milestones land, add them under the current year with a short, factual bullet. Update `DEVELOPMENT_RECORD.md` with the corresponding Git commits. Keep entries verifiable — link each milestone to commits or release tags where possible.

**Copyright © 2026 Jhon Xyryll Samoy. All rights reserved.**
