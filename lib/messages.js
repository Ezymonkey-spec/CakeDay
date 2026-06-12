// ============================================================
// lib/messages.js — the copy-paste birthday messages
// ------------------------------------------------------------
// Used in two places: on the website (tap to copy) and inside
// the "it's today!" reminder email (so people can reply-forward
// a message within seconds of opening the email).
// ============================================================

import { ordinal } from "./dates";

export const TEMPLATES = {
  warm: [
    (n) => `Happy birthday, ${n}! I hope today is filled with the people and things you love most. Wishing you a wonderful year ahead.`,
    (n) => `Happy birthday ${n}! Thinking of you today and feeling very lucky to have you in my life. Enjoy every minute of it.`,
    (n) => `${n}, happy birthday! May this next year bring you more of everything that makes you happy. Celebrate well today — you deserve it.`,
    (n, age) => age
      ? `Happy ${ordinal(age)} birthday, ${n}! Here's to another year of good health, good company and good times. Have a beautiful day.`
      : `Happy birthday, ${n}! Here's to another year of good health, good company and good times. Have a beautiful day.`,
  ],
  funny: [
    (n) => `Happy birthday ${n}! You're not getting older, you're becoming a classic.`,
    (n) => `Happy birthday, ${n}! Remember: birthday calories don't count. It's basically science.`,
    (n) => `${n}! Another year wiser… allegedly. Happy birthday — go cause some trouble.`,
    (n, age) => age
      ? `Happy birthday ${n}! ${age} looks great on you. Suspiciously great. What's your secret?`
      : `Happy birthday ${n}! This age looks great on you. Suspiciously great. What's your secret?`,
  ],
  short: [
    (n) => `Happy birthday, ${n}! 🎂`,
    (n) => `HBD ${n} — have the best day! 🎉`,
    (n) => `Happy birthday ${n}! Hope it's a great one.`,
    (n, age) => (age ? `Happy ${ordinal(age)}, ${n}! 🥳` : `Big happy birthday, ${n}! 🥳`),
  ],
};

export const TONES = [
  { id: "warm", label: "Warm" },
  { id: "funny", label: "Funny" },
  { id: "short", label: "Short & sweet" },
];

// First name only — "Happy birthday, Sarah" not "Sarah Nguyen".
export function firstName(fullName) {
  return fullName.trim().split(/\s+/)[0];
}

// One message of each tone, used inside the day-of email.
export function emailMessageTrio(name, age) {
  const n = firstName(name);
  return [
    TEMPLATES.warm[0](n, age),
    TEMPLATES.funny[0](n, age),
    TEMPLATES.short[0](n, age),
  ];
}
