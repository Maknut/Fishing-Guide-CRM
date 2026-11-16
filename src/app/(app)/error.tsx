"use client";
import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button, Empty } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page page--narrow">
      <div className="panel" style={{ marginTop: 24 }}>
        <Empty icon={<TriangleAlert size={22} />} title="This screen didn't load">
          <p>Something went wrong on our end. Your data is safe. Try again, and if it keeps happening, check your connection.</p>
          <Button variant="primary" onClick={reset}>Try again</Button>
        </Empty>
      </div>
    </div>
  );
}
