// ============================================================
// GET /api/unsubscribe?token=... — one click, no questions
// ------------------------------------------------------------
// Unsubscribe must be effortless — it's the law (Spam Act 2003
// in Australia, and similar everywhere), and grudging unsubscribe
// flows get you marked as spam, which poisons deliverability for
// every other email you send. We keep their list intact so they
// can come back any time.
// ============================================================

import { sql, getListByToken } from "../../../lib/db";

export async function GET(request) {
  try {
    const token = new URL(request.url).searchParams.get("token") || "";
    const list = await getListByToken(token);

    if (!list) {
      return new Response("This unsubscribe link isn't valid.", { status: 404 });
    }

    await sql`UPDATE lists SET unsubscribed = TRUE WHERE id = ${list.id}`;

    const html = `<!doctype html><html><body style="font-family:Helvetica,Arial,sans-serif;background:#FFF6EA;color:#2E2228;padding:40px 16px;text-align:center;">
      <div style="max-width:480px;margin:0 auto;background:#FFFDF8;border:1.5px solid #E8DCC8;border-radius:16px;padding:28px;">
        <h1 style="font-size:22px;">You're unsubscribed 👋</h1>
        <p style="line-height:1.5;">No more reminder emails. Your birthday list is still saved, and you can switch reminders back on from your list page whenever you like.</p>
        <p><a href="${process.env.APP_URL}/list/${token}" style="color:#C73E4A;font-weight:bold;">View my list</a></p>
      </div>
    </body></html>`;
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  } catch (err) {
    console.error("GET /api/unsubscribe failed:", err);
    return new Response("Something went wrong. Please try the link again.", { status: 500 });
  }
}
