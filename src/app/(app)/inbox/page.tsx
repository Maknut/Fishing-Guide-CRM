import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import { Empty } from "@/components/ui";

export const metadata: Metadata = { title: "Inbox" };

// Desktop only: the right-hand pane before a conversation is picked.
export default function InboxIndex() {
  return (
    <div className="inbox-pane-empty">
      <Empty icon={<MessageSquare size={22} />} title="Pick a conversation">
        <p>Texts and emails with each client live in one thread.</p>
      </Empty>
    </div>
  );
}
