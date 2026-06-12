// ============================================================
// GET /api/confirm?token=... — the confirm-email click lands here
// ------------------------------------------------------------
// Flips "confirmed" on, then sends the person straight to their
// birthday list. Re-clicking an old confirm link also re-enables
// reminders for someone who previously unsubscribed.
// ============================================================

import { sql, getListByToken } from "../../../lib/db";

export async function GET(request) {
  try {
    const token = new URL(request.url).searchParams.get("token") || "";
    const list = await getListByToken(token);

    if (!list) {
      return new Response("This confirmation link isn't valid.", { status: 404 });
    }

    await sql`
      UPDATE lists SET confirmed = TRUE, unsubscribed = FALSE
      WHERE id = ${list.id}`;

    // Redirect (HTTP 302) to their list page with a welcome flag.
    const dest = `${process.env.APP_URL}/list/${token}?confirmed=1`;
    return Response.redirect(dest, 302);
  } catch (err) {
    console.error("GET /api/confirm failed:", err);
    return new Response("Something went wrong. Please try the link again.", { status: 500 });
  }
}
