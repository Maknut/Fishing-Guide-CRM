import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireGuide } from "@/lib/auth";
import { ScreenTitle } from "@/components/ScreenTitle";

export default async function Inbox() {
  const guideId = await requireGuide();
  const threads = await prisma.conversation.findMany({
    where: { guideId },
    include: { client: true, messages: { orderBy: { sentAt: "desc" }, take: 1 } },
    orderBy: { lastMessageAt: "desc" },
  });

  return (
    <>
      <ScreenTitle>Inbox</ScreenTitle>
      {threads.length === 0 && <p className="dim">No conversations yet. They'll appear when a client texts your business number.</p>}
      {threads.map(t => {
        const last = t.messages[0];
        return (
          <Link key={t.id} href={`/inbox/${t.id}`} className="card">
            <div className="row">
              <div style={{ minWidth: 0 }}>
                <div className="title-sm" style={{ fontWeight: t.unreadCount > 0 ? 800 : 600 }}>
                  {last?.channel === "EMAIL" ? "✉️" : "💬"} {t.client.name}
                </div>
                <div className="dim" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {last ? `${last.direction === "OUTBOUND" ? "You: " : ""}${last.body}` : "No messages"}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div className="dim">{t.lastMessageAt?.toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}</div>
                {t.unreadCount > 0 && <span className="pill confirmed">{t.unreadCount}</span>}
              </div>
            </div>
          </Link>
        );
      })}
    </>
  );
}
