import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { fromLocalDateKey, toLocalDateKey } from '../utils/date';
import { getProgramWeek } from '../utils/progression';

const { width } = Dimensions.get('window');
const CHART_W = width - 40;

const CHART_CONFIG = {
  backgroundGradientFrom: colors.surface,
  backgroundGradientTo: colors.surface,
  backgroundGradientFromOpacity: 1,
  backgroundGradientToOpacity: 1,
  color: (opacity = 1) => `rgba(56, 189, 248, ${opacity})`,
  labelColor: () => colors.textMuted,
  strokeWidth: 2.5,
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: colors.accent,
    fill: colors.bg,
  },
  propsForBackgroundLines: {
    stroke: colors.border,
    strokeDasharray: '4',
    strokeWidth: 1,
  },
  decimalPlaces: 1,
};

const MINI_CHART_CONFIG = {
  backgroundGradientFrom: colors.bg,
  backgroundGradientTo: colors.bg,
  backgroundGradientFromOpacity: 1,
  backgroundGradientToOpacity: 1,
  color: (opacity = 1) => `rgba(56, 189, 248, ${opacity})`,
  labelColor: () => colors.textMuted,
  strokeWidth: 2,
  propsForDots: { r: '3', strokeWidth: '1', stroke: colors.accent, fill: colors.bg },
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
    const d = fromLocalDateKey(w.date);
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

function getMuscleGroups(type) {
  const map = {
    push: 'chest & shoulders',
    pull: 'back & biceps',
    legs: 'legs & core',
    legs_core: 'legs & core',
    full: 'full body',
    upper: 'chest, back & shoulders',
    lower: 'legs & glutes',
    core: 'abs & core',
    posture: 'posture & mobility',
  };
  return map[type] || type;
}

const GOAL_TEXT = {
  lose_fat:        'Cut body fat while preserving lean muscle.',
  build_muscle:    'Build muscle through progressive overload — strength comes first.',
  recomposition:   'Recompose your body — lose fat and build muscle simultaneously.',
  improve_posture: 'Strengthen posture muscles and reduce desk-related discomfort.',
  general_fitness: 'Build a consistent training habit and improve overall fitness.',
  endurance:       'Build cardiovascular endurance and muscular stamina.',
};

const PHASE_NAMES = ['Foundation', 'Build', 'Strength'];

export default function ProgressScreen() {
  const { state, dispatch } = useApp();
  const { progress, userProfile, generatedPlan } = state;
  const [logModal, setLogModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [waistInput, setWaistInput] = useState('');
  const [expandedSession, setExpandedSession] = useState(null);

  const today = toLocalDateKey();
  const setLogs = progress.setLogs || [];
  const streak = getStreak(progress.completedWorkouts);
  const totalWorkouts = progress.completedWorkouts.length;

  // Always derive first/last by DATE — never trust array index, since older
  // data may be stored unsorted. This makes "since you started" trustworthy.
  const weightEntries = [...progress.weight].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const waistEntries = [...progress.waist].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const firstWeight = weightEntries[0];
  const lastWeight = weightEntries[weightEntries.length - 1];
  const weightDelta = lastWeight && firstWeight && weightEntries.length >= 2
    ? (lastWeight.value - firstWeight.value).toFixed(1)
    : null;
  const firstWaist = waistEntries[0];
  const lastWaist = waistEntries[waistEntries.length - 1];
  const waistDelta = lastWaist && firstWaist && waistEntries.length >= 2
    ? (lastWaist.value - firstWaist.value).toFixed(1)
    : null;
  const targetWaist = 80;

  const todayWeightEntry = progress.weight.find(w => w.date === today);
  const todayWaistEntry = progress.waist.find(w => w.date === today);
  const hasExistingToday = !!(todayWeightEntry || todayWaistEntry);

  const weightChartData = weightEntries.length >= 2 ? buildChartData(weightEntries) : null;
  const waistChartData = waistEntries.length >= 2 ? buildChartData(waistEntries, 6) : null;

  const recentPR = getMostRecentPR(setLogs);

  const programWeek  = getProgramWeek(progress.completedWorkouts, state.restart?.date);
  const displayWeek  = Math.min(programWeek, 12);
  const phaseNum     = Math.min(3, Math.ceil(displayWeek / 4));
  const phaseName    = PHASE_NAMES[phaseNum - 1];
  const primaryGoal  = userProfile.goals?.[0] || 'general_fitness';
  const goalText     = GOAL_TEXT[primaryGoal] || GOAL_TEXT.general_fitness;

  useEffect(() => {
    if (logModal) {
      setWeightInput(todayWeightEntry ? String(todayWeightEntry.value) : '');
      setWaistInput(todayWaistEntry ? String(todayWaistEntry.value) : '');
    }
  }, [logModal]);

  function saveLog() {
    if (!weightInput && !waistInput) { setLogModal(false); return; }
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

  function deleteEntry(kind, date, value, unit) {
    Alert.alert(
      'Delete this entry?',
      `Remove ${value} ${unit} logged on ${date}? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => dispatch({ type: kind === 'weight' ? 'REMOVE_WEIGHT' : 'REMOVE_WAIST', payload: date }),
        },
      ],
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>How you're doing</Text>
            {progress.completedWorkouts.length > 0 && (
              <Text style={s.subtitle}>
                Week {displayWeek} of 12 · Phase {phaseNum}: {phaseName}
              </Text>
            )}
          </View>
          {(weightChartData || waistChartData) && (
            <TouchableOpacity style={s.logBtn} onPress={() => setLogModal(true)}>
              <Ionicons name="add" size={18} color={colors.onAccent} />
              <Text style={s.logBtnText}>Log</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stat cards row — 3 cards */}
        <View style={s.statRow}>
          {/* First card: waist — bright blue */}
          <View style={[s.statCard, s.statCardBlue]}>
            <Text style={s.statCardPrimaryGoal}>PRIMARY GOAL</Text>
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
            <Text style={s.statCardValue}>{streak}<Text style={s.statCardUnit}>{streak === 1 ? ' day' : ' days'}</Text></Text>
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
              <Ionicons name="trophy" size={20} color={colors.accentLight} />
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
              <Ionicons name="add" size={16} color={colors.onAccent} style={{ marginRight: 4 }} />
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
                    color: (opacity = 1) => `rgba(34, 211, 238, ${opacity})`,
                    propsForDots: { ...CHART_CONFIG.propsForDots, stroke: colors.info },
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
              .map((w, i) => {
                const plan = generatedPlan?.workouts?.[w.type];
                const dotColor = plan?.color || WORKOUT_COLORS[w.type] || colors.border;
                const label = plan?.name || WORKOUT_LABELS[w.type] || w.type;
                const isExpanded = expandedSession === w.date;
                const sessionSets = setLogs.filter(l => l.date === w.date);
                const byEx = {};
                sessionSets.forEach(l => {
                  const key = l.exerciseId;
                  if (!byEx[key]) byEx[key] = { name: l.exerciseName || l.exerciseId || 'Exercise', sets: [] };
                  byEx[key].sets.push(l);
                });
                const exGroups = Object.values(byEx);
                return (
                  <View key={`${w.date}-${i}`}>
                    <TouchableOpacity
                      style={s.workoutRow}
                      onPress={() => setExpandedSession(isExpanded ? null : w.date)}
                      activeOpacity={0.75}
                    >
                      <View style={[s.workoutDot, { backgroundColor: dotColor }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.workoutType}>{label}</Text>
                        <Text style={s.workoutMuscles}>{getMuscleGroups(w.type)}</Text>
                      </View>
                      <Text style={s.workoutDate}>{w.date}</Text>
                      {exGroups.length > 0 && (
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={14}
                          color={colors.textMuted}
                        />
                      )}
                    </TouchableOpacity>
                    {isExpanded && exGroups.length > 0 && (
                      <View style={s.sessionDetail}>
                        {exGroups.map(({ name, sets }) => (
                          <View key={sets[0]?.exerciseId || name} style={s.sessionExRow}>
                            <Text style={s.sessionExName} numberOfLines={1}>{name}</Text>
                            <Text style={s.sessionExSets}>
                              {[...sets]
                                .sort((a, b) => a.setNumber - b.setNumber)
                                .map(l => l.weight === 0 ? `BW×${l.reps}` : `${l.weight}×${l.reps}`)
                                .join('   ')}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })
          )}
        </View>

        {/* Goal reminder */}
        <View style={s.goalCard}>
          <Ionicons name="trophy-outline" size={18} color={colors.warning} style={{ marginBottom: 8 }} />
          <Text style={s.goalTitle}>What you're working toward</Text>
          <Text style={s.goalText}>
            {goalText}
            {(firstWaist?.value ?? userProfile.waist)
              ? `\nStarting waist: ${firstWaist?.value ?? userProfile.waist} cm → target ${targetWaist} cm.`
              : ''}
            {'\nStay consistent — visible changes take 8–12 weeks.'}
          </Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Log modal */}
      <Modal visible={logModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{hasExistingToday ? "Update today's stats" : "Log today's stats"}</Text>
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

            {(weightEntries.length > 0 || waistEntries.length > 0) && (
              <View style={s.histWrap}>
                <Text style={s.histHeading}>Logged history</Text>
                <Text style={s.histHint}>Tap 🗑 to remove a wrong entry — your "since you started" numbers use the earliest one.</Text>
                <ScrollView style={s.histScroll} showsVerticalScrollIndicator={false}>
                  {weightEntries.length > 0 && <Text style={s.histSubhead}>Weight</Text>}
                  {[...weightEntries].reverse().map(e => (
                    <View key={`w-${e.date}`} style={s.histRow}>
                      <Text style={s.histDate}>{e.date}</Text>
                      <Text style={s.histVal}>{e.value} kg</Text>
                      <TouchableOpacity onPress={() => deleteEntry('weight', e.date, e.value, 'kg')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="trash-outline" size={16} color={colors.secondary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {waistEntries.length > 0 && <Text style={s.histSubhead}>Waist</Text>}
                  {[...waistEntries].reverse().map(e => (
                    <View key={`wa-${e.date}`} style={s.histRow}>
                      <Text style={s.histDate}>{e.date}</Text>
                      <Text style={s.histVal}>{e.value} cm</Text>
                      <TouchableOpacity onPress={() => deleteEntry('waist', e.date, e.value, 'cm')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="trash-outline" size={16} color={colors.secondary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StrengthProgress({ setLogs }) {
  const [expandedEx, setExpandedEx] = useState(null);

  if (!setLogs.length) {
    return (
      <View style={s.chartCard}>
        <Text style={s.chartTitle}>Your lifts so far</Text>
        <Text style={s.chartSub}>Keep logging to see trends</Text>
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
    .sort(([, a], [, b]) => {
      const lastA = [...a.logs].sort((x, y) => y.date.localeCompare(x.date))[0].date;
      const lastB = [...b.logs].sort((x, y) => y.date.localeCompare(x.date))[0].date;
      return lastB.localeCompare(lastA);
    })
    .slice(0, 6);

  const hasMultipleSessions = Object.values(byExercise).some(({ logs }) => {
    const distinctDates = new Set(logs.map(l => l.date));
    return distinctDates.size >= 2;
  });

  return (
    <View style={s.chartCard}>
      <Text style={s.chartTitle}>{hasMultipleSessions ? 'Volume is trending up' : 'Your lifts so far'}</Text>
      <Text style={s.chartSub}>{hasMultipleSessions ? 'Tap any exercise to see session history' : 'Keep logging to see trends'}</Text>
      {exercises.map(([exId, { name, logs }], i) => {
        const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
        const first = sorted[0].weight;
        const last = sorted[sorted.length - 1].weight;
        const best = Math.max(...logs.map(l => l.weight));
        const delta = last - first;
        const isLast = i === exercises.length - 1;
        const isExpanded = expandedEx === exId;

        // Group logs by date for history view
        const byDate = {};
        logs.forEach(l => {
          if (!byDate[l.date]) byDate[l.date] = [];
          byDate[l.date].push(l);
        });
        const dateHistory = Object.entries(byDate)
          .sort(([a], [b]) => b.localeCompare(a))
          .slice(0, 8);

        // Mini chart data — up to 6 sessions, oldest first, max weight per session
        const distinctDates = new Set(logs.map(l => l.date));
        const chartSessions = dateHistory.slice(0, 6).reverse();
        const allBodyweight = chartSessions.every(([, sl]) => sl.every(l => l.weight === 0));
        const chartLabels = chartSessions.map(([d]) => d.slice(5));
        const chartWeights = chartSessions.map(([, sl]) => Math.max(...sl.map(l => l.weight)));

        return (
          <View key={exId} style={[sp.row, isLast && !isExpanded && { borderBottomWidth: 0 }]}>
            <TouchableOpacity
              style={sp.rowHeader}
              onPress={() => setExpandedEx(isExpanded ? null : exId)}
              activeOpacity={0.75}
            >
              <View style={{ flex: 1 }}>
                <Text style={sp.name} numberOfLines={1}>{name}</Text>
                <Text style={sp.meta}>{logs.length} sets · best {best} kg · last {last} kg</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {delta !== 0 && (
                  <View style={[sp.deltaBadge, { backgroundColor: delta > 0 ? colors.success + '20' : colors.secondary + '20' }]}>
                    <Text style={[sp.deltaText, { color: delta > 0 ? colors.success : colors.secondary }]}>
                      {delta > 0 ? '+' : ''}{delta} kg
                    </Text>
                  </View>
                )}
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={colors.textMuted}
                />
              </View>
            </TouchableOpacity>

            {isExpanded && (
              <View style={sp.history}>
                {distinctDates.size >= 2 && chartSessions.length >= 2 && !allBodyweight && (
                  <LineChart
                    data={{ labels: chartLabels, datasets: [{ data: chartWeights }] }}
                    width={CHART_W - 52}
                    height={90}
                    chartConfig={MINI_CHART_CONFIG}
                    bezier
                    style={{ borderRadius: 8, marginBottom: 10 }}
                    withInnerLines={false}
                    withOuterLines={false}
                  />
                )}
                <Text style={sp.historyTitle}>Session history</Text>
                {dateHistory.map(([date, sessionLogs]) => {
                  const sessionSorted = [...sessionLogs].sort((a, b) => a.setNumber - b.setNumber);
                  return (
                    <View key={date} style={sp.historySession}>
                      <Text style={sp.historyDate}>{date}</Text>
                      {sessionSorted.map(l => (
                        <View key={l.setNumber} style={sp.historySetRow}>
                          <Text style={sp.historySetNum}>Set {l.setNumber}</Text>
                          <Text style={sp.historySetVal}>
                            {l.weight === 0 ? 'BW' : `${l.weight} kg`} × {l.reps} reps
                          </Text>
                          {l.feedback && (
                            <View style={[sp.feelPill, { backgroundColor: FEEL_COLORS[l.feedback] + '25' }]}>
                              <Text style={[sp.feelPillText, { color: FEEL_COLORS[l.feedback] }]}>{l.feedback}</Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const FEEL_COLORS = { easy: colors.success, good: colors.info, hard: colors.secondary };

function EmptyChart({ message }) {
  return (
    <View style={s.emptyChart}>
      <Ionicons name="analytics-outline" size={32} color={colors.textMuted} />
      <Text style={s.emptyChartText}>{message}</Text>
    </View>
  );
}

const WORKOUT_COLORS = {
  push: '#EA580C',
  pull: '#3B82F6',
  legs: '#10B981',
  legs_core: '#10B981',
  full: '#F43F5E',
  upper: '#FB923C',
  lower: '#06B6D4',
  core: '#FBBF24',
  posture: '#F59E0B',
};

const WORKOUT_LABELS = {
  push: 'Push day',
  pull: 'Pull day',
  legs: 'Legs + core',
  legs_core: 'Legs + core',
  full: 'Full body',
  upper: 'Upper body',
  lower: 'Lower body',
  core: 'Core day',
  posture: 'Posture session',
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10,
  },
  title: { fontFamily: fonts.display, fontSize: 34, color: colors.text, letterSpacing: 0.5 },
  subtitle: { fontFamily: fonts.bodyItalic, fontSize: 13, color: colors.textSec, marginTop: 3, lineHeight: 19 },
  logBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, gap: 4,
    marginTop: 4,
  },
  logBtnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.onAccent },

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
  statCardPrimaryGoal: { fontFamily: fonts.dataSemiBold, fontSize: 9, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  statCardValueBlue: { fontFamily: fonts.display, fontSize: 28, color: '#fff', letterSpacing: 0.5 },
  statCardUnitBlue: { fontFamily: fonts.dataMedium, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  statCardLabelBlue: { fontFamily: fonts.bodyMedium, fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  statCardGoalBlue: { fontFamily: fonts.bodyItalic, fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 3 },
  statCardValue: { fontFamily: fonts.display, fontSize: 26, color: colors.text, letterSpacing: 0.5 },
  statCardUnit: { fontFamily: fonts.dataMedium, fontSize: 12, color: colors.textSec },
  statCardLabel: { fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.textMuted, marginTop: 2 },

  prCard: {
    marginHorizontal: 20, marginTop: 14,
    backgroundColor: colors.heroCardDeep,
    borderRadius: 18, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: colors.accent + '55',
  },
  prIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(56,189,248,0.16)',
    alignItems: 'center', justifyContent: 'center',
  },
  prTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text, marginBottom: 3 },
  prSub: { fontFamily: fonts.bodyItalic, fontSize: 12, color: colors.heroTextSec },

  chartCard: {
    marginHorizontal: 20, marginTop: 14,
    backgroundColor: colors.surface, borderRadius: 20,
    padding: 16, borderWidth: 1, borderColor: colors.border,
  },
  chartHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12,
  },
  chartTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text, marginBottom: 2 },
  chartSub: { fontFamily: fonts.bodyItalic, fontSize: 12, color: colors.textSec },
  chartCurrent: { fontFamily: fonts.dataSemiBold, fontSize: 13, color: colors.textSec },
  chart: { borderRadius: 10, marginLeft: -8 },
  emptyChart: { height: 100, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyChartText: { fontFamily: fonts.bodyItalic, fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  chartCardEmpty: { alignItems: 'center', paddingVertical: 28 },
  inlineLogBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.accent, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  inlineLogBtnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.onAccent },
  inlineEmpty: {
    paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  inlineEmptyText: { fontFamily: fonts.bodyItalic, fontSize: 12, color: colors.textMuted, flex: 1 },
  inlineLogLink: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.accentLight, marginLeft: 8 },

  workoutRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10,
  },
  workoutDot: { width: 8, height: 8, borderRadius: 4 },
  workoutType: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
  workoutMuscles: { fontFamily: fonts.bodyItalic, fontSize: 11, color: colors.textSec, marginTop: 1 },
  workoutDate: { fontFamily: fonts.data, fontSize: 11, color: colors.textMuted },
  emptyText: { fontFamily: fonts.bodyItalic, fontSize: 13, color: colors.textMuted, marginTop: 10, lineHeight: 20 },

  sessionDetail: {
    backgroundColor: colors.bg,
    borderRadius: 10,
    padding: 10,
    marginBottom: 4,
    gap: 6,
  },
  sessionExRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionExName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textSec,
    flex: 1,
  },
  sessionExSets: {
    fontFamily: fonts.dataSemiBold,
    fontSize: 12,
    color: colors.text,
  },

  goalCard: {
    marginHorizontal: 20, marginTop: 14,
    backgroundColor: colors.surface, borderRadius: 20,
    padding: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  goalTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text, marginBottom: 8 },
  goalText: { fontFamily: fonts.bodyItalic, fontSize: 12, color: colors.textSec, textAlign: 'center', lineHeight: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, borderTopWidth: 1, borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.text, letterSpacing: 0.5 },
  modalLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textSec, marginBottom: 6 },
  modalInput: {
    backgroundColor: colors.surface, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: fonts.data, fontSize: 15, color: colors.text,
    marginBottom: 16, borderWidth: 1, borderColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.accent, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginTop: 4,
  },
  saveBtnText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onAccent },

  histWrap: { marginTop: 18, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14 },
  histHeading: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text, marginBottom: 4 },
  histHint: { fontFamily: fonts.bodyItalic, fontSize: 11, color: colors.textMuted, lineHeight: 16, marginBottom: 8 },
  histScroll: { maxHeight: 180 },
  histSubhead: { fontFamily: fonts.dataSemiBold, fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 8, marginBottom: 4 },
  histRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10,
  },
  histDate: { fontFamily: fonts.data, fontSize: 12, color: colors.textMuted, width: 92 },
  histVal: { fontFamily: fonts.dataSemiBold, fontSize: 13, color: colors.text, flex: 1 },
});

const sp = StyleSheet.create({
  row: {
    paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rowHeader: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
  },
  name: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text, marginRight: 8 },
  meta: { fontFamily: fonts.data, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  deltaBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  deltaText: { fontFamily: fonts.dataSemiBold, fontSize: 12 },
  history: {
    backgroundColor: colors.bg, borderRadius: 10, padding: 10,
    marginBottom: 8, gap: 10,
  },
  historyTitle: {
    fontFamily: fonts.dataSemiBold, fontSize: 10, color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2,
  },
  historySession: { gap: 4 },
  historyDate: { fontFamily: fonts.dataSemiBold, fontSize: 11, color: colors.accentLight, marginBottom: 2 },
  historySetRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historySetNum: { fontFamily: fonts.data, fontSize: 11, color: colors.textMuted, width: 36 },
  historySetVal: { fontFamily: fonts.dataSemiBold, fontSize: 12, color: colors.text, flex: 1 },
  feelPill: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  feelPillText: { fontFamily: fonts.bodyBold, fontSize: 10 },
});
