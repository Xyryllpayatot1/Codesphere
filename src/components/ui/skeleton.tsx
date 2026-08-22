import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "rounded-lg bg-secondary [background-image:linear-gradient(90deg,transparent_0%,color-mix(in_oklab,var(--foreground)_5%,transparent)_50%,transparent_100%)] [background-size:400px_100%] animate-shimmer",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
