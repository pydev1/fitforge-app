const SCHEME = [
  { week: 1, label: 'Base',       phase: 'Establish your baseline',          deltaSets:  0, deltaReps:  0, isDeload: false },
  { week: 2, label: 'Volume+',    phase: '+2 reps per set vs last week',      deltaSets:  0, deltaReps:  2, isDeload: false },
  { week: 3, label: 'Intensity+', phase: '+1 set per exercise vs Week 1',     deltaSets:  1, deltaReps:  0, isDeload: false },
  { week: 4, label: 'Deload',     phase: 'Recovery week — lighter loads',     deltaSets: -1, deltaReps: -2, isDeload: true  },
];

export function getProgramWeek(completedWorkouts) {
  if (!completedWorkouts || !completedWorkouts.length) return 1;
  const sorted = [...completedWorkouts].sort((a, b) => a.date.localeCompare(b.date));
  const firstDate = new Date(sorted[0].date);
  const daysDiff = Math.floor((Date.now() - firstDate.getTime()) / 86400000);
  const weekNum = Math.floor(daysDiff / 7) + 1;
  return ((weekNum - 1) % 4) + 1;
}

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
