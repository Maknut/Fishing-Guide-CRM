"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", icon: "🏠", label: "Home" },
  { href: "/inbox", icon: "💬", label: "Inbox" },
  { href: "/calendar", icon: "📅", label: "Calendar" },
  { href: "/clients", icon: "👤", label: "Clients" },
  { href: "/settings", icon: "⚙️", label: "Settings" },
];

export function TabBar() {
  const path = usePathname();
  return (
    <nav className="tabbar">
      {TABS.map(t => (
        <Link key={t.href} href={t.href} className={path.startsWith(t.href) ? "active" : ""}>
          <span>{t.icon}</span>{t.label}
        </Link>
      ))}
    </nav>
  );
}
