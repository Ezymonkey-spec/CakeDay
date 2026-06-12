// lib/db.js — the database connection (lazy version)
// The connection is only created the first time a query actually
// runs, so the app can BUILD even before the database is attached.

import { neon } from "@neondatabase/serverless";

let client = null;

// Used like: sql`SELECT * FROM lists WHERE token = ${token}`
// The template-tag style automatically parameterises inputs,
// which is the standard defence against SQL injection.
export function sql(strings, ...values) {
  if (!client) client = neon(process.env.DATABASE_URL);
  return client(strings, ...values);
}

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

export async function getListByToken(token) {
  await ensureSchema();
  const rows = await sql`SELECT * FROM lists WHERE token = ${token}`;
  return rows[0] || null;
}
