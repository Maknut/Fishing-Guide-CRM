import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, LogOut, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireGuideRecord } from "@/lib/auth";
import { slotLabel } from "@/lib/labels";
import { PageHead, btnClass } from "@/components/ui";
import { SettingsForm } from "@/components/SettingsForm";
import { signOutAction } from "../actions";

export const metadata: Metadata = { title: "Settings" };

export default async function Settings() {
  const guide = await requireGuideRecord();
  const tripTypes = await prisma.tripType.findMany({ where: { guideId: guide.id, archived: false }, orderBy: { name: "asc" } });

  return (
    <div className="page">
      <PageHead title="Settings" />

      <div className="settings-grid">
        <section className="settings-section">
          <header>
            <h2>Trip types</h2>
            <p>Templates for what you offer. Each one sets the length, meeting spot, gear lists and FAQs for its trip pages.</p>
          </header>
          <div className="panel">
            {tripTypes.length > 0 && (
              <div className="rows">
                {tripTypes.map(t => (
                  <Link key={t.id} href={`/settings/trip-types/${t.id}`} className="row">
                    <div className="grow">
                      <div className="title truncate">{t.name}</div>
                      <div className="meta truncate">{slotLabel(t.slot)}, {t.durationHours} hr, {t.meetingSpot}</div>
                    </div>
                    <ChevronRight className="chev" size={18} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            )}
            {tripTypes.length === 0 && <p className="panel-pad muted">No trip types yet. Create one before taking your first booking.</p>}
            <div className="panel-foot">
              <Link href="/settings/trip-types/new" className={btnClass({ size: "sm" })}>
                <Plus size={16} aria-hidden="true" />
                <span>New trip type</span>
              </Link>
            </div>
          </div>
        </section>
      </div>

      <div style={{ marginTop: 32 }}>
        <SettingsForm
          initial={{
            name: guide.name,
            businessName: guide.businessName ?? "",
            timezone: guide.timezone,
            twilioNumber: guide.twilioNumber,
            defaultTideStationId: guide.defaultTideStationId ?? "",
          }}
        />
      </div>

      <div className="settings-grid" style={{ marginTop: 32 }}>
        <section className="settings-section">
          <header>
            <h2>Email inbox</h2>
            <p>See client emails beside their texts.</p>
          </header>
          <div className="panel panel-pad">
            <p className="muted">Connecting Gmail or Outlook isn't available yet. Texting works today.</p>
          </div>
        </section>

        <section className="settings-section">
          <header>
            <h2>Account</h2>
            <p>You sign in with a link sent to your email. There's no password to remember.</p>
          </header>
          <div className="panel panel-pad" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div className="meta">Signed in as</div>
              <div className="truncate" style={{ fontWeight: 600 }}>{guide.email}</div>
            </div>
            <form action={signOutAction}>
              <button type="submit" className={btnClass()}>
                <LogOut size={17} aria-hidden="true" />
                <span>Sign out</span>
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
