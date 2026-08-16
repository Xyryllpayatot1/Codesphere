import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; " +
      "font-src 'self' data:; connect-src 'self' https://kjpnyowsexasqofiejze.supabase.co wss: blob:; " +
      "worker-src 'self' blob:; frame-ancestors 'self'; base-uri 'self'; form-action 'self'",
  },
];

const STATIC_CACHE = "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400";
const PAGE_CACHE = "public, s-maxage=60, stale-while-revalidate=3600";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
      {
        source: "/robots.txt",
        headers: [{ key: "Cache-Control", value: STATIC_CACHE }],
      },
      {
        source: "/sitemap.xml",
        headers: [{ key: "Cache-Control", value: STATIC_CACHE }],
      },
      {
        source: "/atom.xml",
        headers: [{ key: "Cache-Control", value: STATIC_CACHE }],
      },
      {
        source: "/courses/:path*",
        headers: [{ key: "Cache-Control", value: PAGE_CACHE }],
      },
      {
        source: "/about",
        headers: [{ key: "Cache-Control", value: PAGE_CACHE }],
      },
      {
        source: "/credits",
        headers: [{ key: "Cache-Control", value: PAGE_CACHE }],
      },
      {
        source: "/pricing",
        headers: [{ key: "Cache-Control", value: PAGE_CACHE }],
      },
    ];
  },
};

export default nextConfig;
