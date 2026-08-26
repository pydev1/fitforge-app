import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { BUILD_NUMBER, BUILD_DATE, GIT_HASH } from '../constants/buildInfo';

const BODY_TYPES = ['skinny', 'skinny_fat', 'average', 'athletic', 'overweight'];
const FITNESS_LEVELS = ['beginner', 'intermediate', 'advanced'];
const GOALS_OPTIONS = ['lose_fat', 'build_muscle', 'recomposition', 'improve_posture', 'general_fitness', 'endurance'];
const EQUIPMENT_OPTIONS = ['dumbbells', 'bench', 'resistance_band', 'pull_up_bar', 'barbell'];
const JOB_TYPES = ['desk', 'active', 'mixed'];
const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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

function prettyLabel(str) {
  return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const REMINDER_HOURS = [6, 7, 8, 9, 12, 17, 18, 19, 20, 21];
function formatHour(h) {
  if (h === 12) return '12 PM';
  if (h === 0) return '12 AM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

export default function SettingsScreen({ navigation }) {
  const { state, dispatch } = useApp();
  const p = state.userProfile;

  const [apiKey, setApiKey] = useState(state.apiKey);
  const [showKey, setShowKey] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(state.reminderEnabled ?? false);
  const [reminderHour, setReminderHour] = useState(state.reminderHour ?? 19);

  // Basic info
  const [name, setName] = useState(p.name || '');
  const [gender, setGender] = useState(p.gender || '');
  const [age, setAge] = useState(p.age ? String(p.age) : '');
  const [height, setHeight] = useState(p.height ? String(p.height) : '');
  const [weight, setWeight] = useState(p.weight ? String(p.weight) : '');
  const [waist, setWaist] = useState(p.waist ? String(p.waist) : '');

  // Training profile
  const [bodyType, setBodyType] = useState(p.bodyType || '');
  const [fitnessLevel, setFitnessLevel] = useState(p.fitnessLevel || 'beginner');
  const [goals, setGoals] = useState(p.goals || []);
  const [equipment, setEquipment] = useState(p.equipment || []);
  const [daysPerWeek, setDaysPerWeek] = useState(p.workoutDaysPerWeek || 4);
  const [restDays, setRestDays] = useState(p.restDays || ['Monday', 'Wednesday', 'Friday']);
  const [jobType, setJobType] = useState(p.jobType || 'desk');

  function toggleArr(arr, setArr, val) {
    setArr(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
  }

  function buildProfile() {
    return {
      ...p,
      name: name.trim() || p.name,
      gender,
      age: parseInt(age) || p.age,
      height: parseFloat(height) || p.height,
      weight: parseFloat(weight) || p.weight,
      waist: waist ? parseFloat(waist) : p.waist,
      bodyType,
      fitnessLevel,
      goals,
      equipment,
      workoutDaysPerWeek: daysPerWeek,
      restDays,
      jobType,
    };
  }

  function validateSchedule() {
    const trainingDayCount = ALL_DAYS.filter(day => !restDays.includes(day)).length;
    if (trainingDayCount < daysPerWeek) {
      Alert.alert(
        'Schedule mismatch',
        `You selected ${daysPerWeek} training days, but your rest days leave only ${trainingDayCount}. Remove a rest day or lower training days per week.`,
      );
      return false;
    }
    return true;
  }

  function save() {
    if (!validateSchedule()) return;
    dispatch({ type: 'SET_REMINDER', payload: { enabled: reminderEnabled, hour: reminderHour } });
    dispatch({ type: 'SET_API_KEY', payload: apiKey.trim() });
    const updatedProfile = buildProfile();
    dispatch({ type: 'UPDATE_PROFILE', payload: updatedProfile });
    Alert.alert('Saved!', 'Your profile has been updated.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  }

  function regeneratePlan() {
    Alert.alert(
      'Regenerate Workout Plan',
      'This will rebuild your entire workout plan using your current profile. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          onPress: () => {
            if (!validateSchedule()) return;
            const updatedProfile = buildProfile();
            dispatch({ type: 'REGENERATE_PLAN', payload: updatedProfile });
            Alert.alert('Plan Updated! 🎉', 'Your new workout plan is ready.');
          },
        },
      ],
    );
  }

  const bmi = height && weight
    ? parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2)
    : null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-down" size={22} color={colors.textSec} />
          </TouchableOpacity>
          <Text style={s.title}>Settings</Text>
          <TouchableOpacity style={s.saveBtn} onPress={save}>
            <Text style={s.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* API Key */}
        <Section title="Anthropic API Key" icon="key-outline">
          <Text style={s.note}>Required for your Coach and Form Check features. Get yours at console.anthropic.com</Text>
          <View style={s.keyRow}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="sk-ant-api03-..."
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={s.eyeBtn} onPress={() => setShowKey(!showKey)}>
              <Ionicons name={showKey ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSec} />
            </TouchableOpacity>
          </View>
          <View style={s.keyStatus}>
            <Ionicons name={apiKey ? 'checkmark-circle' : 'warning-outline'} size={14} color={apiKey ? colors.success : colors.warning} />
            <Text style={[s.keyStatusText, { color: apiKey ? colors.success : colors.warning }]}>
              {apiKey ? 'API key is set' : 'No API key — coach and form check disabled'}
            </Text>
          </View>
        </Section>

        {/* Basic Info */}
        <Section title="Personal Info" icon="person-outline">
          <Field label="Display Name" value={name} onChange={setName} placeholder="Your name" />
          <Label text="Gender" />
          <View style={s.chipRow}>
            {['male', 'female', 'other'].map(g => (
              <SelectChip key={g} label={prettyLabel(g)} selected={gender === g} onPress={() => setGender(g)} />
            ))}
          </View>
          <View style={s.row2}>
            <View style={{ flex: 1 }}>
              <Field label="Age" value={age} onChange={setAge} placeholder="25" numeric />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field label="Height (cm)" value={height} onChange={setHeight} placeholder="172" numeric />
            </View>
          </View>
          <View style={s.row2}>
            <View style={{ flex: 1 }}>
              <Field label="Weight (kg)" value={weight} onChange={setWeight} placeholder="70" numeric />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field label="Waist (cm)" value={waist} onChange={setWaist} placeholder="80" numeric />
            </View>
          </View>
          {bmi && !isNaN(bmi) && (
            <View style={s.bmiRow}>
              <Text style={s.bmiLabel}>BMI: </Text>
              <Text style={[s.bmiValue, { color: getBmiColor(bmi) }]}>{bmi.toFixed(1)}</Text>
              <Text style={s.bmiCat}> · {getBmiCategory(bmi)}</Text>
            </View>
          )}
        </Section>

        {/* Training Profile */}
        <Section title="Training Profile" icon="barbell-outline">
          <Label text="Body Type" />
          <View style={s.chipRow}>
            {BODY_TYPES.map(bt => (
              <SelectChip key={bt} label={prettyLabel(bt)} selected={bodyType === bt} onPress={() => setBodyType(bt)} small />
            ))}
          </View>

          <Label text="Fitness Level" />
          <View style={s.chipRow}>
            {FITNESS_LEVELS.map(fl => (
              <SelectChip key={fl} label={prettyLabel(fl)} selected={fitnessLevel === fl} onPress={() => setFitnessLevel(fl)} />
            ))}
          </View>

          <Label text="Goals (first = primary)" />
          <View style={s.chipRow}>
            {GOALS_OPTIONS.map(g => (
              <SelectChip key={g} label={prettyLabel(g)} selected={goals.includes(g)} onPress={() => toggleArr(goals, setGoals, g)} small />
            ))}
          </View>

          <Label text="Equipment" />
          <View style={s.chipRow}>
            {EQUIPMENT_OPTIONS.map(eq => (
              <SelectChip key={eq} label={prettyLabel(eq)} selected={equipment.includes(eq)} onPress={() => toggleArr(equipment, setEquipment, eq)} small />
            ))}
          </View>

          <Label text="Job Type" />
          <View style={s.chipRow}>
            {JOB_TYPES.map(jt => (
              <SelectChip key={jt} label={prettyLabel(jt)} selected={jobType === jt} onPress={() => setJobType(jt)} />
            ))}
          </View>
        </Section>

        {/* Schedule */}
        <Section title="Schedule" icon="calendar-outline">
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

          <Label text="Rest Days" />
          <View style={s.chipRow}>
            {ALL_DAYS.map(day => (
              <TouchableOpacity
                key={day}
                style={[s.dayChip, restDays.includes(day) && s.dayChipRest]}
                onPress={() => toggleArr(restDays, setRestDays, day)}
              >
                <Text style={[s.dayChipText, restDays.includes(day) && s.dayChipTextRest]}>
                  {day.slice(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.scheduleHint}>
            {ALL_DAYS.filter(day => !restDays.includes(day)).length} available training day
            {ALL_DAYS.filter(day => !restDays.includes(day)).length === 1 ? '' : 's'} for your {daysPerWeek}-day target.
          </Text>
        </Section>

        {/* Regenerate Plan */}
        <View style={{ marginHorizontal: 16, marginTop: 20 }}>
          <TouchableOpacity style={s.regenBtn} onPress={regeneratePlan} activeOpacity={0.85}>
            <Ionicons name="refresh-circle" size={20} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={s.regenBtnText}>Regenerate Workout Plan</Text>
          </TouchableOpacity>
          <Text style={s.regenNote}>Rebuilds your entire plan from your updated profile settings above.</Text>
        </View>

        {/* Program restart */}
        <Section title="Coming Back From A Break" icon="refresh-outline">
          {state.restart && (
            <View style={s.restartStatus}>
              <Ionicons name="checkmark-circle" size={15} color={colors.accentLight} />
              <Text style={s.restartStatusText}>
                Easing back active — loads ~{Math.round((1 - state.restart.factor) * 100)}% lighter since {state.restart.date}.
              </Text>
            </View>
          )}
          <TouchableOpacity style={s.restartBtn} onPress={() => navigation.navigate('Restart')} activeOpacity={0.85}>
            <Ionicons name="refresh" size={18} color={colors.onAccent} style={{ marginRight: 8 }} />
            <Text style={s.restartBtnText}>{state.restart ? 'Adjust Restart' : 'Restart After A Break'}</Text>
          </TouchableOpacity>
          {state.restart && (
            <TouchableOpacity
              style={s.restartClearBtn}
              onPress={() => Alert.alert(
                'End restart mode?',
                'Suggested loads go back to normal progression. Your history is unaffected.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'End restart', onPress: () => dispatch({ type: 'CLEAR_RESTART' }) },
                ],
              )}
            >
              <Text style={s.restartClearText}>End restart mode</Text>
            </TouchableOpacity>
          )}
          <Text style={s.regenNote}>
            Been away for a while? This eases your suggested weights back down and restarts the 12-week programme
            from Week 1 — your measurements, logs and personal bests are kept.
          </Text>
        </Section>

        {/* Reminders */}
        <Section title="Daily Reminder" icon="notifications-outline">
          <View style={s.reminderRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.reminderLabel}>Daily workout reminder</Text>
              <Text style={s.reminderSub}>
                {reminderEnabled ? `Fires every day at ${formatHour(reminderHour)}` : 'Off — you\'re on your own'}
              </Text>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{ false: colors.border, true: colors.accentDim }}
              thumbColor={reminderEnabled ? colors.accent : colors.textMuted}
            />
          </View>
          {reminderEnabled && (
            <>
              <Label text="Remind me at" style={{ marginTop: 12 }} />
              <View style={s.chipRow}>
                {REMINDER_HOURS.map(h => (
                  <TouchableOpacity
                    key={h}
                    style={[s.numChip, { width: 'auto', paddingHorizontal: 12 }, reminderHour === h && s.numChipActive]}
                    onPress={() => setReminderHour(h)}
                  >
                    <Text style={[s.numChipText, { fontSize: 13 }, reminderHour === h && s.numChipTextActive]}>
                      {formatHour(h)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </Section>

        {/* About */}
        <Section title="About" icon="information-circle-outline">
          <InfoRow label="App" value="FitForge" />
          <InfoRow label="AI Model" value="Claude Sonnet 4.6 (Anthropic)" />
          <InfoRow label="Version" value="1.0.0" />
          <InfoRow label="Build" value={`#${BUILD_NUMBER} · ${BUILD_DATE} · ${GIT_HASH}`} />
        </Section>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Sub-components ────────────────────────────────────────────── */

function Section({ title, icon, children }) {
  return (
    <View style={ss.section}>
      <View style={ss.sectionHeader}>
        <Ionicons name={icon} size={16} color={colors.accentLight} />
        <Text style={ss.sectionTitle}>{title}</Text>
      </View>
      <View style={ss.sectionBody}>{children}</View>
    </View>
  );
}

function Label({ text, style }) {
  return <Text style={[f.label, { marginTop: 8 }, style]}>{text}</Text>;
}

function Field({ label, value, onChange, placeholder, numeric }) {
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <TextInput
        style={f.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

function SelectChip({ label, selected, onPress, small }) {
  return (
    <TouchableOpacity
      style={[f.chip, selected && f.chipActive, small && f.chipSmall]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[f.chipText, selected && f.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={ir.row}>
      <Text style={ir.label}>{label}</Text>
      <Text style={ir.value}>{value}</Text>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  title: { fontSize: 18, color: colors.text, fontWeight: '700' },
  saveBtn: { backgroundColor: colors.accent, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8 },
  saveBtnText: { fontSize: 13, color: colors.onAccent, fontWeight: '700' },
  note: { fontSize: 12, color: colors.textSec, lineHeight: 18, marginBottom: 12 },
  keyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    backgroundColor: colors.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 13, color: colors.text, borderWidth: 1, borderColor: colors.border, fontFamily: 'monospace',
  },
  eyeBtn: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
  },
  keyStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  keyStatusText: { fontSize: 12 },
  row2: { flexDirection: 'row' },
  bmiRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 8,
    backgroundColor: colors.bg, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  bmiLabel: { fontSize: 13, color: colors.textSec },
  bmiValue: { fontSize: 14, fontWeight: '700' },
  bmiCat: { fontSize: 13, color: colors.textSec },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  numChip: {
    width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
  },
  numChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  numChipText: { fontSize: 18, color: colors.textSec, fontWeight: '700' },
  numChipTextActive: { color: colors.onAccent },
  dayChip: {
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8,
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
  },
  dayChipRest: { backgroundColor: colors.accentDim + '40', borderColor: colors.accent },
  dayChipText: { fontSize: 12, color: colors.textSec, fontWeight: '600' },
  dayChipTextRest: { color: colors.accentLight },
  regenBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accentDim, borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: colors.accent,
  },
  regenBtnText: { fontSize: 14, color: '#fff', fontWeight: '700' },
  regenNote: { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 16 },
  restartStatus: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.accentDim, borderRadius: 10, padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: colors.accent + '40',
  },
  restartStatusText: { flex: 1, fontSize: 12, color: colors.textSec, lineHeight: 17 },
  restartBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 14,
  },
  restartBtnText: { fontSize: 14, color: colors.onAccent, fontWeight: '700' },
  restartClearBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginTop: 4 },
  restartClearText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reminderLabel: { fontSize: 14, color: colors.text, fontWeight: '600' },
  reminderSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  scheduleHint: { fontSize: 11, color: colors.textMuted, lineHeight: 16, marginTop: 4 },
});

const ss = StyleSheet.create({
  section: { marginHorizontal: 16, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 13, color: colors.textSec, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionBody: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
});

const f = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontSize: 12, color: colors.textSec, marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: colors.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.border,
  },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipSmall: { paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { fontSize: 12, color: colors.textSec, fontWeight: '600' },
  chipTextActive: { color: colors.onAccent },
});

const ir = StyleSheet.create({
  row: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  label: { fontSize: 11, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  value: { fontSize: 13, color: colors.text },
});
