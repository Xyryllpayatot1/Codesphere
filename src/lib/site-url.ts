// ---------------------------------------------------------------------------
// CreyvaPH
// Educational Technology Platform
// Created & Led by Jhon Xyryll Samoy
// © 2026 CreyvaPH
// ---------------------------------------------------------------------------

// The public origin for the deployment is provided through NEXT_PUBLIC_SITE_URL
// (e.g. set on Render before `npm run build`). The local fallback is used for
// local development only — the production URL must never be hardcoded here.
const DEFAULT_ORIGIN = "http://localhost:3000";

function resolveBase(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return new URL(configured && /^https?:\/\//i.test(configured) ? configured : DEFAULT_ORIGIN);
}

/** Absolute site origin, from NEXT_PUBLIC_SITE_URL (local fallback in dev). */
export function siteOrigin(): string {
  return resolveBase().origin;
}

/** Absolute URL for a site path, e.g. siteUrl("/about") -> "https://<site>/about". */
export function siteUrl(path = "/"): string {
  return new URL(path, resolveBase()).toString();
}
