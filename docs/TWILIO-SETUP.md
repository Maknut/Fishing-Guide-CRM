# Twilio setup & A2P 10DLC registration kit

Business texting in the US requires **A2P 10DLC registration** — carriers must approve your business and use case before your number can text reliably. Unregistered numbers get filtered/blocked. Registration takes **3 days to 3 weeks**, so start now, before the app is even polished.

---

## Step 1: Twilio account (10 minutes)

1. Sign up at https://twilio.com/try-twilio
2. Verify your phone number
3. **Upgrade the account** (add a payment method). Trial accounts can only text numbers you've manually verified, which is useless for real clients. You're not charged until you use it — SMS is ~$0.0083/message, a number is ~$1.15/month.
4. In the console, note your **Account SID** and **Auth Token** (Account Info box on the home page). These go in Vercel as `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN`.

## Step 2: Buy a number

**Phone Numbers → Manage → Buy a number.** Filter by your area code, tick **SMS** and **Voice**. Buy one. This is the first guide's business line (yours, for testing).

Configure it: click the number → **Messaging** section → "A message comes in" → **Webhook** → paste `https://YOUR-VERCEL-URL/api/webhooks/twilio`, method **HTTP POST**. Save. Put that same URL in Vercel as `TWILIO_WEBHOOK_URL`.

## Step 3: A2P 10DLC registration

**Messaging → Regulatory Compliance → A2P 10DLC.** Two parts:

### 3a. Business Profile / Brand
You'll register **your** business (the software company) as the brand. Have ready:
- Legal business name (sole proprietor is fine — use your name if no LLC)
- EIN, or SSN for sole proprietors
- Business address, website (your Vercel URL is fine), and your contact info
- Business type: **Sole Proprietor** or **Private Company**
- Industry: **Technology** or **Recreation/Leisure**

Low-volume "Sole Proprietor" brand: cheapest ($4 one-time + $2/mo campaign), capped at ~3,000 segments/day — plenty to start.

### 3b. Campaign — copy/paste answers

**Campaign use case:** `Mixed` (or `Customer Care` if Mixed isn't offered for sole props)

**Campaign description:**
> Guidebook is a booking and communication platform for independent fishing guides. Guides use it to send trip confirmations, scheduling updates, weather and meeting-point details, and to reply to client questions. Clients text the guide's dedicated business number; messages are conversational and initiated by, or in direct response to, the client.

**How do end-users consent to receive messages (opt-in)?**
> Clients opt in by texting the guide's business number directly, or by providing their mobile number when booking a trip and agreeing to receive trip-related texts. Consent language on the booking form: "By providing your number you agree to receive text messages about your trip. Reply STOP to opt out."

**Opt-in keywords:** `START, YES`
**Opt-out keywords:** `STOP, UNSUBSCRIBE, CANCEL`
**Help keywords:** `HELP`

**Opt-in message:**
> You're set to receive trip updates from [Guide Name]. Msg&data rates may apply. Reply STOP to opt out, HELP for help.

**Opt-out message:**
> You've been unsubscribed from [Guide Name] trip messages. Reply START to resubscribe.

**Help message:**
> [Guide Name] trip updates via Guidebook. Reply STOP to opt out. Questions? Text this number.

**Sample message 1:**
> Hi Mike, you're confirmed for Sat Aug 1, 6:00 AM half-day inshore. Meet at the North Ramp. Your trip page with weather, tides, and what to bring: https://guidebook.app/trip/abc123 — Capt. Jay

**Sample message 2:**
> Hey Sarah — forecast is looking windy Monday morning. Would 7am work instead of 6:30? Reply here and I'll update your trip page.

**Message contents:** tick **Embedded links** = Yes (trip page URLs). Phone numbers = No. Age-gated = No. Direct lending = No.

## Step 4: While waiting for approval

Twilio lets you send low volume to your own verified numbers immediately. Test the inbound webhook by texting your Twilio number from your personal phone — a "lead" client should appear in the app inbox within seconds.

## Notes for the multi-guide future

Each guide gets their own number, but they all sit under **your** brand + campaign (this is the standard ISV/platform model). Buying numbers per guide is done via the Twilio API — I'll add that to the onboarding flow when we get there. Alternatively, Twilio's **ISV Sole Proprietor** track lets each guide register as their own brand under your account; more paperwork per guide but higher throughput. Not needed at launch.

## Compliance to bake into the app (I'll build these)
- Handle `STOP`/`START`/`HELP` inbound keywords (Twilio does this automatically at the number level, but we should mark the client as opted-out in the app so the guide sees it)
- Consent checkbox text on any client-facing booking form
- Never send marketing/promos — trip-related only. This keeps us squarely in Customer Care territory.
