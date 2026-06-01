import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');
const CHART_W = width - 40;

const CHART_CONFIG = {
  backgroundGradientFrom: colors.card,
  backgroundGradientTo: colors.card,
  backgroundGradientFromOpacity: 1,
  backgroundGradientToOpacity: 1,
  color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
  labelColor: () => colors.textMuted,
  strokeWidth: 2.5,
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: colors.accentLight,
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
    if (diff <= 1) {
      streak++;
      cursor = d;
    } else {
      break;
    }
  }
  return streak;
}

export default function ProgressScreen() {
  const { state, dispatch } = useApp();
  const { progress, userProfile } = state;
  const [logModal, setLogModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [waistInput, setWaistInput] = useState('');

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

  const weightChartData = progress.weight.length >= 2
    ? buildChartData(progress.weight)
    : null;
  const waistChartData = progress.waist.length >= 2
    ? buildChartData(progress.waist, 6)
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
    if (weightInput || waistInput) {
      Alert.alert('Logged! 📊', 'Your measurements have been saved.');
    }
    setWeightInput('');
    setWaistInput('');
    setLogModal(false);
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Progress</Text>
            <Text style={s.subtitle}>Track your transformation</Text>
          </View>
          <TouchableOpacity style={s.logBtn} onPress={() => setLogModal(true)}>
            <Ionicons name="add" size={20} color={colors.white} />
            <Text style={s.logBtnText}>Log</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={s.summaryRow}>
          <SummaryCard
            icon="flame"
            iconColor={colors.warning}
            label="Streak"
            value={`${streak}`}
            unit="days"
          />
          <SummaryCard
            icon="barbell-outline"
            iconColor={colors.accentLight}
            label="Sessions"
            value={`${totalWorkouts}`}
            unit="total"
          />
          {weightDelta !== null && (
            <SummaryCard
              icon="scale-outline"
              iconColor={parseFloat(weightDelta) <= 0 ? colors.success : colors.warning}
              label="Weight"
              value={`${parseFloat(weightDelta) > 0 ? '+' : ''}${weightDelta}`}
              unit="kg"
            />
          )}
          {waistDelta !== null && (
            <SummaryCard
              icon="body-outline"
              iconColor={parseFloat(waistDelta) <= 0 ? colors.success : colors.warning}
              label="Waist"
              value={`${parseFloat(waistDelta) > 0 ? '+' : ''}${waistDelta}`}
              unit="cm"
            />
          )}
        </View>

        {/* Weight Chart */}
        <View style={s.chartCard}>
          <View style={s.chartHeader}>
            <Text style={s.chartTitle}>Weight (kg)</Text>
            {lastWeight && (
              <Text style={s.chartCurrent}>{lastWeight.value} kg now</Text>
            )}
          </View>
          {weightChartData ? (
            <LineChart
              data={weightChartData}
              width={CHART_W - 32}
              height={160}
              chartConfig={CHART_CONFIG}
              bezier
              style={s.chart}
              withInnerLines={true}
              withOuterLines={false}
            />
          ) : (
            <EmptyChart message="Log 2+ weight entries to see your chart" />
          )}
        </View>

        {/* Waist Chart */}
        <View style={s.chartCard}>
          <View style={s.chartHeader}>
            <Text style={s.chartTitle}>Waist (cm)</Text>
            {lastWaist && (
              <Text style={s.chartCurrent}>{lastWaist.value} cm now</Text>
            )}
          </View>
          {waistChartData ? (
            <LineChart
              data={waistChartData}
              width={CHART_W - 32}
              height={160}
              chartConfig={{
                ...CHART_CONFIG,
                color: (opacity = 1) => `rgba(244, 63, 94, ${opacity})`,
                propsForDots: {
                  ...CHART_CONFIG.propsForDots,
                  stroke: colors.secondary,
                },
              }}
              bezier
              style={s.chart}
              withInnerLines={true}
              withOuterLines={false}
            />
          ) : (
            <EmptyChart message="Log 2+ waist entries to see your chart" />
          )}
        </View>

        {/* Strength Progress */}
        <StrengthProgress setLogs={progress.setLogs || []} />

        {/* Recent Workouts */}
        <View style={s.recentCard}>
          <Text style={s.chartTitle}>Recent Sessions</Text>
          {progress.completedWorkouts.length === 0 ? (
            <Text style={s.emptyText}>No sessions logged yet. Complete a workout to see it here.</Text>
          ) : (
            [...progress.completedWorkouts]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 8)
              .map((w, i) => (
                <View key={`${w.date}-${i}`} style={s.workoutRow}>
                  <View style={[s.workoutDot, { backgroundColor: WORKOUT_COLORS[w.type] || colors.border }]} />
                  <Text style={s.workoutDate}>{w.date}</Text>
                  <Text style={s.workoutType}>{WORKOUT_LABELS[w.type] || w.type}</Text>
                </View>
              ))
          )}
        </View>

        {/* Goal Reminder */}
        <View style={s.goalCard}>
          <Ionicons name="trophy-outline" size={20} color={colors.warning} style={{ marginBottom: 8 }} />
          <Text style={s.goalTitle}>Your Goal</Text>
          <Text style={s.goalText}>
            Body recomposition: lose belly fat while gaining lean muscle.{'\n'}
            Starting waist: {firstWaist?.value ?? userProfile.waist}cm → Target: under 80cm.{'\n'}
            Stay consistent — recomp takes 3–6 months to show clearly.
          </Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Log Modal */}
      <Modal visible={logModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Log Today's Stats</Text>
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
              <Text style={s.saveBtnText}>Save Entry</Text>
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
        <Text style={s.chartTitle}>Strength Progress</Text>
        <EmptyChart message="Log sets during workouts to track your strength gains" />
      </View>
    );
  }

  const byExercise = {};
  setLogs.forEach(log => {
    if (!byExercise[log.exerciseId]) {
      byExercise[log.exerciseId] = { name: log.exerciseName, logs: [] };
    }
    byExercise[log.exerciseId].logs.push(log);
  });

  const exercises = Object.entries(byExercise)
    .sort(([, a], [, b]) => b.logs.length - a.logs.length)
    .slice(0, 6);

  return (
    <View style={s.chartCard}>
      <Text style={s.chartTitle}>Strength Progress</Text>
      {exercises.map(([exId, { name, logs }], i) => {
        const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
        const firstWeight = sorted[0].weight;
        const lastWeight = sorted[sorted.length - 1].weight;
        const best = Math.max(...logs.map(l => l.weight));
        const delta = lastWeight - firstWeight;
        const isLast = i === exercises.length - 1;
        return (
          <View key={exId} style={[sp.row, isLast && { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={sp.name} numberOfLines={1}>{name}</Text>
              <Text style={sp.meta}>{logs.length} sets · Best {best} kg · Last {lastWeight} kg</Text>
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

function SummaryCard({ icon, iconColor, label, value, unit }) {
  return (
    <View style={sc.card}>
      <Ionicons name={icon} size={18} color={iconColor} style={{ marginBottom: 4 }} />
      <Text style={sc.value}>{value}<Text style={sc.unit}>{unit}</Text></Text>
      <Text style={sc.label}>{label}</Text>
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
  push:  '#7C3AED',
  pull:  '#3B82F6',
  legs:  '#10B981',
  full:  '#F43F5E',
  core:  '#F59E0B',
  upper: '#8B5CF6',
  lower: '#06B6D4',
  posture: colors.warning,
};

const WORKOUT_LABELS = {
  push:  'Push Day',
  pull:  'Pull Day',
  legs:  'Legs + Core',
  full:  'Full Body',
  core:  'Core Day',
  upper: 'Upper Body',
  lower: 'Lower Body',
  posture: 'Posture Session',
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 28, color: colors.text, fontWeight: '700' },
  subtitle: { fontSize: 13, color: colors.textSec, marginTop: 2 },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 4,
  },
  logBtnText: { fontSize: 13, color: colors.white, fontWeight: '700' },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chartCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitle: { fontSize: 15, color: colors.text, fontWeight: '700' },
  chartCurrent: { fontSize: 12, color: colors.textSec },
  chart: { borderRadius: 10, marginLeft: -8 },
  emptyChart: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyChartText: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  recentCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
  },
  emptyText: { fontSize: 13, color: colors.textMuted, marginTop: 10, lineHeight: 20 },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  workoutDot: { width: 8, height: 8, borderRadius: 4 },
  workoutDate: { fontSize: 12, color: colors.textMuted, width: 80 },
  workoutType: { fontSize: 13, color: colors.text, fontWeight: '500' },
  goalCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  goalTitle: { fontSize: 14, color: colors.text, fontWeight: '700', marginBottom: 8 },
  goalText: { fontSize: 12, color: colors.textSec, textAlign: 'center', lineHeight: 20 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, color: colors.text, fontWeight: '700' },
  modalLabel: { fontSize: 13, color: colors.textSec, marginBottom: 6, fontWeight: '500' },
  modalInput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: { fontSize: 15, color: colors.white, fontWeight: '700' },
});

const sc = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  value: { fontSize: 16, color: colors.text, fontWeight: '700' },
  unit: { fontSize: 10, color: colors.textSec, fontWeight: '400' },
  label: { fontSize: 9, color: colors.textMuted, marginTop: 2 },
});

const sp = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  name: { fontSize: 13, color: colors.text, fontWeight: '600', marginRight: 8 },
  meta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  deltaBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  deltaText: { fontSize: 12, fontWeight: '700' },
});
