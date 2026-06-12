# Cake Day — Setup Guide

You're about to put a real product on the internet. Everything here is
free except an optional domain name later. Budget **about an hour** of
following instructions. You will not need to touch the code.

**The four pieces and what each one does:**

| Piece | Job | Analogy |
|---|---|---|
| GitHub | stores the code | the filing cabinet |
| Vercel | runs the website + the daily timer | the shopfront and the alarm clock |
| Neon | the database (created *through* Vercel) | the ledger of who signed up |
| Resend | sends the emails | the post office |

---

## Step 1 — Create your accounts (10 min)

1. **GitHub** — go to https://github.com → Sign up. Free plan.
2. **Vercel** — go to https://vercel.com → Sign up → choose
   **"Continue with GitHub"** (this links them, which matters later).
   Free "Hobby" plan.
3. **Resend** — go to https://resend.com → Sign up. Free plan.

## Step 2 — Put the code on GitHub (10 min)

1. On GitHub, click the **+** (top right) → **New repository**.
2. Name it `cakeday`, set it to **Private**, click **Create repository**.
3. On the next screen, click the link that says **"uploading an existing
   file"**.
4. Unzip the cakeday folder on your computer, then **drag the CONTENTS of
   the folder** (the `app` folder, `lib` folder, `package.json`, etc. —
   not the outer folder itself) into the browser window.
5. Wait for uploads to finish, then click **Commit changes**.

✅ *Success looks like:* your repository page shows `app`, `lib`,
`package.json`, `vercel.json` at the top level.

## Step 3 — Create the project on Vercel (10 min)

1. In Vercel, click **Add New… → Project**.
2. Find your `cakeday` repository in the list and click **Import**.
3. **STOP before clicking Deploy.** First we attach the database:
   it's easier to add the environment variables in one sitting (Step 5),
   so just click **Deploy** now and let this first deploy **fail or look
   broken — that's expected.** We'll fix it in two minutes.
4. After it finishes, note your site's address — something like
   `https://cakeday-xxxx.vercel.app`. Copy it somewhere.

## Step 4 — Create the database (5 min)

1. In your Vercel project, open the **Storage** tab.
2. Click **Create Database** → choose **Neon** (Postgres) → accept the
   defaults → Create.
3. When asked to connect it to your project, say yes. This automatically
   adds `DATABASE_URL` to your project's environment variables — one
   less thing to paste.

## Step 5 — Get your Resend key, then fill in the settings (10 min)

1. In Resend: **API Keys → Create API Key**. Name it `cakeday`, leave
   permissions as default, click Create, and **copy the key now** (it
   starts with `re_` and is only shown once).
2. In Vercel: your project → **Settings → Environment Variables**.
   Add each of these (Name on the left, Value on the right), then Save:

   | Name | Value |
   |---|---|
   | `RESEND_API_KEY` | the `re_...` key you just copied |
   | `EMAIL_FROM` | `Cake Day <onboarding@resend.dev>` |
   | `APP_URL` | your site address from Step 3, e.g. `https://cakeday-xxxx.vercel.app` (no slash at the end) |
   | `CRON_SECRET` | make up 30+ random characters — letters and numbers, like a long password. Save it somewhere; you'll use it once for testing |
   | `SHOP_NAME` | your card business name |
   | `SHOP_URL` | your shop's web address, starting with `https://` |
   | `NEXT_PUBLIC_SHOP_NAME` | same as SHOP_NAME |
   | `NEXT_PUBLIC_SHOP_URL` | same as SHOP_URL |
   | `DISCOUNT_CODE` | e.g. `CAKEDAY10` — create the matching code in your shop |
   | `REMINDER_TZ` | `Australia/Sydney` |
   | `LEAD_DAYS` | `7` |

3. Redeploy so the settings take effect: **Deployments** tab → click the
   **⋯** on the latest deployment → **Redeploy**.

✅ *Success looks like:* opening your site address shows the Cake Day
landing page with the cake logo and a signup box.

## Step 6 — Test the whole loop with yourself (10 min)

> ⚠️ **Important quirk while you're testing:** until you verify your own
> domain (Step 8), Resend only delivers to **the email address you used
> to sign up for Resend**. Use that address for this test.

1. Open your site, enter your email, click **Get my free reminders**.
2. Check your inbox → click **Confirm my reminders**. You should land on
   your (empty) birthday list.
3. Add a birthday **dated today** (pick anyone — you can delete it
   after). Add a year too, so you see the age feature.
4. Now trigger the reminder job by hand instead of waiting for the
   scheduler. Open **Terminal** (Mac: press Cmd+Space, type "Terminal",
   press Enter) and paste this — replacing the two CAPITALISED parts:

   ```
   curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://YOUR-SITE.vercel.app/api/cron
   ```

   Press Enter.

✅ *Success looks like:* the terminal prints something like
`{"date":"2026-06-12","sent":1,...}` and the **"It's their birthday
today!"** email — with three copy-paste messages and your shop's
discount code — arrives in your inbox. That email is the product.
From now on, Vercel runs this automatically once a day (between 6 and
7am Sydney time).

## Step 7 — Understand the daily rhythm

Every morning the job checks every confirmed subscriber and sends:
- a **heads-up email 7 days before** each birthday ("time to post a card")
- a **day-of email** with ready-to-send messages

A diary table in the database guarantees nobody gets the same email
twice, even if the job runs twice.

## Step 8 — Go properly live (when you're ready, ~20 min + up to a day of waiting)

Two things turn this from "working test" into "real product":

1. **A domain** (e.g. `cakeday.com.au`, ~AU$20/yr from any registrar
   such as VentraIP or GoDaddy). In Vercel: project → **Settings →
   Domains** → add it and follow the DNS instructions shown.
2. **Verify the domain in Resend** so you can email *anyone*, from your
   own address: Resend → **Domains → Add Domain** → it shows you 3–4
   DNS records (TXT/MX lines — think of them as adding your signature
   to the postal register so inboxes trust you). Add them wherever you
   bought the domain. Verification can take minutes to a day.
   Then change `EMAIL_FROM` in Vercel to
   `Cake Day <hello@yourdomain.com.au>` and redeploy.

## Your marketing list (the quiet asset)

People who ticked "send me occasional card ideas and offers" are a
**legally consented marketing list**. To export it: Vercel → Storage →
your Neon database → **Open in Neon** → SQL Editor → run:

```sql
SELECT email FROM lists
WHERE marketing_ok = TRUE AND unsubscribed = FALSE AND confirmed = TRUE;
```

**Rules to stay on the right side of the Spam Act (Australia):** only
email marketing to people from this query; always identify your business
in the email; always include a working unsubscribe. The reminder emails
already do all three automatically — this rule is for any extra
campaigns you send yourself.

## Limits to know (free tiers)

- **Resend:** 100 emails/day, 3,000/month. One subscriber ≈ 2–4 emails
  a month, so roughly **500–1,000 subscribers** fit the free tier.
  Past that, Resend Pro is ~US$20/month — a nice problem to have.
- **Vercel:** the daily job can fire any time within the scheduled hour;
  exact-minute timing isn't guaranteed on the free plan. For birthday
  reminders, that's fine.

## Changing things later (no coding needed)

- Reminder lead time → edit `LEAD_DAYS` in Vercel settings, redeploy.
- Discount code → edit `DISCOUNT_CODE`, redeploy.
- Message wording → the templates live in `lib/messages.js`; edit the
  file on GitHub (pencil icon), commit, and Vercel redeploys itself.
