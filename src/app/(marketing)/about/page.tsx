// ---------------------------------------------------------------------------
// CreyvaPH
// Educational Technology Platform
// Created & Led by Jhon Xyryll Samoy
// © 2026 CreyvaPH
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import { AboutContent } from "@/components/marketing/about/about-content";
import { BRAND_DESCRIPTION, BRAND_NAME } from "@/lib/brand";
import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "About",
  description: BRAND_DESCRIPTION,
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    type: "website",
    siteName: BRAND_NAME,
    title: "About CreyvaPH",
    description: BRAND_DESCRIPTION,
    url: siteUrl("/about"),
  },
};

export default function AboutPage() {
  return <AboutContent />;
}
