import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/jwt";
import { ROLES } from "@/lib/constants";
import { getClientIp, rateLimit, type RateLimitConfig } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// Next.js 16 Proxy (the renamed middleware). Guards protected routes using the
// signed session cookie. Full verification also happens in layouts/API routes.
// ---------------------------------------------------------------------------

// Public pages + SEO endpoints that must be reachable without a session.
// /credits is a marketing page; /robots.txt + /sitemap.xml must stay open for
// crawlers; /health + /api/health are used by the hosting provider's probes.
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/courses",
  "/about",
  "/credits",
  "/robots.txt",
  "/sitemap.xml",
  "/atom.xml",
  // PWA surface — must be reachable before sign-in for install prompts.
  "/manifest.webmanifest",
  "/health",
  "/api/health",
];
const AUTH_API_PREFIX = "/api/auth";

// Per-IP request limits. Generous for normal browsing but cut flood traffic
// before it reaches routes or the database. Exempted endpoints below stay open.
const PAGE_LIMIT: RateLimitConfig = { limit: 300, windowMs: 10_000 };
const API_LIMIT: RateLimitConfig = { limit: 150, windowMs: 10_000 };
const AUTH_LIMIT: RateLimitConfig = { limit: 10, windowMs: 60_000 };
const UNRATELIMITED = new Set(["/health", "/api/health"]);

function applyRateLimit(request: NextRequest, pathname: string): NextResponse | null {
  if (UNRATELIMITED.has(pathname)) return null;
  const ip = getClientIp(request);
  const config = pathname.startsWith(AUTH_API_PREFIX)
    ? AUTH_LIMIT
    : pathname.startsWith("/api/")
      ? API_LIMIT
      : PAGE_LIMIT;
  const hit = rateLimit(ip, config);
  if (!hit.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.max(1, Math.ceil(hit.retryAfterMs / 1000))) },
      }
    );
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Allow static assets always.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons")
  ) {
    return NextResponse.next();
  }

  const limited = applyRateLimit(request, pathname);
  if (limited) return limited;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isPublic = pathname === "/" || PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAuthApi = pathname.startsWith(AUTH_API_PREFIX);

  if (isAuthApi) {
    return NextResponse.next();
  }

  // Logged-in users hitting auth pages go to the dashboard.
  if (session && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isPublic) {
    return NextResponse.next();
  }

  if (!session) {
    const url = new URL("/login", request.url);
    if (pathname.startsWith("/api")) {
      url.searchParams.set("api", "1");
    } else {
      url.searchParams.set("next", pathname + search);
    }
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && session.role !== ROLES.ADMIN) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|html)$).*)"],
};
