import type { Metadata } from "next";
import { requireGuide } from "@/lib/auth";
import { BackLink, PageHead } from "@/components/ui";
import { BLANK_TRIP_TYPE, TripTypeEditor } from "@/components/TripTypeEditor";

export const metadata: Metadata = { title: "New trip type" };

export default async function NewTripType() {
  await requireGuide();
  return (
    <div className="page page--narrow">
      <BackLink href="/settings">Settings</BackLink>
      <PageHead title="New trip type" sub="The template each booking and trip page is built from." />
      <TripTypeEditor initial={BLANK_TRIP_TYPE} />
    </div>
  );
}
