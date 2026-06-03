import { EXERCISES, POSTURE_WARMUPS, POSTURE_COOLDOWNS } from '../data/exerciseLibrary';

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const COLORS = {
  push:  '#EA580C',   // brand orange
  pull:  '#3B82F6',
  legs:  '#10B981',
  full:  '#F43F5E',
  core:  '#FBBF24',   // amber (distinct from orange)
  upper: '#FB923C',   // lighter orange
  lower: '#06B6D4',
};

// Priority-ordered exercise IDs per workout slot
const PRIORITY = {
  push: [
    ['incline_db_press', 'db_press', 'decline_push_up', 'push_up'],
    ['db_shoulder_press', 'pike_push_up'],
    ['lateral_raise', 'band_pull_apart'],
    ['db_tricep_extension', 'tricep_kickback', 'diamond_push_up'],
    ['incline_push_up', 'band_pull_apart'],
  ],
  pull: [
    ['one_arm_row', 'bent_over_row', 'pull_up', 'chin_up', 'inverted_row'],
    ['face_pull', 'rear_delt_fly', 'band_row'],
    ['bicep_curl', 'hammer_curl', 'superman'],
    ['pull_up', 'chin_up', 'band_row', 'inverted_row', 'superman'],
    ['hammer_curl', 'bicep_curl', 'rear_delt_fly'],
  ],
  legs: [
    ['goblet_squat', 'bulgarian_split_squat', 'bodyweight_squat'],
    ['rdl', 'hip_thrust', 'glute_bridge'],
    ['db_reverse_lunge', 'reverse_lunge'],
    ['plank', 'dead_bug'],
    ['bird_dog', 'dead_bug', 'side_plank'],
  ],
  core: [
    ['plank', 'dead_bug'],
    ['side_plank', 'side_plank_hip_dip'],
    ['bird_dog', 'dead_bug'],
    ['hollow_hold', 'leg_raise'],
    ['leg_raise', 'hollow_hold'],
  ],
};

// upper = push compounds + pull compounds
const UPPER_SLOTS = [
  ['incline_db_press', 'db_press', 'push_up'],
  ['one_arm_row', 'bent_over_row', 'inverted_row'],
  ['db_shoulder_press', 'pike_push_up'],
  ['face_pull', 'rear_delt_fly', 'band_pull_apart'],
  ['bicep_curl', 'hammer_curl'],
  ['db_tricep_extension', 'diamond_push_up'],
];

// lower = legs + core
const LOWER_SLOTS = [
  ['goblet_squat', 'bulgarian_split_squat', 'bodyweight_squat'],
  ['rdl', 'hip_thrust', 'glute_bridge'],
  ['db_reverse_lunge', 'reverse_lunge'],
  ['plank', 'dead_bug'],
  ['side_plank', 'bird_dog'],
];

// full = mix of all
const FULL_SLOTS = [
  ['push_up', 'incline_db_press', 'db_press'],
  ['one_arm_row', 'bent_over_row', 'inverted_row'],
  ['goblet_squat', 'bodyweight_squat'],
  ['rdl', 'glute_bridge'],
  ['plank', 'dead_bug'],
  ['db_shoulder_press', 'lateral_raise', 'pike_push_up'],
];

function canDo(exerciseId, equipment) {
  const ex = EXERCISES[exerciseId];
  if (!ex) return false;
  return ex.equipment.every(e => equipment.includes(e));
}

function meetsLevel(exerciseId, fitnessLevel) {
  const ex = EXERCISES[exerciseId];
  if (!ex) return false;
  const levels = { beginner: 0, intermediate: 1, advanced: 2 };
  return (levels[ex.difficulty] ?? 0) <= (levels[fitnessLevel] ?? 1);
}

function pickFromSlots(slots, equipment, fitnessLevel) {
  return slots.map(slot => {
    const id = slot.find(id => canDo(id, equipment) && meetsLevel(id, fitnessLevel));
    return id ? EXERCISES[id] : null;
  }).filter(Boolean);
}

function toWorkoutExercise(ex, primaryGoal) {
  const isStrength = primaryGoal === 'build_muscle';
  const isFatLoss = primaryGoal === 'lose_fat' || primaryGoal === 'endurance';
  let sets, reps, rest;
  if (isStrength) {
    sets = ex.isCompound ? 4 : 3;
    reps = ex.isCompound ? '5-8' : '8-12';
    rest = ex.isCompound ? '90s' : '60s';
  } else if (isFatLoss) {
    sets = 3;
    reps = ex.isCompound ? '12-15' : '15-20';
    rest = '45s';
  } else {
    sets = ex.isCompound ? 3 : 3;
    reps = ex.isCompound ? '8-12' : '10-15';
    rest = ex.isCompound ? '60s' : '45s';
  }
  return {
    id: ex.id,
    name: ex.name,
    sets,
    reps,
    rest,
    equipment: ex.equipment.length ? ex.equipment.map(e => e.replace('_', ' ')).join(', ') : 'Bodyweight',
    muscles: ex.muscles,
    tips: ex.steps[0] || '',
    postureNote: ex.postureNote,
    steps: ex.steps,
    mistakes: ex.mistakes,
  };
}

function getPostureWarmup(type, jobType) {
  const block = POSTURE_WARMUPS[type] || POSTURE_WARMUPS.full;
  return jobType === 'desk' ? block : block.slice(0, 1);
}

function getPostureCooldown(type, jobType) {
  const block = POSTURE_COOLDOWNS[type] || POSTURE_COOLDOWNS.full;
  return jobType === 'desk' ? block : block.slice(0, 1);
}

function buildWorkout(type, equipment, fitnessLevel, primaryGoal, jobType) {
  let slots, name, focus, warmupKey, cooldownKey;

  switch (type) {
    case 'push':
      slots = PRIORITY.push;
      name = 'Push Day';
      focus = 'Chest · Shoulders · Triceps';
      warmupKey = 'push'; cooldownKey = 'push';
      break;
    case 'pull':
      slots = PRIORITY.pull;
      name = 'Pull Day';
      focus = 'Back · Biceps · Rear Delts';
      warmupKey = 'pull'; cooldownKey = 'pull';
      break;
    case 'legs':
      slots = PRIORITY.legs;
      name = 'Legs & Core';
      focus = 'Quads · Hamstrings · Glutes · Core';
      warmupKey = 'legs'; cooldownKey = 'legs';
      break;
    case 'core':
      slots = PRIORITY.core;
      name = 'Core Day';
      focus = 'Abs · Obliques · Lower Back';
      warmupKey = 'legs'; cooldownKey = 'legs';
      break;
    case 'upper':
      slots = UPPER_SLOTS;
      name = 'Upper Body';
      focus = 'Chest · Back · Shoulders · Arms';
      warmupKey = 'full'; cooldownKey = 'full';
      break;
    case 'lower':
      slots = LOWER_SLOTS;
      name = 'Lower Body';
      focus = 'Quads · Hamstrings · Glutes · Core';
      warmupKey = 'legs'; cooldownKey = 'legs';
      break;
    case 'full':
    default:
      slots = FULL_SLOTS;
      name = 'Full Body';
      focus = 'Chest · Back · Legs · Core';
      warmupKey = 'full'; cooldownKey = 'full';
      break;
  }

  const rawExercises = pickFromSlots(slots, equipment, fitnessLevel);
  const exercises = rawExercises.map(ex => toWorkoutExercise(ex, primaryGoal));

  const durationMin = 35 + exercises.length * 5;
  const durationMax = durationMin + 10;

  return {
    id: type,
    name,
    focus,
    color: COLORS[type] || COLORS.full,
    duration: `${durationMin}-${durationMax} min`,
    postureWarmup: getPostureWarmup(warmupKey, jobType),
    exercises,
    postureCooldown: getPostureCooldown(cooldownKey, jobType),
  };
}

function getWorkoutTypeSequence(count) {
  switch (count) {
    case 1:  return ['full'];
    case 2:  return ['upper', 'lower'];
    case 3:  return ['push', 'pull', 'legs'];
    case 4:  return ['push', 'pull', 'legs', 'full'];
    case 5:  return ['push', 'pull', 'legs', 'full', 'core'];
    case 6:  return ['push', 'pull', 'legs', 'push', 'pull', 'legs'];
    default: return ['full'];
  }
}

export function generateWorkoutPlan(userProfile) {
  const {
    equipment = [],
    fitnessLevel = 'beginner',
    goals = ['general_fitness'],
    workoutDaysPerWeek = 4,
    restDays = [],
    jobType = 'desk',
  } = userProfile;

  const primaryGoal = goals[0] || 'general_fitness';

  // Training days = all days minus chosen rest days, capped at workoutDaysPerWeek
  const trainingDays = ALL_DAYS
    .filter(d => !restDays.includes(d))
    .slice(0, workoutDaysPerWeek);

  const typeSequence = getWorkoutTypeSequence(trainingDays.length);

  // Build schedule map
  const schedule = {};
  ALL_DAYS.forEach(d => { schedule[d] = null; });
  trainingDays.forEach((day, i) => {
    schedule[day] = typeSequence[i] || 'full';
  });

  // Build unique workouts (deduplicate type keys)
  const uniqueTypes = [...new Set(typeSequence)];
  const workouts = {};
  uniqueTypes.forEach(type => {
    workouts[type] = buildWorkout(type, equipment, fitnessLevel, primaryGoal, jobType);
  });

  return { schedule, workouts, generatedAt: Date.now() };
}
