// ============================================================
// lib/email.js — everything that lands in an inbox
// ------------------------------------------------------------
// Four emails live here:
//   1. confirmEmail   — "click to confirm" (double opt-in: proves
//                        the address is real AND that its owner
//                        actually asked for reminders — both a legal
//                        nicety under Australia's Spam Act and great
//                        for not being marked as spam)
//   2. linkEmail      — "here's your list" (recovers a lost link)
//   3. upcomingEmail  — the 7-days-before heads-up. This is the
//                        money email: it arrives exactly when
//                        there's still time to BUY AND POST A CARD.
//   4. todayEmail     — day-of, with copy-paste messages inside.
//
// Every email carries: unsubscribe link (legally required),
// the shop plug, the discount code, and a forward-to-a-friend line.
// ============================================================

import { Resend } from "resend";
import { ordinal } from "./dates";
import { emailMessageTrio } from "./messages";

const resend = new Resend(process.env.RESEND_API_KEY);

const SHOP_NAME = process.env.SHOP_NAME || "";
const SHOP_URL = process.env.SHOP_URL || "";
const DISCOUNT_CODE = process.env.DISCOUNT_CODE || "";
const APP_URL = process.env.APP_URL || "";

// Names come from user input, so escape them before putting them
// into HTML. Otherwise someone could name a "friend"
// <script>...</script> and inject code into emails. Classic trap.
function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

// ---------- shared visual pieces ----------

const styles = {
  body: `margin:0;padding:24px 12px;background:#FFF6EA;font-family:Helvetica,Arial,sans-serif;color:#2E2228;`,
  card: `max-width:520px;margin:0 auto;background:#FFFDF8;border:1.5px solid #E8DCC8;border-radius:16px;padding:28px;`,
  h1: `margin:0 0 8px;font-size:24px;line-height:1.2;`,
  p: `margin:0 0 14px;font-size:16px;line-height:1.5;`,
  btn: `display:inline-block;background:#F2545B;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px;`,
  quiet: `color:#5F7470;font-size:13px;line-height:1.5;`,
  msgBox: `background:#FFF6EA;border:1.5px solid #E8DCC8;border-radius:10px;padding:12px 14px;margin:0 0 10px;font-size:15px;line-height:1.5;`,
  shopBox: `border:2px dashed #F2545B;border-radius:12px;padding:14px;text-align:center;margin:18px 0;`,
  milestone: `display:inline-block;background:#E9B44C;color:#2E2228;font-weight:bold;font-size:12px;border-radius:999px;padding:3px 10px;margin-left:6px;`,
};

// The shop call-to-action. Only renders if a shop is configured.
function shopBlock(headline) {
  if (!SHOP_NAME || !SHOP_URL) return "";
  const code = DISCOUNT_CODE
    ? `<p style="${styles.p}margin:10px 0 0;">Use code <strong>${esc(DISCOUNT_CODE)}</strong> at checkout 💌</p>`
    : "";
  return `
    <div style="${styles.shopBox}">
      <p style="${styles.p}margin:0 0 12px;"><strong>${esc(headline)}</strong></p>
      <a href="${esc(SHOP_URL)}" style="${styles.btn}">Shop cards at ${esc(SHOP_NAME)}</a>
      ${code}
    </div>`;
}

// The legally-required-and-also-polite footer.
function footer(listToken) {
  const unsub = `${APP_URL}/api/unsubscribe?token=${listToken}`;
  const manage = `${APP_URL}/list/${listToken}`;
  const shopLine = SHOP_NAME ? ` · Sent with love by ${esc(SHOP_NAME)}` : "";
  return `
    <hr style="border:none;border-top:1.5px solid #E8DCC8;margin:22px 0 14px;">
    <p style="${styles.quiet}">
      Know someone who always forgets birthdays? Forward them this —
      they can set up their own free reminders at <a href="${APP_URL}" style="color:#C73E4A;">${esc(APP_URL.replace(/^https?:\/\//, ""))}</a>.
    </p>
    <p style="${styles.quiet}">
      <a href="${manage}" style="color:#5F7470;">Manage your birthday list</a> ·
      <a href="${unsub}" style="color:#5F7470;">Unsubscribe</a>${shopLine}
    </p>`;
}

function wrap(inner) {
  return `<!doctype html><html><body style="${styles.body}">
    <div style="${styles.card}">${inner}</div>
  </body></html>`;
}

// ---------- the four emails ----------

export async function sendConfirmEmail(to, token) {
  const link = `${APP_URL}/api/confirm?token=${token}`;
  return resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Confirm your birthday reminders 🎂",
    html: wrap(`
      <h1 style="${styles.h1}">One click and you'll never miss a birthday</h1>
      <p style="${styles.p}">Tap the button to confirm your email and switch on your reminders.</p>
      <p style="${styles.p}"><a href="${link}" style="${styles.btn}">Confirm my reminders</a></p>
      <p style="${styles.quiet}">If you didn't sign up for Cake Day, you can safely ignore this email — nothing will be sent to you again.</p>
    `),
  });
}

export async function sendLinkEmail(to, token) {
  const link = `${APP_URL}/list/${token}`;
  return resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Your Cake Day birthday list 🎂",
    html: wrap(`
      <h1 style="${styles.h1}">Here's your birthday list</h1>
      <p style="${styles.p}">You (or someone with your email) asked for the link to your Cake Day list. Here it is:</p>
      <p style="${styles.p}"><a href="${link}" style="${styles.btn}">Open my birthday list</a></p>
      <p style="${styles.quiet}">Keep this email — the link is the key to your list.</p>
    `),
  });
}

// people = [{ name, days, turning, milestone }]
export async function sendUpcomingEmail(to, token, people, leadDays) {
  const items = people.map((p) => {
    const turning = p.turning ? ` — turning <strong>${p.turning}</strong>` : "";
    const badge = p.milestone ? `<span style="${styles.milestone}">★ MILESTONE</span>` : "";
    return `<div style="${styles.msgBox}">🎂 <strong>${esc(p.name)}</strong>${turning}${badge}</div>`;
  }).join("");

  const names = people.map((p) => esc(p.name)).join(people.length === 2 ? " and " : ", ");
  const hasMilestone = people.some((p) => p.milestone);

  return resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject: people.length === 1
      ? `${people[0].name}'s birthday is in ${leadDays} days 🎂`
      : `${people.length} birthdays coming up in ${leadDays} days 🎂`,
    html: wrap(`
      <h1 style="${styles.h1}">One week to go!</h1>
      <p style="${styles.p}">Heads up — ${names} ${people.length === 1 ? "has" : "have"} a birthday in <strong>${leadDays} days</strong>.</p>
      ${items}
      <p style="${styles.p}">That's just enough time to get a card in the post. Future-you says thanks.</p>
      ${shopBlock(hasMilestone
        ? "A milestone birthday deserves a proper card."
        : "Make it a real card this year.")}
      ${footer(token)}
    `),
  });
}

// people = [{ name, turning }]
export async function sendTodayEmail(to, token, people) {
  const sections = people.map((p) => {
    const msgs = emailMessageTrio(p.name, p.turning)
      .map((m) => `<div style="${styles.msgBox}">${esc(m)}</div>`)
      .join("");
    const turning = p.turning ? ` (${ordinal(p.turning)}!)` : "";
    return `
      <h2 style="${styles.h1}font-size:19px;margin-top:18px;">🎉 ${esc(p.name)}${turning}</h2>
      <p style="${styles.p}${styles.quiet}">Copy one of these, or use them as a starting point:</p>
      ${msgs}`;
  }).join("");

  return resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject: people.length === 1
      ? `It's ${people[0].name}'s birthday today! 🎉`
      : `${people.length} birthdays today! 🎉`,
    html: wrap(`
      <h1 style="${styles.h1}">Today's the day</h1>
      <p style="${styles.p}">Don't overthink the message — sending it is what counts. Here are some ready to go:</p>
      ${sections}
      ${shopBlock("Running late? A card posted today still says you cared.")}
      ${footer(token)}
    `),
  });
}
