# Putting the app on the internet — a non-developer's guide

End result: your app lives at a real URL (e.g. `https://yourapp.vercel.app`), updates itself whenever you save new code to GitHub, and the daily weather/tide refresh runs automatically. All free tiers.

This guide assumes you're on **Android using Termux**, like your local setup.

---

## The three pieces

| Service | What it does | Cost |
|---|---|---|
| **GitHub** | Stores the code. Vercel watches it for changes. | Free |
| **Vercel** | Runs the app on the internet. Made by the Next.js team. | Free (Hobby) |
| **Supabase** | The database. You already have this from local setup. | Free |
| **Resend** | Sends the login emails (Mailtrap was only for testing). | Free (3k emails/mo) |

---

## Part A: Get the code onto GitHub (one-time)

**1. Create a GitHub account** at https://github.com if you haven't — sign up with elied0327@gmail.com. Pick a username (you'll need it below).

**2. Create an empty repository:** click the **+** (top right) → **New repository**. Name it `guidebook` (or the product name). Leave it **Private** for now — you can flip to public when you open-source. Do NOT tick "add a README". Click **Create repository**.

**3. Make a Personal Access Token** (GitHub's version of a password for Termux):
- Click your profile photo → **Settings** → scroll to **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**
- Name: `termux`. Expiration: 90 days is fine. Tick the **repo** checkbox. Click **Generate token**.
- **Copy it now** — it won't be shown again. Paste it somewhere safe (a note).

**4. In Termux**, install git if you haven't:
```
pkg install git
```

**5. Still in Termux**, go into your project folder and run these one at a time :
```
cd ~/guidebook
git init
git add .
git commit -m "Initial Guidebook build"
git branch -M main
git remote add origin https://github.com/Maknut/Fishing-Guide-CRM.git
git push -u origin main
```
When it asks for a username, type your GitHub username. When it asks for a **password, paste the token** (not your real password). Nothing will appear as you paste — that's normal, just press Enter.

Refresh the GitHub page — you should see all your files. ✅

> **Important:** the `.env` file is deliberately excluded (it's in `.gitignore`), so your passwords never go to GitHub. That's correct.

---

## Part B: Set up login email (Resend)

1. Go to https://resend.com, sign up, verify your email.
2. **API Keys** → **Create API key** → name it `guidebook`, copy the key (starts with `re_`).
3. For now, Resend lets you send from `onboarding@resend.dev` without owning a domain. Once you buy a domain later, you'll add it under **Domains** and switch `EMAIL_FROM`.

---

## Part C: Put it on Vercel

**1.** Go to https://vercel.com and sign up **with your GitHub account** (click "Continue with GitHub"). This links them.

**2.** Click **Add New… → Project**. You'll see your `Fishing-Guide-CRM` repository — click **Import**.

**3.** Leave Framework as **Next.js** (auto-detected). Before clicking Deploy, open **Environment Variables** and add these (name on the left, value on the right):

| Name | Value |
|---|---|
| `DATABASE_URL` | Your Supabase connection string — **but see the note below** |
| `AUTH_SECRET` | Any long random string (e.g. mash the keyboard for 40 characters) |
| `AUTH_TRUST_HOST` | `true` |
| `EMAIL_SERVER` | `smtps://resend:YOUR_RESEND_API_KEY@smtp.resend.com:465` (swap in your real key, which starts with `re_`) |
| `EMAIL_FROM` | `Guidebook <onboarding@resend.dev>` |
| `NWS_USER_AGENT` | `guidebook (elied0327@gmail.com)` |
| `CRON_SECRET` | Another long random string |
| `TWILIO_ACCOUNT_SID` | leave blank for now |
| `TWILIO_AUTH_TOKEN` | leave blank for now |
| `TWILIO_WEBHOOK_URL` | leave blank for now |

> **Database URL note:** Vercel runs "serverless," which works best with Supabase's **connection pooler**. In Supabase: Project Settings → Database → Connection string → choose **Transaction** mode (port **6543**) and use that URL here. Add `?pgbouncer=true` to the end of it.

**4.** Click **Deploy**. Takes 1–3 minutes. When it finishes you'll get a URL like `https://guidebook-abc123.vercel.app`. 🎉

**5.** **Create the database tables in production.** Back in Termux, run this ONE time (use the **direct** Supabase URL here — port 5432, not the pooler — because migrations need a direct connection):
```
DATABASE_URL="postgresql://postgres.xxxx:PASSWORD@aws-...supabase.com:5432/postgres" ./scripts/migrate-prod.sh
```
If you set up the local database earlier against the same Supabase project, the tables already exist and this will say the database is already in sync, which is fine.

**6.** Open your Vercel URL, enter your email, click the login link Resend sends you. You're live.

---

## Part D: Turn on the daily weather/tide refresh

Vercel reads `vercel.json` and sets up the cron automatically. Just confirm it's there: Vercel project → **Settings** → **Cron Jobs**. You should see `/api/cron/refresh-trip-pages` at 9:00 UTC daily. (Hobby plan allows one daily cron — that's exactly what we use.)

---

## Making changes from now on

Whenever I give you updated code:
```
cd ~/guidebook
git add .
git commit -m "describe what changed"
git push
```
Vercel sees the push and redeploys in ~2 minutes. Nothing else to do.

If a change includes a **database change** (I'll tell you), also run the `migrate-prod.sh` command from step C5.

---

## When you're ready for a real domain

1. Buy one (Namecheap, Porkbun, Cloudflare — ~$10–15/yr).
2. Vercel project → **Settings → Domains** → add it. Vercel shows you two DNS records to add at your registrar.
3. Add the domain in Resend → **Domains**, add their DNS records too, then change `EMAIL_FROM` in Vercel to `Guidebook <login@yourdomain.com>`.
4. Update `TWILIO_WEBHOOK_URL` (when Twilio is set up) to use the new domain.

---

## Troubleshooting

- **Build fails on Vercel** → click the failed deployment and read the last few red lines; send them to me.
- **"Invalid environment variable"** → a value has a stray quote or space. Re-paste it.
- **Login email never arrives** → check Resend → **Logs**. If it's rejected, `EMAIL_FROM` must be `onboarding@resend.dev` until you verify a domain.
- **App loads but says database error** → the `DATABASE_URL` in Vercel is wrong, or you skipped step C5.
