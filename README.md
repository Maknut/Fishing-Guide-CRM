# Guidebook (working name)

CRM + booking + trip management for fishing guides. Unified SMS/email inbox, half-day/full-day scheduling, and auto-populated client trip pages with NOAA weather, tides, and gear guidance.

## Stack

Next.js 15 (App Router) · TypeScript · Prisma · PostgreSQL · Auth.js (magic link) · Twilio (SMS) · NOAA NWS + Tides & Currents (free, US only)

## Setup

```bash
npm install
cp .env.example .env        # fill in values
npx prisma migrate dev      # creates DB schema
npm run dev
```

**Auth:** Auth.js tables are in the schema; a `Guide` row is auto-provisioned on first login (keyed by email). Magic-link login needs SMTP in `EMAIL_SERVER` — for local dev, [Mailpit](https://mailpit.axllent.org) (`smtp://localhost:1025`) works great and shows the login email in a local web UI.

**Demo data:** `npm run db:seed` creates guide `demo@guidebook.local` with clients, trip types, bookings, a conversation with a pinned message, and a live trip page. Log in with that email to explore.

## Architecture notes

- **Multi-tenancy:** every tenant-owned table carries `guideId`. API routes obtain `guideId` ONLY via `requireGuide()` (session), never from the request. Queries use `findFirst({ where: { id, guideId } })`, not `findUnique(id)`.
- **Slots:** days split into AM/PM. `FULL` conflicts with `AM`+`PM`; enforced in `lib/bookings.ts` + a DB unique on `(guideId, date, slot)`.
- **Trip pages:** created with the booking; unguessable `slug`; `sections` is ordered JSON seeded from the TripType template (meet / bring / not-bring / FAQ / custom), guide-editable per booking.
- **Weather/tides:** tides fetched once (astronomical, valid years out). Weather fetched daily inside the ~7-day NWS window by `/api/cron/refresh-trip-pages` (wire to Vercel Cron; `CRON_SECRET` bearer). "What to wear" is a deterministic rules engine in `lib/weather.ts`.
- **SMS:** one Twilio number per guide (A2P 10DLC registration required — start early, takes days). Inbound webhook validates the Twilio signature, is idempotent on `MessageSid`, auto-creates unknown senders as `lead` clients.
- **Email channel:** schema-ready (`Channel.EMAIL`); Gmail/Outlook OAuth ingestion is the next integration (`emailProvider` fields on Guide).

## Docs

- `HOW-TO-RUN-LOCALLY.md` — local setup, non-dev
- `docs/DEPLOY.md` — GitHub + Vercel + Resend, non-dev
- `docs/TWILIO-SETUP.md` — Twilio account + A2P 10DLC registration answers

## Build order / status

- [x] Data model (Prisma schema)
- [x] Booking service w/ slot conflicts + trip page seeding
- [x] Clients + Bookings API
- [x] Twilio send/receive + webhook
- [x] NOAA weather + tides clients, refresh job, wear-rec rules
- [x] Public trip page (server component)
- [x] Auth.js tables + first-login Guide provisioning
- [x] Guide-facing UI: dashboard, inbox + thread (send/pin), calendar (AM/PM halves), bookings (create/detail/status), clients (list/add/profile)
- [ ] Email channel (Gmail first)
- [x] Settings screen (business, SMS number, tide station search) + Trip type editor
- [ ] SMS STOP/START opt-out handling
- [ ] Instagram DMs (phase 2) · Payments (phase 3)
