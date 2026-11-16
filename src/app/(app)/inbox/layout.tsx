import { MessageSquare } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireGuideRecord } from "@/lib/auth";
import { fmtStamp } from "@/lib/dates";
import { Avatar, Empty, PageHead } from "@/components/ui";
import { ThreadLink } from "@/components/ThreadLink";

// The conversation list stays on screen beside the open thread on desktop.
// On phones the list and the thread are separate screens (handled in CSS).
export default async function InboxLayout({ children }: { children: React.ReactNode }) {
  const guide = await requireGuideRecord();
  const threads = await prisma.conversation.findMany({
    where: { guideId: guide.id, lastMessageAt: { not: null } },
    include: { client: true, messages: { orderBy: { sentAt: "desc" }, take: 1 } },
    orderBy: { lastMessageAt: "desc" },
  });
  const unreadTotal = threads.reduce((n, t) => n + t.unreadCount, 0);

  return (
    <div className="inbox">
      <div className="inbox-list">
        <PageHead title="Inbox" sub={unreadTotal > 0 ? `${unreadTotal} unread` : threads.length > 0 ? "You're all caught up." : undefined} />
        {threads.length === 0 ? (
          <div className="panel">
            <Empty icon={<MessageSquare size={22} />} title="No conversations yet">
              <p>When a client texts your business number, the conversation shows up here. You can also start one from a client's profile.</p>
            </Empty>
          </div>
        ) : (
          <div className="panel">
            <div className="rows">
              {threads.map(t => {
                const last = t.messages[0];
                return (
                  <ThreadLink key={t.id} id={t.id} unread={t.unreadCount > 0}>
                    <Avatar name={t.client.name} />
                    <div className="grow">
                      <div className="top">
                        <span className="name truncate">{t.client.name}</span>
                        {t.lastMessageAt && <span className="time">{fmtStamp(t.lastMessageAt, guide.timezone)}</span>}
                      </div>
                      <div className="preview">
                        {last ? `${last.direction === "OUTBOUND" ? "You: " : ""}${last.body}` : ""}
                      </div>
                    </div>
                    {t.unreadCount > 0 && <span className="unread-dot" aria-label={`${t.unreadCount} unread`} />}
                  </ThreadLink>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
