export default function Loading() {
  const bubbles = [
    { w: "52%", out: false }, { w: "64%", out: true }, { w: "38%", out: false }, { w: "58%", out: true }, { w: "44%", out: false },
  ];
  return (
    <div className="thread" aria-busy="true" aria-label="Loading conversation">
      <header className="thread-head">
        <span className="skel" style={{ width: 40, height: 40, borderRadius: "50%" }} />
        <div className="who" style={{ display: "grid", gap: 8 }}>
          <span className="skel skel-line" style={{ width: 140 }} />
          <span className="skel skel-line" style={{ width: 96, height: 10 }} />
        </div>
      </header>
      <div className="thread-msgs">
        {bubbles.map((b, i) => (
          <div key={i} className={`bubble-wrap${b.out ? " is-out" : ""}`} style={{ marginTop: 12 }}>
            <span className="skel" style={{ width: b.w, height: 40, borderRadius: 18 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
