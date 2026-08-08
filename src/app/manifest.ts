import type { MetadataRoute } from "next";
import { BRAND_DESCRIPTION } from "@/lib/brand";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CodeSphere — Learn to Code, Interactively",
    short_name: "CodeSphere",
    description: BRAND_DESCRIPTION,
    id: "/",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0f0a1e",
    theme_color: "#0f0a1e",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Quick session", url: "/dashboard?quick=1", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Networking Lab", url: "/networking", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Playground", url: "/playground", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
