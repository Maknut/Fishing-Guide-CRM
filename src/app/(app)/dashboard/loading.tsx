import { RowsSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <div className="page" aria-busy="true" aria-label="Loading">
      <div className="page-head">
        <span className="skel skel-title" style={{ width: "min(360px, 70%)", height: 38 }} />
      </div>
      <div className="dash">
        <div className="dash-main">
          <div className="today" style={{ padding: 24, display: "grid", gap: 14 }}>
            <span className="skel" style={{ width: 96, height: 24, borderRadius: 999 }} />
            <span className="skel" style={{ width: "62%", height: 28, borderRadius: 8 }} />
            <span className="skel skel-line" style={{ width: "44%" }} />
            <span className="skel" style={{ height: 132, borderRadius: 10, marginTop: 8 }} />
          </div>
          <RowsSkeleton rows={3} />
        </div>
      </div>
    </div>
  );
}
