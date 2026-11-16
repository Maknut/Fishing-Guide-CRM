export default function TripLoading() {
  return (
    <main className="trip" aria-busy="true" aria-label="Loading your trip">
      <header className="trip-hero">
        <div className="inner" style={{ minHeight: 260 }} />
      </header>
      <div className="trip-body">
        {[120, 220, 160].map(h => (
          <div key={h} className="trip-card">
            <span className="skel skel-title" />
            <span className="skel" style={{ height: h - 70, marginTop: 16, borderRadius: 10 }} />
          </div>
        ))}
      </div>
    </main>
  );
}
