"use client";
// ============================================================
// The landing page: pitch + signup. "use client" at the top
// means this page runs in the visitor's browser (it has a form
// that reacts as you type, which needs to live client-side).
// ============================================================

import { useState } from "react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [marketingOk, setMarketingOk] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | sending | done | error
  const [error, setError] = useState("");
  const [existing, setExisting] = useState(false);

  async function signUp() {
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, marketingOk }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setExisting(Boolean(data.existing));
      setStatus("done");
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  }

  return (
    <div className="wrap">
      <header className="header">
        <a className="logo" href="/">
          <span style={{ fontSize: "1.6rem" }}>🎂</span>
          <h1>Cake Day</h1>
        </a>
      </header>

      <section className="land-hero">
        <h1>Never miss a birthday again</h1>
        <p>
          A free email a week before each birthday — just enough time to post a
          card — and another on the day, with messages ready to copy and send.
        </p>
      </section>

      {status !== "done" && (
        <section className="panel" style={{ maxWidth: 460, margin: "0 auto 24px" }}>
          <h2>Start your birthday list</h2>
          <label>
            Your email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              onKeyDown={(e) => e.key === "Enter" && signUp()}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={marketingOk}
              onChange={(e) => setMarketingOk(e.target.checked)}
            />
            <span className="muted">
              Also send me occasional card ideas and offers (optional — reminders
              work either way)
            </span>
          </label>
          {error && <p className="error">{error}</p>}
          <div className="form-actions">
            <button className="btn-primary" disabled={status === "sending"} onClick={signUp}>
              {status === "sending" ? "Setting up…" : "Get my free reminders"}
            </button>
          </div>
          <p className="muted" style={{ marginTop: 10, fontSize: "0.85rem" }}>
            Already signed up but lost your link? Enter the same email and we'll
            send it again. Unsubscribe any time with one click.
          </p>
        </section>
      )}

      {status === "done" && (
        <section className="panel center" style={{ maxWidth: 460, margin: "0 auto 24px" }}>
          <h2>📬 Check your inbox</h2>
          <p>
            {existing
              ? "You're already set up! We've emailed you the link to your birthday list."
              : "We've sent you a confirmation email. Click the button inside to switch your reminders on — then start adding birthdays."}
          </p>
          <p className="muted">(No email after a few minutes? Check spam, or try again.)</p>
        </section>
      )}

      <section className="steps">
        <div className="step">
          <div className="big">✍️</div>
          <h3>Add birthdays</h3>
          <p>Names and dates. Add a year to track milestone birthdays.</p>
        </div>
        <div className="step">
          <div className="big">📮</div>
          <h3>Get a heads-up</h3>
          <p>An email 7 days out — enough time to buy and post a card.</p>
        </div>
        <div className="step">
          <div className="big">💬</div>
          <h3>Send something great</h3>
          <p>On the day: copy-paste messages, warm, funny or short.</p>
        </div>
      </section>

      <footer className="footer">
        {process.env.NEXT_PUBLIC_SHOP_NAME && process.env.NEXT_PUBLIC_SHOP_URL ? (
          <a href={process.env.NEXT_PUBLIC_SHOP_URL}>
            Cards by {process.env.NEXT_PUBLIC_SHOP_NAME} 💌
          </a>
        ) : (
          <span className="muted">Free forever · unsubscribe any time</span>
        )}
      </footer>
    </div>
  );
}
