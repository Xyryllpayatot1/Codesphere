import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/jwt";
import { ROLES } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Next.js 16 Proxy (the renamed middleware). Guards protected routes using the
// signed session cookie. Full verification also happens in layouts/API routes.
// ---------------------------------------------------------------------------

const PUBLIC_PATHS = ["/login", "/register", "/courses", "/pricing", "/about"];
const AUTH_API_PREFIX = "/api/auth";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Allow static assets always.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/api/play") // playground code execution is login-free by design
  ) {
    return NextResponse.next();
  }

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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
