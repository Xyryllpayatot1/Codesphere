# CreyvaPH — Third-Party Software Notice

CreyvaPH is built using open-source technologies and libraries. These components remain the property of their respective authors and are used under their own license terms. CreyvaPH does **not** claim ownership over any of the software listed below.

Versions listed are the versions resolved in this project's `package.json` / `package-lock.json`. License names are those declared by each package. The full license texts ship inside each package under `node_modules/` and are authoritative.

---

## Frameworks & Languages

| Name | Version | License | Official source | Purpose in CreyvaPH |
| --- | --- | --- | --- | --- |
| Next.js | 16.3.0 | MIT | https://nextjs.org / https://github.com/vercel/next.js | Application framework (App Router, server components, routing, API routes, PWA build) |
| React / React DOM | 19.2.8 | MIT | https://react.dev / https://github.com/facebook/react | UI rendering library |
| TypeScript | 5.9.3 | Apache-2.0 | https://www.typescriptlang.org | Typed JavaScript used across the codebase |
| Tailwind CSS | 4.3.3 | MIT | https://tailwindcss.com | Utility-first CSS styling |
| ESLint | 9.39.5 | MIT | https://eslint.org | Static linting (`npm run lint`) |

## Database & ORM

| Name | Version | License | Official source | Purpose in CreyvaPH |
| --- | --- | --- | --- | --- |
| Prisma ORM | 7.9.1 | Apache-2.0 | https://www.prisma.io | Schema management, migrations, and the Prisma client |
| @prisma/client | 7.9.1 | Apache-2.0 | https://www.prisma.io | Type-safe database client |
| @prisma/adapter-pg | 7.9.1 | Apache-2.0 | https://www.prisma.io | Postgres driver adapter for Prisma 7 |
| pg | 8.22.0 | MIT | https://node-postgres.com | PostgreSQL connection (Supabase Postgres) |

## State, Data & Logic

| Name | Version | License | Official source | Purpose in CreyvaPH |
| --- | --- | --- | --- | --- |
| Zustand | 5.0.14 | MIT | https://zustand-demo.pmnd.rs | Client-side state management (playground, netlab) |
| @tanstack/react-query | 5.101.4 | MIT | https://tanstack.com/query | Server-state fetching/caching on the client |
| zod | 4.4.3 | MIT | https://zod.dev | Runtime input validation |
| class-variance-authority | 0.7.1 | Apache-2.0 | https://github.com/joe-bell/cva | Variant-based styling primitives |
| clsx | 2.1.1 | MIT | https://github.com/lukeed/clsx | Conditional class-name composition |
| tailwind-merge | 3.6.0 | MIT | https://github.com/dcastil/tailwind-merge | Merging conflicting Tailwind classes |

## Auth & Security

| Name | Version | License | Official source | Purpose in CreyvaPH |
| --- | --- | --- | --- | --- |
| jose | 6.2.8 | MIT | https://github.com/panva/jose | JWT session signing/verification |
| bcryptjs | 3.0.3 | BSD-3-Clause | https://github.com/dcodeIO/bcrypt.js | Password hashing |

## Code Editing & Sandboxing

| Name | Version | License | Official source | Purpose in CreyvaPH |
| --- | --- | --- | --- | --- |
| monaco-editor | 0.56.0 | MIT | https://microsoft.github.io/monaco-editor | Code editor engine (live playground) |
| @monaco-editor/react | 4.7.0 | MIT | https://github.com/suren-atoyan/monaco-react | React wrapper for Monaco Editor |
| jsdom | 30.0.1 | MIT | https://github.com/jsdom/jsdom | In-browser sandbox for running user code |
| sanitize-html | 2.17.6 | MIT | https://github.com/apostrophecms/sanitize-html | Sanitizing user-provided HTML |

## UI, Icons & Charts

| Name | Version | License | Official source | Purpose in CreyvaPH |
| --- | --- | --- | --- | --- |
| lucide-react | 1.28.0 | ISC | https://lucide.dev | Icon set used throughout the UI |
| framer-motion | 13.0.0 | MIT | https://motion.dev | Animations and transitions |
| recharts | 3.10.1 | MIT | https://recharts.org | Charts (dashboard, analytics) |
| @radix-ui/react-slot | 1.3.3 | MIT | https://www.radix-ui.com | Slot primitive for button `asChild` |

## Content & Markdown

| Name | Version | License | Official source | Purpose in CreyvaPH |
| --- | --- | --- | --- | --- |
| marked | 18.0.9 | MIT | https://marked.js.org | Markdown parsing for lesson content |

## Development Tooling

| Name | Version | License | Official source | Purpose in CreyvaPH |
| --- | --- | --- | --- | --- |
| tsx | 4.23.9 | MIT | https://tsx.is | Running TypeScript scripts (Prisma seed) |
| eslint-config-next | 16.3.0 | MIT | https://nextjs.org | Next.js ESLint preset |
| @types/* | various | MIT | https://www.typescriptlang.org | Type definitions for dependencies |

---

## Notes

- This list covers the direct runtime and dev dependencies declared in `package.json`. Transitive dependencies (packages installed inside `node_modules` that are not declared directly) are governed by their own licenses as distributed by their authors.
- License texts are **not** reproduced here; the authoritative license for each package ships with the package itself under `node_modules/<package>/LICENSE` (or equivalent).
- `next`, `react`, `prisma`, and other tooling are used as libraries and frameworks under their respective terms. CreyvaPH does not embed or redistribute these packages; they are consumed as dependencies.

**Copyright © 2026 Jhon Xyryll Samoy. All rights reserved.**
