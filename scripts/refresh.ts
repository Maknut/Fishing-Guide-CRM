// Manual/local runner for the trip page refresh job (prod uses Vercel Cron -> API route)
import { refreshUpcomingTripPages } from "../src/lib/tripPageRefresh";
refreshUpcomingTripPages().then(r => { console.log(r); process.exit(0); });
