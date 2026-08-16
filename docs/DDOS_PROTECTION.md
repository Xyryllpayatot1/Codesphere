# DDoS Protection Guide — CreyvaPH

CreyvaPH runs on Render's free tier as a single Node instance with no CDN in front, so a Layer-7 HTTP flood (the kind "DDoS test scripts" send) can exhaust CPU, memory, and database connections and take the site down.

Protection is layered. This guide covers all four layers.

---

## Layer 1 — Cloudflare in front (REQUIRED, free)

This is the single most effective fix. Cloudflare absorbs flood traffic, filters known attackers, rate-limits per-IP, and caches static files so most requests never reach your Render origin.

You need a domain name for this (any cheap `.com`/`.ph` works).

### Steps

1. **Create a Cloudflare account** → https://dash.cloudflare.com/sign-up
2. **Add your site** (Add a site → your domain) and pick the **Free** plan.
3. Cloudflare will show you **two nameservers** (e.g. `aria.ns.cloudflare.com`). It also detects existing DNS records — **do not** add your Render URL yet.
4. At your domain registrar (GoDaddy/Namecheap/etc.), replace the registrar's nameservers with Cloudflare's two. Propagation takes minutes to a few hours.
5. Back in Cloudflare → **DNS**, add an `A`/`CNAME` record:
   - `@` (or `www`) → `CNAME` → `creyvaph-lms.onrender.com` with proxy **Proxied** (orange cloud icon = ON).
6. Wait for status to change to **Active**, then on **SSL/TLS → Overview** set mode to **Full (strict)**.
7. On Render (Dashboard → creyvaph-lms → Settings → Custom Domain) add the same domain and point it to the Cloudflare DNS. Render will issue an automatic certificate.

### Then enable the flood filters

- **Security → Bots** → turn on **Bot Fight Mode** (Free) — blocks most scripted floods.
- **Security → WAF → Managed rules** → enable **Cloudflare Managed Ruleset** — default L7 DDoS rules.
- **Security → DDoS** → the "HTTP DDoS Protection" ruleset is on by default; keep it enabled.
- **Security → WAF → Rate limiting rules** → add:
  - `if (ip.src.country eq "US" and not cf.client.bot)` — or simpler, a rule for all traffic:
  - **Expression**: `true` — **Action**: `Block` (or `Managed Challenge`) — **Requests per period**: `300` per `10 seconds`.
  - Add a second rule for `/api/auth/*`: **Expression**: `starts_with(http.request.uri.path, "/api/auth")` — **Action**: `Block` — `10` per `60 seconds` (blocks login brute force).
- **Caching → Cache rules** (Free): static assets are cached automatically; with the `Cache-Control` headers already set in `next.config.ts`, Cloudflare will also cache `/courses`, `/about`, `/credits`, `/pricing`, `robots.txt`, `sitemap.xml`, and `atom.xml`.

### Why this beats app-level protection

A real distributed attack uses many different source IPs — no per-IP limiter inside the app can stop that. Cloudflare filters at the network edge, before your Render instance ever sees the traffic, and hides your origin IP so attackers can't bypass it. Keep your Render origin URL unpublished.

---

## Layer 2 — App-level rate limiting (implemented)

`src/lib/rate-limit.ts` + `src/proxy.ts` now enforce per-IP fixed-window limits **before** any route or database query runs:

| Traffic | Limit | Window |
|---|---|---|
| Pages | 300 requests | 10 s |
| API (`/api/*`) | 150 requests | 10 s |
| Auth (`/api/auth/*`) | 10 requests | 60 s |

Blocked requests get HTTP `429` + `Retry-After`. Limits are generous enough that normal browsing/prefetching is unaffected. `/health` and `/api/health` are exempt so uptime monitors keep working.

Client IP is read from `CF-Connecting-IP` (set by Cloudflare) falling back to `X-Forwarded-For`.

**Caveats:**
- The counter lives in process memory → resets on restart and works per-instance only. This stops single-IP floods and scripted load tests; it does **not** stop a multi-IP DDoS (that's Layer 1).
- Tune the numbers in `src/proxy.ts` if a real classroom burst trips the limits.

---

## Layer 3 — Security & caching headers (implemented)

`next.config.ts` now sets on every response:

- `Strict-Transport-Security` (HSTS, 2 years)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`
- `Content-Security-Policy` (baseline — `unsafe-inline`/`unsafe-eval` are kept because Next.js hydration and the Monaco editor require them; tighten later if you want)

And `Cache-Control` on public content (`/courses*`, `/about`, `/credits`, `/pricing`, `/robots.txt`, `/sitemap.xml`, `/atom.xml`) so Cloudflare/Render can serve it from cache instead of the origin. `X-Powered-By` is disabled.

---

## Layer 4 — Render plan

Render's **free** tier is ~512 MB RAM / a fraction of a CPU with no autoscaling. Even the **Starter** plan (~$7/mo) multiplies headroom and keeps the instance alive during load spikes. If uptime matters, upgrade. Paid plans also let you set a memory budget so the process restarts instead of hanging.

---

## Testing after setup

```bash
# Smoke test: normal browsing still works
curl -s https://your-domain.com/api/health

# Verify the app limiter: 12 hits on the auth endpoint in 60s → 429
for i in $(seq 1 12); do curl -s -o /dev/null -w "%{http_code}\n" -X POST https://your-domain.com/api/auth/login; done
```

Expected: `200 ... 200 429 429 ...` (the 429s prove the limiter is active).

Re-run your DDoS test script afterward — Cloudflare should answer most of it with a block page/challenge and your origin should stay up.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Certificates not issuing | SSL/TLS mode must be **Full (strict)**; DNS record must be Proxied |
| Real users get 429 | Limits too tight — raise values in `src/proxy.ts` and the Cloudflare rate rule |
| Cloudflare 1016 / origin down | Render free instance died — upgrade plan or check Render logs |
| Attackers still hit origin directly | Your Render URL was shared/leaked; keep it secret, only use the custom domain publicly |
