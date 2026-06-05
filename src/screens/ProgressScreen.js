import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');
const CHART_W = width - 40;

const CHART_CONFIG = {
  backgroundGradientFrom: colors.surface,
  backgroundGradientTo: colors.surface,
  backgroundGradientFromOpacity: 1,
  backgroundGradientToOpacity: 1,
  color: (opacity = 1) => `rgba(40, 120, 216, ${opacity})`,
  labelColor: () => colors.textMuted,
  strokeWidth: 2.5,
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#2878d8',
    fill: colors.bg,
  },
  propsForBackgroundLines: {
    stroke: colors.border,
    strokeDasharray: '4',
    strokeWidth: 1,
  },
  decimalPlaces: 1,
};

function buildChartData(entries, limit = 7) {
  const slice = entries.slice(-limit);
  return {
    labels: slice.map((e) => e.date.slice(5)),
    datasets: [{ data: slice.map((e) => e.value) }],
  };
}

function getStreak(completedWorkouts) {
  if (!completedWorkouts.length) return 0;
  const sorted = [...completedWorkouts].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (const w of sorted) {
    const d = new Date(w.date);
    const diff = Math.round((cursor - d) / 86400000);
    if (diff <= 1) { streak++; cursor = d; }
    else break;
  }
  return streak;
}

function getMostRecentPR(setLogs) {
  if (!setLogs.length) return null;
  const byExercise = {};
  setLogs.forEach(log => {
    if (!byExercise[log.exerciseId]) byExercise[log.exerciseId] = { name: log.exerciseName, logs: [] };
    byExercise[log.exerciseId].logs.push(log);
  });
  let bestEntry = null;
  Object.values(byExercise).forEach(({ name, logs }) => {
    const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
    sorted.forEach((log, i) => {
      if (i === 0) return;
      const prevBest = Math.max(...sorted.slice(0, i).map(l => l.weight));
      if (log.weight > prevBest) {
        if (!bestEntry || log.date > bestEntry.date) {
          bestEntry = { name, weight: log.weight, date: log.date };
        }
      }
    });
  });
  return bestEntry;
}

function formatPRDate(dateStr) {
  const d = new Date(dateStr);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[d.getDay()];
}

// Get muscle group label for a workout type
function getMuscleGroups(type) {
  const map = {
    push: 'chest & shoulders',
    pull: 'back & biceps',
    legs_core: 'legs & core',
    posture: 'posture & mobility',
  };
  return map[type] || type;
}

export default function ProgressScreen() {
  const { state, dispatch } = useApp();
  const { progress, userProfile } = state;
  const [logModal, setLogModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [waistInput, setWaistInput] = useState('');

  const setLogs = progress.setLogs || [];
  const streak = getStreak(progress.completedWorkouts);
  const totalWorkouts = progress.completedWorkouts.length;
  const lastWeight = progress.weight[progress.weight.length - 1];
  const firstWeight = progress.weight[0];
  const weightDelta = lastWeight && firstWeight
    ? (lastWeight.value - firstWeight.value).toFixed(1)
    : null;
  const lastWaist = progress.waist[progress.waist.length - 1];
  const firstWaist = progress.waist[0];
  const waistDelta = lastWaist && firstWaist
    ? (lastWaist.value - firstWaist.value).toFixed(1)
    : null;
  const targetWaist = 80;

  const weightChartData = progress.weight.length >= 2 ? buildChartData(progress.weight) : null;
  const waistChartData = progress.waist.length >= 2 ? buildChartData(progress.waist, 6) : null;

  const recentPR = getMostRecentPR(setLogs);

  // Rough week number based on first workout date
  const firstDate = progress.completedWorkouts.length
    ? new Date(progress.completedWorkouts[0].date)
    : null;
  const weekNum = firstDate
    ? Math.max(1, Math.ceil((Date.now() - firstDate.getTime()) / (7 * 86400000)))
    : null;

  function saveLog() {
    const today = new Date().toISOString().split('T')[0];
    if (weightInput) {
      const val = parseFloat(weightInput);
      if (isNaN(val) || val < 30 || val > 300) {
        Alert.alert('Invalid weight', 'Please enter a weight between 30 and 300 kg.');
        return;
      }
      dispatch({ type: 'LOG_WEIGHT', payload: { date: today, value: val } });
    }
    if (waistInput) {
      const val = parseFloat(waistInput);
      if (isNaN(val) || val < 40 || val > 200) {
        Alert.alert('Invalid measurement', 'Please enter a waist between 40 and 200 cm.');
        return;
      }
      dispatch({ type: 'LOG_WAIST', payload: { date: today, value: val } });
    }
    if (weightInput || waistInput) Alert.alert('Logged 📊', 'Your measurements have been saved.');
    setWeightInput('');
    setWaistInput('');
    setLogModal(false);
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>How you're doing</Text>
            {weekNum && (
              <Text style={s.subtitle}>
                Week {weekNum} of 12 — building the habit. Numbers will follow.
              </Text>
            )}
          </View>
          <TouchableOpacity style={s.logBtn} onPress={() => setLogModal(true)}>
            <Ionicons name="add" size={18} color={colors.white} />
            <Text style={s.logBtnText}>Log</Text>
          </TouchableOpacity>
        </View>

        {/* Stat cards row — 3 cards */}
        <View style={s.statRow}>
          {/* First card: waist — bright blue */}
          <View style={[s.statCard, s.statCardBlue]}>
            <Text style={s.statCardValueBlue}>
              {lastWaist?.value ?? userProfile.waist ?? '—'}
              <Text style={s.statCardUnitBlue}> cm</Text>
            </Text>
            <Text style={s.statCardLabelBlue}>Waist</Text>
            <Text style={s.statCardGoalBlue}>goal is {targetWaist} cm</Text>
          </View>

          {/* Second: streak */}
          <View style={s.statCard}>
            <Ionicons name="flame" size={16} color={colors.warning} style={{ marginBottom: 4 }} />
            <Text style={s.statCardValue}>{streak}<Text style={s.statCardUnit}> days</Text></Text>
            <Text style={s.statCardLabel}>Streak</Text>
          </View>

          {/* Third: sessions */}
          <View style={s.statCard}>
            <Ionicons name="barbell-outline" size={16} color={colors.textSec} style={{ marginBottom: 4 }} />
            <Text style={s.statCardValue}>{totalWorkouts}</Text>
            <Text style={s.statCardLabel}>Sessions</Text>
          </View>
        </View>

        {/* PR achievement card */}
        {recentPR && (
          <View style={s.prCard}>
            <View style={s.prIconWrap}>
              <Ionicons name="trophy" size={20} color="#b8dcf8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.prTitle}>You hit a PR on {formatPRDate(recentPR.date)}</Text>
              <Text style={s.prSub}>{recentPR.name} · {recentPR.weight} kg</Text>
            </View>
          </View>
        )}

        {/* Weight + Waist charts — collapse into one card when both empty */}
        {!weightChartData && !waistChartData ? (
          <View style={[s.chartCard, s.chartCardEmpty]}>
            <Ionicons name="analytics-outline" size={36} color={colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={[s.chartTitle, { textAlign: 'center', marginBottom: 6 }]}>Your trend line starts here</Text>
            <Text style={[s.chartSub, { textAlign: 'center', marginBottom: 18 }]}>
              Log your first weight and waist measurement to start tracking progress
            </Text>
            <TouchableOpacity style={s.inlineLogBtn} onPress={() => setLogModal(true)}>
              <Ionicons name="add" size={16} color={colors.white} style={{ marginRight: 4 }} />
              <Text style={s.inlineLogBtnText}>Log now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Weight chart */}
            <View style={s.chartCard}>
              <View style={s.chartHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.chartTitle}>Your weight is moving</Text>
                  {weightDelta !== null && (
                    <Text style={s.chartSub}>
                      {parseFloat(weightDelta) < 0 ? 'Down' : 'Up'} {Math.abs(parseFloat(weightDelta))} kg since you started
                    </Text>
                  )}
                </View>
                {lastWeight && <Text style={s.chartCurrent}>{lastWeight.value} kg</Text>}
              </View>
              {weightChartData ? (
                <LineChart
                  data={weightChartData}
                  width={CHART_W - 32}
                  height={160}
                  chartConfig={CHART_CONFIG}
                  bezier
                  style={s.chart}
                  withInnerLines
                  withOuterLines={false}
                />
              ) : (
                <View style={s.inlineEmpty}>
                  <Text style={s.inlineEmptyText}>Log 2+ weight entries to see your chart</Text>
                  <TouchableOpacity onPress={() => setLogModal(true)}>
                    <Text style={s.inlineLogLink}>+ Log now</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Waist chart */}
            <View style={s.chartCard}>
              <View style={s.chartHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.chartTitle}>Waist is the real signal</Text>
                  {waistDelta !== null && (
                    <Text style={s.chartSub}>
                      {parseFloat(waistDelta) < 0 ? 'Down' : 'Up'} {Math.abs(parseFloat(waistDelta))} cm — target is {targetWaist} cm
                    </Text>
                  )}
                </View>
                {lastWaist && <Text style={s.chartCurrent}>{lastWaist.value} cm</Text>}
              </View>
              {waistChartData ? (
                <LineChart
                  data={waistChartData}
                  width={CHART_W - 32}
                  height={160}
                  chartConfig={{
                    ...CHART_CONFIG,
                    color: (opacity = 1) => `rgba(255, 87, 34, ${opacity})`,
                    propsForDots: { ...CHART_CONFIG.propsForDots, stroke: colors.accent },
                  }}
                  bezier
                  style={s.chart}
                  withInnerLines
                  withOuterLines={false}
                />
              ) : (
                <View style={s.inlineEmpty}>
                  <Text style={s.inlineEmptyText}>Log 2+ waist entries to see your chart</Text>
                  <TouchableOpacity onPress={() => setLogModal(true)}>
                    <Text style={s.inlineLogLink}>+ Log now</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        )}

        {/* Strength — volume trending up */}
        <StrengthProgress setLogs={setLogs} />

        {/* Recent sessions */}
        <View style={s.chartCard}>
          <Text style={s.chartTitle}>Recent sessions</Text>
          {progress.completedWorkouts.length === 0 ? (
            <Text style={s.emptyText}>No sessions logged yet. Complete a workout to see it here.</Text>
          ) : (
            [...progress.completedWorkouts]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 8)
              .map((w, i) => (
                <View key={`${w.date}-${i}`} style={s.workoutRow}>
                  <View style={[s.workoutDot, { backgroundColor: WORKOUT_COLORS[w.type] || colors.border }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.workoutType}>{WORKOUT_LABELS[w.type] || w.type}</Text>
                    <Text style={s.workoutMuscles}>{getMuscleGroups(w.type)}</Text>
                  </View>
                  <Text style={s.workoutDate}>{w.date}</Text>
                </View>
              ))
          )}
        </View>

        {/* Goal reminder */}
        <View style={s.goalCard}>
          <Ionicons name="trophy-outline" size={18} color={colors.warning} style={{ marginBottom: 8 }} />
          <Text style={s.goalTitle}>What you're working toward</Text>
          <Text style={s.goalText}>
            Body recomposition: lose belly fat while gaining lean muscle.{'\n'}
            Starting waist: {firstWaist?.value ?? userProfile.waist} cm → under {targetWaist} cm.{'\n'}
            Stay consistent — recomp takes 3–6 months to show clearly.
          </Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Log modal */}
      <Modal visible={logModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Log today's stats</Text>
              <TouchableOpacity onPress={() => setLogModal(false)}>
                <Ionicons name="close" size={22} color={colors.textSec} />
              </TouchableOpacity>
            </View>
            <Text style={s.modalLabel}>Weight (kg)</Text>
            <TextInput
              style={s.modalInput}
              value={weightInput}
              onChangeText={setWeightInput}
              keyboardType="decimal-pad"
              placeholder={`e.g. ${lastWeight?.value ?? userProfile.weight}`}
              placeholderTextColor={colors.textMuted}
            />
            <Text style={s.modalLabel}>Waist (cm)</Text>
            <TextInput
              style={s.modalInput}
              value={waistInput}
              onChangeText={setWaistInput}
              keyboardType="decimal-pad"
              placeholder={`e.g. ${lastWaist?.value ?? userProfile.waist}`}
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity style={s.saveBtn} onPress={saveLog}>
              <Text style={s.saveBtnText}>Save entry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StrengthProgress({ setLogs }) {
  if (!setLogs.length) {
    return (
      <View style={s.chartCard}>
        <Text style={s.chartTitle}>Volume is trending up</Text>
        <EmptyChart message="Log sets during workouts to track your strength gains" />
      </View>
    );
  }
  const byExercise = {};
  setLogs.forEach(log => {
    if (!byExercise[log.exerciseId]) byExercise[log.exerciseId] = { name: log.exerciseName, logs: [] };
    byExercise[log.exerciseId].logs.push(log);
  });
  const exercises = Object.entries(byExercise)
    .sort(([, a], [, b]) => b.logs.length - a.logs.length)
    .slice(0, 6);

  return (
    <View style={s.chartCard}>
      <Text style={s.chartTitle}>Volume is trending up</Text>
      <Text style={s.chartSub}>Your top lifts over time</Text>
      {exercises.map(([exId, { name, logs }], i) => {
        const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
        const first = sorted[0].weight;
        const last = sorted[sorted.length - 1].weight;
        const best = Math.max(...logs.map(l => l.weight));
        const delta = last - first;
        const isLast = i === exercises.length - 1;
        return (
          <View key={exId} style={[sp.row, isLast && { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={sp.name} numberOfLines={1}>{name}</Text>
              <Text style={sp.meta}>{logs.length} sets · best {best} kg · last {last} kg</Text>
            </View>
            {delta !== 0 && (
              <View style={[sp.deltaBadge, { backgroundColor: delta > 0 ? colors.success + '20' : colors.secondary + '20' }]}>
                <Text style={[sp.deltaText, { color: delta > 0 ? colors.success : colors.secondary }]}>
                  {delta > 0 ? '+' : ''}{delta} kg
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function EmptyChart({ message }) {
  return (
    <View style={s.emptyChart}>
      <Ionicons name="analytics-outline" size={32} color={colors.textMuted} />
      <Text style={s.emptyChartText}>{message}</Text>
    </View>
  );
}

const WORKOUT_COLORS = {
  push: '#2878d8',
  pull: colors.info,
  legs_core: colors.success,
  posture: colors.warning,
};

const WORKOUT_LABELS = {
  push: 'Push day',
  pull: 'Pull day',
  legs_core: 'Legs + core',
  posture: 'Posture session',
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10,
  },
  title: { fontFamily: 'BebasNeue_400Regular', fontSize: 34, color: colors.text, letterSpacing: 0.5 },
  subtitle: { fontFamily: 'Figtree_400Regular_Italic', fontSize: 13, color: colors.textSec, marginTop: 3, lineHeight: 19 },
  logBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, gap: 4,
    marginTop: 4,
  },
  logBtnText: { fontFamily: 'Figtree_700Bold', fontSize: 13, color: colors.white },

  statRow: {
    flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 4, gap: 10,
  },
  statCard: {
    flex: 1, backgroundColor: colors.surface,
    borderRadius: 18, padding: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  statCardBlue: {
    backgroundColor: colors.statCard,
    borderColor: colors.statCardBorder,
  },
  statCardValueBlue: { fontFamily: 'BebasNeue_400Regular', fontSize: 28, color: '#fff', letterSpacing: 0.5 },
  statCardUnitBlue: { fontFamily: 'Figtree_500Medium', fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  statCardLabelBlue: { fontFamily: 'Figtree_500Medium', fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  statCardGoalBlue: { fontFamily: 'Figtree_400Regular_Italic', fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 3 },
  statCardValue: { fontFamily: 'BebasNeue_400Regular', fontSize: 26, color: colors.text, letterSpacing: 0.5 },
  statCardUnit: { fontFamily: 'Figtree_500Medium', fontSize: 12, color: colors.textSec },
  statCardLabel: { fontFamily: 'Figtree_500Medium', fontSize: 10, color: colors.textMuted, marginTop: 2 },

  prCard: {
    marginHorizontal: 20, marginTop: 14,
    backgroundColor: colors.heroCardDeep || '#0e1e40',
    borderRadius: 18, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: '#2264c8' + '60',
  },
  prIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(40,100,200,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  prTitle: { fontFamily: 'Figtree_700Bold', fontSize: 14, color: '#f0f8ff', marginBottom: 3 },
  prSub: { fontFamily: 'Figtree_400Regular_Italic', fontSize: 12, color: '#b8dcf8' },

  chartCard: {
    marginHorizontal: 20, marginTop: 14,
    backgroundColor: colors.surface, borderRadius: 20,
    padding: 16, borderWidth: 1, borderColor: colors.border,
  },
  chartHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12,
  },
  chartTitle: { fontFamily: 'Figtree_700Bold', fontSize: 15, color: colors.text, marginBottom: 2 },
  chartSub: { fontFamily: 'Figtree_400Regular_Italic', fontSize: 12, color: colors.textSec },
  chartCurrent: { fontFamily: 'Figtree_700Bold', fontSize: 13, color: colors.textSec },
  chart: { borderRadius: 10, marginLeft: -8 },
  emptyChart: { height: 100, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyChartText: { fontFamily: 'Figtree_400Regular_Italic', fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  chartCardEmpty: { alignItems: 'center', paddingVertical: 28 },
  inlineLogBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.accent, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  inlineLogBtnText: { fontFamily: 'Figtree_700Bold', fontSize: 13, color: colors.white },
  inlineEmpty: {
    paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  inlineEmptyText: { fontFamily: 'Figtree_400Regular_Italic', fontSize: 12, color: colors.textMuted, flex: 1 },
  inlineLogLink: { fontFamily: 'Figtree_600SemiBold', fontSize: 12, color: colors.accentLight, marginLeft: 8 },

  workoutRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10,
  },
  workoutDot: { width: 8, height: 8, borderRadius: 4 },
  workoutType: { fontFamily: 'Figtree_600SemiBold', fontSize: 13, color: colors.text },
  workoutMuscles: { fontFamily: 'Figtree_400Regular_Italic', fontSize: 11, color: colors.textSec, marginTop: 1 },
  workoutDate: { fontFamily: 'Figtree_400Regular', fontSize: 11, color: colors.textMuted },
  emptyText: { fontFamily: 'Figtree_400Regular_Italic', fontSize: 13, color: colors.textMuted, marginTop: 10, lineHeight: 20 },

  goalCard: {
    marginHorizontal: 20, marginTop: 14,
    backgroundColor: colors.surface, borderRadius: 20,
    padding: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  goalTitle: { fontFamily: 'Figtree_700Bold', fontSize: 14, color: colors.text, marginBottom: 8 },
  goalText: { fontFamily: 'Figtree_400Regular_Italic', fontSize: 12, color: colors.textSec, textAlign: 'center', lineHeight: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, borderTopWidth: 1, borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { fontFamily: 'BebasNeue_400Regular', fontSize: 24, color: colors.text, letterSpacing: 0.5 },
  modalLabel: { fontFamily: 'Figtree_600SemiBold', fontSize: 13, color: colors.textSec, marginBottom: 6 },
  modalInput: {
    backgroundColor: colors.surface, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: 'Figtree_400Regular', fontSize: 15, color: colors.text,
    marginBottom: 16, borderWidth: 1, borderColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.accent, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginTop: 4,
  },
  saveBtnText: { fontFamily: 'Figtree_700Bold', fontSize: 15, color: colors.white },
});

const sp = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  name: { fontFamily: 'Figtree_600SemiBold', fontSize: 13, color: colors.text, marginRight: 8 },
  meta: { fontFamily: 'Figtree_400Regular', fontSize: 11, color: colors.textMuted, marginTop: 2 },
  deltaBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  deltaText: { fontFamily: 'Figtree_700Bold', fontSize: 12 },
});
