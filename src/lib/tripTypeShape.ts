import { z } from "zod";

const line = z.string().trim().min(1).max(200);

export const TripTypeInput = z.object({
  name: z.string().trim().min(1, "Give the trip type a name.").max(120),
  slot: z.enum(["AM", "PM", "FULL"]),
  durationHours: z.number().positive("Trip length must be more than 0 hours.").max(24),
  maxAnglers: z.number().int().min(1, "A trip needs at least 1 angler.").max(6, "Up to 6 anglers per trip."),
  meetingSpot: z.string().trim().min(1, "Add where clients should meet you.").max(200),
  meetingLat: z.number().min(-90, "Latitude should be between -90 and 90.").max(90, "Latitude should be between -90 and 90.").nullable().optional(),
  meetingLng: z.number().min(-180, "Longitude should be between -180 and 180.").max(180, "Longitude should be between -180 and 180.").nullable().optional(),
  tideStationId: z.string().trim().regex(/^\d{7}$/, "Tide station IDs are 7 digits.").nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  gearBring: z.array(line).max(40).default([]),
  gearNotBring: z.array(line).max(40).default([]),
  faqs: z.array(z.object({ q: z.string().trim().min(1).max(300), a: z.string().trim().max(2000) })).max(30).default([]),
});

export const TripTypePatch = TripTypeInput.partial().extend({ archived: z.boolean().optional() });
