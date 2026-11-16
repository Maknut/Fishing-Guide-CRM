# Publishing on Netlify

The repo is ready for Netlify: `netlify.toml` holds the build settings and a scheduled
function runs the daily tide and forecast refresh.

## One-time setup (about 10 minutes, all in the browser)

1. Go to https://app.netlify.com and choose **Add new site → Import an existing project**.
2. Pick **GitHub**, authorize Netlify, and choose `Maknut/Fishing-Guide-CRM`.
3. Leave the build settings as detected (they come from `netlify.toml`).
4. Before deploying, open **Environment variables** and add:

| Name | Value |
|---|---|
| `DATABASE_URL` | Supabase **Transaction pooler** URL (port 6543) with `?pgbouncer=true` on the end |
| `AUTH_SECRET` | Any long random string |
| `AUTH_TRUST_HOST` | `true` |
| `EMAIL_SERVER` | `smtp://resend:YOUR_RESEND_API_KEY@smtp.resend.com:465` |
| `EMAIL_FROM` | `Driftline <onboarding@resend.dev>` |
| `NWS_USER_AGENT` | `driftline (your email address)` |
| `CRON_SECRET` | Another long random string |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WEBHOOK_URL` | Add when Twilio is set up |

5. Click **Deploy**. Every push to `main` redeploys automatically after that.

## Database

No terminal? Open `prisma/setup.sql`, copy all of it into the Supabase SQL editor and press Run. Otherwise:

Create or update the tables once, from any terminal, using the **direct** Supabase URL (port 5432):

```
DATABASE_URL="postgresql://postgres.xxxx:PASSWORD@...supabase.com:5432/postgres" ./scripts/migrate-prod.sh
```

## After the first deploy

- Sign in at your `*.netlify.app` address with your email.
- When Twilio is ready, set `TWILIO_WEBHOOK_URL` to `https://YOUR-SITE.netlify.app/api/webhooks/twilio`
  and use the same address in the Twilio console.
