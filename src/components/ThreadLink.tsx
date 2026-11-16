"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** A row in the inbox list that knows whether its conversation is the one on screen. */
export function ThreadLink({ id, unread, children }: { id: string; unread: boolean; children: ReactNode }) {
  const active = usePathname() === `/inbox/${id}`;
  return (
    <Link href={`/inbox/${id}`} className={`row thread-row${unread && !active ? " is-unread" : ""}`} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}
