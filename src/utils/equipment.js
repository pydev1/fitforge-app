// Loadable-weight model — snaps suggested loads to weights the user can ACTUALLY
// build from their kit, instead of theoretical 0.5kg / 2.5kg steps.
//
// The user's dumbbell kit:
//   Adjustable: 2 bars @ 1.75kg each; plates 8×1kg, 8×2.5kg, 4×2kg
//   Fixed hex pairs: 1kg, 2kg, 3kg, 5kg (one per hand)
//
// Plates load symmetrically (one per end), so they're added in PAIRS — the
// smallest change to a single bar is 2× a plate. Two-dumbbell moves split the
// plates across both bars; single-dumbbell moves (goblet squat, overhead
// extension, one-arm row, hip thrust) can stack every plate on one bar.

const BAR = 1.75;                          // each adjustable bar
const HEX = [1, 2, 3, 5];                  // fixed hex dumbbells (per hand)

// Total plate counts owned.
const PLATES_TOTAL = { 1: 8, 2: 4, 2.5: 8 };

// All loads achievable on one bar given how many of each plate can go on it.
// Plates are added in pairs (symmetric), so a plate of weight w in `pairs`
// quantity contributes 0, 2w, 4w, … up to pairs·2w.
function barLoads(plateCounts) {
  let sums = new Set([0]);
  for (const w of Object.keys(plateCounts)) {
    const pairs = Math.floor(plateCounts[w] / 2);
    const step = 2 * Number(w);
    const next = new Set();
    for (const s of sums) {
      for (let p = 0; p <= pairs; p++) next.add(s + p * step);
    }
    sums = next;
  }
  return [...sums].map(s => +(s + BAR).toFixed(2));
}

function ladder(plateCountsForOneBar) {
  const set = new Set([...HEX, ...barLoads(plateCountsForOneBar)]);
  return [...set].sort((a, b) => a - b);
}

// Two-dumbbell moves: plates split evenly between the two bars.
export const TWO_DB_LOADS = ladder({ 1: 4, 2: 2, 2.5: 4 });
// Single-dumbbell moves: all plates available on the one bar.
export const SINGLE_DB_LOADS = ladder({ 1: 8, 2: 4, 2.5: 8 });

// Exercises performed with a SINGLE dumbbell (can load the whole kit on one bar).
const SINGLE_DB_IDS = new Set([
  'goblet_squat', 'db_tricep_extension', 'one_arm_row', 'hip_thrust',
]);

// Which loadable ladder applies to this workout-exercise (null = not a dumbbell
// move, e.g. bodyweight or band — nothing to snap).
// CONVENTION: all dumbbell weights in the app are PER DUMBBELL (gym standard:
// "pressing the 12s"), so two-DB moves use the per-hand ladder directly.
export function getDumbbellLadder(exercise) {
  if (!exercise) return null;
  if (!/dumbbell/i.test(String(exercise.equipment || ''))) return null;
  return SINGLE_DB_IDS.has(exercise.id) ? SINGLE_DB_LOADS : TWO_DB_LOADS;
}

// True for moves performed with a dumbbell in EACH hand (weight field means
// kg per dumbbell). Single-DB and non-dumbbell moves return false.
export function isTwoDumbbell(exercise) {
  return getDumbbellLadder(exercise) === TWO_DB_LOADS;
}

// Nearest achievable load to a target (ties resolve to the lighter option).
export function snapToLoad(target, loads) {
  if (target == null || !loads?.length) return target;
  if (target <= 0) return 0;
  let best = loads[0];
  let bestDiff = Math.abs(loads[0] - target);
  for (const l of loads) {
    const d = Math.abs(l - target);
    if (d < bestDiff - 1e-9) { best = l; bestDiff = d; }
  }
  return best;
}

// Next rung strictly heavier than `current` (caps at the max rung).
export function nextLoadUp(current, loads) {
  for (const l of loads) if (l > current + 1e-9) return l;
  return loads[loads.length - 1];
}

// Next rung strictly lighter than `current` (floors at the min rung).
export function nextLoadDown(current, loads) {
  for (let i = loads.length - 1; i >= 0; i--) if (loads[i] < current - 1e-9) return loads[i];
  return loads[0];
}
