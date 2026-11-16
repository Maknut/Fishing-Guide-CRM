import Link from "next/link";
import { Compass } from "lucide-react";
import { Empty } from "@/components/ui";

export default function AppNotFound() {
  return (
    <div className="page page--narrow">
      <div className="panel" style={{ marginTop: 24 }}>
        <Empty icon={<Compass size={22} />} title="We couldn't find that">
          <p>It may have been removed, or the link is out of date.</p>
          <Link href="/dashboard" className="btn btn--primary"><span>Go to home</span></Link>
        </Empty>
      </div>
    </div>
  );
}
