import { daysBetweenLocalDateKeys, fromLocalDateKey } from './date';

const SCHEME = [
  { week: 1, label: 'Base',       phase: 'Establish your baseline',          deltaSets:  0, deltaReps:  0, isDeload: false },
  { week: 2, label: 'Volume+',    phase: '+2 reps per set vs last week',      deltaSets:  0, deltaReps:  2, isDeload: false },
  { week: 3, label: 'Intensity+', phase: '+1 set per exercise vs Week 1',     deltaSets:  1, deltaReps:  0, isDeload: false },
  { week: 4, label: 'Deload',     phase: 'Recovery week — lighter loads',     deltaSets: -1, deltaReps: -2, isDeload: true  },
];

// The 4-week Base→Volume→Intensity→Deload cycle is anchored to a start date.
// Normally that's your first-ever session; after a restart it's the restart
// date, so the cycle re-establishes at Base rather than drifting forward
// through the calendar weeks you were away.
export function getProgramWeek(completedWorkouts, anchorDateKey) {
  let startMs;
  if (anchorDateKey) {
    startMs = fromLocalDateKey(anchorDateKey).getTime();
  } else {
    if (!completedWorkouts || !completedWorkouts.length) return 1;
    const sorted = [...completedWorkouts].sort((a, b) => a.date.localeCompare(b.date));
    startMs = new Date(sorted[0].date).getTime();
  }
  const daysDiff = Math.max(0, Math.floor((Date.now() - startMs) / 86400000));
  const weekNum = Math.floor(daysDiff / 7) + 1;
  return ((weekNum - 1) % 4) + 1;
}

/* ── Detraining / Restart ─────────────────────────────────────────────
   After a training break, strength drops (detraining) but comes back fast
   thanks to muscle memory. We ease the suggested loads down, then let the
   normal session-to-session progression climb them back up automatically. */

// A gap of two weeks or more is where easing back becomes worthwhile.
export const RESTART_GAP_DAYS = 14;

export function weeksAway(lastDateKey, todayKey) {
  if (!lastDateKey) return 0;
  const days = daysBetweenLocalDateKeys(lastDateKey, todayKey);
  return Math.max(0, Math.floor(days / 7));
}

// How much to scale last-known loads by when coming back.
//   auto  — ~3% lighter per week off, sensible default (6 wks → ~82%)
//   light — extra cautious (a further ~8% down)
//   fresh — treat it as a near-rebuild from a base load
export function detrainingFactor(weeks, mode = 'auto') {
  if (mode === 'fresh') return 0.5;
  let f = 1 - 0.03 * weeks;
  f = Math.max(0.6, Math.min(0.95, f));
  if (mode === 'light') f = Math.max(0.55, f - 0.08);
  return Math.round(f * 100) / 100;
}

export const RESTART_MODES = [
  { id: 'auto',  label: 'Ease in',     blurb: 'Recommended — start a touch lighter and build back over a couple of weeks.' },
  { id: 'light', label: 'Play it safe', blurb: 'Longer break or feeling rusty? Start noticeably lighter.' },
  { id: 'fresh', label: 'Fresh start',  blurb: 'Rebuild from a light base — best after a long layoff or injury.' },
];

// Is this workout-exercise band-based? (equipment is a display string here.)
export function isBandExercise(equipment) {
  return /band/i.test(String(equipment || ''));
}

// Band moves can't be micro-loaded like dumbbells, so we let people swap them
// for a dumbbell movement that hits the same muscles and loads cleanly in kg.
export const BAND_SWAPS = {
  band_pull_apart: 'rear_delt_fly',
  face_pull:       'rear_delt_fly',
  band_row:        'bent_over_row',
};

export function getProgressionModifier(programWeek) {
  return SCHEME[(programWeek - 1) % 4];
}

export function applyProgression(exercise, mod) {
  const sets = Math.max(1, exercise.sets + mod.deltaSets);
  const repsMatch = String(exercise.reps || '').match(/(\d+)(?:[–\-](\d+))?/);
  if (!repsMatch) return { ...exercise, sets };
  const lo = parseInt(repsMatch[1]);
  const hi = repsMatch[2] ? parseInt(repsMatch[2]) : null;
  const newLo = Math.max(1, lo + mod.deltaReps);
  const newHi = hi ? Math.max(newLo, hi + mod.deltaReps) : null;
  const reps = newHi ? `${newLo}–${newHi}` : String(newLo);
  return { ...exercise, sets, reps };
}
