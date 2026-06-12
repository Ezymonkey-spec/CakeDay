// ============================================================
// lib/validate.js — checking user input on the server
// ------------------------------------------------------------
// Golden rule: never trust what arrives over the network, even
// from your own website. Anyone can send anything to these URLs,
// so every field is checked here before touching the database.
// Returns { ok: true, value } or { ok: false, error }.
// ============================================================

import { daysInMonth } from "./dates";

export function validateEmail(raw) {
  const email = String(raw || "").trim().toLowerCase();
  // A pragmatic check: something@something.something, sane length.
  if (email.length < 5 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "That doesn't look like an email address." };
  }
  return { ok: true, value: email };
}

export function validateBirthday(body) {
  const name = String(body?.name || "").trim();
  const month = Number(body?.month);
  const day = Number(body?.day);
  const yearRaw = body?.year;
  const note = String(body?.note || "").trim();

  if (!name || name.length > 100) {
    return { ok: false, error: "Please provide a name (up to 100 characters)." };
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { ok: false, error: "Month must be 1–12." };
  }
  if (!Number.isInteger(day) || day < 1 || day > daysInMonth(month)) {
    return { ok: false, error: "That day doesn't exist in that month." };
  }
  let year = null;
  if (yearRaw !== null && yearRaw !== undefined && yearRaw !== "") {
    year = Number(yearRaw);
    const thisYear = new Date().getFullYear();
    if (!Number.isInteger(year) || year < 1900 || year > thisYear) {
      return { ok: false, error: `Birth year should be 1900–${thisYear}, or blank.` };
    }
  }
  if (note.length > 200) {
    return { ok: false, error: "Notes are limited to 200 characters." };
  }
  return { ok: true, value: { name, month, day, year, note } };
}
