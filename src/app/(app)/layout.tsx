import { prisma } from "@/lib/prisma";
import { requireGuideRecord } from "@/lib/auth";
import { Sidebar, TabBar } from "@/components/Nav";
import { ToastProvider } from "@/components/Toast";
import { isDemoEmail } from "@/lib/demo";
import { signOutAction } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const guide = await requireGuideRecord();
  const unread = await prisma.conversation.aggregate({ where: { guideId: guide.id }, _sum: { unreadCount: true } });
  const unreadCount = unread._sum.unreadCount ?? 0;

  return (
    <ToastProvider>
      <div className="shell">
        <Sidebar name={guide.name} business={guide.businessName} unread={unreadCount} signOut={signOutAction} />
        <main className="shell-main" id="main">
          {isDemoEmail(guide.email) && (
            <p className="demo-banner" role="note">
              <strong>Demo account.</strong> Everything here is sample data that only you can see. Texting is switched off, and the account is deleted after 7 days.
            </p>
          )}
          {children}
        </main>
        <TabBar unread={unreadCount} />
      </div>
    </ToastProvider>
  );
}
