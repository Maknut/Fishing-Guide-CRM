"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Plus, Search, Users } from "lucide-react";
import { fmtPhone } from "@/lib/labels";
import { Avatar, Button, Empty, PageHead } from "./ui";
import { ClientForm } from "./ClientForm";

export type ClientRow = { id: string; name: string; phone: string | null; email: string | null; tags: string[]; trips: number; lastTrip: string | null };

export function ClientList({ clients, openNew }: { clients: ClientRow[]; openNew: boolean }) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(openNew);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    const digits = q.replace(/\D/g, "");
    return clients.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        c.tags.some(t => t.toLowerCase().includes(q)) ||
        (digits.length >= 3 && (c.phone ?? "").includes(digits)),
    );
  }, [clients, query]);

  return (
    <div className="page">
      <PageHead title="Clients" sub={clients.length > 0 ? `${clients.length} ${clients.length === 1 ? "person" : "people"}` : undefined}>
        <Button variant="primary" icon={<Plus size={18} aria-hidden="true" />} onClick={() => setAdding(true)}>
          Add client
        </Button>
      </PageHead>

      {clients.length === 0 ? (
        <div className="panel">
          <Empty icon={<Users size={22} />} title="No clients yet">
            <p>Add the people you fish with. Anyone who texts your business number is added here automatically.</p>
            <Button variant="primary" onClick={() => setAdding(true)}>Add your first client</Button>
          </Empty>
        </div>
      ) : (
        <>
          <div className="input-icon" style={{ maxWidth: 420, marginBottom: 16 }}>
            <Search size={18} aria-hidden="true" />
            <input className="input" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, number or tag" aria-label="Search clients" />
          </div>

          <div className="panel">
            <div className="client-table-head label" aria-hidden="true">
              <span>Name</span><span>Contact</span><span>Tags</span><span>Trips</span><span />
            </div>
            {shown.length === 0 ? (
              <Empty compact title={`No one matches "${query.trim()}"`}>
                <p>Check the spelling, or add them as a new client.</p>
              </Empty>
            ) : (
              <div className="rows">
                {shown.map(c => (
                  <Link key={c.id} href={`/clients/${c.id}`} className="row client-row">
                    <div className="who">
                      <Avatar name={c.name} />
                      <div style={{ minWidth: 0 }}>
                        <div className="title truncate">{c.name}</div>
                        <div className="meta truncate mobile-meta">
                          {c.tags.length > 0 ? c.tags.slice(0, 3).join(", ") : fmtPhone(c.phone) || c.email || "No contact details"}
                        </div>
                      </div>
                    </div>
                    <div className="contact meta truncate">{fmtPhone(c.phone) || c.email || "None on file"}</div>
                    <div className="last tags">
                      {c.tags.slice(0, 3).map(t => <span key={t} className="tag">{t}</span>)}
                    </div>
                    <div className="meta" style={{ flex: "none" }}>{c.trips} {c.trips === 1 ? "trip" : "trips"}</div>
                    <ChevronRight className="chev" size={18} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <ClientForm open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
