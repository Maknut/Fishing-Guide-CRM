import { CalendarX } from "lucide-react";

export default function TripNotFound() {
  return (
    <main className="fullpage">
      <div className="inner">
        <span className="empty-icon" style={{ width: 56, height: 56, borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--sunk)", color: "var(--ink-3)" }}>
          <CalendarX size={26} aria-hidden="true" />
        </span>
        <h1>This trip page isn't available</h1>
        <p>The trip may have been cancelled or rescheduled, or the link is missing a few characters. Text or call your guide for an up-to-date link.</p>
      </div>
    </main>
  );
}
