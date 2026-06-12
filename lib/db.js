// ============================================================
// lib/db.js — the database connection
// ------------------------------------------------------------
// Think of the database as a filing cabinet with three drawers:
//   lists     — one row per person who signed up (their email,
//               their secret link token, and their consent flags)
//   birthdays — the actual birthdays, each pointing at a list
//   sent_log  — a diary of which reminder emails went out on
//               which day, so we never send duplicates
// ============================================================

import { neon } from "@neondatabase/serverless";

// The connection. The neon `sql` tag automatically *parameterises*
// queries — meaning user input is passed separately from the SQL
// itself, which is the standard defence against SQL injection
// (an attack where someone types database commands into a form).
export const sql = neon(process.env.DATABASE_URL);

// Create the tables the first time the app runs. "IF NOT EXISTS"
// makes this safe to call repeatedly — it does nothing once the
// tables are there. We remember the promise so concurrent requests
// don't all race to create tables at once.
let schemaReady = null;

export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS lists (
          id           SERIAL PRIMARY KEY,
          token        TEXT UNIQUE NOT NULL,
          email        TEXT UNIQUE NOT NULL,
          confirmed    BOOLEAN NOT NULL DEFAULT FALSE,
          unsubscribed BOOLEAN NOT NULL DEFAULT FALSE,
          marketing_ok BOOLEAN NOT NULL DEFAULT FALSE,
          created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`;
      await sql`
        CREATE TABLE IF NOT EXISTS birthdays (
          id      SERIAL PRIMARY KEY,
          list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
          name    TEXT NOT NULL,
          month   INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
          day     INTEGER NOT NULL CHECK (day BETWEEN 1 AND 31),
          year    INTEGER,
          note    TEXT NOT NULL DEFAULT ''
        )`;
      await sql`
        CREATE TABLE IF NOT EXISTS sent_log (
          id      SERIAL PRIMARY KEY,
          list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
          sent_on DATE NOT NULL,
          kind    TEXT NOT NULL,
          UNIQUE (list_id, sent_on, kind)
        )`;
    })();
  }
  return schemaReady;
}

// Look up a list by its secret token. Returns the row or null.
export async function getListByToken(token) {
  await ensureSchema();
  const rows = await sql`SELECT * FROM lists WHERE token = ${token}`;
  return rows[0] || null;
}
