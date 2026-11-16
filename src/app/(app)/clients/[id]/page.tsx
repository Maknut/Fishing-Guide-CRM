import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Mail, Phone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireGuide } from "@/lib/auth";
import { fmtDate, plural } from "@/lib/dates";
import { fmtPhone } from "@/lib/labels";
import { Avatar, BackLink, StatusPill } from "@/components/ui";
import { ClientActions } from "@/components/ClientActions";
import { NotesEditor } from "@/components/NotesEditor";

export const metadata: Metadata = { title: "Client" };

export default async function ClientProfile({ params }: { params: Promise<{ id: string }> }) {
  const guideId = await requireGuide();
  const { id } = await params;
  const c = await prisma.client.findFirst({
    where: { id, guideId },
    include: { bookings: { include: { tripType: true }, orderBy: { date: "desc" } } },
  });
  if (!c) notFound();

  const completed = c.bookings.filter(b => b.status === "COMPLETED").length;

  return (
    <div className="page">
      <BackLink href="/clients">Clients</BackLink>

      <header className="page-head">
        <div className="profile-head">
          <Avatar name={c.name} large />
          <div style={{ minWidth: 0 }}>
            <h1>{c.name}</h1>
            <p className="sub">
              {c.bookings.length === 0 ? "No trips yet" : `${plural(c.bookings.length, "booking")}${completed > 0 ? `, ${completed} completed` : ""}`}
            </p>
          </div>
        </div>
        <div className="actions">
          <ClientActions client={{ id: c.id, name: c.name, phone: c.phone, email: c.email, tags: c.tags, notes: c.notes }} />
        </div>
      </header>

      <div className="two-col">
        <section className="panel" aria-label="Trip history">
          <div className="panel-head"><h2>Trips</h2></div>
          {c.bookings.length === 0 ? (
            <p className="panel-pad muted" style={{ paddingTop: 4 }}>Nothing booked yet. Use "Book a trip" to get {c.name.split(/\s+/)[0]} on the calendar.</p>
          ) : (
            <div className="rows">
              {c.bookings.map(b => (
                <Link key={b.id} href={`/bookings/${b.id}`} className="row">
                  <div className="datebox">
                    <div className="dow">{fmtDate(b.date, { month: "short" })}</div>
                    <div className="day">{b.date.getUTCDate()}</div>
                  </div>
                  <div className="grow">
                    <div className="title truncate">{b.tripType.name}</div>
                    <div className="meta">{fmtDate(b.date, { weekday: "long", year: "numeric" })}</div>
                  </div>
                  <StatusPill status={b.status} />
                  <ChevronRight className="chev" size={18} aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="stack">
          <section className="panel">
            <div className="panel-head"><h2>Contact</h2></div>
            <div className="panel-pad" style={{ paddingTop: 4, display: "grid", gap: 10 }}>
              {c.phone ? (
                <a href={`tel:${c.phone}`} className="inline-icon link"><Phone size={16} aria-hidden="true" />{fmtPhone(c.phone)}</a>
              ) : (
                <span className="inline-icon muted"><Phone size={16} aria-hidden="true" />No mobile number. Add one to text them.</span>
              )}
              {c.email ? (
                <a href={`mailto:${c.email}`} className="inline-icon link"><Mail size={16} aria-hidden="true" />{c.email}</a>
              ) : (
                <span className="inline-icon muted"><Mail size={16} aria-hidden="true" />No email</span>
              )}
              {c.tags.length > 0 && (
                <div className="tags" style={{ marginTop: 4 }}>
                  {c.tags.map(t => <span key={t} className="tag">{t}</span>)}
                </div>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head"><h2>Notes</h2></div>
            <div className="panel-pad" style={{ paddingTop: 4 }}>
              <NotesEditor endpoint={`/api/clients/${c.id}`} initial={c.notes ?? ""} label={`Notes about ${c.name}`} placeholder="Gets seasick in chop, brings his own 7wt, tips well" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
