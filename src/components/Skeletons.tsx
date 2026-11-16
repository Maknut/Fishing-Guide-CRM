// Loading placeholders shaped like the screens they stand in for, so the layout
// doesn't jump when the real content arrives.

export function RowsSkeleton({ rows = 4, avatar = false }: { rows?: number; avatar?: boolean }) {
  return (
    <div className="panel">
      <div className="rows">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="row">
            {avatar && <span className="skel" style={{ width: 40, height: 40, borderRadius: "50%", flex: "none" }} />}
            <div className="grow" style={{ display: "grid", gap: 8 }}>
              <span className="skel skel-line" style={{ width: `${52 - (i % 3) * 9}%` }} />
              <span className="skel skel-line" style={{ width: `${34 + (i % 2) * 12}%`, height: 10 }} />
            </div>
            <span className="skel" style={{ width: 76, height: 24, borderRadius: 999, flex: "none" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton({ narrow = false, rows = 5, avatar = false }: { narrow?: boolean; rows?: number; avatar?: boolean }) {
  return (
    <div className={`page${narrow ? " page--narrow" : ""}`} aria-busy="true" aria-label="Loading">
      <div className="page-head">
        <span className="skel skel-title" style={{ width: "min(320px, 60%)", height: 38 }} />
      </div>
      <RowsSkeleton rows={rows} avatar={avatar} />
    </div>
  );
}
