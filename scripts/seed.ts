// Sample data for local development: npm run db:seed
// Creates the guide demo@guidebook.local; sign in with that email to see it.
import { prisma } from "../src/lib/prisma";
import { seedDemoData } from "../src/lib/demo";
import { refreshTripPage } from "../src/lib/tripPageRefresh";

async function main() {
  const guide = await prisma.guide.upsert({
    where: { email: "demo@guidebook.local" },
    update: {},
    create: { email: "demo@guidebook.local", name: "Capt. Jay Morgan", businessName: "Marsh Light Charters", defaultTideStationId: "8670870" },
  });

  // Safe to run twice: skip if the guide already has data.
  if ((await prisma.client.count({ where: { guideId: guide.id } })) > 0) {
    console.log("Sample data already exists. Sign in as demo@guidebook.local");
    return;
  }

  const pageIds = await seedDemoData(guide.id, guide.timezone);
  // Real tides and forecast for the sample trips (best effort; needs internet).
  for (const id of pageIds) await refreshTripPage(id).catch(() => {});
  console.log("Seeded. Sign in as demo@guidebook.local");
}

main().finally(() => prisma.$disconnect());
