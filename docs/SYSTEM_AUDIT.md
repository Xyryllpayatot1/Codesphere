# CodeSphere — System Audit Report

- **Date:** 2026-08-09
- **Scope:** full application audit (auth, courses/learning engine, games, networking lab, collaboration rooms, admin, store, rewards/XP, media, proxy, DB config, mobile/UI)
- **Method:** static review of every API route + engine module, typecheck (`npx tsc --noEmit`), ESLint, production build (`next build`), plus live DB verification of every reward-path fix with a throwaway user (fixtures created, asserted, and fully removed).

## Verdict

The system is in good shape. Auth is consistently enforced (proxy + per-route `requireSession`/`requireRole`), admin routes are gated, client input is re-validated server-side, and rewards funnel through one transactional pipeline. The audit found **5 real bugs, all in the reward/progress engine** — every one fixed and verified. No production-critical security holes (IDOR, privilege escalation, injection, unsafe uploads) were found.

## Fixed bugs

| # | Severity | Location | Bug | Fix |
|---|----------|----------|-----|-----|
| 1 | **High** | `src/lib/services/progress.ts:19` (`touchLesson`) | Every visit to a lesson page reset `lessonProgress.status` to `IN_PROGRESS`. Viewing an already-`COMPLETED` lesson reverted it, regressing course-completion and progress percent. | Update now touches only `lastAccessedAt`; the `COMPLETED` state is preserved. |
| 2 | **High** | `src/lib/services/progress.ts:77` (`recordExerciseResult`) | The per-lesson counter upsert also forced `status: IN_PROGRESS`, reverting completed lessons when an exercise was re-submitted. | Status no longer reset on update (`progressPercent` still uses `Math.max`, so 100% is kept). |
| 3 | **High** | `src/lib/services/progress.ts:100` (`recordQuizAttempt`) | Quiz XP/coins/missions were awarded on **every** passing attempt — a trivial XP farm (retake a passed quiz repeatedly). | A `firstPass` guard (first `passed` attempt for the user+quiz) gates the XP award, coin bonus, mission progress, `QUIZ_PASSED` activity and `quizzesPassed` increment. The submit route now reports the real `xpEarned` (`src/app/api/learn/quizzes/[key]/submit/route.ts:45`). |
| 4 | **High** | `src/lib/services/progress.ts:215` (`completeLesson`) | The "already completed" check ran **outside** the write, so two concurrent POSTs (e.g. double-clicking "Complete") could both award lesson XP, streak, and even re-issue a course certificate. | The `COMPLETED` transition is now claimed atomically with a conditional `updateMany(status != COMPLETED)`; only the winning request proceeds to award. Postgres re-evaluates the WHERE against the locked row, so the loser gets `count 0` and reports `already_completed`. |
| 5 | **Medium** | `src/lib/net/progress.ts:84` (`submitNetMission`) | Same race class: a `findUnique` + upsert let concurrent submissions double-award mission XP/coins. | Atomic conditional `updateMany` claim; reward only on `count > 0`. |

**Verification (live, against the real DB):** a script created a throwaway user, course, lesson, exercise and quiz, then asserted — quiz XP on first pass only; repeated pass = 0 XP; `completeLesson` awards lesson XP exactly once, second call returns `already_completed` with an unchanged XP ledger; `touchLesson` and `recordExerciseResult` both preserve `COMPLETED`; the net-mission claim returns `count 1` then `count 0`. **All 14 checks passed.** All fixture rows and helper scripts were deleted afterwards (verified zero orphans via SQL).

## Verified-clean areas

- **Auth:** custom JWT (jose, pinned HS256, `httpOnly`+`sameSite:lax` cookie, 30d expiry). `src/proxy.ts` guards every non-public route and redirects `/api` auth failures to `/login?api=1`. Roles checked server-side, never from client state.
- **Admin surface:** every `/api/admin/*` route calls `requireRole(ROLES.ADMIN)` (worlds, submissions, releases, cover upload).
- **Media uploads:** extension whitelist + magic-byte sniffing + 8 MB cap + sharp re-encode to capped WebP; stored bytes are always server output, so no executable payload can be planted; path building uses DB ids only.
- **Rooms/collab:** SSE stream requires membership; event publishing requires membership, blocks `VIEWER` edits, enforces host-only `TOPOLOGY_RESET`, and `isLocked` correctly means "host-only editing" (enforced server-side); host-only actions gated by `room.hostId === session.id`; kick/role-change on the host blocked.
- **Store/titles:** level + tier + rarity gates on POST, ownership checks on equip, `spendCoins` is transactional and can't go negative; title grants are idempotent.
- **Games:** submission re-validated by the deterministic grader; game/world/level locks enforced server-side.
- **Networking lab:** client snapshots are re-validated by the pure engine server-side; projects are ownership-scoped on read/update/delete.
- **Project submissions:** 100 KB cap; admin approval awards XP only on first approval (`wasApproved` guard).
- **Study time:** seconds capped at 3600; daily-login XP/streak awarded at most once per day (`isFirstToday`).
- **DB:** lazy Prisma singleton + `pg` pool tuned for the Supabase/Supavisor pooler (idle/lifetime/`maxUses` rotation, error listener) — addresses the "Server has closed the connection" class of 500s.

## Non-critical recommendations (not fixed — out of scope / intentional)

1. **Login/register have no rate limiting** — bcrypt cost 10 slows brute force, but add a rate limiter / account lockout for public deployments.
2. **`handle()` in `src/lib/api.ts`** returns `500` with the raw `Error.message` (e.g. `spendCoins` "Not enough CodeCoins", `submitNetMission` "Mission not found") — leaks internals and maps client errors to 500. Prefer throwing `ApiError` with proper status codes.
3. **`readJson()` / `req.json()` have no body-size cap** on most routes (rooms/events checks `content-length`; projects/releases don't). Add a byte cap for authenticated abuse resistance.
4. **Study-time mission farming:** `recordStudyTime` trusts client-reported minutes toward the study mission with no per-day cap on `StudySession` rows. Acceptable for v1; a server-side elapsed-time tracker would close it.
5. **`jwt.ts` falls back to `"dev-secret-change-me"`** if `AUTH_SECRET` is unset — harmless here (`.env` is set) but make the production build fail fast on a missing secret.
6. **`src/lib/perf.ts` logs on every request by default** ("always on"). Gate behind an env flag or remove once latency work is done.
7. **Collab rooms are in-memory single-instance** (documented in `hub.ts`) — fine for one `next start` process; a multi-instance deploy needs the realtime layer externalized.
8. **5-char room codes** (~28 M space) are guessable by design; acceptable for v1 given no secrets live in rooms.

## Quality gates

- `npx tsc --noEmit` — clean
- `npm run lint` — clean (earlier fixed 1 error + 3 warnings: removed leftover `mktoken.cjs` debug script, removed unused params in the networking projects route)
- `npm run build` — succeeds (all routes compile; full route list captured in the build log)
