"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Copy, ExternalLink, Send } from "lucide-react";
import { api, errorMessage } from "@/lib/fetcher";
import { Button, btnClass } from "./ui";
import { useToast } from "./Toast";

/** The client's trip page link: copy it, open it, or drop it into a text to the client. */
export function TripLink({ url, path, clientId, clientName, canText }: { url: string; path: string; clientId: string; clientName: string; canText: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [opening, setOpening] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast("Link copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast("Couldn't copy. Press and hold the link to copy it instead.", { type: "error" });
    }
  }

  async function textIt() {
    setOpening(true);
    try {
      const { id } = await api<{ id: string }>("/api/conversations", { body: { clientId } });
      const draft = `Here's your trip page with where to meet, what to bring and the forecast: ${url}`;
      router.push(`/inbox/${id}?draft=${encodeURIComponent(draft)}`);
    } catch (e) {
      toast(errorMessage(e), { type: "error" });
      setOpening(false);
    }
  }

  return (
    <div className="stack">
      <div className="linkbox">
        <code title={url}>{url.replace(/^https?:\/\//, "")}</code>
        <button type="button" className="icon-btn" onClick={copy} aria-label="Copy trip page link">
          {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
        </button>
      </div>
      <div className="actions-bar">
        {canText && (
          <Button size="sm" variant="primary" pending={opening} icon={<Send size={15} aria-hidden="true" />} onClick={textIt}>
            Text it to {clientName.split(/\s+/)[0]}
          </Button>
        )}
        <a href={path} target="_blank" rel="noreferrer" className={btnClass({ size: "sm" })}>
          <ExternalLink size={15} aria-hidden="true" />
          <span>Preview</span>
        </a>
      </div>
    </div>
  );
}
