import type { ReactNode } from "react";
import { Mark, Swell } from "./ui";
import { APP_NAME } from "@/lib/brand";

/** Two-panel frame for the signed-out screens: brand on one side, the task on the other. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="auth">
      <section className="auth-brand">
        <Swell />
        <div className="mark"><Mark size={24} />{APP_NAME}</div>
        <div>
          <h1>Less phone tag. More time on the water.</h1>
          <p>Texts, bookings and a trip page for every client, with tides and the forecast filled in for you.</p>
        </div>
      </section>
      <section className="auth-form">
        <div className="inner">{children}</div>
      </section>
    </main>
  );
}
