# CreyvaPH Copyright & Ownership

> **Rebrand note:** The project was formerly known as **CodeSphere** and was renamed to **CreyvaPH**. This document uses the current brand name. Historical records (e.g. `DEVELOPMENT_HISTORY.md`, `DEVELOPMENT_RECORD.md`) and the original Git commit messages reference the former name.

**Project:**
CreyvaPH

**Creator:**
Jhon Xyryll Samoy

**Copyright:**
© 2026 Jhon Xyryll Samoy

**Full copyright notice:**

```
CreyvaPH
Copyright © 2026 Jhon Xyryll Samoy.
All rights reserved.
```

> CreyvaPH is an educational technology platform developed as a student-driven project focused on practical programming, web development, networking, and digital technology education.

---

This document establishes the ownership and attribution record for CreyvaPH. It describes which materials are project-owned, which are third-party, and how the project has been developed. It is intended as supporting documentation should the creator choose to pursue formal copyright registration or other intellectual-property protection in the future.

> **Note:** The copyright notice above reflects original authorship as it exists today. It is not a claim of formal legal registration, and no registration number or certificate is claimed here. Trademark registration is separate from copyright protection.

---

## 1. Original Project Materials

The following categories contain materials created for CreyvaPH and are owned by the project:

- **Project concept and product identity** — the CreyvaPH name, mission, vision, and platform definition
- **Branding and original graphics** — the CreyvaPH visual identity, logo assets, and PWA iconography created for the project (see `public/` and `scripts/generate-pwa-assets.mjs`)
- **Architecture and technical design** — the overall application architecture, data model (see `prisma/schema.prisma`), and engineering decisions
- **Original source code** — application code written for CreyvaPH under `src/` (see Section 2)
- **Original UI/UX design** — layout, component design, and interaction patterns created for CreyvaPH (see Section 3)
- **Educational content** — lessons, exercises, quizzes, and course material (see Section 4)
- **Networking simulation engine** — the virtual network simulator logic (see Sections 5–6)
- **Games and exercises** — interactive learning activities (see Section 7)
- **Documentation** — this and other project documentation (see Section 8)

Original materials are created specifically for CreyvaPH. Not every file in the repository is original to CreyvaPH; third-party and open-source components are identified separately in Section 10 and in `THIRD_PARTY.md`.

## 2. Source Code

The application source code under `src/` is original project-owned material, including:

- `src/app/` — Next.js App Router pages and API route handlers
- `src/components/` — React components built for CreyvaPH
- `src/lib/` — shared libraries, business logic, services, and utilities

The following are **not** original CreyvaPH materials and remain the property of their respective owners:

- Third-party dependencies installed under `node_modules/`
- Generated output such as the Prisma-generated client under `src/generated/`
- Build output directories
- The `next` framework itself and its tooling

## 3. Original UI/UX Design

The user interface and user experience design — including the component design system, layout structure, navigation patterns, visual styling, dark/light theming, and the overall look and feel of the platform — are original project-owned material created for CreyvaPH.

This does not extend to third-party design assets or libraries (for example, icon sets and styling utilities), which are attributed separately.

## 4. Original Educational Content

CreyvaPH's learning content is original to the project, including:

- Course structures, modules, and lessons
- Concept blocks and examples
- Auto-graded exercises and their test cases
- Quizzes and practice questions
- Hints and feedback text
- Study-plan curriculum organization

Seed data in `prisma/seed.ts` contains this original curriculum content.

## 5. Networking Simulation Architecture

The virtual networking laboratory is a core original component of CreyvaPH. Its architecture — including device models, link/cable models, packet flow, network simulation state management, and mission/troubleshooting design — is original project-owned material (see `src/lib/net/`).

## 6. Simulation Logic

The simulation and grading logic — routing, cable and device behavior, packet handling, and the deterministic rules used to evaluate networking missions and exercises — is original project-owned material.

## 7. Original Games and Exercises

Interactive games and educational exercises built for CreyvaPH — their game design, level definitions, grading rules, and content — are original project-owned material (see the games and learn modules under `src/`).

## 8. Documentation

Project documentation, including this file, `THIRD_PARTY.md`, `DEVELOPMENT_HISTORY.md`, `DEVELOPMENT_RECORD.md`, and the `README.md`, is original project-owned material unless otherwise noted.

## 9. Original Graphics and Branding

Original graphics created for CreyvaPH — including the CreyvaPH logo, PWA icons, and any in-app artwork — are project-owned. Branding assets are generated from project scripts in `scripts/` and stored under `public/`.

**Note:** Any icon glyphs sourced from icon libraries (e.g. lucide-react) remain the property of their respective authors and are used under their license terms.

## 10. Third-Party Components

CreyvaPH is built on widely used open-source technologies and libraries. These remain the property of their respective authors and are not claimed as CreyvaPH material. Major third-party components include (not exhaustive):

- Next.js (framework)
- React / React DOM (UI library)
- TypeScript (language)
- Prisma ORM + `@prisma/adapter-pg` (database access)
- Tailwind CSS (styling)
- Zustand, TanStack Query (state / data fetching)
- Monaco Editor + `@monaco-editor/react` (code editing)
- Framer Motion, Recharts, lucide-react, zod, jose, bcryptjs, pg, marked, sanitize-html, jsdom, and others

See `THIRD_PARTY.md` for the full list with versions, licenses, sources, and purposes.

## 11. Open-Source Licenses

CreyvaPH and its original materials are held under an all-rights-reserved copyright notice (see the notice at the top of this document). The project currently does **not** publish its own open-source license.

Third-party dependencies are distributed under their own open-source licenses (e.g. MIT, Apache-2.0, BSD-3-Clause, ISC), which remain in effect for those packages. See the `LICENSE` files within each package under `node_modules/` and the `THIRD_PARTY.md` table for details.

## 12. AI-Assisted Development Disclosure

CreyvaPH was developed using AI-assisted software development tools alongside human-led product design, architecture, testing, and development direction. This means parts of the implementation were produced with AI assistance under the guidance of the project creator.

For clarity, the repository may contain:

- **Human-created original work** — product decisions, design, and direction by Jhon Xyryll Samoy
- **AI-assisted work** — code and content produced with AI tooling under human direction
- **Third-party code** — code and assets owned by their respective authors
- **Open-source dependencies** — packages distributed under open-source licenses (see `THIRD_PARTY.md`)

This disclosure is intended to be transparent. AI-generated material is not automatically owned by the creator; ownership applies only to work the creator has the legal right to claim.

## 13. Development History

The development history of CreyvaPH is tracked through the project's Git repository and summarized in `DEVELOPMENT_HISTORY.md`. A versioned record of milestones, features, and commits is maintained in `DEVELOPMENT_RECORD.md`.

---

**Copyright © 2026 Jhon Xyryll Samoy. All rights reserved.**
