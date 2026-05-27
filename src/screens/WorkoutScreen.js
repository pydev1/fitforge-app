import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { POSTURE_EXERCISES } from '../data/workoutData';
import { colors } from '../theme/colors';

const TABS = ['Today', 'Weekly', 'Posture Guide'];
const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getTodayKey() {
  const d = new Date().getDay();
  return DAYS_ORDER[d === 0 ? 6 : d - 1];
}

export default function WorkoutScreen({ route }) {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [infoExercise, setInfoExercise] = useState(null);

  useEffect(() => {
    if (route?.params?.tab === 'posture') setActiveTab(2);
  }, [route?.params]);

  const { generatedPlan, progress, userProfile } = state;
  const todayKey = getTodayKey();
  const todayWorkoutId = generatedPlan?.schedule?.[todayKey] ?? null;
  const todayWorkout = todayWorkoutId ? generatedPlan?.workouts?.[todayWorkoutId] : null;

  const totalDays = generatedPlan
    ? Object.values(generatedPlan.schedule).filter(Boolean).length
    : 0;

  function markComplete() {
    const date = new Date().toISOString().split('T')[0];
    const alreadyDone = progress.completedWorkouts.some(w => w.date === date);
    if (alreadyDone) {
      Alert.alert('Already logged', "Today's session is already marked as complete!");
      return;
    }
    dispatch({ type: 'LOG_WORKOUT', payload: { date, type: todayWorkoutId } });
    Alert.alert('Session Complete! 💪', 'Great work — logged to your progress tracker.');
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Workouts</Text>
        <Text style={s.subtitle}>
          {totalDays > 0 ? `${totalDays}-day split` : 'No plan yet'} · personalised for {userProfile.name || 'you'}
        </Text>
      </View>

      <View style={s.tabBar}>
        {TABS.map((tab, i) => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, activeTab === i && s.tabActive]}
            onPress={() => setActiveTab(i)}
          >
            <Text style={[s.tabText, activeTab === i && s.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {activeTab === 0 && (
          <TodayTab
            workout={todayWorkout}
            dayName={todayKey}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            onComplete={markComplete}
            completedWorkouts={progress.completedWorkouts}
            onInfo={setInfoExercise}
          />
        )}
        {activeTab === 1 && (
          <WeeklyTab
            generatedPlan={generatedPlan}
            completedWorkouts={progress.completedWorkouts}
          />
        )}
        {activeTab === 2 && (
          <PostureGuideTab expandedId={expandedId} setExpandedId={setExpandedId} />
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      <ExerciseInfoModal exercise={infoExercise} onClose={() => setInfoExercise(null)} />
    </SafeAreaView>
  );
}

/* ─── Today Tab ─────────────────────────────────────────────────── */

function TodayTab({ workout, dayName, expandedId, setExpandedId, onComplete, completedWorkouts, onInfo }) {
  const today = new Date().toISOString().split('T')[0];
  const isDone = completedWorkouts.some(w => w.date === today);

  if (!workout) {
    return (
      <View style={s.restContainer}>
        <Text style={{ fontSize: 48 }}>😴</Text>
        <Text style={s.restTitle}>Rest Day</Text>
        <Text style={s.restSubtitle}>{dayName} · Muscle growth happens during recovery</Text>
        <View style={s.restTip}>
          <Ionicons name="information-circle-outline" size={16} color={colors.info} style={{ marginRight: 8 }} />
          <Text style={s.restTipText}>
            Use today for a 10-min walk, light stretching, or the Posture Guide routine. Recovery is part of the programme.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 16 }}>
      <View style={[s.workoutHeader, { borderLeftColor: workout.color }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.workoutDay}>{dayName}</Text>
          <Text style={s.workoutName}>{workout.name}</Text>
          <Text style={s.workoutFocus}>{workout.focus}</Text>
        </View>
        <View style={s.durationBadge}>
          <Ionicons name="time-outline" size={13} color={colors.textSec} />
          <Text style={s.durationText}>{workout.duration}</Text>
        </View>
      </View>

      {workout.postureWarmup?.length > 0 && (
        <PostureBlock
          title="Posture Warm-Up"
          subtitle="5 min · do this before you start"
          icon="body"
          iconColor={colors.info}
          items={workout.postureWarmup}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          blockColor={colors.info}
        />
      )}

      <SectionLabel text="Main Workout" icon="barbell-outline" color={workout.color} />
      {workout.exercises?.map(ex => (
        <ExerciseCard
          key={ex.id}
          exercise={ex}
          expanded={expandedId === ex.id}
          onToggle={() => setExpandedId(expandedId === ex.id ? null : ex.id)}
          accentColor={workout.color}
          onInfo={() => onInfo(ex)}
          isToday
        />
      ))}

      {workout.postureCooldown?.length > 0 && (
        <PostureBlock
          title="Posture Cooldown"
          subtitle="5 min · finish every session with this"
          icon="leaf"
          iconColor={colors.success}
          items={workout.postureCooldown}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          blockColor={colors.success}
        />
      )}

      <TouchableOpacity
        style={[s.completeBtn, isDone && s.completeBtnDone]}
        onPress={onComplete}
        activeOpacity={0.8}
      >
        <Ionicons name={isDone ? 'checkmark-circle' : 'checkmark-circle-outline'} size={22} color="#fff" />
        <Text style={s.completeBtnText}>{isDone ? 'Session Logged ✓' : 'Mark as Complete'}</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ─── Posture Block ─────────────────────────────────────────────── */

function PostureBlock({ title, subtitle, icon, iconColor, items, expandedId, setExpandedId, blockColor }) {
  return (
    <View style={[s.postureBlock, { borderColor: blockColor + '55' }]}>
      <View style={[s.postureBlockHeader, { backgroundColor: blockColor + '18' }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
        <View style={{ flex: 1 }}>
          <Text style={[s.postureBlockTitle, { color: iconColor }]}>{title}</Text>
          <Text style={s.postureBlockSubtitle}>{subtitle}</Text>
        </View>
      </View>
      {items.map(item => (
        <TouchableOpacity
          key={item.id}
          style={s.postureItem}
          onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}
          activeOpacity={0.75}
        >
          <Text style={s.postureItemIcon}>{item.icon}</Text>
          <View style={{ flex: 1 }}>
            <View style={s.postureItemRow}>
              <Text style={s.postureItemName}>{item.name}</Text>
              <Text style={s.postureItemReps}>{item.reps}</Text>
            </View>
            {expandedId === item.id && (
              <Text style={s.postureItemBenefit}>{item.benefit}</Text>
            )}
          </View>
          <Ionicons name={expandedId === item.id ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

/* ─── Section Label ─────────────────────────────────────────────── */

function SectionLabel({ text, icon, color }) {
  return (
    <View style={[s.sectionLabel, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[s.sectionLabelText, { color }]}>{text}</Text>
    </View>
  );
}

/* ─── Exercise Card ─────────────────────────────────────────────── */

function ExerciseCard({ exercise, expanded, onToggle, accentColor, onInfo, isToday }) {
  return (
    <TouchableOpacity style={s.exCard} onPress={onToggle} activeOpacity={0.8}>
      <View style={s.exCardTop}>
        <View style={[s.exColorBar, { backgroundColor: accentColor }]} />
        <View style={{ flex: 1 }}>
          <Text style={s.exName}>{exercise.name}</Text>
          <View style={s.exMeta}>
            <Chip text={`${exercise.sets} sets`} />
            <Chip text={exercise.reps} />
            <Chip text={`Rest ${exercise.rest}`} />
          </View>
        </View>
        <TouchableOpacity
          style={s.infoBtn}
          onPress={e => { e.stopPropagation?.(); onInfo(); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="information-circle-outline" size={22} color={colors.info} />
        </TouchableOpacity>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} style={{ marginLeft: 4 }} />
      </View>
      {expanded && (
        <View style={s.exDetails}>
          <DetailRow icon="body-outline" label="Muscles" value={exercise.muscles} />
          <DetailRow icon="construct-outline" label="Equipment" value={exercise.equipment} />
          <DetailRow icon="bulb-outline" label="Form Tip" value={exercise.tips} />
          {exercise.postureNote && (
            <View style={s.postureNote}>
              <Text style={s.postureNoteText}>{exercise.postureNote}</Text>
            </View>
          )}
          {isToday && <SetLogger exercise={exercise} accentColor={accentColor} />}
        </View>
      )}
    </TouchableOpacity>
  );
}

function Chip({ text }) {
  return (
    <View style={s.chip}>
      <Text style={s.chipText}>{text}</Text>
    </View>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <View style={s.detailRow}>
      <Ionicons name={icon} size={14} color={colors.accentLight} style={{ marginRight: 6, marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={s.detailLabel}>{label}</Text>
        <Text style={s.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

/* ─── Weekly Tab ─────────────────────────────────────────────────── */

function WeeklyTab({ generatedPlan, completedWorkouts }) {
  const todayKey = getTodayKey();

  if (!generatedPlan) {
    return (
      <View style={{ padding: 24, alignItems: 'center' }}>
        <Text style={{ color: colors.textSec, fontSize: 14 }}>No plan generated yet.</Text>
      </View>
    );
  }

  const { schedule, workouts } = generatedPlan;
  const trainingCount = Object.values(schedule).filter(Boolean).length;

  return (
    <View style={{ paddingHorizontal: 16 }}>
      <View style={s.weekBanner}>
        <Text style={s.weekBannerText}>
          {trainingCount}-day personalised split with posture correction in every session. Rest days are set for recovery.
        </Text>
      </View>

      {DAYS_ORDER.map(day => {
        const workoutId = schedule[day] ?? null;
        const workout = workoutId ? workouts[workoutId] : null;
        const isToday = day === todayKey;

        return (
          <View key={day} style={[s.weekRow, isToday && { borderColor: colors.accent }]}>
            <View style={[s.weekDot, { backgroundColor: workout ? workout.color : colors.border }]} />
            <View style={{ flex: 1 }}>
              <View style={s.weekRowTop}>
                <Text style={[s.weekDay, isToday && { color: colors.accentLight }]}>{day}</Text>
                {isToday && <View style={s.todayBadge}><Text style={s.todayBadgeText}>Today</Text></View>}
              </View>
              {workout ? (
                <>
                  <Text style={s.weekWorkout}>{workout.name} · {workout.focus}</Text>
                  <Text style={s.weekPosture}>
                    + {workout.postureWarmup?.length ?? 0} posture warm-up · {workout.postureCooldown?.length ?? 0} posture cooldown
                  </Text>
                </>
              ) : (
                <Text style={s.weekWorkout}>Rest Day · active recovery or light walk</Text>
              )}
            </View>
          </View>
        );
      })}

      <View style={s.tipCard}>
        <Ionicons name="information-circle" size={16} color={colors.info} style={{ marginRight: 8, marginTop: 1 }} />
        <Text style={s.tipText}>
          Posture correction is baked into every workout — warm-up activates the right muscles, cooldown releases tightness.
        </Text>
      </View>
    </View>
  );
}

/* ─── Posture Guide Tab ──────────────────────────────────────────── */

function PostureGuideTab({ expandedId, setExpandedId }) {
  const critical = POSTURE_EXERCISES.filter(e => e.priority === 'CRITICAL');
  const high = POSTURE_EXERCISES.filter(e => e.priority === 'HIGH');
  const medium = POSTURE_EXERCISES.filter(e => e.priority === 'MEDIUM');

  return (
    <View style={{ paddingHorizontal: 16 }}>
      <View style={s.postureBanner}>
        <Ionicons name="warning" size={15} color={colors.warning} style={{ marginRight: 8 }} />
        <Text style={s.postureBannerText}>
          These exercises are embedded in your workouts. This tab is your reference guide — and a reminder to do the critical ones at your desk too.
        </Text>
      </View>
      <PostureGuideSection title="Critical — Also Do At Your Desk" exercises={critical} color={colors.secondary} expandedId={expandedId} setExpandedId={setExpandedId} />
      <PostureGuideSection title="High Priority — In Every Workout" exercises={high} color={colors.warning} expandedId={expandedId} setExpandedId={setExpandedId} />
      {medium.length > 0 && (
        <PostureGuideSection title="Good Addition" exercises={medium} color={colors.success} expandedId={expandedId} setExpandedId={setExpandedId} />
      )}
    </View>
  );
}

function PostureGuideSection({ title, exercises, color, expandedId, setExpandedId }) {
  return (
    <>
      <Text style={[s.guideSection, { color }]}>{title}</Text>
      {exercises.map(ex => (
        <TouchableOpacity
          key={ex.id}
          style={s.guideCard}
          onPress={() => setExpandedId(expandedId === ex.id ? null : ex.id)}
          activeOpacity={0.8}
        >
          <View style={s.guideCardTop}>
            <Text style={s.guideIcon}>{ex.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.guideName}>{ex.name}</Text>
              <Text style={s.guideMeta}>{ex.duration} · {ex.sets} sets · {ex.category}</Text>
            </View>
            <Ionicons name={expandedId === ex.id ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
          </View>
          {expandedId === ex.id && (
            <View style={s.guideExpanded}>
              <Text style={s.guideRow}>🎯 <Text style={s.guideRowLabel}>Target: </Text>{ex.targetArea}</Text>
              <Text style={s.guideRow}>💡 <Text style={s.guideRowLabel}>Why: </Text>{ex.benefit}</Text>
              <Text style={s.guideRow}>📋 <Text style={s.guideRowLabel}>How: </Text>{ex.howTo}</Text>
              <Text style={[s.guideRow, { color: colors.accentLight }]}>
                ⏱ <Text style={[s.guideRowLabel, { color: colors.accentLight }]}>Frequency: </Text>{ex.frequency}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </>
  );
}

/* ─── Exercise Info Modal ────────────────────────────────────────── */

function ExerciseInfoModal({ exercise, onClose }) {
  if (!exercise) return null;
  return (
    <Modal visible={!!exercise} transparent animationType="slide" onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={m.sheet}>
          <View style={m.handle} />
          <View style={m.header}>
            <Text style={m.title}>{exercise.name}</Text>
            <TouchableOpacity onPress={onClose} style={m.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSec} />
            </TouchableOpacity>
          </View>
          <View style={m.chips}>
            <Chip text={`${exercise.sets} sets`} />
            <Chip text={exercise.reps} />
            <Chip text={exercise.equipment} />
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={m.scroll}>
            <Text style={m.sectionTitle}>How to perform</Text>
            {exercise.steps?.map((step, i) => (
              <View key={i} style={m.step}>
                <View style={m.stepNum}>
                  <Text style={m.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={m.stepText}>{step}</Text>
              </View>
            ))}
            {exercise.mistakes?.length > 0 && (
              <>
                <Text style={m.sectionTitle}>Common mistakes to avoid</Text>
                {exercise.mistakes.map((mistake, i) => (
                  <View key={i} style={m.mistake}>
                    <Ionicons name="close-circle" size={14} color={colors.secondary} style={{ marginRight: 8, marginTop: 2 }} />
                    <Text style={m.mistakeText}>{mistake}</Text>
                  </View>
                ))}
              </>
            )}
            {exercise.postureNote && (
              <View style={m.postureNote}>
                <Text style={m.postureNoteText}>{exercise.postureNote}</Text>
              </View>
            )}
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* ─── Set Logger ─────────────────────────────────────────────────── */

const FEEDBACK_COLORS = { easy: colors.success, good: colors.accentLight, hard: colors.secondary };
const FEEDBACK_LABELS = { easy: 'Too Easy', good: 'Just Right', hard: 'Too Hard' };

function getSuggestion(setLogs, exerciseId, setIdx, today) {
  const relevant = setLogs
    .filter(l => l.exerciseId === exerciseId && l.setNumber === setIdx + 1 && l.date !== today)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!relevant.length) return null;
  const last = relevant[0];
  let weight = last.weight;
  let reason = 'felt right';
  if (last.feedback === 'easy') { weight = Math.round((weight + 2.5) * 2) / 2; reason = 'easy last time'; }
  else if (last.feedback === 'hard') { weight = Math.max(0, Math.round((weight - 2.5) * 2) / 2); reason = 'hard last time'; }
  return { weight, reason };
}

function SetLogger({ exercise, accentColor }) {
  const { state, dispatch } = useApp();
  const setLogs = state.progress.setLogs || [];
  const today = new Date().toISOString().split('T')[0];
  const numSets = exercise.sets;

  const [sets, setSets] = React.useState(() =>
    Array.from({ length: numSets }, () => ({ weight: '', reps: '', feedback: null, saved: false }))
  );

  function setField(idx, field, value) {
    setSets(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  function applysuggestion(idx) {
    const s = getSuggestion(setLogs, exercise.id, idx, today);
    if (s) setField(idx, 'weight', String(s.weight));
  }

  function handleSave(idx) {
    const set = sets[idx];
    const w = parseFloat(set.weight);
    const r = parseInt(set.reps, 10);
    if (isNaN(w) || w <= 0 || isNaN(r) || r <= 0) {
      Alert.alert('Missing info', 'Enter weight (kg) and reps before saving this set.');
      return;
    }
    dispatch({
      type: 'LOG_SET',
      payload: {
        date: today,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        setNumber: idx + 1,
        weight: w,
        reps: r,
        feedback: set.feedback || 'good',
      },
    });
    setSets(prev => prev.map((s, i) => i === idx ? { ...s, saved: true } : s));
  }

  const targetReps = exercise.reps ? exercise.reps.split(/[–\-]/)[0] : '10';

  return (
    <View style={sl.container}>
      <View style={sl.header}>
        <Ionicons name="barbell-outline" size={13} color={accentColor} />
        <Text style={[sl.headerText, { color: accentColor }]}>LOG SETS</Text>
      </View>
      {sets.map((set, idx) => {
        const suggestion = getSuggestion(setLogs, exercise.id, idx, today);
        return (
          <View key={idx} style={[sl.setRow, set.saved && sl.setRowSaved]}>
            <View style={sl.setTopRow}>
              <Text style={sl.setLabel}>Set {idx + 1}</Text>
              {set.saved ? (
                <View style={sl.savedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={sl.savedText}>{set.weight} kg × {set.reps} reps</Text>
                </View>
              ) : suggestion ? (
                <TouchableOpacity style={sl.suggestionRow} onPress={() => applysuggestion(idx)}>
                  <Text style={sl.suggestionText}>↗ {suggestion.weight} kg · {suggestion.reason}</Text>
                  <Text style={sl.useBtn}>Use</Text>
                </TouchableOpacity>
              ) : (
                <Text style={sl.noHistory}>No history — start light</Text>
              )}
            </View>
            {!set.saved && (
              <>
                <View style={sl.inputRow}>
                  <View style={sl.inputGroup}>
                    <Text style={sl.inputLabel}>Weight (kg)</Text>
                    <TextInput
                      style={sl.input}
                      value={set.weight}
                      onChangeText={v => setField(idx, 'weight', v)}
                      keyboardType="decimal-pad"
                      placeholder={suggestion ? String(suggestion.weight) : '0'}
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={sl.inputGroup}>
                    <Text style={sl.inputLabel}>Reps done</Text>
                    <TextInput
                      style={sl.input}
                      value={set.reps}
                      onChangeText={v => setField(idx, 'reps', v)}
                      keyboardType="number-pad"
                      placeholder={targetReps}
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>
                <View style={sl.feedbackRow}>
                  {['easy', 'good', 'hard'].map(fb => (
                    <TouchableOpacity
                      key={fb}
                      style={[
                        sl.fbBtn,
                        set.feedback === fb && {
                          backgroundColor: FEEDBACK_COLORS[fb] + '25',
                          borderColor: FEEDBACK_COLORS[fb],
                        },
                      ]}
                      onPress={() => setField(idx, 'feedback', fb)}
                    >
                      <Text style={[sl.fbText, set.feedback === fb && { color: FEEDBACK_COLORS[fb] }]}>
                        {FEEDBACK_LABELS[fb]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={[sl.saveSetBtn, { backgroundColor: accentColor }]} onPress={() => handleSave(idx)}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        );
      })}
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 28, color: colors.text, fontWeight: '700' },
  subtitle: { fontSize: 13, color: colors.textSec, marginTop: 2 },
  tabBar: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 8,
    backgroundColor: colors.surface, borderRadius: 12, padding: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  tabActive: { backgroundColor: colors.accent },
  tabText: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  scroll: { flex: 1 },

  restContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  restTitle: { fontSize: 26, color: colors.text, fontWeight: '700', marginTop: 16 },
  restSubtitle: { fontSize: 14, color: colors.textSec, marginTop: 6, textAlign: 'center' },
  restTip: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: colors.card, borderRadius: 12, padding: 14, marginTop: 24,
    borderWidth: 1, borderColor: colors.border,
  },
  restTipText: { flex: 1, fontSize: 13, color: colors.textSec, lineHeight: 20 },

  workoutHeader: {
    backgroundColor: colors.card, borderRadius: 14, padding: 16,
    marginTop: 8, marginBottom: 12, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'flex-start',
    borderLeftWidth: 4, borderWidth: 1, borderColor: colors.border,
  },
  workoutDay: { fontSize: 12, color: colors.textSec, fontWeight: '500' },
  workoutName: { fontSize: 20, color: colors.text, fontWeight: '700', marginTop: 2 },
  workoutFocus: { fontSize: 13, color: colors.textSec, marginTop: 2 },
  durationBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, gap: 4,
  },
  durationText: { fontSize: 11, color: colors.textSec },

  postureBlock: { borderRadius: 14, borderWidth: 1, marginBottom: 14, overflow: 'hidden' },
  postureBlockHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  postureBlockTitle: { fontSize: 13, fontWeight: '700' },
  postureBlockSubtitle: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  postureItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: colors.border, gap: 10,
  },
  postureItemIcon: { fontSize: 20, width: 28, textAlign: 'center', marginTop: 1 },
  postureItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flex: 1, marginRight: 6 },
  postureItemName: { fontSize: 13, color: colors.text, fontWeight: '600', flex: 1 },
  postureItemReps: { fontSize: 11, color: colors.textSec, marginLeft: 8 },
  postureItemBenefit: { fontSize: 12, color: colors.textSec, lineHeight: 18, marginTop: 4 },

  sectionLabel: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderLeftWidth: 3, paddingLeft: 8, marginBottom: 8, marginTop: 4,
  },
  sectionLabelText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },

  exCard: {
    backgroundColor: colors.card, borderRadius: 14, marginBottom: 8,
    overflow: 'hidden', borderWidth: 1, borderColor: colors.border,
  },
  exCardTop: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8 },
  infoBtn: { padding: 2 },
  exColorBar: { width: 3, height: 40, borderRadius: 2 },
  exName: { fontSize: 14, color: colors.text, fontWeight: '600', marginBottom: 6 },
  exMeta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { backgroundColor: colors.surface, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  chipText: { fontSize: 10, color: colors.textSec, fontWeight: '500' },
  exDetails: {
    paddingHorizontal: 14, paddingBottom: 14,
    borderTopWidth: 1, borderTopColor: colors.border, gap: 8, paddingTop: 10,
  },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start' },
  detailLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  detailValue: { fontSize: 13, color: colors.textSec, lineHeight: 19 },
  postureNote: {
    backgroundColor: colors.accentDim + '55', borderRadius: 8, padding: 10,
    borderLeftWidth: 3, borderLeftColor: colors.accentLight,
  },
  postureNoteText: { fontSize: 12, color: colors.accentLight, lineHeight: 18 },

  completeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16,
    marginTop: 16, marginBottom: 8, gap: 8,
  },
  completeBtnDone: { backgroundColor: colors.success },
  completeBtnText: { fontSize: 15, color: '#fff', fontWeight: '700' },

  weekBanner: {
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    marginTop: 8, marginBottom: 14, borderWidth: 1, borderColor: colors.border,
  },
  weekBannerText: { fontSize: 13, color: colors.textSec, lineHeight: 20 },
  weekRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: colors.card, borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: colors.border, gap: 12,
  },
  weekDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  weekRowTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  weekDay: { fontSize: 13, color: colors.text, fontWeight: '700' },
  weekWorkout: { fontSize: 12, color: colors.textSec, marginTop: 2 },
  weekPosture: { fontSize: 11, color: colors.accentLight, marginTop: 3, fontStyle: 'italic' },
  todayBadge: { backgroundColor: colors.accentDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  todayBadgeText: { fontSize: 10, color: colors.accentLight, fontWeight: '700' },
  tipCard: {
    flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12,
    padding: 14, marginTop: 4, borderWidth: 1, borderColor: colors.border, alignItems: 'flex-start',
  },
  tipText: { flex: 1, fontSize: 12, color: colors.textSec, lineHeight: 19 },

  postureBanner: {
    flexDirection: 'row', backgroundColor: colors.warning + '18',
    borderRadius: 12, padding: 14, marginTop: 8, marginBottom: 16,
    borderWidth: 1, borderColor: colors.warning + '40', alignItems: 'flex-start',
  },
  postureBannerText: { flex: 1, fontSize: 12, color: colors.textSec, lineHeight: 19 },
  guideSection: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
  guideCard: {
    backgroundColor: colors.card, borderRadius: 12, marginBottom: 8,
    overflow: 'hidden', borderWidth: 1, borderColor: colors.border,
  },
  guideCardTop: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  guideIcon: { fontSize: 22, width: 34, textAlign: 'center' },
  guideName: { fontSize: 14, color: colors.text, fontWeight: '600' },
  guideMeta: { fontSize: 11, color: colors.textSec, marginTop: 2 },
  guideExpanded: { padding: 14, paddingTop: 0, gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: 14 },
  guideRow: { fontSize: 12, color: colors.textSec, lineHeight: 19 },
  guideRowLabel: { fontWeight: '700', color: colors.textSec },
});

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '85%', borderTopWidth: 1, borderColor: colors.border, paddingBottom: 16,
  },
  handle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: 17, color: colors.text, fontWeight: '700', flex: 1, marginRight: 12 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  scroll: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 13, color: colors.textSec, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 16, marginBottom: 10 },
  step: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 12 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accentDim, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNumText: { fontSize: 12, color: colors.accentLight, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 20 },
  mistake: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  mistakeText: { flex: 1, fontSize: 13, color: colors.textSec, lineHeight: 19 },
  postureNote: { backgroundColor: colors.accentDim + '55', borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: colors.accentLight, marginTop: 12 },
  postureNoteText: { fontSize: 12, color: colors.accentLight, lineHeight: 18 },
});

const sl = StyleSheet.create({
  container: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 4 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  headerText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  setRow: {
    backgroundColor: colors.surface, borderRadius: 10, padding: 10,
    marginBottom: 8, borderWidth: 1, borderColor: colors.border,
  },
  setRowSaved: { borderColor: colors.success + '50', backgroundColor: colors.success + '0D' },
  setTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  setLabel: { fontSize: 12, color: colors.text, fontWeight: '700' },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  suggestionText: { fontSize: 11, color: colors.accentLight, fontStyle: 'italic' },
  useBtn: { fontSize: 10, color: colors.accent, fontWeight: '700', borderWidth: 1, borderColor: colors.accent, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  noHistory: { fontSize: 11, color: colors.textMuted, fontStyle: 'italic' },
  savedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  savedText: { fontSize: 12, color: colors.success, fontWeight: '600' },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 10, color: colors.textMuted, marginBottom: 4, fontWeight: '500', textTransform: 'uppercase' },
  input: {
    backgroundColor: colors.card, borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 8, fontSize: 15, color: colors.text,
    borderWidth: 1, borderColor: colors.border, textAlign: 'center', fontWeight: '600',
  },
  feedbackRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  fbBtn: {
    flex: 1, borderRadius: 7, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  fbText: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  saveSetBtn: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
