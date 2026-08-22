// ---------------------------------------------------------------------------
// CreyvaPH
// Educational Technology Platform
// Created & Led by Jhon Xyryll Samoy
// © 2026 CreyvaPH
// ---------------------------------------------------------------------------

import { getSession } from "@/lib/auth";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { Footer } from "@/components/layout/footer";

// Server-rendered per request (course data is DB-backed) — no static build deps.
export const dynamic = "force-dynamic";

export default async function MarketingLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader signedIn={Boolean(session)} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
