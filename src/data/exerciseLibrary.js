// Exercise library — tagged by equipment, category, difficulty
// equipment values: 'dumbbells' | 'resistance_band' | 'bench' | 'pull_up_bar' | 'barbell'
// empty equipment array = bodyweight only

export const EXERCISES = {

  /* ── PUSH ─────────────────────────────────────────── */

  // Chest
  push_up: {
    id: 'push_up', name: 'Push-Up', category: 'push', subCategory: 'chest',
    equipment: [], muscles: 'Chest, Shoulders, Triceps', difficulty: 'beginner', isCompound: true,
    steps: [
      'Place hands slightly wider than shoulders, body in a straight line from head to heels.',
      'Lower your chest to just above the floor, elbows at roughly 45° from your torso.',
      'Press back up to the start. Keep core tight and hips level throughout.',
    ],
    mistakes: ['Hips sagging or piking', 'Flaring elbows 90° out', 'Not reaching full depth'],
    postureNote: null,
  },
  incline_push_up: {
    id: 'incline_push_up', name: 'Incline Push-Up', category: 'push', subCategory: 'chest',
    equipment: [], muscles: 'Lower Chest, Shoulders, Triceps', difficulty: 'beginner', isCompound: true,
    steps: [
      'Place hands on an elevated surface (bench, chair, wall) wider than shoulders.',
      'Body in a straight line, lower chest toward the surface with control.',
      'Press back up. The higher the surface, the easier the exercise.',
    ],
    mistakes: ['Hips dropping', 'Neck craning forward'],
    postureNote: null,
  },
  diamond_push_up: {
    id: 'diamond_push_up', name: 'Diamond Push-Up', category: 'push', subCategory: 'triceps',
    equipment: [], muscles: 'Triceps, Inner Chest', difficulty: 'intermediate', isCompound: false,
    steps: [
      'Form a diamond shape with thumbs and index fingers, hands under chest.',
      'Lower chest toward hands with elbows tucking close to your sides.',
      'Press back up, fully extending the arms and squeezing the triceps.',
    ],
    mistakes: ['Flaring elbows out', 'Not keeping wrists aligned under shoulders'],
    postureNote: null,
  },
  decline_push_up: {
    id: 'decline_push_up', name: 'Decline Push-Up', category: 'push', subCategory: 'chest',
    equipment: [], muscles: 'Upper Chest, Front Delts', difficulty: 'intermediate', isCompound: true,
    steps: [
      'Place feet on an elevated surface (bench or chair), hands on the floor shoulder-width.',
      'Lower chest toward the floor, keeping elbows at 45°.',
      'Press back up. Targets the upper chest similar to incline pressing.',
    ],
    mistakes: ['Hips dropping', 'Too wide or narrow hand placement'],
    postureNote: null,
  },
  pike_push_up: {
    id: 'pike_push_up', name: 'Pike Push-Up', category: 'push', subCategory: 'shoulders',
    equipment: [], muscles: 'Front Delts, Triceps', difficulty: 'intermediate', isCompound: true,
    steps: [
      'Start in a downward dog position — hips high, forming an inverted V.',
      'Lower your head toward the floor between your hands by bending elbows.',
      'Press back up to the start position. Mimics the overhead press pattern.',
    ],
    mistakes: ['Not maintaining hips high throughout', 'Head going past the hands'],
    postureNote: null,
  },
  db_press: {
    id: 'db_press', name: 'Dumbbell Floor Press', category: 'push', subCategory: 'chest',
    equipment: ['dumbbells'], muscles: 'Chest, Shoulders, Triceps', difficulty: 'beginner', isCompound: true,
    steps: [
      'Lie on your back on the floor, knees bent. Hold dumbbells at chest level.',
      'Press dumbbells up until arms are straight, then lower until triceps touch the floor.',
      'Great alternative to bench press — the floor limits range and protects shoulders.',
    ],
    mistakes: ['Lowering too fast', 'Not keeping shoulder blades pinched together'],
    postureNote: null,
  },
  incline_db_press: {
    id: 'incline_db_press', name: 'Incline Dumbbell Press', category: 'push', subCategory: 'chest',
    equipment: ['dumbbells', 'bench'], muscles: 'Upper Chest, Front Delts', difficulty: 'beginner', isCompound: true,
    steps: [
      'Set bench to 30–45°. Sit back with dumbbells on thighs, kick up to chest height.',
      'Pinch shoulder blades together and press up, elbows at 45° from torso.',
      'Lower slowly over 3 seconds back to chest level.',
    ],
    mistakes: ['Flaring elbows 90°', 'Bouncing off chest', 'Not retracting shoulder blades'],
    postureNote: null,
  },
  db_shoulder_press: {
    id: 'db_shoulder_press', name: 'Dumbbell Shoulder Press', category: 'push', subCategory: 'shoulders',
    equipment: ['dumbbells'], muscles: 'Shoulders, Triceps', difficulty: 'beginner', isCompound: true,
    steps: [
      'Sit or stand with dumbbells at shoulder height, palms facing forward.',
      'Brace your core and press straight up until arms are fully extended.',
      'Lower with control back to shoulder height.',
    ],
    mistakes: ['Arching lower back excessively', 'Cutting range of motion short'],
    postureNote: null,
  },
  lateral_raise: {
    id: 'lateral_raise', name: 'Dumbbell Lateral Raise', category: 'push', subCategory: 'shoulders',
    equipment: ['dumbbells'], muscles: 'Side Delts', difficulty: 'beginner', isCompound: false,
    steps: [
      'Stand with dumbbells at sides, slight forward lean at hips.',
      'Raise arms out to the sides leading with elbows, stop at shoulder height.',
      'Lower slowly over 3 seconds — the descent builds the muscle.',
    ],
    mistakes: ['Shrugging shoulders up', 'Using momentum to swing weight', 'Going above shoulder height'],
    postureNote: null,
  },
  db_tricep_extension: {
    id: 'db_tricep_extension', name: 'Overhead Tricep Extension', category: 'push', subCategory: 'triceps',
    equipment: ['dumbbells'], muscles: 'Triceps (long head)', difficulty: 'beginner', isCompound: false,
    steps: [
      'Hold one dumbbell with both hands overhead, arms straight.',
      'Lower behind head by bending elbows, keeping upper arms still.',
      'Extend back up fully, squeezing triceps at the top.',
    ],
    mistakes: ['Elbows flaring out wide', 'Moving upper arms during the rep'],
    postureNote: null,
  },
  tricep_kickback: {
    id: 'tricep_kickback', name: 'Tricep Kickback', category: 'push', subCategory: 'triceps',
    equipment: ['dumbbells'], muscles: 'Triceps', difficulty: 'beginner', isCompound: false,
    steps: [
      'Hinge forward until torso is nearly parallel to floor.',
      'Pin upper arm parallel to floor and extend forearm back until straight.',
      'Squeeze tricep hard at full extension, lower with control.',
    ],
    mistakes: ['Upper arm dropping during the movement', 'Not reaching full extension'],
    postureNote: null,
  },
  band_pull_apart: {
    id: 'band_pull_apart', name: 'Resistance Band Pull-Apart', category: 'push', subCategory: 'shoulders',
    equipment: ['resistance_band'], muscles: 'Rear Delts, Rhomboids', difficulty: 'beginner', isCompound: false,
    steps: [
      'Hold band at shoulder width with straight arms in front of you.',
      'Pull band apart horizontally by moving arms out to the sides.',
      'Touch band to chest, squeezing shoulder blades together. Return slowly.',
    ],
    mistakes: ['Bending elbows (turns into a row)', 'Not squeezing at end position'],
    postureNote: '💡 Posture: counteracts chest tightness and rounded shoulders from pressing.',
  },

  /* ── PULL ─────────────────────────────────────────── */

  superman: {
    id: 'superman', name: 'Superman Hold', category: 'pull', subCategory: 'back',
    equipment: [], muscles: 'Lower Back, Glutes, Rear Delts', difficulty: 'beginner', isCompound: false,
    steps: [
      'Lie face down, arms extended overhead.',
      'Simultaneously lift arms, chest, and legs off the floor.',
      'Hold for 2–3 seconds, squeeze back muscles. Lower and repeat.',
    ],
    mistakes: ['Holding breath', 'Only lifting legs without upper body'],
    postureNote: '💡 Posture: strengthens the entire posterior chain.',
  },
  inverted_row: {
    id: 'inverted_row', name: 'Inverted Row (Table)', category: 'pull', subCategory: 'back',
    equipment: [], muscles: 'Lats, Rhomboids, Biceps', difficulty: 'beginner', isCompound: true,
    steps: [
      'Lie under a sturdy table, grip the edge shoulder-width.',
      'Body straight from head to heels, pull chest up to the table edge.',
      'Lower with full control. The more horizontal your body, the harder it is.',
    ],
    mistakes: ['Hips dropping', 'Using momentum instead of pulling with the back'],
    postureNote: '💡 Posture: excellent horizontal pull for correcting rounded shoulders.',
  },
  bent_over_row: {
    id: 'bent_over_row', name: 'Dumbbell Bent-Over Row', category: 'pull', subCategory: 'back',
    equipment: ['dumbbells'], muscles: 'Lats, Rhomboids, Biceps', difficulty: 'beginner', isCompound: true,
    steps: [
      'Hinge at hips until torso is at 45°, back flat, dumbbells hanging.',
      'Drive elbows straight back, squeezing shoulder blades hard at top.',
      'Lower with full control over 2–3 seconds.',
    ],
    mistakes: ['Rounding lower back', 'Jerking weight using momentum', 'Not squeezing shoulder blades'],
    postureNote: '💡 Posture: directly corrects rounded upper back from desk work.',
  },
  one_arm_row: {
    id: 'one_arm_row', name: 'Dumbbell One-Arm Row', category: 'pull', subCategory: 'back',
    equipment: ['dumbbells', 'bench'], muscles: 'Lats, Rhomboids, Biceps', difficulty: 'beginner', isCompound: true,
    steps: [
      'Place same-side knee and hand on bench. Hold dumbbell in free hand.',
      'Drive elbow straight up toward the ceiling, keeping torso still.',
      'Squeeze lat at the top, lower with full control.',
    ],
    mistakes: ['Rotating torso to row higher', 'Shrugging shoulder up'],
    postureNote: '💡 Posture: balances out pressing and corrects upper back rounding.',
  },
  face_pull: {
    id: 'face_pull', name: 'Resistance Band Face Pull', category: 'pull', subCategory: 'rearDelt',
    equipment: ['resistance_band'], muscles: 'Rear Delts, External Rotators', difficulty: 'beginner', isCompound: false,
    steps: [
      'Anchor band at eye level. Hold with both hands, step back for tension.',
      'Pull toward face with elbows flaring up and out — above wrist level.',
      'Finish with hands beside ears, thumbs behind you. Hold 1 second.',
    ],
    mistakes: ['Elbows dropping below wrists', 'Pulling to neck instead of face', 'Rushing reps'],
    postureNote: '💡 Most important posture exercise — do this every single session.',
  },
  rear_delt_fly: {
    id: 'rear_delt_fly', name: 'Dumbbell Rear Delt Fly', category: 'pull', subCategory: 'rearDelt',
    equipment: ['dumbbells'], muscles: 'Rear Delts, Upper Back', difficulty: 'beginner', isCompound: false,
    steps: [
      'Hinge forward at hips until torso is nearly parallel to floor.',
      'Raise arms out to the sides leading with elbows, stop at shoulder height.',
      'Lower slowly over 3 seconds. Use light weight — precision only.',
    ],
    mistakes: ['Too much weight (uses traps not rear delts)', 'Bending elbows into a row'],
    postureNote: '💡 Posture: directly targets muscles weakened by desk work.',
  },
  bicep_curl: {
    id: 'bicep_curl', name: 'Dumbbell Bicep Curl', category: 'pull', subCategory: 'biceps',
    equipment: ['dumbbells'], muscles: 'Biceps, Brachialis', difficulty: 'beginner', isCompound: false,
    steps: [
      'Stand with dumbbells at sides, palms forward.',
      'Curl up while rotating wrist outward at the top. Squeeze bicep.',
      'Lower slowly over 3 seconds. Elbows stay glued to sides.',
    ],
    mistakes: ['Swinging body', 'Not supinating wrist', 'Rushing the lowering phase'],
    postureNote: null,
  },
  hammer_curl: {
    id: 'hammer_curl', name: 'Hammer Curl', category: 'pull', subCategory: 'biceps',
    equipment: ['dumbbells'], muscles: 'Biceps, Brachioradialis', difficulty: 'beginner', isCompound: false,
    steps: [
      'Stand with dumbbells at sides, palms facing your body (neutral grip).',
      'Curl up keeping the neutral wrist throughout — do not rotate.',
      'Lower slowly over 2–3 seconds.',
    ],
    mistakes: ['Rotating wrists outward', 'Swinging upper arms forward'],
    postureNote: null,
  },
  band_row: {
    id: 'band_row', name: 'Resistance Band Seated Row', category: 'pull', subCategory: 'back',
    equipment: ['resistance_band'], muscles: 'Mid Back, Biceps', difficulty: 'beginner', isCompound: true,
    steps: [
      'Sit on floor with legs extended, loop band around feet.',
      'Sit tall and row handles back toward hips, elbows close to body.',
      'Squeeze shoulder blades at the end, return with full control.',
    ],
    mistakes: ['Rounding lower back', 'Letting elbows flare out wide'],
    postureNote: null,
  },
  pull_up: {
    id: 'pull_up', name: 'Pull-Up', category: 'pull', subCategory: 'back',
    equipment: ['pull_up_bar'], muscles: 'Lats, Biceps, Core', difficulty: 'intermediate', isCompound: true,
    steps: [
      'Hang from bar with overhand grip, hands just wider than shoulders.',
      'Pull elbows down and back until chin clears the bar.',
      'Lower with full control until arms are straight.',
    ],
    mistakes: ['Kipping / using momentum', 'Not reaching full hang at bottom', 'Crossing feet (causes rotation)'],
    postureNote: null,
  },
  chin_up: {
    id: 'chin_up', name: 'Chin-Up', category: 'pull', subCategory: 'back',
    equipment: ['pull_up_bar'], muscles: 'Lats, Biceps', difficulty: 'intermediate', isCompound: true,
    steps: [
      'Hang from bar with underhand grip, hands shoulder-width.',
      'Pull elbows down and slightly forward until chin clears the bar.',
      'Lower slowly with full control.',
    ],
    mistakes: ['Kipping', 'Using only biceps without engaging lats'],
    postureNote: null,
  },

  /* ── LEGS ─────────────────────────────────────────── */

  bodyweight_squat: {
    id: 'bodyweight_squat', name: 'Bodyweight Squat', category: 'legs', subCategory: 'quads',
    equipment: [], muscles: 'Quads, Glutes, Core', difficulty: 'beginner', isCompound: true,
    steps: [
      'Stand feet shoulder-width, toes slightly turned out.',
      'Sit hips back and down, keeping chest tall and knees tracking over toes.',
      'Descend until thighs are parallel or below. Drive through heels to stand.',
    ],
    mistakes: ['Knees caving inward', 'Chest collapsing forward', 'Not reaching parallel'],
    postureNote: null,
  },
  glute_bridge: {
    id: 'glute_bridge', name: 'Glute Bridge', category: 'legs', subCategory: 'hamstrings',
    equipment: [], muscles: 'Glutes, Hamstrings, Core', difficulty: 'beginner', isCompound: false,
    steps: [
      'Lie on back, knees bent, feet flat on floor hip-width apart.',
      'Drive through heels, lift hips until body forms a straight line from knees to shoulders.',
      'Squeeze glutes hard at the top. Hold 1 second, lower slowly.',
    ],
    mistakes: ['Overextending lower back at top', 'Feet too far or too close'],
    postureNote: null,
  },
  reverse_lunge: {
    id: 'reverse_lunge', name: 'Reverse Lunge', category: 'legs', subCategory: 'quads',
    equipment: [], muscles: 'Quads, Glutes, Balance', difficulty: 'beginner', isCompound: true,
    steps: [
      'Stand tall, step one foot back about 2 feet.',
      'Lower rear knee toward floor, front shin roughly vertical.',
      'Push through front heel to return to standing.',
    ],
    mistakes: ['Front knee past toes', 'Torso leaning too far forward', 'Step too short'],
    postureNote: null,
  },
  goblet_squat: {
    id: 'goblet_squat', name: 'Dumbbell Goblet Squat', category: 'legs', subCategory: 'quads',
    equipment: ['dumbbells'], muscles: 'Quads, Glutes, Core', difficulty: 'beginner', isCompound: true,
    steps: [
      'Hold dumbbell vertically at chest, feet shoulder-width, toes out slightly.',
      'Squat down keeping chest tall and knees pushing out over toes.',
      'Drive through heels to stand, squeezing glutes at the top.',
    ],
    mistakes: ['Knees caving in', 'Chest falling forward', 'Not reaching parallel depth'],
    postureNote: null,
  },
  rdl: {
    id: 'rdl', name: 'Dumbbell Romanian Deadlift', category: 'legs', subCategory: 'hamstrings',
    equipment: ['dumbbells'], muscles: 'Hamstrings, Glutes, Lower Back', difficulty: 'beginner', isCompound: true,
    steps: [
      'Stand with dumbbells in front of thighs, soft bend in knees.',
      'Push hips back as you lower dumbbells close to your legs.',
      'Lower until strong hamstring stretch, then drive hips forward squeezing glutes.',
    ],
    mistakes: ['Rounding lower back', 'Bending knees too much (becomes a squat)', 'Not feeling hamstring stretch'],
    postureNote: '💡 Posture: strengthens the posterior chain — foundation of good standing posture.',
  },
  db_reverse_lunge: {
    id: 'db_reverse_lunge', name: 'Dumbbell Reverse Lunge', category: 'legs', subCategory: 'quads',
    equipment: ['dumbbells'], muscles: 'Quads, Glutes', difficulty: 'beginner', isCompound: true,
    steps: [
      'Hold dumbbells at sides, step one foot back about 2 feet.',
      'Lower rear knee toward floor, front shin stays vertical.',
      'Push through front heel to return. Complete all reps on one leg or alternate.',
    ],
    mistakes: ['Front knee caving inward', 'Torso leaning forward excessively'],
    postureNote: null,
  },
  bulgarian_split_squat: {
    id: 'bulgarian_split_squat', name: 'Bulgarian Split Squat', category: 'legs', subCategory: 'quads',
    equipment: ['dumbbells', 'bench'], muscles: 'Quads, Glutes, Balance', difficulty: 'intermediate', isCompound: true,
    steps: [
      'Stand in front of bench. Place rear foot on bench, laces down.',
      'Lower front knee toward floor, keeping torso upright.',
      'Drive through front heel to stand. Keep front knee over toes.',
    ],
    mistakes: ['Front foot too close to bench', 'Knee caving inward', 'Leaning heavily forward'],
    postureNote: null,
  },
  hip_thrust: {
    id: 'hip_thrust', name: 'Dumbbell Hip Thrust', category: 'legs', subCategory: 'hamstrings',
    equipment: ['dumbbells', 'bench'], muscles: 'Glutes, Hamstrings', difficulty: 'intermediate', isCompound: false,
    steps: [
      'Sit on floor with upper back against bench. Place dumbbell on hips.',
      'Drive through heels, thrust hips up until body is parallel to floor.',
      'Squeeze glutes hard at top for 1 second. Lower slowly.',
    ],
    mistakes: ['Hyperextending lower back at top', 'Chin jutting up (keep chin tucked)'],
    postureNote: null,
  },

  /* ── CORE ─────────────────────────────────────────── */

  plank: {
    id: 'plank', name: 'Plank Hold', category: 'core', subCategory: 'core',
    equipment: [], muscles: 'Core, Shoulders, Glutes', difficulty: 'beginner', isCompound: false,
    steps: [
      'Forearms on floor under shoulders, body in a straight line.',
      'Squeeze glutes and pull belly button toward spine.',
      'Breathe normally. Stop if hips sag — quality beats time.',
    ],
    mistakes: ['Hips sagging down', 'Hips piking up', 'Holding breath'],
    postureNote: '💡 Posture: core strength is the foundation of good posture all day.',
  },
  dead_bug: {
    id: 'dead_bug', name: 'Dead Bug', category: 'core', subCategory: 'core',
    equipment: [], muscles: 'Deep Core, Anti-Rotation', difficulty: 'beginner', isCompound: false,
    steps: [
      'Lie on back, press lower back firmly into floor (keep this contact always).',
      'Arms up to ceiling, knees at 90°.',
      'Exhale and slowly lower opposite arm and leg. Return. Repeat other side.',
    ],
    mistakes: ['Lower back lifting off floor', 'Moving too fast', 'Holding breath'],
    postureNote: null,
  },
  side_plank: {
    id: 'side_plank', name: 'Side Plank', category: 'core', subCategory: 'core',
    equipment: [], muscles: 'Obliques, Hip Abductors', difficulty: 'beginner', isCompound: false,
    steps: [
      'Side plank on forearm, elbow under shoulder, body in straight line.',
      'Lift hips off floor. Hold position, breathing steadily.',
      'Keep hips stacked — don\'t let them rotate forward.',
    ],
    mistakes: ['Hip rotation forward', 'Hips sagging toward floor'],
    postureNote: null,
  },
  side_plank_hip_dip: {
    id: 'side_plank_hip_dip', name: 'Side Plank Hip Dip', category: 'core', subCategory: 'core',
    equipment: [], muscles: 'Obliques, Hip Abductors', difficulty: 'intermediate', isCompound: false,
    steps: [
      'Get into side plank position.',
      'Lower hip slightly below neutral, then raise above neutral line.',
      'Control both directions — no bouncing.',
    ],
    mistakes: ['Rotating forward', 'Moving too fast'],
    postureNote: null,
  },
  bird_dog: {
    id: 'bird_dog', name: 'Bird Dog', category: 'core', subCategory: 'core',
    equipment: [], muscles: 'Core, Lower Back, Glutes', difficulty: 'beginner', isCompound: false,
    steps: [
      'Start on all fours, wrists under shoulders, knees under hips.',
      'Extend opposite arm and leg simultaneously, keeping hips level.',
      'Hold 2 seconds, return, switch sides. Move slowly with control.',
    ],
    mistakes: ['Rotating hips to one side', 'Rushing through reps', 'Arching lower back'],
    postureNote: '💡 Posture: improves lumbar stability and control.',
  },
  hollow_hold: {
    id: 'hollow_hold', name: 'Hollow Body Hold', category: 'core', subCategory: 'core',
    equipment: [], muscles: 'Deep Core, Hip Flexors', difficulty: 'intermediate', isCompound: false,
    steps: [
      'Lie on back, press lower back into floor.',
      'Lift shoulders slightly and extend arms overhead. Raise legs to about 45°.',
      'Hold the "banana" shape. Lower legs to increase difficulty.',
    ],
    mistakes: ['Lower back arching off floor', 'Legs too high (takes away the challenge)'],
    postureNote: null,
  },
  leg_raise: {
    id: 'leg_raise', name: 'Lying Leg Raise', category: 'core', subCategory: 'core',
    equipment: [], muscles: 'Lower Abs, Hip Flexors', difficulty: 'beginner', isCompound: false,
    steps: [
      'Lie flat on back, hands under lower back for support.',
      'Keeping legs straight, raise them to 90°.',
      'Lower slowly without letting them touch the floor.',
    ],
    mistakes: ['Lower back arching off floor', 'Bending knees to make it easier'],
    postureNote: null,
  },
};

// Helper: get exercises available with given equipment
export function getAvailableExercises(equipmentOwned, category = null) {
  return Object.values(EXERCISES).filter((ex) => {
    const categoryMatch = category ? ex.category === category : true;
    const equipMatch = ex.equipment.every((e) => equipmentOwned.includes(e));
    return categoryMatch && equipMatch;
  });
}

// Helper: filter by difficulty
export function filterByDifficulty(exercises, level) {
  const levels = { beginner: 0, intermediate: 1, advanced: 2 };
  const maxLevel = levels[level] ?? 1;
  return exercises.filter((ex) => levels[ex.difficulty] <= maxLevel);
}

// Posture warmup blocks shared across workouts
export const POSTURE_WARMUPS = {
  push: [
    { id: 'pw_cat_cow', name: 'Cat-Cow Stretch', reps: '10 slow reps', benefit: 'Wakes up the spine before pressing', icon: '🐱' },
    { id: 'pw_thoracic', name: 'Thoracic Rotation', reps: '8 each side', benefit: 'Opens mid-back stiffness before pressing', icon: '🔄' },
    { id: 'pw_pull_apart', name: 'Band Pull-Apart', reps: '15 reps', benefit: 'Pre-activates rear delts to protect shoulders', icon: '💪' },
  ],
  pull: [
    { id: 'pw_wall_angels', name: 'Wall Angels', reps: '10 reps', benefit: 'Activates scapular muscles for rowing', icon: '👼' },
    { id: 'pw_chin_tuck', name: 'Chin Tucks', reps: '10 reps, hold 3s', benefit: 'Aligns cervical spine before back loading', icon: '🤵' },
    { id: 'pw_cat_cow2', name: 'Cat-Cow Stretch', reps: '10 slow reps', benefit: 'Prepares spine for hinge movements', icon: '🐱' },
  ],
  legs: [
    { id: 'pw_hip_flexor', name: 'Hip Flexor Stretch', reps: '30s each side', benefit: 'Releases tight hip flexors before squatting', icon: '🧘' },
    { id: 'pw_fig4', name: 'Seated Figure-4 Stretch', reps: '30s each side', benefit: 'Opens glutes before leg loading', icon: '🪑' },
    { id: 'pw_cat_cow3', name: 'Cat-Cow Stretch', reps: '10 slow reps', benefit: 'Prepares lumbar spine for heavy leg work', icon: '🐱' },
  ],
  full: [
    { id: 'pw_wall_angels2', name: 'Wall Angels', reps: '10 reps', benefit: 'Scapular control for balanced push/pull', icon: '👼' },
    { id: 'pw_pull_apart2', name: 'Band Pull-Apart', reps: '15 reps', benefit: 'Protects shoulders for combined session', icon: '💪' },
    { id: 'pw_thoracic2', name: 'Thoracic Rotation', reps: '8 each side', benefit: 'Opens mid-back for full upper body', icon: '🔄' },
  ],
};

export const POSTURE_COOLDOWNS = {
  push: [
    { id: 'pc_chest', name: 'Doorway Chest Stretch', reps: '30s each side', benefit: 'Releases pec tightness from pressing', icon: '🚪' },
    { id: 'pc_chin_tuck', name: 'Chin Tucks', reps: '15 reps, hold 3s', benefit: 'Reset forward head posture', icon: '🤵' },
  ],
  pull: [
    { id: 'pc_thoracic', name: 'Thoracic Rotation', reps: '10 each side', benefit: 'Decompresses mid-back after rowing', icon: '🔄' },
    { id: 'pc_hip', name: 'Hip Flexor Stretch', reps: '30s each side', benefit: 'Counteracts hip flexor tightness', icon: '🧘' },
  ],
  legs: [
    { id: 'pc_hip_leg', name: 'Hip Flexor Stretch', reps: '45s each side', benefit: 'Critical after leg day — prevents lower back pain', icon: '🧘' },
    { id: 'pc_chin2', name: 'Chin Tucks', reps: '15 reps, hold 3s', benefit: 'Daily reset for forward head posture', icon: '🤵' },
  ],
  full: [
    { id: 'pc_chest2', name: 'Doorway Chest Stretch', reps: '30s each side', benefit: 'Undoes forward shoulder pull from pressing', icon: '🚪' },
    { id: 'pc_cat_cow', name: 'Cat-Cow Stretch', reps: '10 slow reps', benefit: 'Decompresses spine after full body session', icon: '🐱' },
  ],
};
