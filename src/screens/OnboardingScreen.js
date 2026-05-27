import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { generateWorkoutPlan } from '../utils/workoutGenerator';
import { colors } from '../theme/colors';

const TOTAL_STEPS = 6;

const BODY_TYPES = [
  { value: 'skinny', label: 'Skinny', desc: 'Low weight, low fat' },
  { value: 'skinny_fat', label: 'Skinny-Fat', desc: 'Normal weight, high fat %' },
  { value: 'average', label: 'Average', desc: 'Balanced build' },
  { value: 'athletic', label: 'Athletic', desc: 'Muscular, low fat' },
  { value: 'overweight', label: 'Overweight', desc: 'Higher body fat' },
];

const FITNESS_LEVELS = [
  { value: 'beginner', label: 'Beginner', desc: 'Under 6 months training' },
  { value: 'intermediate', label: 'Intermediate', desc: '6 months – 2 years' },
  { value: 'advanced', label: 'Advanced', desc: '2+ years consistent' },
];

const GOALS = [
  { value: 'lose_fat', label: 'Lose Fat', icon: 'flame' },
  { value: 'build_muscle', label: 'Build Muscle', icon: 'barbell' },
  { value: 'recomposition', label: 'Recomposition', icon: 'sync' },
  { value: 'improve_posture', label: 'Fix Posture', icon: 'body' },
  { value: 'general_fitness', label: 'General Fitness', icon: 'fitness' },
  { value: 'endurance', label: 'Endurance', icon: 'heart' },
];

const EQUIPMENT_OPTIONS = [
  { value: 'dumbbells', label: 'Dumbbells', icon: 'barbell' },
  { value: 'bench', label: 'Bench', icon: 'bed' },
  { value: 'resistance_band', label: 'Resistance Band', icon: 'git-network' },
  { value: 'pull_up_bar', label: 'Pull-Up Bar', icon: 'remove' },
  { value: 'barbell', label: 'Barbell', icon: 'barbell' },
];

const JOB_TYPES = [
  { value: 'desk', label: 'Desk Job', desc: 'Seated most of the day' },
  { value: 'active', label: 'Active Job', desc: 'On your feet often' },
  { value: 'mixed', label: 'Mixed', desc: 'Some of both' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getBmiColor(bmi) {
  if (bmi < 18.5) return colors.info;
  if (bmi < 25) return colors.success;
  if (bmi < 30) return colors.warning;
  return colors.secondary;
}

function getBmiCategory(bmi) {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

export default function OnboardingScreen() {
  const { dispatch } = useApp();
  const [step, setStep] = useState(0);

  // Step 1
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  // Step 2
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  // Step 3
  const [bodyType, setBodyType] = useState('');
  const [fitnessLevel, setFitnessLevel] = useState('');
  // Step 4
  const [goals, setGoals] = useState([]);
  // Step 5
  const [equipment, setEquipment] = useState([]);
  // Step 6
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [restDays, setRestDays] = useState(['Monday', 'Wednesday', 'Friday']);
  const [jobType, setJobType] = useState('desk');

  function toggleArray(arr, setArr, val) {
    setArr(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
  }

  function validateStep() {
    switch (step) {
      case 0: return name.trim().length > 0 && gender !== '';
      case 1: {
        const h = parseFloat(height), w = parseFloat(weight), a = parseInt(age);
        return h > 50 && h < 300 && w > 20 && w < 500 && a > 5 && a < 120;
      }
      case 2: return bodyType !== '' && fitnessLevel !== '';
      case 3: return goals.length > 0;
      case 4: return true; // equipment optional (bodyweight = no equipment)
      case 5: return restDays.length < 7;
      default: return true;
    }
  }

  function next() {
    if (!validateStep()) {
      Alert.alert('Missing Info', 'Please fill in all required fields before continuing.');
      return;
    }
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      finish();
    }
  }

  function finish() {
    const userProfile = {
      name: name.trim(),
      gender,
      age: parseInt(age),
      height: parseFloat(height),
      weight: parseFloat(weight),
      waist: waist ? parseFloat(waist) : null,
      bodyType,
      fitnessLevel,
      goals,
      equipment,
      workoutDaysPerWeek: daysPerWeek,
      restDays,
      jobType,
    };
    const generatedPlan = generateWorkoutPlan(userProfile);
    dispatch({ type: 'COMPLETE_ONBOARDING', payload: { userProfile, generatedPlan } });
  }

  const bmi = height && weight
    ? parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2)
    : null;

  const stepTitles = ['About You', 'Your Measurements', 'Body & Level', 'Your Goals', 'Equipment', 'Schedule'];

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Progress Bar */}
      <View style={s.progressRow}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[s.progressDot, i <= step && s.progressDotActive, i < step && s.progressDotDone]}
          />
        ))}
      </View>

      <View style={s.stepHeader}>
        <Text style={s.stepCount}>Step {step + 1} of {TOTAL_STEPS}</Text>
        <Text style={s.stepTitle}>{stepTitles[step]}</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 0 && (
            <Step1
              name={name} setName={setName}
              gender={gender} setGender={setGender}
            />
          )}
          {step === 1 && (
            <Step2
              age={age} setAge={setAge}
              height={height} setHeight={setHeight}
              weight={weight} setWeight={setWeight}
              waist={waist} setWaist={setWaist}
              bmi={bmi}
            />
          )}
          {step === 2 && (
            <Step3
              bodyType={bodyType} setBodyType={setBodyType}
              fitnessLevel={fitnessLevel} setFitnessLevel={setFitnessLevel}
            />
          )}
          {step === 3 && (
            <Step4 goals={goals} toggleGoal={val => toggleArray(goals, setGoals, val)} />
          )}
          {step === 4 && (
            <Step5
              equipment={equipment}
              toggleEquipment={val => toggleArray(equipment, setEquipment, val)}
            />
          )}
          {step === 5 && (
            <Step6
              daysPerWeek={daysPerWeek} setDaysPerWeek={setDaysPerWeek}
              restDays={restDays} toggleRestDay={val => toggleArray(restDays, setRestDays, val)}
              jobType={jobType} setJobType={setJobType}
            />
          )}

          <View style={{ height: 16 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Navigation Buttons */}
      <View style={s.btnRow}>
        {step > 0 ? (
          <TouchableOpacity style={s.backBtn} onPress={() => setStep(step - 1)}>
            <Ionicons name="chevron-back" size={20} color={colors.textSec} />
          </TouchableOpacity>
        ) : (
          <View style={s.backBtn} />
        )}
        <TouchableOpacity
          style={[s.nextBtn, !validateStep() && s.nextBtnDisabled]}
          onPress={next}
          activeOpacity={0.85}
        >
          <Text style={s.nextBtnText}>
            {step === TOTAL_STEPS - 1 ? 'Generate My Plan ✨' : 'Continue'}
          </Text>
          {step < TOTAL_STEPS - 1 && (
            <Ionicons name="chevron-forward" size={18} color={colors.white} style={{ marginLeft: 4 }} />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* ─── Step 1: Name & Gender ─────────────────────────────────────── */

function Step1({ name, setName, gender, setGender }) {
  const GENDERS = [
    { value: 'male', label: 'Male', icon: 'male' },
    { value: 'female', label: 'Female', icon: 'female' },
    { value: 'other', label: 'Other', icon: 'person' },
  ];
  return (
    <View>
      <Text style={s.intro}>Welcome to FitForge. Let's build your personal workout plan.</Text>

      <Label text="What should we call you?" />
      <TextInput
        style={s.input}
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="words"
        autoFocus
      />

      <Label text="Gender" />
      <View style={s.chipRow}>
        {GENDERS.map(g => (
          <SelectChip
            key={g.value}
            label={g.label}
            icon={g.icon}
            selected={gender === g.value}
            onPress={() => setGender(g.value)}
          />
        ))}
      </View>
    </View>
  );
}

/* ─── Step 2: Measurements ──────────────────────────────────────── */

function Step2({ age, setAge, height, setHeight, weight, setWeight, waist, setWaist, bmi }) {
  return (
    <View>
      <Text style={s.intro}>These help personalise your plan and track your progress accurately.</Text>

      <View style={s.row2}>
        <View style={s.col}>
          <Label text="Age" />
          <TextInput style={s.input} value={age} onChangeText={setAge}
            placeholder="25" placeholderTextColor={colors.textMuted} keyboardType="number-pad" />
        </View>
        <View style={s.col}>
          <Label text="Height (cm)" />
          <TextInput style={s.input} value={height} onChangeText={setHeight}
            placeholder="172" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" />
        </View>
      </View>

      <View style={s.row2}>
        <View style={s.col}>
          <Label text="Weight (kg)" />
          <TextInput style={s.input} value={weight} onChangeText={setWeight}
            placeholder="70" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" />
        </View>
        <View style={s.col}>
          <Label text="Waist (cm) — optional" />
          <TextInput style={s.input} value={waist} onChangeText={setWaist}
            placeholder="80" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" />
        </View>
      </View>

      {bmi && !isNaN(bmi) && (
        <View style={s.bmiCard}>
          <Text style={s.bmiLabel}>Your BMI</Text>
          <Text style={[s.bmiValue, { color: getBmiColor(bmi) }]}>{bmi.toFixed(1)}</Text>
          <Text style={[s.bmiCat, { color: getBmiColor(bmi) }]}>{getBmiCategory(bmi)}</Text>
        </View>
      )}
    </View>
  );
}

/* ─── Step 3: Body Type & Fitness Level ─────────────────────────── */

function Step3({ bodyType, setBodyType, fitnessLevel, setFitnessLevel }) {
  return (
    <View>
      <Text style={s.intro}>Honest answers here help us pick the right exercises and intensity.</Text>

      <Label text="Body Type" />
      {BODY_TYPES.map(bt => (
        <TouchableOpacity
          key={bt.value}
          style={[s.listItem, bodyType === bt.value && s.listItemActive]}
          onPress={() => setBodyType(bt.value)}
          activeOpacity={0.8}
        >
          <View style={[s.radio, bodyType === bt.value && s.radioActive]} />
          <View style={{ flex: 1 }}>
            <Text style={[s.listLabel, bodyType === bt.value && s.listLabelActive]}>{bt.label}</Text>
            <Text style={s.listDesc}>{bt.desc}</Text>
          </View>
          {bodyType === bt.value && (
            <Ionicons name="checkmark-circle" size={20} color={colors.accentLight} />
          )}
        </TouchableOpacity>
      ))}

      <Label text="Fitness Level" style={{ marginTop: 20 }} />
      {FITNESS_LEVELS.map(fl => (
        <TouchableOpacity
          key={fl.value}
          style={[s.listItem, fitnessLevel === fl.value && s.listItemActive]}
          onPress={() => setFitnessLevel(fl.value)}
          activeOpacity={0.8}
        >
          <View style={[s.radio, fitnessLevel === fl.value && s.radioActive]} />
          <View style={{ flex: 1 }}>
            <Text style={[s.listLabel, fitnessLevel === fl.value && s.listLabelActive]}>{fl.label}</Text>
            <Text style={s.listDesc}>{fl.desc}</Text>
          </View>
          {fitnessLevel === fl.value && (
            <Ionicons name="checkmark-circle" size={20} color={colors.accentLight} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

/* ─── Step 4: Goals ─────────────────────────────────────────────── */

function Step4({ goals, toggleGoal }) {
  return (
    <View>
      <Text style={s.intro}>Pick everything that applies. Your primary goal is the first one you tap.</Text>
      <View style={s.chipGrid}>
        {GOALS.map(g => (
          <TouchableOpacity
            key={g.value}
            style={[s.goalChip, goals.includes(g.value) && s.goalChipActive]}
            onPress={() => toggleGoal(g.value)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={g.icon}
              size={22}
              color={goals.includes(g.value) ? colors.white : colors.textSec}
              style={{ marginBottom: 6 }}
            />
            <Text style={[s.goalChipText, goals.includes(g.value) && s.goalChipTextActive]}>
              {g.label}
            </Text>
            {goals.indexOf(g.value) === 0 && (
              <View style={s.primaryBadge}><Text style={s.primaryBadgeText}>Primary</Text></View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/* ─── Step 5: Equipment ─────────────────────────────────────────── */

function Step5({ equipment, toggleEquipment }) {
  return (
    <View>
      <Text style={s.intro}>
        Select only what you actually own at home or have consistent access to. Leave blank for bodyweight-only.
      </Text>
      <View style={s.chipGrid}>
        {EQUIPMENT_OPTIONS.map(eq => (
          <TouchableOpacity
            key={eq.value}
            style={[s.goalChip, equipment.includes(eq.value) && s.goalChipActive]}
            onPress={() => toggleEquipment(eq.value)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={eq.icon}
              size={22}
              color={equipment.includes(eq.value) ? colors.white : colors.textSec}
              style={{ marginBottom: 6 }}
            />
            <Text style={[s.goalChipText, equipment.includes(eq.value) && s.goalChipTextActive]}>
              {eq.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {equipment.length === 0 && (
        <View style={s.infoCard}>
          <Ionicons name="information-circle-outline" size={16} color={colors.info} style={{ marginRight: 8 }} />
          <Text style={s.infoText}>Bodyweight-only plan will be generated — still highly effective!</Text>
        </View>
      )}
    </View>
  );
}

/* ─── Step 6: Schedule ──────────────────────────────────────────── */

function Step6({ daysPerWeek, setDaysPerWeek, restDays, toggleRestDay, jobType, setJobType }) {
  const trainingDays = DAYS.filter(d => !restDays.includes(d));
  return (
    <View>
      <Text style={s.intro}>Your schedule shapes the workout split we assign to each training day.</Text>

      <Label text="Training Days Per Week" />
      <View style={s.chipRow}>
        {[3, 4, 5, 6].map(n => (
          <TouchableOpacity
            key={n}
            style={[s.numChip, daysPerWeek === n && s.numChipActive]}
            onPress={() => setDaysPerWeek(n)}
          >
            <Text style={[s.numChipText, daysPerWeek === n && s.numChipTextActive]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Label text="Rest Days (tap to toggle)" style={{ marginTop: 16 }} />
      <View style={s.chipRow}>
        {DAYS.map(day => (
          <TouchableOpacity
            key={day}
            style={[s.dayChip, restDays.includes(day) && s.dayChipRest]}
            onPress={() => toggleRestDay(day)}
          >
            <Text style={[s.dayChipText, restDays.includes(day) && s.dayChipTextRest]}>
              {day.slice(0, 3)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.scheduleInfo}>
        <Text style={s.scheduleInfoText}>
          Training {trainingDays.length} day{trainingDays.length !== 1 ? 's' : ''}: {trainingDays.join(', ')}
        </Text>
      </View>

      <Label text="Job Type" style={{ marginTop: 16 }} />
      {JOB_TYPES.map(jt => (
        <TouchableOpacity
          key={jt.value}
          style={[s.listItem, jobType === jt.value && s.listItemActive]}
          onPress={() => setJobType(jt.value)}
          activeOpacity={0.8}
        >
          <View style={[s.radio, jobType === jt.value && s.radioActive]} />
          <View style={{ flex: 1 }}>
            <Text style={[s.listLabel, jobType === jt.value && s.listLabelActive]}>{jt.label}</Text>
            <Text style={s.listDesc}>{jt.desc}</Text>
          </View>
          {jobType === jt.value && (
            <Ionicons name="checkmark-circle" size={20} color={colors.accentLight} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

/* ─── Sub-components ────────────────────────────────────────────── */

function Label({ text, style }) {
  return <Text style={[s.label, style]}>{text}</Text>;
}

function SelectChip({ label, icon, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[s.selectChip, selected && s.selectChipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={16} color={selected ? colors.white : colors.textSec} style={{ marginRight: 6 }} />
      <Text style={[s.selectChipText, selected && s.selectChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  progressRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 6,
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  progressDotActive: { backgroundColor: colors.accentDim },
  progressDotDone: { backgroundColor: colors.accentLight },

  stepHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  stepCount: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginBottom: 4 },
  stepTitle: { fontSize: 24, color: colors.text, fontWeight: '700' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  intro: {
    fontSize: 14,
    color: colors.textSec,
    lineHeight: 21,
    marginBottom: 20,
  },

  label: {
    fontSize: 13,
    color: colors.textSec,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },

  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },

  row2: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },

  bmiCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bmiLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  bmiValue: { fontSize: 36, fontWeight: '800', marginTop: 4 },
  bmiCat: { fontSize: 14, fontWeight: '600', marginTop: 2 },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },

  selectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  selectChipText: { fontSize: 14, color: colors.textSec, fontWeight: '600' },
  selectChipTextActive: { color: colors.white },

  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  listItemActive: {
    borderColor: colors.accentLight,
    backgroundColor: colors.accentDim + '30',
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioActive: {
    borderColor: colors.accentLight,
    backgroundColor: colors.accentLight,
  },
  listLabel: { fontSize: 14, color: colors.text, fontWeight: '600', marginBottom: 2 },
  listLabelActive: { color: colors.accentLight },
  listDesc: { fontSize: 12, color: colors.textMuted },

  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  goalChip: {
    width: '30%',
    minWidth: 90,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  goalChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  goalChipText: { fontSize: 11, color: colors.textSec, fontWeight: '600', textAlign: 'center' },
  goalChipTextActive: { color: colors.white },
  primaryBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.warning,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  primaryBadgeText: { fontSize: 8, color: colors.white, fontWeight: '700' },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.info + '15',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.info + '40',
  },
  infoText: { flex: 1, fontSize: 12, color: colors.textSec, lineHeight: 18 },

  numChip: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  numChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  numChipText: { fontSize: 18, color: colors.textSec, fontWeight: '700' },
  numChipTextActive: { color: colors.white },

  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayChipRest: {
    backgroundColor: colors.accentDim + '40',
    borderColor: colors.accent,
  },
  dayChipText: { fontSize: 12, color: colors.textSec, fontWeight: '600' },
  dayChipTextRest: { color: colors.accentLight },

  scheduleInfo: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scheduleInfoText: { fontSize: 12, color: colors.textSec, lineHeight: 18 },

  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 4,
  },
  nextBtnDisabled: { opacity: 0.45 },
  nextBtnText: { fontSize: 15, color: colors.white, fontWeight: '700' },
});
