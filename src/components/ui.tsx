// Small presentational building blocks shared across screens. No client-side state here,
// so these work in both server and client components.
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "default" | "primary" | "ghost" | "danger" | "danger-solid";
  size?: "md" | "sm";
  block?: boolean;
  pending?: boolean;
  icon?: ReactNode;
};

export function btnClass({ variant = "default", size = "md", block = false }: Pick<ButtonProps, "variant" | "size" | "block"> = {}) {
  return ["btn", variant !== "default" && `btn--${variant}`, size === "sm" && "btn--sm", block && "btn--block"].filter(Boolean).join(" ");
}

/** Button with a built-in pending state: shows a spinner and blocks repeat clicks. */
export function Button({ variant, size, block, pending = false, icon, children, className, disabled, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={`${btnClass({ variant, size, block })}${className ? ` ${className}` : ""}`}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...rest}
    >
      {pending ? <span className="spinner" aria-hidden="true" /> : icon}
      <span>{children}</span>
    </button>
  );
}

const STATUS_LABEL: Record<string, string> = {
  INQUIRY: "Inquiry",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function StatusPill({ status }: { status: string }) {
  return <span className={`pill pill--${status.toLowerCase()}`}>{STATUS_LABEL[status] ?? status}</span>;
}

export function initials(name: string) {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, " ").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "#";
  if (/^\d/.test(words[0])) return "#";
  return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
}

export function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  return <span className={`avatar${large ? " avatar--lg" : ""}`} aria-hidden="true">{initials(name)}</span>;
}

export function PageHead({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {children && <div className="actions">{children}</div>}
    </header>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="back">
      <ChevronLeft size={16} aria-hidden="true" />
      {children}
    </Link>
  );
}

export function Empty({ icon, title, children, compact = false }: { icon?: ReactNode; title: string; children?: ReactNode; compact?: boolean }) {
  return (
    <div className={`empty${compact ? " empty--compact" : ""}`}>
      {icon && <span className="empty-icon" aria-hidden="true">{icon}</span>}
      <h3>{title}</h3>
      {children}
    </div>
  );
}

/** The wave mark: two drift lines. Used beside the wordmark and on the trip page. */
export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M2 9c2.2 0 2.8-2 5-2s2.8 2 5 2 2.8-2 5-2 2.8 2 5 2" />
      <path d="M2 16c2.2 0 2.8-2 5-2s2.8 2 5 2 2.8-2 5-2 2.8 2 5 2" opacity="0.55" />
    </svg>
  );
}

/** Decorative swell used behind the sign-in panel and trip page hero. */
export function Swell({ className = "swell" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1200 300" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 120 C 150 60, 300 60, 450 120 S 750 180, 900 120 S 1100 70, 1200 100 V300 H0 Z" fill="#234a21" />
      <path d="M0 190 C 180 130, 330 140, 500 190 S 800 240, 980 180 S 1140 150, 1200 170 V300 H0 Z" fill="#2c5a29" />
      <path d="M0 250 C 200 205, 380 215, 560 250 S 860 285, 1040 240 S 1160 225, 1200 235 V300 H0 Z" fill="#366b32" />
    </svg>
  );
}
