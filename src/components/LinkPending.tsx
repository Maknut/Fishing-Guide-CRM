"use client";
import { useLinkStatus } from "next/link";
import type { ReactNode } from "react";

/**
 * Place inside a <Link>. While that link's navigation is loading, shows a spinner in place
 * of `children` (or a soft pulse over the link when used as an overlay).
 */
export function LinkPending({ children, overlay = false }: { children?: ReactNode; overlay?: boolean }) {
  const { pending } = useLinkStatus();
  if (overlay) return pending ? <span className="link-pending" aria-hidden="true" /> : null;
  return pending ? <span className="spinner" role="status" aria-label="Loading" /> : <>{children}</>;
}
