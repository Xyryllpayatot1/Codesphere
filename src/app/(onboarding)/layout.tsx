import { requireSession } from "@/lib/auth";
import { Logo } from "@/components/shared/logo";

export const dynamic = "force-dynamic";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await requireSession();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center border-b border-border px-5">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center p-4">{children}</main>
    </div>
  );
}
