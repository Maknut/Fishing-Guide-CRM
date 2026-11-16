# Running Guidebook on your own computer — a non-developer's guide

This walks you through seeing the real app running in your web browser, with sample data already loaded. It'll take about 20–30 minutes the first time. You'll use two free web services and one program install — no coding.

---

## What you'll install/sign up for

1. **Node.js** — the program that runs the app (free install)
2. **Supabase** — a free database (just a website signup, no install)
3. **Mailtrap** — a free "fake email inbox" so you can click the login link (just a website signup, no install)

---

## Step 1: Install Node.js

1. Go to **https://nodejs.org**
2. Download the version marked **LTS** (not "Current")
3. Run the installer, click through with default options

**Check it worked:** open the **Terminal** app (Mac: search "Terminal" in Spotlight) or **PowerShell** (Windows: search in Start menu). Type this and press Enter:

```
node -v
```

You should see something like `v22.x.x`. If you see an error, restart your computer and try again.

---

## Step 2: Unzip the project

Unzip the `guidebook.zip` file I gave you into a location you'll remember, like your Desktop.

---

## Step 3: Open the project folder in Terminal

In Terminal/PowerShell, type `cd ` (with a space after it), then drag the unzipped `guidebook` folder from Finder/File Explorer into the Terminal window — this auto-fills the path. Press Enter.

You can check you're in the right place by typing:

```
ls
```

(Windows: type `dir` instead.) You should see files like `package.json` and `README.md`.

---

## Step 4: Install the app's building blocks

Still in Terminal, type:

```
npm install
```

This downloads everything the app needs. It'll take a minute or two and print a lot of text — that's normal. Wait until you get your cursor back.

---

## Step 5: Get a free database (Supabase)

1. Go to **https://supabase.com** and sign up (free)
2. Click **New project**
3. Give it any name, set a database password (write it down somewhere), pick any region, click **Create**
4. Wait ~2 minutes for it to set up
5. Once ready, go to **Project Settings** (gear icon) → **Database**
6. Find **Connection string**, choose the **URI** tab, and copy it. It'll look like:
   `postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-...supabase.com:5432/postgres`
7. Replace `[YOUR-PASSWORD]` in that string with the password you set in step 3

Keep this copied — you'll paste it in Step 7.

---

## Step 6: Get a free fake email inbox (Mailtrap)

The app sends a "magic link" to log in instead of a password. Mailtrap catches that email so you can click it, without needing to set up real email.

1. Go to **https://mailtrap.io** and sign up (free)
2. Go to **Email Testing** → you'll see a default **Sandbox** inbox already created
3. Click into it, find **SMTP Settings**, choose **Nodemailer** from the dropdown
4. You'll see something like:
   ```
   host: 'sandbox.smtp.mailtrap.io',
   port: 2525,
   auth: { user: 'abc123', pass: 'xyz789' }
   ```
5. Keep this tab open — you'll need the `user` and `pass` values next.

---

## Step 7: Create your settings file

1. In the `guidebook` folder, find the file named `.env.example`
2. Make a copy of it and rename the copy to exactly `.env` (no ".example")
   - Mac: if you don't see the file extension, that's fine — just make sure it's named `.env`
3. Open `.env` in any text editor (TextEdit, Notepad, or similar)
4. Fill in these lines:

```
DATABASE_URL="<paste your Supabase connection string from Step 5>"

AUTH_SECRET="anything-you-want-here-just-make-it-long-and-random"

EMAIL_SERVER="smtp://<mailtrap-user>:<mailtrap-pass>@sandbox.smtp.mailtrap.io:2525"
EMAIL_FROM="Guidebook <login@guidebook.local>"
```

Everything else in the file (Twilio, NWS, CRON_SECRET) you can leave as-is or blank for now — those only matter for texting and weather, not for just viewing the app.

Save the file.

---

## Step 8: Set up the database tables

Back in Terminal (still in the `guidebook` folder), type:

```
npx prisma db push
```

This creates all the tables in your Supabase database. Run it again any time an update changes the database.

---

## Step 9: Load sample data

```
npm run db:seed
```

This fills the database with a demo fishing guide, clients, bookings, and messages, so the app isn't empty.

---

## Step 10: Start the app

```
npm run dev
```

You'll see a message like `Ready on http://localhost:3000`. Leave this Terminal window open — closing it stops the app.

---

## Step 11: Open it in your browser

1. Go to **http://localhost:3000**
2. It'll ask you to sign in — enter: **demo@guidebook.local**
3. Go check your **Mailtrap** inbox tab (Step 6) — a login email will have arrived within a few seconds
4. Open it and click the login link
5. You're in! Explore the dashboard, inbox, calendar, and clients — all pre-loaded with sample data.

---

## Using it again later

You don't need to repeat all these steps. Next time, just:

1. Open Terminal, `cd` into the `guidebook` folder (drag it in like Step 3)
2. Type `npm run dev`
3. Go to `http://localhost:3000`

## If something goes wrong

- **"command not found"** → Node.js isn't installed correctly; redo Step 1 and restart your computer
- **Database connection errors** → double check you replaced `[YOUR-PASSWORD]` in the Supabase URL with your actual password
- **No login email arrives** → double-check the `EMAIL_SERVER` line in `.env` matches your Mailtrap credentials exactly, no extra spaces

Texting (Twilio) and weather/tides won't fully work yet without additional setup — that's expected. This guide is just to get the app running and viewable.
