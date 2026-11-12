// Adaptive deloads + travel (pause) mode.
//
// Pure helpers only — no React, no storage — so the Home, Workout, Progress and
// Settings screens all derive the same answer from the same state.
//
// State shape (see AppContext):
//   deloadMode: 'adaptive' | 'scheduled'
//   deloads:    [{ start: 'YYYY-MM-DD', reason: 'fatigue' | 'long_block' | 'manual' }]
//   deloadSnoozedOn: 'YYYY-MM-DD' | null
//   trips:      [{ start: 'YYYY-MM-DD', end: 'YYYY-MM-DD', kit, daysPerWeek }]

import { toLocalDateKey, fromLocalDateKey, daysBetweenLocalDateKeys } from './date';

export const DELOAD_LENGTH_DAYS = 7;
// After any recovery (deload, trip, restart) don't nag for this long.
const DELOAD_COOLDOWN_DAYS = 14;
// A session counts as "tough" when at least this share of its sets were tagged hard.
const TOUGH_SESSION_SHARE = 0.5;
// Suggest a deload when this many of the last 3 sessions were tough.
const TOUGH_SESSIONS_NEEDED = 2;
// Even without hard sessions, suggest an easy week after this long without one.
const LONG_BLOCK_WEEKS = 10;

export function addDays(dateKey, n) {
  const d = fromLocalDateKey(dateKey);
  d.setDate(d.getDate() + n);
  return toLocalDateKey(d);
}

function maxKey(...keys) {
  return keys.filter(Boolean).sort().pop() || null;
}

// ── Trips ────────────────────────────────────────────────────────────────────

export const TRIP_KITS = [
  { id: 'bodyweight', label: 'Bodyweight only', blurb: 'Hotel room or living room — no kit at all.' },
  { id: 'band',       label: 'Resistance band', blurb: 'Bodyweight plus a band in your bag.' },
  { id: 'gym',        label: 'Gym access',      blurb: 'Keep your normal workouts; the programme still pauses.' },
];

export function getActiveTrip(trips, today = toLocalDateKey()) {
  return (trips || []).find(t => t.start <= today && today <= t.end) || null;
}

// The trip that is in progress or still to come (there is only ever one).
export function getCurrentOrUpcomingTrip(trips, today = toLocalDateKey()) {
  return (trips || [])
    .filter(t => t.end >= today)
    .sort((a, b) => a.start.localeCompare(b.start))[0] || null;
}

// Most recent trip that has already finished.
export function getLastFinishedTrip(trips, today = toLocalDateKey()) {
  return (trips || [])
    .filter(t => t.end < today)
    .sort((a, b) => b.end.localeCompare(a.end))[0] || null;
}

// Days in [fromKey, toKey) that were spent on a trip. Used to freeze the
// programme week and to stop a holiday counting as "time off training".
export function pausedDaysBetween(trips, fromKey, toKey) {
  if (!fromKey || !toKey || fromKey >= toKey) return 0;
  let total = 0;
  (trips || []).forEach(t => {
    const s = maxKey(t.start, fromKey);
    const lastPaused = t.end < toKey ? t.end : addDays(toKey, -1);
    if (s <= lastPaused) total += daysBetweenLocalDateKeys(s, lastPaused) + 1;
  });
  return total;
}

// ── Deloads ──────────────────────────────────────────────────────────────────

export function getActiveDeload(deloads, today = toLocalDateKey()) {
  return (deloads || []).find(d =>
    d.start <= today && today < (d.end || addDays(d.start, DELOAD_LENGTH_DAYS))
  ) || null;
}

export function deloadEndDate(deload) {
  if (!deload) return null;
  return deload.end || addDays(deload.start, DELOAD_LENGTH_DAYS);
}

// Groups set logs into sessions (one per date), newest first.
function sessionsFromLogs(setLogs) {
  const byDate = {};
  (setLogs || []).forEach(l => {
    if (!l?.date) return;
    (byDate[l.date] = byDate[l.date] || []).push(l);
  });
  return Object.keys(byDate)
    .sort((a, b) => b.localeCompare(a))
    .map(date => {
      const sets = byDate[date].filter(l => l.feedback);
      const hard = sets.filter(l => l.feedback === 'hard').length;
      return { date, sets: sets.length, hard, tough: sets.length > 0 && hard / sets.length >= TOUGH_SESSION_SHARE };
    });
}

// Decides whether to offer a recovery week. Returns null, or
// { reason: 'fatigue' | 'long_block', toughCount, weeks }.
//
// "Recovery" resets the clock: a finished deload, a finished trip, or a
// programme restart. Sessions before that point never count.
export function getDeloadSuggestion({
  setLogs, deloads, trips, restart, deloadSnoozedOn, today = toLocalDateKey(),
}) {
  if (getActiveDeload(deloads, today)) return null;
  if (getActiveTrip(trips, today)) return null;
  if (deloadSnoozedOn && daysBetweenLocalDateKeys(deloadSnoozedOn, today) < 3) return null;

  const lastDeload = (deloads || []).slice().sort((a, b) => b.start.localeCompare(a.start))[0];
  const lastTrip = getLastFinishedTrip(trips, today);
  const lastRecovery = maxKey(
    lastDeload ? deloadEndDate(lastDeload) : null,
    lastTrip ? addDays(lastTrip.end, 1) : null,
    restart?.date,
  );
  if (lastRecovery && daysBetweenLocalDateKeys(lastRecovery, today) < DELOAD_COOLDOWN_DAYS) return null;

  const sessions = sessionsFromLogs(setLogs)
    .filter(s => s.date <= today)
    .filter(s => !lastRecovery || s.date >= lastRecovery);
  if (!sessions.length) return null;

  const recent = sessions.slice(0, 3);
  const toughCount = recent.filter(s => s.tough).length;
  // Only judge fatigue on sessions from the last fortnight — old hard days don't count.
  const recentEnough = recent.every(s => daysBetweenLocalDateKeys(s.date, today) <= 14);
  if (recentEnough && toughCount >= TOUGH_SESSIONS_NEEDED) {
    return { reason: 'fatigue', toughCount, weeks: null };
  }

  // Long block: continuous training since the last recovery (or first session),
  // minus any trip days, without a single easy week.
  const blockStart = lastRecovery || sessions[sessions.length - 1].date;
  const trainingDays = daysBetweenLocalDateKeys(blockStart, today) - pausedDaysBetween(trips, blockStart, today);
  const weeks = Math.floor(trainingDays / 7);
  const trainedLastWeek = daysBetweenLocalDateKeys(sessions[0].date, today) <= 7;
  if (weeks >= LONG_BLOCK_WEEKS && trainedLastWeek) {
    return { reason: 'long_block', toughCount, weeks };
  }
  return null;
}

export function describeDeloadSuggestion(sug) {
  if (!sug) return '';
  if (sug.reason === 'fatigue') {
    return `${sug.toughCount} of your last 3 sessions were mostly hard sets. A lighter week now lets you come back stronger.`;
  }
  return `${sug.weeks} weeks of steady training without an easy week. A lighter week now keeps progress coming.`;
}
