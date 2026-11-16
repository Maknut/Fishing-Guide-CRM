-- Driftline database setup.
-- Paste this whole file into the Supabase SQL editor and press Run.
-- Safe to run more than once: it only creates what is missing, never deletes data.
-- It matches prisma/schema.prisma; if you can run a terminal, `npx prisma db push` does the same job.

-- ---------- Value lists ----------
DO $$ BEGIN CREATE TYPE "EmailProvider" AS ENUM ('GMAIL', 'OUTLOOK'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "Channel" AS ENUM ('SMS', 'EMAIL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "Direction" AS ENUM ('INBOUND', 'OUTBOUND'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "MsgStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "Slot" AS ENUM ('AM', 'PM', 'FULL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "BookingStatus" AS ENUM ('INQUIRY', 'CONFIRMED', 'COMPLETED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "WeatherStatus" AS ENUM ('PENDING', 'AVAILABLE', 'STALE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- Tables ----------
CREATE TABLE IF NOT EXISTS "Guide" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "businessName" TEXT,
  "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
  "twilioNumber" TEXT,
  "emailProvider" "EmailProvider",
  "emailAddress" TEXT,
  "defaultTideStationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Guide_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Client" (
  "id" TEXT NOT NULL,
  "guideId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "notes" TEXT,
  "tags" TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Client_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Client_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Conversation" (
  "id" TEXT NOT NULL,
  "guideId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "lastMessageAt" TIMESTAMP(3),
  "unreadCount" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Conversation_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Conversation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "TripType" (
  "id" TEXT NOT NULL,
  "guideId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slot" "Slot" NOT NULL,
  "durationHours" DOUBLE PRECISION NOT NULL,
  "maxAnglers" INTEGER NOT NULL DEFAULT 2,
  "priceCents" INTEGER,
  "meetingSpot" TEXT NOT NULL,
  "meetingLat" DOUBLE PRECISION,
  "meetingLng" DOUBLE PRECISION,
  "tideStationId" TEXT,
  "description" TEXT,
  "gearBring" TEXT[],
  "gearNotBring" TEXT[],
  "faqs" JSONB NOT NULL DEFAULT '[]',
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TripType_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TripType_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Booking" (
  "id" TEXT NOT NULL,
  "guideId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "tripTypeId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "slot" "Slot" NOT NULL,
  "startTime" TEXT NOT NULL,
  "anglers" INTEGER NOT NULL DEFAULT 1,
  "status" "BookingStatus" NOT NULL DEFAULT 'INQUIRY',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Booking_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Booking_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Booking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Booking_tripTypeId_fkey" FOREIGN KEY ("tripTypeId") REFERENCES "TripType"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Message" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "channel" "Channel" NOT NULL,
  "direction" "Direction" NOT NULL,
  "body" TEXT NOT NULL,
  "externalId" TEXT,
  "subject" TEXT,
  "status" "MsgStatus" NOT NULL DEFAULT 'DELIVERED',
  "pinnedToBookingId" TEXT,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Message_pinnedToBookingId_fkey" FOREIGN KEY ("pinnedToBookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "BlockedDay" (
  "id" TEXT NOT NULL,
  "guideId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "slot" "Slot" NOT NULL DEFAULT 'FULL',
  "reason" TEXT,
  CONSTRAINT "BlockedDay_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BlockedDay_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "Guide"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "TripPage" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "sections" JSONB NOT NULL DEFAULT '[]',
  "tideStationId" TEXT,
  "tidePredictions" JSONB,
  "weatherStatus" "WeatherStatus" NOT NULL DEFAULT 'PENDING',
  "weatherSnapshot" JSONB,
  "weatherFetchedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TripPage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TripPage_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Sign-in tables (Auth.js)
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "email" TEXT NOT NULL,
  "emailVerified" TIMESTAMP(3),
  "image" TEXT,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Account" (
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("provider", "providerAccountId"),
  CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Session" (
  "sessionToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("sessionToken"),
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "VerificationToken" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier", "token")
);

-- ---------- Indexes ----------
CREATE UNIQUE INDEX IF NOT EXISTS "Guide_email_key" ON "Guide"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Guide_twilioNumber_key" ON "Guide"("twilioNumber");
CREATE INDEX IF NOT EXISTS "Client_guideId_idx" ON "Client"("guideId");
CREATE UNIQUE INDEX IF NOT EXISTS "Client_guideId_phone_key" ON "Client"("guideId", "phone");
CREATE UNIQUE INDEX IF NOT EXISTS "Conversation_clientId_key" ON "Conversation"("clientId");
CREATE INDEX IF NOT EXISTS "Conversation_guideId_lastMessageAt_idx" ON "Conversation"("guideId", "lastMessageAt");
CREATE INDEX IF NOT EXISTS "Message_conversationId_sentAt_idx" ON "Message"("conversationId", "sentAt");
CREATE INDEX IF NOT EXISTS "Message_externalId_idx" ON "Message"("externalId");
CREATE INDEX IF NOT EXISTS "TripType_guideId_idx" ON "TripType"("guideId");
CREATE INDEX IF NOT EXISTS "Booking_guideId_date_slot_idx" ON "Booking"("guideId", "date", "slot");
CREATE INDEX IF NOT EXISTS "Booking_guideId_status_idx" ON "Booking"("guideId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "BlockedDay_guideId_date_slot_key" ON "BlockedDay"("guideId", "date", "slot");
CREATE UNIQUE INDEX IF NOT EXISTS "TripPage_bookingId_key" ON "TripPage"("bookingId");
CREATE UNIQUE INDEX IF NOT EXISTS "TripPage_slug_key" ON "TripPage"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- ---------- Upgrade from the first version ----------
-- Older databases had a rule that kept a cancelled booking's slot locked. Remove it if present.
DROP INDEX IF EXISTS "Booking_guideId_date_slot_key";
DROP INDEX IF EXISTS "Booking_guideId_date_idx";

-- ---------- Supabase: keep these tables private ----------
-- The app talks to the database directly with its own password. Turning on row level
-- security (with no policies) blocks Supabase's public web API from reading these tables,
-- without affecting the app.
ALTER TABLE "Guide" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TripType" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Booking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BlockedDay" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TripPage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VerificationToken" ENABLE ROW LEVEL SECURITY;
