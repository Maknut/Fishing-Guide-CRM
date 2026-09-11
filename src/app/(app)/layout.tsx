import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { TabBar } from "@/components/TabBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/api/auth/signin");
  return (
    <div className="shell">
      <main className="shell-main">{children}</main>
      <TabBar />
    </div>
  );
}
