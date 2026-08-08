# CodeSphere

**Educational Technology Platform**
**Created & Led by Jhon Xyryll Samoy**
**© 2026 CodeSphere**

CodeSphere is an educational technology platform designed to strengthen the technical and digital skills of students through interactive programming lessons, hands-on exercises, gamified learning, and virtual networking laboratories.

---

## Description

CodeSphere turns passive technical education into hands-on practice. Students learn by doing — writing and running real code in a live playground, completing auto-graded exercises and quizzes, building portfolio projects, and experimenting in a full virtual networking laboratory. Progress, XP, streaks, achievements and certificates keep learning motivating, while a smart study plan adapts to each learner's schedule.

## Mission

> "CodeSphere aims to make technical education more practical, accessible, and engaging by helping students develop programming, web development, networking, and digital technology skills through interactive learning and hands-on experimentation."

## Vision

A world where every student can build practical technical skills — not just read about them — by learning through doing in a safe, honest, and engaging environment.

## Core Features

- **Interactive lessons** — Structured courses with concept blocks, examples, and inline practice.
- **Live code playground** — Write and run HTML, CSS and JavaScript directly in the browser.
- **Auto-graded exercises & quizzes** — Instant feedback with precise hints and test cases.
- **Gamified progression** — XP, levels, streaks, badges and certificates.
- **Real projects** — Portfolio-style projects with submissions and review.
- **Virtual networking lab** — A custom network simulator with devices, cables, packets, routing and troubleshooting missions.
- **Smart study plan** — A deterministic algorithm builds a daily plan from progress, mistakes and available time.
- **PWA support** — Installable, app-like experience on mobile and desktop.

## Creator

CodeSphere was conceived and led by **Jhon Xyryll Samoy** as a student-driven educational technology project focused on helping learners build practical technical skills through hands-on digital experiences.

- **Founder & Lead Developer** — Jhon Xyryll Samoy
- **Head of Team Xy**
- **ICT Club President 2026**

## Technology Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js (App Router) |
| Language | TypeScript |
| UI | React 19, Tailwind CSS v4, lucide-react |
| Database | PostgreSQL (Prisma ORM, `@prisma/adapter-pg`) |
| Auth | jose (JWT sessions), bcryptjs |
| Code editing | Monaco Editor |
| Data fetching | TanStack Query |
| State | Zustand |
| Animation | Framer Motion |
| Charts | Recharts |
| Validation | Zod |
| Sandboxing | jsdom + sanitize-html |

## Development Approach

CodeSphere is built around honest, deterministic learning:

- Exercises are graded against clear, defined outcomes — no guesswork.
- The study planner and networking engine are deterministic and testable.
- Security and responsible technology use are embedded in the curriculum (e.g. the cyber-safety games and safe lab environments).

## Project Structure

```
src/
  app/
    (app)/        Authenticated application (dashboard, learn, networking, playground, …)
    (auth)/       Login and registration
    (marketing)/  Public site (landing, about, credits, courses)
    api/          Route handlers (learn, networking, profile, progression, …)
  components/
    learning/     Lesson blocks, code editor, course rail
    netlab/       Networking simulation UI (canvas, tools, packet lab)
    marketing/    Public-facing components (about content, course cards)
    layout/       Shell, sidebar, header, footer, mobile navigation
    ui/           Design-system primitives
  lib/
    brand.ts      Product identity constants
    constants.ts  Platform-wide constants
    net/          Networking simulation engine
    engine/       XP, levels and progression
    services/     Learning services (progress, enrollment, …)
prisma/
  schema.prisma   Database schema
```

## Getting Started

```bash
npm install
# configure DATABASE_URL (PostgreSQL) and AUTH_SECRET
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Commands

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — production server
- `npm run lint` — ESLint
- `npm run icons` — regenerate PWA assets

## Credits

- **Product** — CodeSphere
- **Creator & Project Lead** — Jhon Xyryll Samoy (Founder & Lead Developer · Head of Team Xy · ICT Club President 2026)
- **Technology** — see the in-app [Credits](/credits) page or the table above.

## Copyright & Ownership

```
CodeSphere
Copyright © 2026 Jhon Xyryll Samoy.
All rights reserved.
```

- **Project:** CodeSphere
- **Creator:** Jhon Xyryll Samoy
- **Role:** Founder & Lead Developer (Head of Team Xy · ICT Club President 2026)
- **Copyright year:** 2026

CodeSphere is an educational technology platform developed as a student-driven project focused on practical programming, web development, networking, and digital technology education.

### Original project materials

The following are original project-owned materials created for CodeSphere: the application source code under `src/`, the original UI/UX design, educational content (lessons, exercises, quizzes, games), the networking simulation architecture and logic, project documentation, and original graphics and branding. Seed data in `prisma/seed.ts` contains the original curriculum content.

### AI-assisted development disclosure

CodeSphere was developed using AI-assisted software development tools alongside human-led product design, architecture, testing, and development direction. The repository may contain human-created original work, AI-assisted work, third-party code, and open-source dependencies.

### Third-party software notice

CodeSphere is built on widely used open-source technologies — including Next.js, React, TypeScript, Prisma, Tailwind CSS, Zustand, TanStack Query, and others — which remain the property of their respective authors and are used under their own licenses. CodeSphere does not claim ownership over third-party libraries, frameworks, icons, fonts, or other external resources. See [`docs/THIRD_PARTY.md`](docs/THIRD_PARTY.md) for the full list with versions, licenses, and sources.

### Open-source dependency notice

Third-party dependencies are distributed under their own open-source licenses (MIT, Apache-2.0, BSD-3-Clause, ISC, etc.), which remain in effect for those packages. See the license files inside each package under `node_modules/` and the [`docs/THIRD_PARTY.md`](docs/THIRD_PARTY.md) table.

### Copyright vs. trademark

Copyright protects original expression and is claimed above for CodeSphere materials. Trademark registration is separate from copyright protection. The CodeSphere name is not claimed as a registered trademark unless formal registration is completed.

### Documentation

For the full ownership and development record, see:

- [`docs/COPYRIGHT.md`](docs/COPYRIGHT.md) — complete copyright and ownership statement
- [`docs/THIRD_PARTY.md`](docs/THIRD_PARTY.md) — third-party components and licenses
- [`docs/DEVELOPMENT_HISTORY.md`](docs/DEVELOPMENT_HISTORY.md) — maintainable development history
- [`docs/DEVELOPMENT_RECORD.md`](docs/DEVELOPMENT_RECORD.md) — Git-based development evidence

## License

All rights reserved. CodeSphere and its content are © 2026 Jhon Xyryll Samoy. No open-source license is applied to the project's original materials. Third-party dependencies retain their own licenses (see above).
