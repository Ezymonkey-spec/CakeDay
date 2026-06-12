// ============================================================
// POST /api/lists — sign up (or recover a lost link)
// ------------------------------------------------------------
// If the email is new: create a list with a random secret token
// and send the confirmation email.
// If the email already exists: email them their existing link.
// (One endpoint, two jobs — "sign up" and "I lost my link" are
// the same button on the site, which keeps things simple.)
// ============================================================

import { randomBytes } from "crypto";
import { sql, ensureSchema } from "../../../lib/db";
import { validateEmail } from "../../../lib/validate";
import { sendConfirmEmail, sendLinkEmail } from "../../../lib/email";

export async function POST(request) {
  try {
    await ensureSchema();
    const body = await request.json().catch(() => ({}));

    const check = validateEmail(body.email);
    if (!check.ok) {
      return Response.json({ error: check.error }, { status: 400 });
    }
    const email = check.value;
    const marketingOk = body.marketingOk === true;

    const existing = await sql`SELECT token FROM lists WHERE email = ${email}`;

    if (existing.length > 0) {
      // Already signed up — send them their link rather than erroring.
      await sendLinkEmail(email, existing[0].token);
      return Response.json({ ok: true, existing: true });
    }

    // 24 random bytes ≈ a 32-character unguessable token. This token
    // IS the key to the list, so it must be impossible to guess.
    const token = randomBytes(24).toString("base64url");

    await sql`
      INSERT INTO lists (token, email, marketing_ok)
      VALUES (${token}, ${email}, ${marketingOk})`;

    await sendConfirmEmail(email, token);

    // Return the token so the site can take them straight to their
    // list — reminders stay off until they click the confirm email.
    return Response.json({ ok: true, token });
  } catch (err) {
    console.error("POST /api/lists failed:", err);
    return Response.json({ error: "Something went wrong on our end. Please try again." }, { status: 500 });
  }
}
