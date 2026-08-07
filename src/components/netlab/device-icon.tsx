"use client";

import type { DeviceType } from "@/lib/net/types";
import { DEVICE_TYPES } from "@/lib/net/devices";
import { cn } from "@/lib/utils";

const KIND_COLOR: Record<string, string> = {
  end: "text-sky-400",
  infra: "text-violet-400",
  router: "text-emerald-400",
  security: "text-rose-400",
  cloud: "text-slate-400",
};

export function deviceColor(type: DeviceType): string {
  return KIND_COLOR[DEVICE_TYPES[type].kind] ?? "text-slate-400";
}

export function DeviceIcon({ type, className }: { type: DeviceType; className?: string }) {
  const color = KIND_COLOR[DEVICE_TYPES[type].kind] ?? "text-slate-400";
  const common = { className: cn(color, className) };
  const rect: React.SVGProps<SVGRectElement> = {
    x: 10,
    y: 18,
    width: 64,
    height: 34,
    rx: 4,
    strokeWidth: 2.5,
    fill: "none",
    className: "stroke-current",
  };

  switch (type) {
    case "pc":
      return (
        <svg viewBox="0 0 84 64" {...common}>
          <rect x="14" y="14" width="56" height="34" rx="3" className="fill-current/15 stroke-current" strokeWidth="2.5" />
          <path d="M30 52h24M42 48v6" className="stroke-current" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case "laptop":
      return (
        <svg viewBox="0 0 84 64" {...common}>
          <rect x="16" y="12" width="52" height="32" rx="3" className="fill-current/15 stroke-current" strokeWidth="2.5" />
          <path d="M10 46h64l-6 8H16z" className="fill-current/15 stroke-current" strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
      );
    case "server":
      return (
        <svg viewBox="0 0 84 64" {...common}>
          <rect x="24" y="8" width="36" height="48" rx="4" className="fill-current/15 stroke-current" strokeWidth="2.5" />
          <circle cx="33" cy="20" r="2.5" className="fill-current" />
          <circle cx="33" cy="32" r="2.5" className="fill-current" />
          <circle cx="33" cy="44" r="2.5" className="fill-current" />
          <path d="M42 18h12M42 30h12M42 42h12" className="stroke-current" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "printer":
      return (
        <svg viewBox="0 0 84 64" {...common}>
          <rect x="18" y="16" width="48" height="30" rx="4" className="fill-current/15 stroke-current" strokeWidth="2.5" />
          <path d="M24 46v10h36V46M24 24h10" className="stroke-current" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M28 52h28" className="stroke-current" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "switch":
      return (
        <svg viewBox="0 0 84 64" {...common}>
          <rect {...rect} />
          <path d="M22 28h8M38 28h8M54 28h8M22 42h8M38 42h8M54 42h8" className="stroke-current" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "hub":
      return (
        <svg viewBox="0 0 84 64" {...common}>
          <rect {...rect} />
          <circle cx="42" cy="35" r="7" className="fill-current/20 stroke-current" strokeWidth="2.5" />
          <path d="M24 24h8M52 24h8M24 46h8M52 46h8" className="stroke-current" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case "router":
      return (
        <svg viewBox="0 0 84 64" {...common}>
          <rect {...rect} />
          <path d="M42 18l2-6M42 18l-6-2M42 18l4-4" className="stroke-current" strokeWidth="2" strokeLinecap="round" />
          <path d="M26 28h12M26 36h12M26 44h12M56 28h4M56 36h4M56 44h4" className="stroke-current" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    case "wirelessRouter":
      return (
        <svg viewBox="0 0 84 64" {...common}>
          <rect {...rect} />
          <path d="M42 18l2-6M42 18l-6-2M42 18l4-4" className="stroke-current" strokeWidth="2" strokeLinecap="round" />
          <path d="M28 26a18 12 0 0128 0M32 31a11 7 0 0120 0" className="fill-none stroke-current" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "accessPoint":
      return (
        <svg viewBox="0 0 84 64" {...common}>
          <rect x="14" y="38" width="56" height="12" rx="4" className="fill-current/15 stroke-current" strokeWidth="2.5" />
          <circle cx="42" cy="30" r="3.5" className="fill-current" />
          <path d="M30 28a20 12 0 0124 0M34 24a12 7 0 0116 0" className="fill-none stroke-current" strokeWidth="2" strokeLinecap="round" />
          <path d="M42 34v4" className="stroke-current" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "firewall":
      return (
        <svg viewBox="0 0 84 64" {...common}>
          <rect {...rect} />
          <path d="M42 26c-5 4-7 8-5 12 4-2 5-5 5-5s1 3 5 5c2-4 0-8-5-12z" className="fill-current/30 stroke-current" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case "cloud":
      return (
        <svg viewBox="0 0 84 64" {...common}>
          <path
            d="M24 48a12 12 0 011-24 16 16 0 0131-3 13 13 0 011 27z"
            className="fill-current/15 stroke-current"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path d="M38 40l6-6M38 34l6 6" className="stroke-current" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 84 64" {...common}>
          <rect {...rect} />
        </svg>
      );
  }
}
