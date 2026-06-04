import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { POSTURE_EXERCISES } from '../data/workoutData';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

const TABS = ['Today', 'This week', 'Posture'];
const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getTodayKey() {
  const d = new Date().getDay();
  return DAYS_ORDER[d === 0 ? 6 : d - 1];
}

function roundWeight(w) {
  return Math.round(w * 2) / 2;
}

function suggestWeight(weight, feedback) {
  const w = parseFloat(weight);
  if (!w || !feedback || feedback === 'good') return weight;
  const factor = feedback === 'easy' ? 1.075 : 0.925;
  const suggested = roundWeight(w * factor);
  return suggested > 0 ? String(suggested) : weight;
}

function getFeedbackColor(feedback) {
  if (feedback === 'easy') return colors.success;
  if (feedback === 'good') return colors.info;
  if (feedback === 'hard') return colors.secondary;
  return colors.textMuted;
}

function getFeedbackIcon(feedback) {
  if (feedback === 'easy') return 'trending-up';
  if (feedback === 'good') return 'checkmark-circle';
  if (feedback === 'hard') return 'trending-down';
  return 'ellipse-outline';
}

// Get best weight for an exercise across all set logs
function getExercisePR(setLogs, exerciseId) {
  const logs = setLogs.filter(l => l.exerciseId === exerciseId && l.weight);
  if (!logs.length) return null;
  return Math.max(...logs.map(l => l.weight));
}

// Get last 5 session weights for sparkline
function getSparklineData(setLogs, exerciseId) {
  const byDate = {};
  setLogs.filter(l => l.exerciseId === exerciseId && l.weight).forEach(l => {
    if (!byDate[l.date] || l.weight > byDate[l.date]) {
      byDate[l.date] = l.weight;
    }
  });
  const sorted = Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0])).slice(-5);
  return sorted.map(([, v]) => v);
}

export default function WorkoutScreen({ route }) {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [infoExercise, setInfoExercise] = useState(null);
  const [sessionSets, setSessionSets] = useState({});

  useEffect(() => {
    if (route?.params?.tab === 'posture') setActiveTab(2);
  }, [route?.params]);

  const { generatedPlan, progress, userProfile } = state;
  const todayKey = getTodayKey();
  const todayWorkoutId = generatedPlan?.schedule?.[todayKey] ?? null;
  const todayWorkout = todayWorkoutId ? generatedPlan?.workouts?.[todayWorkoutId] : null;
  const setLogs = progress.setLogs || [];

  useEffect(() => {
    if (!todayWorkout?.exercises) return;
    const prevSession = [...(progress.completedWorkouts || [])]
      .reverse()
      .find(w => w.type === todayWorkoutId && w.exercises?.length);

    const initial = {};
    todayWorkout.exercises.forEach(ex => {
      const prevEx = prevSession?.exercises?.find(e => e.id === ex.id);
      const prevWeights = (prevEx?.sets || []).map(s => s.weight).filter(Boolean);
      const lastWeight = prevWeights.length ? String(prevWeights[prevWeights.length - 1]) : '';
      initial[ex.id] = Array.from({ length: ex.sets }, (_, i) => ({
        weight: i === 0 ? lastWeight : '',
        feedback: null,
        completed: false,
        suggested: i === 0 && !!lastWeight,
      }));
    });
    setSessionSets(initial);
  }, [todayWorkoutId]);

  function handleSetUpdate(exerciseId, setIdx, field, value) {
    setSessionSets(prev => {
      const sets = [...(prev[exerciseId] || [])];
      sets[setIdx] = { ...sets[setIdx], [field]: value };
      if (field === 'feedback' && setIdx + 1 < sets.length) {
        const nextWeight = suggestWeight(sets[setIdx].weight, value);
        if (nextWeight !== sets[setIdx + 1].weight) {
          sets[setIdx + 1] = { ...sets[setIdx + 1], weight: nextWeight, suggested: true };
        }
      }
      return { ...prev, [exerciseId]: sets };
    });
  }

  function getPrevSessionRef(exerciseId) {
    const prevSession = [...(progress.completedWorkouts || [])]
      .reverse()
      .find(w => w.type === todayWorkoutId && w.exercises?.length);
    if (!prevSession) return null;
    const prevEx = prevSession?.exercises?.find(e => e.id === exerciseId);
    if (!prevEx?.sets?.length) return null;
    const weights = prevEx.sets.map(s => s.weight).filter(Boolean);
    if (!weights.length) return null;
    const avg = roundWeight(weights.reduce((a, b) => a + b, 0) / weights.length);
    return { avg, sets: prevEx.sets.length, date: prevSession.date };
  }

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
    const exerciseLogs = (todayWorkout?.exercises || []).map(ex => ({
      id: ex.id, name: ex.name,
      sets: (sessionSets[ex.id] || []).map((s, i) => ({
        setNum: i + 1, weight: parseFloat(s.weight) || null,
        feedback: s.feedback, completed: s.completed,
      })),
    }));
    dispatch({ type: 'LOG_WORKOUT', payload: { date, type: todayWorkoutId, exercises: exerciseLogs } });
    Alert.alert('Session complete! 💪', 'Great work — logged to your progress tracker.');
  }

  // Get subtitle based on today's workout
  const subtitle = todayWorkout
    ? `${todayWorkout.name} today — ${todayWorkout.focus}`
    : totalDays > 0 ? `${totalDays}-day split · personalised for ${userProfile.name || 'you'}` : 'No plan yet';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Your workouts</Text>
        <Text style={s.subtitle}>{subtitle}</Text>
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

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {activeTab === 0 && (
            <TodayTab
              workout={todayWorkout}
              dayName={todayKey}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
              onComplete={markComplete}
              completedWorkouts={progress.completedWorkouts}
              onInfo={setInfoExercise}
              sessionSets={sessionSets}
              onSetUpdate={handleSetUpdate}
              getPrevRef={getPrevSessionRef}
              setLogs={setLogs}
            />
          )}
          {activeTab === 1 && (
            <WeeklyTab generatedPlan={generatedPlan} completedWorkouts={progress.completedWorkouts} />
          )}
          {activeTab === 2 && (
            <PostureGuideTab expandedId={expandedId} setExpandedId={setExpandedId} />
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <ExerciseInfoModal exercise={infoExercise} onClose={() => setInfoExercise(null)} />
    </SafeAreaView>
  );
}

/* ─── Today Tab ─────────────────────────────────────────────────── */

function TodayTab({
  workout, dayName, expandedId, setExpandedId,
  onComplete, completedWorkouts, onInfo,
  sessionSets, onSetUpdate, getPrevRef, setLogs,
}) {
  const today = new Date().toISOString().split('T')[0];
  const isDone = completedWorkouts.some(w => w.date === today);

  if (!workout) {
    return (
      <View style={s.restContainer}>
        <Text style={{ fontSize: 48 }}>😴</Text>
        <Text style={s.restTitle}>Rest day</Text>
        <Text style={s.restSubtitle}>{dayName} · muscle growth happens during recovery</Text>
        <View style={s.restTip}>
          <Ionicons name="information-circle-outline" size={16} color={colors.info} style={{ marginRight: 8 }} />
          <Text style={s.restTipText}>
            Use today for a 10-min walk, light stretching, or the Posture routine.
          </Text>
        </View>
      </View>
    );
  }

  const totalSets = (workout.exercises || []).reduce((a, ex) => a + ex.sets, 0);
  const completedSets = Object.values(sessionSets).reduce(
    (a, sets) => a + sets.filter(s => s.completed).length, 0
  );
  const prog = totalSets > 0 ? completedSets / totalSets : 0;

  return (
    <View style={{ paddingHorizontal: 20 }}>
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

      {totalSets > 0 && (
        <View style={s.progressBar}>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${prog * 100}%`, backgroundColor: workout.color }]} />
          </View>
          <Text style={s.progressLabel}>{completedSets} / {totalSets} sets done</Text>
        </View>
      )}

      {workout.postureWarmup?.length > 0 && (
        <PostureBlock
          title="Posture warm-up"
          subtitle="5 min · do this before you start"
          icon="body" iconColor={colors.info}
          items={workout.postureWarmup}
          expandedId={expandedId} setExpandedId={setExpandedId}
          blockColor={colors.info}
        />
      )}

      <Text style={s.sectionDivider}>Today's exercises</Text>
      {workout.exercises?.map(ex => {
        const sparkline = getSparklineData(setLogs, ex.id);
        const pr = getExercisePR(setLogs, ex.id);
        const prevRef = getPrevRef(ex.id);
        const isPR = pr && prevRef && prevRef.avg >= pr;
        return (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            expanded={expandedId === ex.id}
            onToggle={() => setExpandedId(expandedId === ex.id ? null : ex.id)}
            accentColor={workout.color}
            onInfo={() => onInfo(ex)}
            sets={sessionSets[ex.id] || []}
            onSetUpdate={(idx, field, val) => onSetUpdate(ex.id, idx, field, val)}
            prevRef={prevRef}
            sparkline={sparkline}
            isPR={isPR}
          />
        );
      })}

      {workout.postureCooldown?.length > 0 && (
        <PostureBlock
          title="Posture cooldown"
          subtitle="5 min · finish every session with this"
          icon="leaf" iconColor={colors.success}
          items={workout.postureCooldown}
          expandedId={expandedId} setExpandedId={setExpandedId}
          blockColor={colors.success}
        />
      )}

      <TouchableOpacity
        style={[s.completeBtn, isDone && s.completeBtnDone]}
        onPress={onComplete}
        activeOpacity={0.8}
      >
        <Ionicons name={isDone ? 'checkmark-circle' : 'checkmark-circle-outline'} size={22} color="#fff" />
        <Text style={s.completeBtnText}>{isDone ? 'Session logged ✓' : 'Mark as complete'}</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ─── Exercise Card ─────────────────────────────────────────────── */

function ExerciseCard({ exercise, expanded, onToggle, accentColor, onInfo, sets, onSetUpdate, prevRef, sparkline, isPR }) {
  const completedCount = sets.filter(s => s.completed).length;
  const allDone = completedCount === sets.length && sets.length > 0;
  const lastWeight = prevRef?.avg;

  return (
    <View style={[s.exCard, allDone && { borderColor: colors.success + '70' }]}>
      <TouchableOpacity style={s.exCardTop} onPress={onToggle} activeOpacity={0.8}>
        {/* Icon with dark bg */}
        <View style={s.exIconWrap}>
          <Ionicons name="barbell-outline" size={16} color={accentColor} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={s.exNameRow}>
            <Text style={s.exName}>{exercise.name}</Text>
            {isPR && (
              <View style={s.prBadge}>
                <Text style={s.prBadgeText}>PR</Text>
              </View>
            )}
            {allDone && (
              <View style={s.doneBadge}>
                <Text style={s.doneBadgeText}>Done ✓</Text>
              </View>
            )}
          </View>
          <Text style={s.exMeta}>
            {exercise.sets} sets{lastWeight ? ` · last ${lastWeight} kg` : ` · ${exercise.reps}`}
          </Text>
        </View>

        {/* Sparkline */}
        {sparkline.length > 1 && (
          <Sparkline data={sparkline} color={accentColor} />
        )}

        <TouchableOpacity
          style={s.infoBtn}
          onPress={e => { e.stopPropagation?.(); onInfo(); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
        </TouchableOpacity>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} style={{ marginLeft: 2 }} />
      </TouchableOpacity>

      {expanded && (
        <View style={s.exExpanded}>
          <View style={s.exDetails}>
            <DetailRow icon="body-outline" label="Muscles" value={exercise.muscles} />
            <DetailRow icon="construct-outline" label="Equipment" value={exercise.equipment} />
            <DetailRow icon="bulb-outline" label="Form tip" value={exercise.tips} />
            {exercise.postureNote && (
              <View style={s.postureNote}>
                <Text style={s.postureNoteText}>{exercise.postureNote}</Text>
              </View>
            )}
          </View>
          <SetTracker
            sets={sets}
            exercise={exercise}
            onSetUpdate={onSetUpdate}
            prevRef={prevRef}
            accentColor={accentColor}
          />
        </View>
      )}
    </View>
  );
}

/* ─── Sparkline ─────────────────────────────────────────────────── */

function Sparkline({ data, color }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const H = 24, W = 6, GAP = 3;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: H, gap: GAP, marginRight: 6 }}>
      {data.map((v, i) => {
        const h = Math.max(4, Math.round(((v - min) / range) * (H - 4)) + 4);
        const isLast = i === data.length - 1;
        return (
          <View key={i} style={{
            width: W, height: h, borderRadius: 2,
            backgroundColor: isLast ? color : color + '55',
          }} />
        );
      })}
    </View>
  );
}

/* ─── Set Tracker ───────────────────────────────────────────────── */

function SetTracker({ sets, exercise, onSetUpdate, prevRef, accentColor }) {
  return (
    <View style={st.container}>
      <View style={st.header}>
        <View style={st.headerLeft}>
          <Ionicons name="barbell" size={14} color={accentColor} style={{ marginRight: 6 }} />
          <Text style={[st.headerTitle, { color: accentColor }]}>Track sets</Text>
        </View>
        {prevRef && (
          <Text style={st.prevRef}>Last session: {prevRef.avg} kg × {prevRef.sets} sets</Text>
        )}
      </View>
      <View style={st.colRow}>
        <Text style={[st.colLabel, { width: 42 }]}>Set</Text>
        <Text style={[st.colLabel, { flex: 1 }]}>Weight</Text>
        <Text style={[st.colLabel, { width: 70 }]}>Feel</Text>
        <View style={{ width: 36 }} />
      </View>
      {sets.map((set, i) => (
        <SetRow
          key={i}
          setNum={i + 1}
          set={set}
          isNext={i === sets.filter(s => s.completed).length}
          onUpdate={(field, val) => onSetUpdate(i, field, val)}
          accentColor={accentColor}
        />
      ))}
      <View style={st.legend}>
        <LegendItem color={colors.success} label="Easy → weight goes up next set" />
        <LegendItem color={colors.info}    label="Good → weight stays" />
        <LegendItem color={colors.secondary} label="Hard → weight drops next set" />
      </View>
    </View>
  );
}

function LegendItem({ color, label }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginRight: 6 }} />
      <Text style={{ fontFamily: 'Figtree_400Regular', fontSize: 10, color: colors.textMuted }}>{label}</Text>
    </View>
  );
}

/* ─── Set Row ───────────────────────────────────────────────────── */

function SetRow({ setNum, set, isNext, onUpdate, accentColor }) {
  return (
    <View>
      <View style={[sr.row, set.completed && sr.rowDone, isNext && !set.completed && sr.rowActive]}>
        <View style={[sr.setNumBadge, set.completed && { backgroundColor: colors.success + '30' }]}>
          <Text style={[sr.setNum, set.completed && { color: colors.success }]}>{setNum}</Text>
        </View>
        <View style={{ flex: 1, marginHorizontal: 8 }}>
          {set.suggested && !set.completed && (
            <Text style={sr.suggestedLabel}>suggested</Text>
          )}
          <View style={sr.weightRow}>
            <TextInput
              style={[sr.weightInput, set.completed && sr.weightInputDone]}
              value={set.weight}
              onChangeText={val => onUpdate('weight', val.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              editable={!set.completed}
              selectTextOnFocus
            />
            <Text style={sr.kgLabel}>kg</Text>
          </View>
        </View>
        <View style={{ width: 70, alignItems: 'center' }}>
          {set.completed && set.feedback ? (
            <View style={[sr.fbDoneChip, { backgroundColor: getFeedbackColor(set.feedback) + '25', borderColor: getFeedbackColor(set.feedback) + '60' }]}>
              <Ionicons name={getFeedbackIcon(set.feedback)} size={12} color={getFeedbackColor(set.feedback)} />
              <Text style={[sr.fbDoneText, { color: getFeedbackColor(set.feedback) }]}>
                {set.feedback.charAt(0).toUpperCase() + set.feedback.slice(1)}
              </Text>
            </View>
          ) : !set.completed ? (
            <Text style={{ fontFamily: 'Figtree_400Regular', fontSize: 11, color: colors.textMuted }}>—</Text>
          ) : (
            <Text style={{ fontFamily: 'Figtree_400Regular', fontSize: 11, color: colors.textMuted }}>rate it</Text>
          )}
        </View>
        <TouchableOpacity
          style={sr.checkBtn}
          onPress={() => {
            if (set.completed) { onUpdate('completed', false); onUpdate('feedback', null); }
            else { onUpdate('completed', true); }
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={set.completed ? 'checkmark-circle' : 'checkmark-circle-outline'}
            size={28}
            color={set.completed ? colors.success : isNext ? accentColor : colors.border}
          />
        </TouchableOpacity>
      </View>
      {set.completed && !set.feedback && (
        <View style={sr.feedbackPromptRow}>
          <Text style={sr.feedbackPromptLabel}>How was that set?</Text>
          {['easy', 'good', 'hard'].map(f => (
            <TouchableOpacity
              key={f}
              style={[sr.fbBtn, { borderColor: getFeedbackColor(f), backgroundColor: getFeedbackColor(f) + '18' }]}
              onPress={() => onUpdate('feedback', f)}
              activeOpacity={0.7}
            >
              <Ionicons name={getFeedbackIcon(f)} size={14} color={getFeedbackColor(f)} />
              <Text style={[sr.fbBtnText, { color: getFeedbackColor(f) }]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {set.completed && set.feedback && set.feedback !== 'good' && (
        <View style={sr.suggestionHint}>
          <Ionicons
            name={set.feedback === 'easy' ? 'trending-up' : 'trending-down'}
            size={12} color={getFeedbackColor(set.feedback)} style={{ marginRight: 4 }}
          />
          <Text style={[sr.suggestionHintText, { color: getFeedbackColor(set.feedback) }]}>
            {set.feedback === 'easy' ? 'Weight increased for next set' : 'Weight reduced for next set'}
          </Text>
        </View>
      )}
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
            {expandedId === item.id && <Text style={s.postureItemBenefit}>{item.benefit}</Text>}
          </View>
          <Ionicons name={expandedId === item.id ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
        </TouchableOpacity>
      ))}
    </View>
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
      <Ionicons name={icon} size={14} color={colors.textSec} style={{ marginRight: 6, marginTop: 2 }} />
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
        <Text style={{ fontFamily: 'Figtree_400Regular', color: colors.textSec, fontSize: 14 }}>No plan generated yet.</Text>
      </View>
    );
  }
  const { schedule, workouts } = generatedPlan;
  const trainingCount = Object.values(schedule).filter(Boolean).length;

  return (
    <View style={{ paddingHorizontal: 20 }}>
      <View style={s.weekBanner}>
        <Text style={s.weekBannerText}>
          {trainingCount}-day personalised split. Weight tracked per set — the app learns your strength and suggests increases automatically.
        </Text>
      </View>
      {DAYS_ORDER.map(day => {
        const workoutId = schedule[day] ?? null;
        const workout = workoutId ? workouts[workoutId] : null;
        const isToday = day === todayKey;
        return (
          <View key={day} style={[s.weekRow, isToday && { borderColor: colors.accent + '80' }]}>
            <View style={[s.weekDot, { backgroundColor: workout ? workout.color : colors.border }]} />
            <View style={{ flex: 1 }}>
              <View style={s.weekRowTop}>
                <Text style={[s.weekDay, isToday && { color: colors.text }]}>{day}</Text>
                {isToday && <View style={s.todayBadge}><Text style={s.todayBadgeText}>Today</Text></View>}
              </View>
              {workout ? (
                <>
                  <Text style={s.weekWorkout}>{workout.name} · {workout.focus}</Text>
                  <Text style={s.weekPosture}>
                    + {workout.postureWarmup?.length ?? 0} posture warm-up · {workout.postureCooldown?.length ?? 0} cooldown
                  </Text>
                </>
              ) : (
                <Text style={s.weekWorkout}>Rest day · active recovery</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ─── Posture Guide Tab ──────────────────────────────────────────── */

function PostureGuideTab({ expandedId, setExpandedId }) {
  const critical = POSTURE_EXERCISES.filter(e => e.priority === 'CRITICAL');
  const high = POSTURE_EXERCISES.filter(e => e.priority === 'HIGH');
  const medium = POSTURE_EXERCISES.filter(e => e.priority === 'MEDIUM');
  return (
    <View style={{ paddingHorizontal: 20 }}>
      <View style={s.postureBanner}>
        <Ionicons name="warning" size={15} color={colors.warning} style={{ marginRight: 8 }} />
        <Text style={s.postureBannerText}>
          These are embedded in your workouts. This tab is your reference guide — also do critical ones at your desk.
        </Text>
      </View>
      <PostureGuideSection title="Critical — also do at your desk" exercises={critical} color={colors.secondary} expandedId={expandedId} setExpandedId={setExpandedId} />
      <PostureGuideSection title="High priority" exercises={high} color={colors.warning} expandedId={expandedId} setExpandedId={setExpandedId} />
      {medium.length > 0 && (
        <PostureGuideSection title="Good addition" exercises={medium} color={colors.success} expandedId={expandedId} setExpandedId={setExpandedId} />
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
              <Text style={[s.guideRow, { color: colors.textSec }]}>⏱ <Text style={[s.guideRowLabel, { color: colors.textSec }]}>Frequency: </Text>{ex.frequency}</Text>
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
                <View style={m.stepNum}><Text style={m.stepNumText}>{i + 1}</Text></View>
                <Text style={m.stepText}>{step}</Text>
              </View>
            ))}
            {exercise.mistakes?.length > 0 && (
              <>
                <Text style={m.sectionTitle}>Common mistakes</Text>
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

/* ─── Styles ─────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 },
  title: { fontFamily: 'BebasNeue_400Regular', fontSize: 34, color: colors.text, letterSpacing: 0.5 },
  subtitle: { fontFamily: 'Figtree_400Regular_Italic', fontSize: 13, color: colors.textSec, marginTop: 3 },
  tabBar: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 10,
    backgroundColor: colors.surface, borderRadius: 14, padding: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center' },
  tabActive: { backgroundColor: colors.card },
  tabText: { fontFamily: 'Figtree_600SemiBold', fontSize: 12, color: colors.textMuted },
  tabTextActive: { color: colors.text },
  scroll: { flex: 1 },

  restContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  restTitle: { fontFamily: 'BebasNeue_400Regular', fontSize: 32, color: colors.text, marginTop: 16, letterSpacing: 0.5 },
  restSubtitle: { fontFamily: 'Figtree_400Regular_Italic', fontSize: 14, color: colors.textSec, marginTop: 6, textAlign: 'center' },
  restTip: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.surface,
    borderRadius: 14, padding: 14, marginTop: 24, borderWidth: 1, borderColor: colors.border,
  },
  restTipText: { fontFamily: 'Figtree_400Regular', flex: 1, fontSize: 13, color: colors.textSec, lineHeight: 20 },

  workoutHeader: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16,
    marginTop: 8, marginBottom: 10, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'flex-start',
    borderLeftWidth: 4, borderWidth: 1, borderColor: colors.border,
  },
  workoutDay: { fontFamily: 'Figtree_500Medium', fontSize: 11, color: colors.textSec, textTransform: 'uppercase', letterSpacing: 0.5 },
  workoutName: { fontFamily: 'BebasNeue_400Regular', fontSize: 26, color: colors.text, marginTop: 2, letterSpacing: 0.5 },
  workoutFocus: { fontFamily: 'Figtree_400Regular_Italic', fontSize: 13, color: colors.textSec, marginTop: 2 },
  durationBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, gap: 4,
  },
  durationText: { fontFamily: 'Figtree_500Medium', fontSize: 11, color: colors.textSec },

  progressBar: {
    marginBottom: 12, backgroundColor: colors.surface,
    borderRadius: 12, padding: 10, borderWidth: 1, borderColor: colors.border,
  },
  progressTrack: { height: 5, backgroundColor: colors.bg, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabel: { fontFamily: 'Figtree_500Medium', fontSize: 11, color: colors.textSec, textAlign: 'right' },

  sectionDivider: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8, marginTop: 4,
  },

  postureBlock: { borderRadius: 16, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  postureBlockHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  postureBlockTitle: { fontFamily: 'Figtree_700Bold', fontSize: 13 },
  postureBlockSubtitle: { fontFamily: 'Figtree_400Regular_Italic', fontSize: 11, color: colors.textMuted, marginTop: 1 },
  postureItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: colors.border, gap: 10,
  },
  postureItemIcon: { fontSize: 20, width: 28, textAlign: 'center', marginTop: 1 },
  postureItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flex: 1, marginRight: 6 },
  postureItemName: { fontFamily: 'Figtree_600SemiBold', fontSize: 13, color: colors.text, flex: 1 },
  postureItemReps: { fontFamily: 'Figtree_400Regular', fontSize: 11, color: colors.textSec, marginLeft: 8 },
  postureItemBenefit: { fontFamily: 'Figtree_400Regular_Italic', fontSize: 12, color: colors.textSec, lineHeight: 18, marginTop: 4 },

  exCard: {
    backgroundColor: colors.surface, borderRadius: 16, marginBottom: 8,
    overflow: 'hidden', borderWidth: 1, borderColor: colors.border,
  },
  exCardTop: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, gap: 10 },
  exExpanded: { borderTopWidth: 1, borderTopColor: colors.border },
  infoBtn: { padding: 2 },
  exIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  exNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  exName: { fontFamily: 'Figtree_700Bold', fontSize: 14, color: colors.text },
  exMeta: { fontFamily: 'Figtree_400Regular', fontSize: 12, color: colors.textSec },
  prBadge: {
    backgroundColor: colors.statCard,
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  prBadgeText: { fontFamily: 'Figtree_700Bold', fontSize: 9, color: '#fff' },
  doneBadge: {
    backgroundColor: colors.success + '25',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: colors.success + '50',
  },
  doneBadgeText: { fontFamily: 'Figtree_600SemiBold', fontSize: 9, color: colors.success },
  chip: { backgroundColor: colors.bg, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.border },
  chipText: { fontFamily: 'Figtree_500Medium', fontSize: 10, color: colors.textSec },
  exDetails: {
    paddingHorizontal: 14, paddingBottom: 12, gap: 8, paddingTop: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start' },
  detailLabel: { fontFamily: 'Figtree_600SemiBold', fontSize: 10, color: colors.textMuted, marginBottom: 2 },
  detailValue: { fontFamily: 'Figtree_400Regular', fontSize: 13, color: colors.textSec, lineHeight: 19 },
  postureNote: {
    backgroundColor: colors.surface, borderRadius: 10, padding: 10,
    borderLeftWidth: 3, borderLeftColor: colors.textSec,
  },
  postureNoteText: { fontFamily: 'Figtree_400Regular_Italic', fontSize: 12, color: colors.textSec, lineHeight: 18 },

  completeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accent, borderRadius: 16, paddingVertical: 16,
    marginTop: 16, marginBottom: 8, gap: 8,
  },
  completeBtnDone: { backgroundColor: colors.success },
  completeBtnText: { fontFamily: 'Figtree_700Bold', fontSize: 15, color: '#fff' },

  weekBanner: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 14,
    marginTop: 8, marginBottom: 14, borderWidth: 1, borderColor: colors.border,
  },
  weekBannerText: { fontFamily: 'Figtree_400Regular_Italic', fontSize: 13, color: colors.textSec, lineHeight: 20 },
  weekRow: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.surface,
    borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border, gap: 12,
  },
  weekDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  weekRowTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  weekDay: { fontFamily: 'Figtree_700Bold', fontSize: 13, color: colors.textSec },
  weekWorkout: { fontFamily: 'Figtree_400Regular', fontSize: 12, color: colors.textSec, marginTop: 2 },
  weekPosture: { fontFamily: 'Figtree_400Regular_Italic', fontSize: 11, color: colors.textMuted, marginTop: 3 },
  todayBadge: { backgroundColor: colors.accent + '20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  todayBadgeText: { fontFamily: 'Figtree_700Bold', fontSize: 10, color: colors.accent },

  postureBanner: {
    flexDirection: 'row', backgroundColor: colors.warning + '18', borderRadius: 14,
    padding: 14, marginTop: 8, marginBottom: 16, borderWidth: 1,
    borderColor: colors.warning + '40', alignItems: 'flex-start',
  },
  postureBannerText: { fontFamily: 'Figtree_400Regular', flex: 1, fontSize: 12, color: colors.textSec, lineHeight: 19 },
  guideSection: { fontFamily: 'Figtree_700Bold', fontSize: 12, letterSpacing: 0.4, marginBottom: 8, marginTop: 4 },
  guideCard: {
    backgroundColor: colors.surface, borderRadius: 14, marginBottom: 8,
    overflow: 'hidden', borderWidth: 1, borderColor: colors.border,
  },
  guideCardTop: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  guideIcon: { fontSize: 22, width: 34, textAlign: 'center' },
  guideName: { fontFamily: 'Figtree_600SemiBold', fontSize: 14, color: colors.text },
  guideMeta: { fontFamily: 'Figtree_400Regular', fontSize: 11, color: colors.textSec, marginTop: 2 },
  guideExpanded: { padding: 14, paddingTop: 0, gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: 14 },
  guideRow: { fontFamily: 'Figtree_400Regular', fontSize: 12, color: colors.textSec, lineHeight: 19 },
  guideRowLabel: { fontFamily: 'Figtree_700Bold', color: colors.textSec },
});

const st = StyleSheet.create({
  container: {
    margin: 12, backgroundColor: colors.bg,
    borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontFamily: 'Figtree_600SemiBold', fontSize: 12 },
  prevRef: { fontFamily: 'Figtree_400Regular_Italic', fontSize: 10, color: colors.textMuted },
  colRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.surface + '80',
  },
  colLabel: { fontFamily: 'Figtree_600SemiBold', fontSize: 9, color: colors.textMuted, letterSpacing: 0.4 },
  legend: {
    padding: 10, borderTopWidth: 1, borderTopColor: colors.border, gap: 2,
    backgroundColor: colors.surface + '50',
  },
});

const sr = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border + '80', gap: 4,
  },
  rowActive: { backgroundColor: colors.card + '80' },
  rowDone: { backgroundColor: colors.success + '08' },
  setNumBadge: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  setNum: { fontFamily: 'Figtree_700Bold', fontSize: 13, color: colors.textSec },
  weightRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  suggestedLabel: { fontFamily: 'Figtree_500Medium', fontSize: 9, color: colors.textSec, letterSpacing: 0.4, marginBottom: 2 },
  weightInput: {
    width: 60, height: 36, backgroundColor: colors.surface,
    borderRadius: 8, borderWidth: 1, borderColor: colors.border,
    textAlign: 'center', fontFamily: 'Figtree_700Bold', fontSize: 16, color: colors.text,
  },
  weightInputDone: {
    backgroundColor: colors.success + '15', borderColor: colors.success + '40', color: colors.success,
  },
  kgLabel: { fontFamily: 'Figtree_600SemiBold', fontSize: 12, color: colors.textMuted },
  fbDoneChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1,
  },
  fbDoneText: { fontFamily: 'Figtree_700Bold', fontSize: 10 },
  checkBtn: { width: 36, alignItems: 'center', justifyContent: 'center' },
  feedbackPromptRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border + '80', gap: 8,
  },
  feedbackPromptLabel: { fontFamily: 'Figtree_600SemiBold', fontSize: 11, color: colors.textSec, marginRight: 4 },
  fbBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1,
  },
  fbBtnText: { fontFamily: 'Figtree_700Bold', fontSize: 12 },
  suggestionHint: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 56, paddingVertical: 5,
    backgroundColor: colors.surface + '60',
    borderBottomWidth: 1, borderBottomColor: colors.border + '80',
  },
  suggestionHintText: { fontFamily: 'Figtree_600SemiBold', fontSize: 10 },
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
  title: { fontFamily: 'BebasNeue_400Regular', fontSize: 22, color: colors.text, flex: 1, marginRight: 12, letterSpacing: 0.5 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  scroll: { paddingHorizontal: 20 },
  sectionTitle: { fontFamily: 'Figtree_700Bold', fontSize: 12, color: colors.textSec, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 16, marginBottom: 10 },
  step: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 12 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNumText: { fontFamily: 'Figtree_700Bold', fontSize: 12, color: colors.textSec },
  stepText: { fontFamily: 'Figtree_400Regular', flex: 1, fontSize: 13, color: colors.text, lineHeight: 20 },
  mistake: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  mistakeText: { fontFamily: 'Figtree_400Regular', flex: 1, fontSize: 13, color: colors.textSec, lineHeight: 19 },
  postureNote: { backgroundColor: colors.card, borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: colors.textSec, marginTop: 12 },
  postureNoteText: { fontFamily: 'Figtree_400Regular_Italic', fontSize: 12, color: colors.textSec, lineHeight: 18 },
});
