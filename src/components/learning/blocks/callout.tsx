import { Info, Lightbulb, AlertTriangle, AlertOctagon } from "lucide-react";
import type { CalloutVariant } from "@/lib/content/types";
import { cn } from "@/lib/utils";
import { InlineHtml } from "./inline-html";

const STYLES: Record<CalloutVariant, { icon: typeof Info; wrap: string; iconColor: string }> = {
  info: { icon: Info, wrap: "border-info/40 bg-info/10", iconColor: "text-info" },
  tip: { icon: Lightbulb, wrap: "border-accent/50 bg-accent/15", iconColor: "text-accent-foreground" },
  warning: { icon: AlertTriangle, wrap: "border-warning/50 bg-warning/10", iconColor: "text-warning" },
  danger: { icon: AlertOctagon, wrap: "border-destructive/50 bg-destructive/10", iconColor: "text-destructive" },
};

export function Callout({ variant, title, text }: { variant: CalloutVariant; title?: string; text: string }) {
  const s = STYLES[variant];
  return (
    <div className={cn("my-4 flex gap-3 rounded-lg border p-4", s.wrap)}>
      <s.icon className={cn("mt-0.5 h-5 w-5 shrink-0", s.iconColor)} />
      <div className="space-y-1">
        {title && <p className="text-sm font-semibold">{title}</p>}
        <p className="text-sm leading-relaxed text-foreground/90">
          <InlineHtml text={text} />
        </p>
      </div>
    </div>
  );
}
