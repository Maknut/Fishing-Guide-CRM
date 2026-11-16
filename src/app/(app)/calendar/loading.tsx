export default function Loading() {
  return (
    <div className="page" aria-busy="true" aria-label="Loading">
      <div className="page-head">
        <span className="skel skel-title" style={{ width: "min(300px, 60%)", height: 38 }} />
      </div>
      <div className="cal-layout">
        <div className="panel cal">
          <div className="cal-grid">
            {Array.from({ length: 35 }, (_, i) => (
              <div key={i} className="cal-cell">
                <span className="skel" style={{ width: 24, height: 24, borderRadius: "50%" }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
