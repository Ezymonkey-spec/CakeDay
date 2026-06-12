// ============================================================
// lib/dates.js — all the fiddly date maths in one place
// ------------------------------------------------------------
// The trickiest idea here: the server running this code lives in
// a data centre on UTC time, but "today" for your users means
// today in Sydney. So we always ask "what's the date right now
// in REMINDER_TZ?" instead of trusting the server's clock-date.
// ============================================================

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function daysInMonth(month) {
  return [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

export function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

// "What is today's date in a given timezone?" → {y, m, d}
// en-CA formatting gives YYYY-MM-DD, which is easy to split.
export function todayInTZ(tz = "Australia/Sydney") {
  const str = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const [y, m, d] = str.split("-").map(Number);
  return { y, m, d };
}

// Compare two month/day pairs as if they were positions in the year.
function dayOfYearKey(m, d) {
  return m * 100 + d; // e.g. March 5 → 305. Only used for ordering.
}

// Given a birthday (month, day) and "today" {y,m,d}, return:
//   { date: {y,m,d of next occurrence}, days: whole days until it }
// Handles Feb-29 birthdays by celebrating Feb 28 in non-leap years.
export function nextOccurrence(month, day, today) {
  const resolve = (year) => {
    let m = month, d = day;
    if (month === 2 && day === 29 && !isLeapYear(year)) d = 28;
    return { y: year, m, d };
  };

  let next = resolve(today.y);
  if (dayOfYearKey(next.m, next.d) < dayOfYearKey(today.m, today.d)) {
    next = resolve(today.y + 1);
  }

  // Count the days between two calendar dates using UTC timestamps,
  // which sidesteps daylight-saving "23 or 25 hour day" bugs.
  const a = Date.UTC(today.y, today.m - 1, today.d);
  const b = Date.UTC(next.y, next.m - 1, next.d);
  const days = Math.round((b - a) / 86400000);
  return { date: next, days };
}

// Ages people will turn, and which ones are "milestones" —
// the birthdays people buy the fancy cards for.
const MILESTONES = new Set([1, 13, 16, 18, 21, 30, 40, 50, 60, 65, 70, 75, 80, 90, 100]);

export function turningAge(birthYear, occurrenceYear) {
  if (!birthYear) return null;
  return occurrenceYear - birthYear;
}

export function isMilestone(age) {
  return age != null && MILESTONES.has(age);
}

export function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function countdownLabel(days) {
  if (days === 0) return "Today!";
  if (days === 1) return "Tomorrow";
  if (days < 14) return `in ${days} days`;
  if (days < 60) return `in ${Math.round(days / 7)} weeks`;
  return `in ${days} days`;
}
