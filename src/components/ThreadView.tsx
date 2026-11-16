"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { ArrowUp, Pin, PinOff } from "lucide-react";
import { api, errorMessage } from "@/lib/fetcher";
import { useToast } from "./Toast";

export type ThreadMessage = {
  id: string;
  body: string;
  outbound: boolean;
  channel: "SMS" | "EMAIL";
  failed: boolean;
  time: string;
  day: string;
  pinnedTo: string | null;
  pending?: boolean;
};

type Change = { type: "add"; message: ThreadMessage } | { type: "pin"; id: string; pinnedTo: string | null };

function applyChange(list: ThreadMessage[], change: Change): ThreadMessage[] {
  if (change.type === "add") return [...list, change.message];
  return list.map(m => (m.id === change.id ? { ...m, pinnedTo: change.pinnedTo } : m));
}

export function ThreadView(props: {
  conversationId: string;
  clientId: string;
  clientName: string;
  messages: ThreadMessage[];
  pinBooking: { id: string; label: string } | null;
  hasPhone: boolean;
  hasEmail: boolean;
  smsReady: boolean;
  refreshOnMount: boolean;
  initialDraft?: string;
}) {
  const { conversationId, clientId, clientName, pinBooking, hasPhone, hasEmail, smsReady } = props;
  const router = useRouter();
  const toast = useToast();
  const [messages, change] = useOptimistic(props.messages, applyChange);
  const [, startTransition] = useTransition();
  const [draft, setDraft] = useState(props.initialDraft ?? "");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const firstPaint = useRef(true);

  // The server marked this thread read while rendering; refresh so the unread badges catch up.
  useEffect(() => {
    if (props.refreshOnMount) router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the newest message in view: instantly on open, smoothly when one is added.
  useLayoutEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: firstPaint.current ? "auto" : "smooth" });
    firstPaint.current = false;
  }, [messages.length]);

  // Grow the box with the message, up to a few lines.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [draft]);

  const blocked = !hasPhone
    ? { text: `Add a phone number to text ${clientName}.`, href: `/clients/${clientId}`, cta: "Open profile" }
    : !smsReady
      ? { text: "Texting isn't set up yet. Add your business number to start sending.", href: "/settings", cta: "Open settings" }
      : null;

  function send() {
    const body = draft.trim();
    if (!body || sending || blocked) return;
    setSending(true);
    setDraft("");
    startTransition(async () => {
      change({ type: "add", message: { id: `pending-${Date.now()}`, body, outbound: true, channel: "SMS", failed: false, time: "Sending", day: "Today", pinnedTo: null, pending: true } });
      try {
        await api("/api/messages", { body: { conversationId, channel: "SMS", body } });
        router.refresh();
      } catch (e) {
        setDraft(body); // give the message back so nothing typed is lost
        toast(errorMessage(e), { type: "error" });
      } finally {
        setSending(false);
      }
    });
  }

  function togglePin(m: ThreadMessage) {
    if (!pinBooking && !m.pinnedTo) return;
    const pinnedTo = m.pinnedTo ? null : pinBooking!.id;
    startTransition(async () => {
      change({ type: "pin", id: m.id, pinnedTo });
      try {
        await api(`/api/messages/${m.id}/pin`, { body: { bookingId: pinnedTo } });
        toast(pinnedTo ? "Pinned to the trip page" : "Removed from the trip page");
        router.refresh();
      } catch (e) {
        toast(errorMessage(e), { type: "error" });
      }
    });
  }

  let lastDay = "";
  return (
    <>
      <div className="thread-msgs" aria-live="polite">
        {messages.length === 0 && (
          <p className="day-divider">No messages with {clientName} yet. Say hello below.</p>
        )}
        {messages.map(m => {
          const showDay = m.day !== lastDay;
          lastDay = m.day;
          const canPin = !m.pending && (Boolean(pinBooking) || Boolean(m.pinnedTo));
          return (
            <div key={m.id} style={{ display: "contents" }}>
              {showDay && <div className="day-divider">{m.day}</div>}
              <div className={`bubble-wrap${m.outbound ? " is-out" : ""}`}>
                <div className={`bubble${m.pinnedTo ? " is-pinned" : ""}${m.pending ? " is-pending is-new" : ""}`}>{m.body}</div>
                <div className="bubble-meta">
                  <span>{m.failed ? "Not delivered" : m.time}{m.channel === "EMAIL" ? ", email" : ""}</span>
                  {canPin && (
                    <button type="button" className={`pin-btn${m.pinnedTo ? " is-pinned" : ""}`} onClick={() => togglePin(m)} aria-pressed={Boolean(m.pinnedTo)}>
                      {m.pinnedTo ? <PinOff size={13} aria-hidden="true" /> : <Pin size={13} aria-hidden="true" />}
                      {m.pinnedTo ? "Unpin" : "Pin to trip page"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="composer">
        {blocked ? (
          <div className="composer-blocked">
            <span>{blocked.text}</span>
            <Link href={blocked.href} className="link">{blocked.cta}</Link>
          </div>
        ) : (
          <>
            <div className="composer-box">
              <textarea
                ref={inputRef}
                rows={1}
                value={draft}
                placeholder={`Text ${clientName}`}
                aria-label={`Message to ${clientName}`}
                maxLength={1600}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  // Enter sends with a keyboard; on touch screens Enter stays a new line.
                  const touch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
                  if (e.key === "Enter" && !e.shiftKey && !touch && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <button type="button" className="send" onClick={send} disabled={!draft.trim() || sending} aria-label="Send text">
                {sending ? <span className="spinner" aria-hidden="true" /> : <ArrowUp size={19} strokeWidth={2.4} aria-hidden="true" />}
              </button>
            </div>
            <div className="composer-foot">
              <span>Sends as a text from your business number{hasEmail ? ". Email is coming soon." : "."}</span>
              {draft.length > 1400 && <span>{1600 - draft.length} left</span>}
            </div>
          </>
        )}
      </div>
    </>
  );
}
