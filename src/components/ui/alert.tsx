import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertVariant = "info" | "success" | "warning" | "danger";

const styles: Record<AlertVariant, { icon: React.ElementType; classes: string }> = {
  info: { icon: Info, classes: "border-info/25 bg-info/8 text-info-foreground [&_svg]:text-info" },
  success: {
    icon: CheckCircle2,
    classes: "border-success/25 bg-success/8 text-success-foreground [&_svg]:text-success",
  },
  warning: {
    icon: AlertTriangle,
    classes: "border-warning/30 bg-warning/10 text-warning-foreground dark:text-foreground [&_svg]:text-warning",
  },
  danger: {
    icon: XCircle,
    classes: "border-destructive/25 bg-destructive/8 text-destructive-foreground dark:text-foreground [&_svg]:text-destructive",
  },
};

export function Alert({
  variant = "info",
  title,
  children,
  className,
}: {
  variant?: AlertVariant;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const Icon = styles[variant].icon;
  return (
    <div role={variant === "danger" ? "alert" : "status"} className={cn("rounded-lg border p-3.5", styles[variant].classes, className)}>
      <div className="flex gap-2.5">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div className="min-w-0 text-sm">
          {title && <p className="font-medium text-foreground">{title}</p>}
          {children && <div className={cn("text-[0.8125rem] leading-relaxed", title && "mt-0.5")}>{children}</div>}
        </div>
      </div>
    </div>
  );
}
