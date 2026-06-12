"use client";
// ============================================================
// /list/[token] — your birthday book
// ------------------------------------------------------------
// This is the page people land on after confirming. The token in
// the web address is the key to the list: anyone with the link
// can view and edit it (like a shared Google Doc link), so it's
// long and unguessable. The page talks to our API to load and
// save — the database is the single source of truth.
// ============================================================

import { useState, useEffect, useRef, use } from "react";
import { MONTHS, daysInMonth, todayInTZ, nextOccurrence, turningAge, countdownLabel } from "../../../lib/dates";
import { TEMPLATES, TONES, firstName } from "../../../lib/messages";

export default function ListPage({ params }) {
  const { token } = use(params); // Next.js 15: params arrive as a promise
  const [justConfirmed, setJustConfirmed] = useState(false);

  const [list, setList] = useState(null);     // { email, confirmed, unsubscribed, birthdays }
  const [loadError, setLoadError] = useState("");
  const [view, setView] = useState("list");   // list | form
  const [editing, setEditing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [tone, setTone] = useState("warm");
  const [copiedKey, setCopiedKey] = useState(null);
  const [busy, setBusy] = useState(false);

  // ----- load the list from the server on first render -----
  useEffect(() => {
    // Did they arrive from the confirmation email? (?confirmed=1)
    setJustConfirmed(new URLSearchParams(window.location.search).get("confirmed") === "1");

    fetch(`/api/lists/${token}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || "Couldn't load your list.");
        return res.json();
      })
      .then(setList)
      .catch((e) => setLoadError(e.message));
  }, [token]);

  // ----- helpers that call the API -----
  async function api(path, options) {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  }

  async function saveBirthday(values) {
    setBusy(true);
    try {
      if (editing) {
        const { birthday } = await api(`/api/lists/${token}/birthdays/${editing.id}`, {
          method: "PUT", body: JSON.stringify(values),
        });
        setList((l) => ({ ...l, birthdays: l.birthdays.map((b) => (b.id === birthday.id ? birthday : b)) }));
      } else {
        const { birthday } = await api(`/api/lists/${token}/birthdays`, {
          method: "POST", body: JSON.stringify(values),
        });
        setList((l) => ({ ...l, birthdays: [...l.birthdays, birthday] }));
      }
      setEditing(null);
      setView("list");
    } catch (e) {
      alert(e.message);
    }
    setBusy(false);
  }

  async function deleteBirthday(id) {
    try {
      await api(`/api/lists/${token}/birthdays/${id}`, { method: "DELETE" });
      setList((l) => ({ ...l, birthdays: l.birthdays.filter((b) => b.id !== id) }));
      if (expandedId === id) setExpandedId(null);
    } catch (e) {
      alert(e.message);
    }
  }

  async function toggleReminders(on) {
    try {
      await api(`/api/lists/${token}`, { method: "PATCH", body: JSON.stringify({ remindersOn: on }) });
      setList((l) => ({ ...l, unsubscribed: !on }));
    } catch (e) {
      alert(e.message);
    }
  }

  async function copyText(text, key) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  }

  // ----- sort by who's next (same maths the reminder emails use) -----
  const today = todayInTZ(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const sorted = (list?.birthdays || [])
    .map((b) => {
      const { date, days } = nextOccurrence(b.month, b.day, today);
      return { ...b, days, turning: turningAge(b.year, date.y) };
    })
    .sort((a, b) => a.days - b.days || a.name.localeCompare(b.name));
  const hero = sorted[0];

  // ----- render -----
  if (loadError) {
    return (
      <div className="wrap center">
        <h1 style={{ margin: "40px 0 12px" }}>Hmm, that link didn't work</h1>
        <p className="muted">{loadError}</p>
        <p><a className="btn-primary" href="/">Go to the start page</a></p>
      </div>
    );
  }
  if (!list) return <div className="wrap center"><p className="muted">Opening your birthday book…</p></div>;

  return (
    <div className="wrap">
      <header className="header">
        <a className="logo" href="/"><span style={{ fontSize: "1.6rem" }}>🎂</span><h1>Cake Day</h1></a>
        <button className="btn-primary" onClick={() => { setEditing(null); setView(view === "form" ? "list" : "form"); }}>
          {view === "form" ? "Cancel" : "+ Add birthday"}
        </button>
      </header>

      {justConfirmed && (
        <div className="notice">✅ Reminders are on! Add your birthdays below — emails arrive 7 days before and on the day.</div>
      )}
      {!list.confirmed && (
        <div className="notice">📬 Almost there — click the link in your confirmation email to switch reminders on. You can add birthdays in the meantime.</div>
      )}
      {list.confirmed && list.unsubscribed && (
        <div className="notice">
          🔕 Reminders are off.{" "}
          <button className="btn-ghost" onClick={() => toggleReminders(true)}>Turn them back on</button>
        </div>
      )}

      {view === "form" && (
        <BirthdayForm
          key={editing?.id || "new"}
          initial={editing}
          busy={busy}
          onSave={saveBirthday}
          onCancel={() => { setEditing(null); setView("list"); }}
        />
      )}

      {view === "list" && sorted.length === 0 && (
        <div className="panel center">
          <div style={{ fontSize: "3rem" }}>🎂</div>
          <h2>No birthdays yet</h2>
          <p className="muted">Add the first one — Cake Day does the remembering from there.</p>
          <button className="btn-primary" onClick={() => setView("form")}>+ Add your first birthday</button>
        </div>
      )}

      {view === "list" && hero && (
        <section className={`hero ${hero.days === 0 ? "is-today" : ""}`}>
          <p className="eyebrow">{hero.days === 0 ? "It's today" : "Next up"}</p>
          <h2 className="hero-name">{hero.name}</h2>
          <p className="hero-date">
            {MONTHS[hero.month - 1]} {hero.day}
            {hero.turning ? ` · turning ${hero.turning}` : ""}
          </p>
          <div className="hero-count">{hero.days === 0 ? "🎂 Happy birthday!" : countdownLabel(hero.days)}</div>
          <div>
            <button className="btn-primary" onClick={() => setExpandedId(expandedId === hero.id ? null : hero.id)}>
              {expandedId === hero.id ? "Hide messages" : "Write a message"}
            </button>
          </div>
        </section>
      )}

      {view === "list" && sorted.length > 0 && (
        <ul className="bday-list">
          {sorted.map((p) => (
            <li key={p.id} className={`row ${p.days === 0 ? "is-today" : ""}`}>
              <button className="row-main" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                <span className="row-date">
                  <span className="row-day">{p.day}</span>
                  <span className="row-month">{MONTHS[p.month - 1].slice(0, 3)}</span>
                </span>
                <span className="row-name">
                  {p.name}
                  {p.turning ? <em> turns {p.turning}</em> : null}
                  {p.note ? <small>{p.note}</small> : null}
                </span>
                <span className={`row-count ${p.days <= 7 ? "soon" : ""}`}>{countdownLabel(p.days)}</span>
              </button>

              {expandedId === p.id && (
                <div className="msgs">
                  <div className="tones">
                    {TONES.map((t) => (
                      <button key={t.id} className={`tone ${tone === t.id ? "active" : ""}`} onClick={() => setTone(t.id)}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  {TEMPLATES[tone].map((fn, i) => {
                    const text = fn(firstName(p.name), p.turning);
                    const key = `${p.id}-${tone}-${i}`;
                    return (
                      <div key={key} className="msg">
                        <p>{text}</p>
                        <button className="copy" onClick={() => copyText(text, key)}>
                          {copiedKey === key ? "Copied ✓" : "Copy"}
                        </button>
                      </div>
                    );
                  })}
                  {process.env.NEXT_PUBLIC_SHOP_NAME && process.env.NEXT_PUBLIC_SHOP_URL && (
                    <p className="center" style={{ margin: "6px 0 12px" }}>
                      <a href={process.env.NEXT_PUBLIC_SHOP_URL} target="_blank" rel="noreferrer">
                        💌 Prefer paper? Send a real card from {process.env.NEXT_PUBLIC_SHOP_NAME} →
                      </a>
                    </p>
                  )}
                  <div className="row-actions">
                    <button className="btn-ghost" onClick={() => { setEditing(p); setView("form"); }}>Edit</button>
                    <DeleteButton onConfirm={() => deleteBirthday(p.id)} />
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <footer className="footer">
        <span className="muted">
          Reminders go to <strong>{list.email}</strong>
          {list.confirmed && !list.unsubscribed && (
            <> · <button className="btn-ghost" onClick={() => toggleReminders(false)}>Pause reminders</button></>
          )}
        </span>
      </footer>
    </div>
  );
}

// ----- the add/edit form -----
function BirthdayForm({ initial, busy, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || "");
  const [month, setMonth] = useState(initial?.month || 1);
  const [day, setDay] = useState(initial?.day || 1);
  const [year, setYear] = useState(initial?.year ? String(initial.year) : "");
  const [note, setNote] = useState(initial?.note || "");
  const [error, setError] = useState("");
  const nameRef = useRef(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const maxDay = daysInMonth(month);
  const thisYear = new Date().getFullYear();

  function submit() {
    if (!name.trim()) return setError("Please add a name.");
    if (day > maxDay) return setError(`${MONTHS[month - 1]} only has ${maxDay} days.`);
    const y = year.trim() === "" ? null : Number(year);
    if (y !== null && (!Number.isInteger(y) || y < 1900 || y > thisYear)) {
      return setError(`Birth year should be 1900–${thisYear}, or blank.`);
    }
    onSave({ name: name.trim(), month, day, year: y, note: note.trim() });
  }

  return (
    <section className="panel">
      <h2>{initial ? "Edit birthday" : "Add a birthday"}</h2>
      <label>
        Name
        <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sarah Nguyen" />
      </label>
      <div className="form-row">
        <label>
          Month
          <select value={month} onChange={(e) => { const m = Number(e.target.value); setMonth(m); if (day > daysInMonth(m)) setDay(daysInMonth(m)); }}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </label>
        <label>
          Day
          <select value={day} onChange={(e) => setDay(Number(e.target.value))}>
            {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label>
          Year <span className="muted">(optional)</span>
          <input inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} placeholder="1990" />
        </label>
      </div>
      <label>
        Note <span className="muted">(optional — e.g. "my brother-in-law, loves fishing")</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="shows in your list" />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="form-actions">
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" disabled={busy} onClick={submit}>
          {busy ? "Saving…" : initial ? "Save changes" : "Add to the book"}
        </button>
      </div>
    </section>
  );
}

// ----- two-tap delete so one stray click can't wipe a person -----
function DeleteButton({ onConfirm }) {
  const [arming, setArming] = useState(false);
  useEffect(() => {
    if (!arming) return;
    const t = setTimeout(() => setArming(false), 3000);
    return () => clearTimeout(t);
  }, [arming]);
  return (
    <button className={`btn-ghost btn-danger ${arming ? "armed" : ""}`} onClick={() => (arming ? onConfirm() : setArming(true))}>
      {arming ? "Tap again to delete" : "Delete"}
    </button>
  );
}
