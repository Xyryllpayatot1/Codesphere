// ---------------------------------------------------------------------------
// CreyvaPH
// Educational Technology Platform
// Created & Led by Jhon Xyryll Samoy
// © 2026 CreyvaPH
// ---------------------------------------------------------------------------

import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/courses", "/credits"],
        disallow: [
          "/admin",
          "/api",
          "/dashboard",
          "/learn",
          "/networking",
          "/playground",
          "/games",
          "/projects",
          "/certificates",
          "/profile",
          "/missions",
          "/achievements",
          "/leaderboard",
          "/progress",
          "/study-plan",
          "/store",
          "/prompts",
          "/practice",
          "/room",
          "/whats-new",
          "/worlds",
          "/onboarding",
        ],
      },
    ],
    sitemap: siteUrl("/sitemap.xml"),
  };
}
