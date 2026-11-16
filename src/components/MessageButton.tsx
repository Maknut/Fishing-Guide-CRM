"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { api, errorMessage } from "@/lib/fetcher";
import { Button } from "./ui";
import { useToast } from "./Toast";

/** Opens the client's conversation, creating it the first time. */
export function MessageButton({ clientId, variant, size }: { clientId: string; variant?: "default" | "primary"; size?: "md" | "sm" }) {
  const router = useRouter();
  const toast = useToast();
  const [opening, setOpening] = useState(false);

  async function open() {
    setOpening(true);
    try {
      const { id } = await api<{ id: string }>("/api/conversations", { body: { clientId } });
      router.push(`/inbox/${id}`);
    } catch (e) {
      toast(errorMessage(e), { type: "error" });
      setOpening(false);
    }
  }

  return (
    <Button variant={variant} size={size} pending={opening} icon={<MessageSquare size={size === "sm" ? 15 : 17} aria-hidden="true" />} onClick={open}>
      Message
    </Button>
  );
}
