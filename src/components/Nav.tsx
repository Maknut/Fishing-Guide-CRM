"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, House, LogOut, MessageSquare, Settings, Users } from "lucide-react";
import { Mark } from "./ui";
import { APP_NAME } from "@/lib/brand";

// Sections of the app, and which URL prefixes belong to each (bookings live under Calendar).
const ITEMS = [
  { href: "/dashboard", label: "Home", icon: House, match: ["/dashboard"] },
  { href: "/inbox", label: "Inbox", icon: MessageSquare, match: ["/inbox"] },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, match: ["/calendar", "/bookings"] },
  { href: "/clients", label: "Clients", icon: Users, match: ["/clients"] },
  { href: "/settings", label: "Settings", icon: Settings, match: ["/settings"] },
] as const;

function useActive() {
  const path = usePathname() ?? "";
  return (match: readonly string[]) => match.some(m => path === m || path.startsWith(`${m}/`));
}

export function Sidebar({ name, business, unread, signOut }: { name: string; business: string | null; unread: number; signOut: () => Promise<void> }) {
  const isActive = useActive();
  return (
    <aside className="sidebar">
      <Link href="/dashboard" className="wordmark" aria-label={`${APP_NAME} home`}>
        <Mark size={24} />
        {APP_NAME}
      </Link>
      <nav aria-label="Main">
        {ITEMS.map(({ href, label, icon: Icon, match }) => (
          <Link key={href} href={href} aria-current={isActive(match) ? "page" : undefined}>
            <Icon size={19} strokeWidth={2} aria-hidden="true" />
            {label}
            {href === "/inbox" && unread > 0 && <span className="badge" aria-label={`${unread} unread`}>{unread > 99 ? "99+" : unread}</span>}
          </Link>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="who">
          <strong className="truncate">{name}</strong>
          {business && <span className="truncate">{business}</span>}
        </div>
        <form action={signOut}>
          <button type="submit" className="icon-btn" aria-label="Sign out" title="Sign out">
            <LogOut size={18} aria-hidden="true" />
          </button>
        </form>
      </div>
    </aside>
  );
}

export function TabBar({ unread }: { unread: number }) {
  const isActive = useActive();
  return (
    <nav className="tabbar" aria-label="Main">
      {ITEMS.map(({ href, label, icon: Icon, match }) => (
        <Link key={href} href={href} aria-current={isActive(match) ? "page" : undefined}>
          <span className="tab-icon">
            <Icon size={21} strokeWidth={2} aria-hidden="true" />
            {href === "/inbox" && unread > 0 && <span className="badge" aria-label={`${unread} unread`}>{unread > 9 ? "9+" : unread}</span>}
          </span>
          {label}
        </Link>
      ))}
    </nav>
  );
}
