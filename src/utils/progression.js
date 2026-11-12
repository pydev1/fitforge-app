import { daysBetweenLocalDateKeys, toLocalDateKey } from './date';
import { getDumbbellLadder, snapToLoad, nextLoadUp, nextLoadDown } from './equipment';
import {
  pausedDaysBetween, getActiveDeload, getActiveTrip, getLastFinishedTrip, addDays,
} from './recovery';

// 12-week periodised programme — 3 phases of 4 weeks, last week of each is a deload.
// deltaSets / deltaReps are applied on top of the base sets/reps from the exercise library.
const SCHEME = [
  // Phase 1 — Foundation: establish movement quality and build work capacity
  { week: 1,  label: 'Foundation', phase: 'Establish your baseline',            deltaSets:  0, deltaReps:  0, isDeload: false },
  { week: 2,  label: 'Foundation', phase: 'Push the reps — hold the weight',    deltaSets:  0, deltaReps:  2, isDeload: false },
  { week: 3,  label: 'Foundation', phase: 'Add a set — build work capacity',    deltaSets:  1, deltaReps:  1, isDeload: false },
  { week: 4,  label: 'Deload',     phase: 'Recovery week — muscles grow here',  deltaSets: -1, deltaReps: -2, isDeload: true  },
  // Phase 2 — Build: increase volume and begin progressing the load
  { week: 5,  label: 'Build',      phase: 'Phase 2 — add load and volume',      deltaSets:  1, deltaReps: -1, isDeload: false },
  { week: 6,  label: 'Build',      phase: 'Hold the load — add a set',          deltaSets:  1, deltaReps:  0, isDeload: false },
  { week: 7,  label: 'Build',      phase: 'Peak volume week — push every set',  deltaSets:  2, deltaReps:  0, isDeload: false },
  { week: 8,  label: 'Deload',     phase: 'Recovery — halfway there',           deltaSets: -1, deltaReps: -2, isDeload: true  },
  // Phase 3 — Strength: heavy loads, fewer reps, personal records
  { week: 9,  label: 'Strength',   phase: 'Phase 3 — go heavy, fewer reps',     deltaSets:  1, deltaReps: -2, isDeload: false },
  { week: 10, label: 'Strength',   phase: 'Heavier still — trust the process',  deltaSets:  1, deltaReps: -2, isDeload: false },
  { week: 11, label: 'Strength',   phase: 'PR week — beat your personal best',  deltaSets:  1, deltaReps: -2, isDeload: false },
  { week: 12, label: 'Complete',   phase: 'Final recovery — programme done!',   deltaSets:  0, deltaReps: -2, isDeload: true  },
];

// Detraining / Restart ─────────────────────────────────────────────────────────
// A gap of two weeks or more is where easing back becomes worthwhile.
export const RESTART_GAP_DAYS = 14;

export function weeksAway(lastDateKey, todayKey) {
  if (!lastDateKey) return 0;
  const days = daysBetweenLocalDateKeys(lastDateKey, todayKey);
  return Math.max(0, Math.floor(days / 7));
}

// Scale last-known loads by when coming back after a break.
export function detrainingFactor(weeks, mode = 'auto') {
  if (mode === 'fresh') return 0.5;
  let f = 1 - 0.03 * weeks;
  f = Math.max(0.6, Math.min(0.95, f));
  if (mode === 'light') f = Math.max(0.55, f - 0.08);
  return Math.round(f * 100) / 100;
}

export const RESTART_MODES = [
  { id: 'auto',  label: 'Ease in',      blurb: 'Recommended — start a touch lighter and build back over a couple of weeks.' },
  { id: 'light', label: 'Play it safe', blurb: 'Longer break or feeling rusty? Start noticeably lighter.' },
  { id: 'fresh', label: 'Fresh start',  blurb: 'Rebuild from a light base — best after a long layoff or injury.' },
];

export function isBandExercise(equipment) {
  return /band/i.test(String(equipment || ''));
}

export const BAND_SWAPS = {
  band_pull_apart: 'rear_delt_fly',
  face_pull:       'rear_delt_fly',
  band_row:        'bent_over_row',
};

// Programme week ───────────────────────────────────────────────────────────────
// Returns 1–12 during the programme, 13 when it's complete (>12 weeks elapsed).
// Anchors to restart.date so a cycle reset or detraining restart resets the count.
// Days spent on a trip (travel mode) don't count — the programme is paused.
export function getProgramWeek(completedWorkouts, anchorDateKey, trips) {
  let startKey;
  if (anchorDateKey) {
    startKey = anchorDateKey;
  } else {
    if (!completedWorkouts || !completedWorkouts.length) return 1;
    startKey = [...completedWorkouts].map(w => w.date).sort()[0];
  }
  const todayKey = toLocalDateKey();
  const elapsed = Math.max(0, daysBetweenLocalDateKeys(startKey, todayKey));
  const daysDiff = Math.max(0, elapsed - pausedDaysBetween(trips, startKey, todayKey));
  const weekNum  = Math.floor(daysDiff / 7) + 1;
  return Math.min(weekNum, 13); // 13 signals programme complete
}

// Returns the SCHEME entry for a given programme week.
// Week 12 is a real one-week deload ("Final recovery"). Week 13+ means the
// 12-week programme has actually finished and the user hasn't started cycle 2
// yet (Home screen's "Next cycle" button) — falling back to week 12's entry
// here would keep applying its 60% deload cut every session, compounding
// lower and lower forever. Hold steady instead until cycle 2 begins.
const PROGRAMME_COMPLETE = {
  week: 13, label: 'Complete', phase: 'Programme complete — start cycle 2 on Home',
  deltaSets: 0, deltaReps: 0, isDeload: false,
};
export function getProgressionModifier(programWeek) {
  if (programWeek >= 13) return PROGRAMME_COMPLETE;
  const idx = Math.min(programWeek, 12) - 1;
  return SCHEME[Math.max(0, idx)];
}

// Adaptive mode replaces the fixed week-4/8/12 deloads with a "hold" week —
// recovery weeks happen when your logged sets say you need one instead.
const ADAPTIVE_HOLD = {
  label: 'Consolidate', phase: 'Own these weights — recovery adapts to how you feel',
  deltaSets: 0, deltaReps: 0, isDeload: false,
};
const ADAPTIVE_FINAL = {
  label: 'Complete', phase: 'Final week — own your numbers',
  deltaSets: 0, deltaReps: 0, isDeload: false,
};
const DELOAD_WEEK = {
  label: 'Deload', phase: 'Recovery week — lighter loads, same movements',
  deltaSets: -1, deltaReps: -2, isDeload: true,
};
const TRAVEL_WEEK = {
  label: 'Travel', phase: 'Programme paused — just keep moving',
  deltaSets: 0, deltaReps: 0, isDeload: false, isTravel: true,
};

// The single source of truth for "what does this week look like?".
// Order of precedence: active trip → active deload → programme week.
export function getEffectiveModifier(programWeek, { deloadMode = 'adaptive', deloads, trips, today } = {}) {
  const day = today || toLocalDateKey();
  if (getActiveTrip(trips, day)) return { ...TRAVEL_WEEK, week: programWeek };
  if (getActiveDeload(deloads, day)) return { ...DELOAD_WEEK, week: programWeek };
  const base = getProgressionModifier(programWeek);
  if (deloadMode === 'scheduled' || !base.isDeload) return base;
  return { ...(base.week === 12 ? ADAPTIVE_FINAL : ADAPTIVE_HOLD), week: base.week };
}

// Convenience for screens: everything they need from app state in one call.
export function getWeekContext(state, today = toLocalDateKey()) {
  const trips = state.trips || [];
  const programWeek = getProgramWeek(state.progress?.completedWorkouts, state.restart?.date, trips);
  const mod = getEffectiveModifier(programWeek, {
    deloadMode: state.deloadMode || 'adaptive',
    deloads: state.deloads || [],
    trips,
    today,
  });
  return { programWeek, mod, loadEase: getLoadEase(state, today) };
}

// Which "ease the loads back down" rule applies right now. A programme restart
// is used as-is. Coming home from a trip without your usual kit produces an
// equivalent, milder ease — but unlike a restart it does NOT reset the
// programme week. Whichever happened most recently wins.
export function getLoadEase(state, today = toLocalDateKey()) {
  const restart = state.restart || null;
  const trip = getLastFinishedTrip(state.trips, today);
  if (!trip || trip.kit === 'gym') return restart;
  const returnDate = addDays(trip.end, 1);
  if (restart && restart.date >= returnDate) return restart;
  const tripDays = daysBetweenLocalDateKeys(trip.start, returnDate);
  const weeksOff = Math.max(1, Math.floor(tripDays / 7));
  // Bodyweight training while away holds onto most of it, so cap the ease at 15%.
  const factor = Math.max(0.85, detrainingFactor(weeksOff, 'auto'));
  return { date: returnDate, weeksOff, factor, mode: 'travel' };
}

export function applyProgression(exercise, mod) {
  const sets = Math.max(1, exercise.sets + mod.deltaSets);
  const repsMatch = String(exercise.reps || '').match(/(\d+)(?:[–\-](\d+))?/);
  if (!repsMatch) return { ...exercise, sets };
  const lo    = parseInt(repsMatch[1]);
  const hi    = repsMatch[2] ? parseInt(repsMatch[2]) : null;
  const newLo = Math.max(4, lo + mod.deltaReps);           // floor at 4 — even strength phase
  const newHi = hi ? Math.max(newLo, hi + mod.deltaReps) : null;
  const reps  = newHi ? `${newLo}–${newHi}` : String(newLo);
  return { ...exercise, sets, reps };
}

// Next-session starting weight ─────────────────────────────────────────────────
// Shared by WorkoutScreen (live session) and HomeScreen prep card (read-only preview).
// Returns null when there is no history yet.
export function getNextSessionWeight(setLogs, exercise, today, isDeload, restart) {
  const past = (setLogs || [])
    .filter(l => l.exerciseId === exercise.id && l.date !== (today || ''))
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!past.length) return null;

  const lastDate    = past[0].date;
  const lastSession = past
    .filter(l => l.date === lastDate)
    .sort((a, b) => a.setNumber - b.setNumber);
  const finalSet = lastSession[lastSession.length - 1];
  if (!finalSet) return null;

  const baseWeight = finalSet.weight;
  const ladder     = getDumbbellLadder(exercise);
  const snap       = v => (ladder ? snapToLoad(v, ladder) : Math.round(v * 2) / 2);

  // Cycle restart (factor=1.0) or detraining restart (factor<1.0)
  if (restart && lastDate < restart.date) return snap(baseWeight * restart.factor);
  if (isDeload) return snap(baseWeight * 0.6);
  if (!ladder) return baseWeight; // bodyweight — no external load to step

  const anyHard = lastSession.some(l => l.feedback === 'hard');
  if (finalSet.feedback === 'easy' && !anyHard) return nextLoadUp(baseWeight, ladder);
  if (anyHard) return nextLoadDown(baseWeight, ladder);
  return snap(baseWeight);
}
