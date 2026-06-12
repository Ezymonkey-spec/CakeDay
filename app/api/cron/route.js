// ============================================================
// GET /api/cron — the heart of the app
// ------------------------------------------------------------
// Vercel's scheduler calls this once a day. It:
//   1. Checks the secret password (so random strangers can't
//      trigger thousands of emails by visiting the URL)
//   2. Works out today's date IN SYDNEY TIME, not server time
//   3. For every confirmed subscriber, finds birthdays that are
//      exactly LEAD_DAYS away ("time to buy a card") or today
//      ("here are messages to send right now")
//   4. Sends at most one email per person per type per day,
//      using sent_log as a diary so re-runs never double-send
// ============================================================

import { sql, ensureSchema } from "../../../lib/db";
import { todayInTZ, nextOccurrence, turningAge, isMilestone } from "../../../lib/dates";
import { sendUpcomingEmail, sendTodayEmail } from "../../../lib/email";

// Allow up to 60s of runtime (Vercel's free default is shorter).
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function GET(request) {
  // --- 1. the bouncer at the door ---
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureSchema();

    const tz = process.env.REMINDER_TZ || "Australia/Sydney";
    const leadDays = Number(process.env.LEAD_DAYS || 7);
    const today = todayInTZ(tz);
    const todayStr = `${today.y}-${String(today.m).padStart(2, "0")}-${String(today.d).padStart(2, "0")}`;

    // --- 2. everyone who should receive email, with their birthdays ---
    const rows = await sql`
      SELECT l.id AS list_id, l.token, l.email,
             b.name, b.month, b.day, b.year
      FROM lists l
      JOIN birthdays b ON b.list_id = l.id
      WHERE l.confirmed = TRUE AND l.unsubscribed = FALSE`;

    // Group the flat rows into one bucket per subscriber.
    const byList = new Map();
    for (const r of rows) {
      if (!byList.has(r.list_id)) {
        byList.set(r.list_id, { listId: r.list_id, token: r.token, email: r.email, upcoming: [], today: [] });
      }
      const bucket = byList.get(r.list_id);
      const { date, days } = nextOccurrence(r.month, r.day, today);
      const turning = turningAge(r.year, date.y);
      const person = { name: r.name, days, turning, milestone: isMilestone(turning) };

      if (days === 0) bucket.today.push(person);
      else if (days === leadDays) bucket.upcoming.push(person);
    }

    // --- 3. send, with the sent_log diary preventing duplicates ---
    let sent = 0, skipped = 0, failed = 0;

    for (const list of byList.values()) {
      for (const kind of ["upcoming", "today"]) {
        const people = list[kind];
        if (people.length === 0) continue;

        // Already sent this kind today? (e.g. if the job re-ran)
        const already = await sql`
          SELECT 1 FROM sent_log
          WHERE list_id = ${list.listId}
            AND sent_on = ${todayStr} AND kind = ${kind}`;
        if (already.length > 0) { skipped++; continue; }

        try {
          if (kind === "upcoming") {
            await sendUpcomingEmail(list.email, list.token, people, leadDays);
          } else {
            await sendTodayEmail(list.email, list.token, people);
          }
          await sql`
            INSERT INTO sent_log (list_id, sent_on, kind)
            VALUES (${list.listId}, ${todayStr}, ${kind})
            ON CONFLICT DO NOTHING`;
          sent++;
          // Gentle pacing — email providers rate-limit rapid-fire requests.
          await sleep(250);
        } catch (e) {
          // One failed email shouldn't stop everyone else's reminders.
          console.error(`Email failed for ${list.email}:`, e);
          failed++;
        }
      }
    }

    const summary = { date: todayStr, tz, leadDays, sent, skipped, failed };
    console.log("Cron summary:", summary);
    return Response.json(summary);
  } catch (err) {
    console.error("Cron failed:", err);
    return Response.json({ error: "Cron failed." }, { status: 500 });
  }
}
