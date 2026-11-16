"use client";
import Link from "next/link";
import { useState } from "react";
import { CalendarPlus, Pencil } from "lucide-react";
import { Button, btnClass } from "./ui";
import { ClientForm, type ClientValues } from "./ClientForm";
import { MessageButton } from "./MessageButton";

/** Message, book and edit buttons on a client's profile. */
export function ClientActions({ client }: { client: ClientValues & { id: string } }) {
  const [editing, setEditing] = useState(false);

  return (
    <>
      <MessageButton clientId={client.id} variant="primary" />
      <Link href={`/bookings/new?client=${client.id}`} className={btnClass()}>
        <CalendarPlus size={17} aria-hidden="true" />
        <span>Book a trip</span>
      </Link>
      <Button icon={<Pencil size={16} aria-hidden="true" />} onClick={() => setEditing(true)}>
        Edit
      </Button>
      <ClientForm open={editing} onClose={() => setEditing(false)} client={client} />
    </>
  );
}
