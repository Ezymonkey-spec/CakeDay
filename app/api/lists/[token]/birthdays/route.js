// ============================================================
// PUT/DELETE /api/lists/[token]/birthdays/[id]
// ------------------------------------------------------------
// Note the security detail in every query: "AND list_id = ..." —
// the birthday must belong to THIS list's token. Without that,
// anyone with their own list could edit other people's entries
// by guessing ID numbers (IDs count up: 1, 2, 3…).
// ============================================================

import { sql, getListByToken } from "../../../../../../lib/db";
import { validateBirthday } from "../../../../../../lib/validate";

export async function PUT(request, { params }) {
  try {
    const { token, id } = await params;
    const list = await getListByToken(token);
    if (!list) return Response.json({ error: "List not found." }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const check = validateBirthday(body);
    if (!check.ok) return Response.json({ error: check.error }, { status: 400 });

    const { name, month, day, year, note } = check.value;
    const rows = await sql`
      UPDATE birthdays
      SET name = ${name}, month = ${month}, day = ${day}, year = ${year}, note = ${note}
      WHERE id = ${Number(id)} AND list_id = ${list.id}
      RETURNING id, name, month, day, year, note`;

    if (rows.length === 0) return Response.json({ error: "Birthday not found." }, { status: 404 });
    return Response.json({ ok: true, birthday: rows[0] });
  } catch (err) {
    console.error("PUT birthday failed:", err);
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { token, id } = await params;
    const list = await getListByToken(token);
    if (!list) return Response.json({ error: "List not found." }, { status: 404 });

    await sql`DELETE FROM birthdays WHERE id = ${Number(id)} AND list_id = ${list.id}`;
    return Response.json({ ok: true });
  } catch (err) {
    console.error("DELETE birthday failed:", err);
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
