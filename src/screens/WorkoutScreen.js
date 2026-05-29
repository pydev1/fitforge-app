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

const TABS = ['Today', 'Weekly', 'Posture Guide'];
const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getTodayKey() {
  const d = new Date().getDay();
  return DAYS_ORDER[d === 0 ? 6 : d - 1];
}

// Round to nearest 0.5 (dumbbell increments)
function roundWeight(w) {
  return Math.round(w * 2) / 2;
}

function suggestWeight(weight, feedback) {
  const w = parseFloat(weight);
  if (!w || !feedback || feedback === 'good') return weight;
  const factor = feedback === 'easy' ? 1.075 : 0.925; // +7.5% or -7.5%
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

  // Initialise set tracking from previous session of same workout type
  useEffect(() => {
    if (!todayWorkout?.exercises) return;
    const prevSession = [...(progress.completedWorkouts || [])]
      .reverse()
      .find(w => w.type === todayWorkoutId && w.exercises?.length);

    const initial = {};
    todayWorkout.exercises.forEach(ex => {
      const prevEx = prevSession?.exercises?.find(e => e.id === ex.id);
      // Use last set's weight from previous session as starting suggestion
      const prevSets = prevEx?.sets || [];
      const prevWeights = prevSets.map(s => s.weight).filter(Boolean);
      const lastWeight = prevWeights.length
        ? String(prevWeights[prevWeights.length - 1])
        : '';
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

      // When feedback is given, auto-suggest next set weight
      if (field === 'feedback' && setIdx + 1 < sets.length) {
        const currentWeight = sets[setIdx].weight;
        const nextWeight = suggestWeight(currentWeight, value);
        if (nextWeight !== sets[setIdx + 1].weight) {
          sets[setIdx + 1] = {
            ...sets[setIdx + 1],
            weight: nextWeight,
            suggested: true,
          };
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
      id: ex.id,
      name: ex.name,
      sets: (sessionSets[ex.id] || []).map((s, i) => ({
        setNum: i + 1,
        weight: parseFloat(s.weight) || null,
        feedback: s.feedback,
        completed: s.completed,
      })),
    }));
    dispatch({
      type: 'LOG_WORKOUT',
      payload: { date, type: todayWorkoutId, exercises: exerciseLogs },
    });
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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
      </KeyboardAvoidingView>

      <ExerciseInfoModal exercise={infoExercise} onClose={() => setInfoExercise(null)} />
    </SafeAreaView>
  );
}

/* ─── Today Tab ─────────────────────────────────────────────────── */

function TodayTab({
  workout, dayName, expandedId, setExpandedId,
  onComplete, completedWorkouts, onInfo,
  sessionSets, onSetUpdate, getPrevRef,
}) {
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
            Use today for a 10-min walk, light stretching, or the Posture Guide routine.
          </Text>
        </View>
      </View>
    );
  }

  const totalSets = (workout.exercises || []).reduce((a, ex) => a + ex.sets, 0);
  const completedSets = Object.values(sessionSets).reduce(
    (a, sets) => a + sets.filter(s => s.completed).length, 0
  );
  const progress = totalSets > 0 ? completedSets / totalSets : 0;

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

      {/* Session progress bar */}
      {totalSets > 0 && (
        <View style={s.progressBar}>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${progress * 100}%`, backgroundColor: workout.color }]} />
          </View>
          <Text style={s.progressLabel}>{completedSets} / {totalSets} sets done</Text>
        </View>
      )}

      {workout.postureWarmup?.length > 0 && (
        <PostureBlock
          title="Posture Warm-Up"
          subtitle="5 min · do this before you start"
          icon="body" iconColor={colors.info}
          items={workout.postureWarmup}
          expandedId={expandedId} setExpandedId={setExpandedId}
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
<<<<<<< HEAD
          isToday
=======
          sets={sessionSets[ex.id] || []}
          onSetUpdate={(idx, field, val) => onSetUpdate(ex.id, idx, field, val)}
          prevRef={getPrevRef(ex.id)}
>>>>>>> 15f82f6 (feat: per-set weight tracking with smart suggestions)
        />
      ))}

      {workout.postureCooldown?.length > 0 && (
        <PostureBlock
          title="Posture Cooldown"
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
        <Text style={s.completeBtnText}>{isDone ? 'Session Logged ✓' : 'Mark as Complete'}</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ─── Exercise Card ─────────────────────────────────────────────── */

function ExerciseCard({ exercise, expanded, onToggle, accentColor, onInfo, sets, onSetUpdate, prevRef }) {
  const completedCount = sets.filter(s => s.completed).length;
  const allDone = completedCount === sets.length && sets.length > 0;

  return (
    <View style={[s.exCard, allDone && { borderColor: colors.success + '70' }]}>
      <TouchableOpacity style={s.exCardTop} onPress={onToggle} activeOpacity={0.8}>
        <View style={[s.exColorBar, { backgroundColor: allDone ? colors.success : accentColor }]} />
        <View style={{ flex: 1 }}>
          <Text style={s.exName}>{exercise.name}</Text>
          <View style={s.exMeta}>
            <Chip text={`${exercise.sets} sets`} />
            <Chip text={exercise.reps} />
            <Chip text={`Rest ${exercise.rest}`} />
            {allDone && (
              <View style={[s.chip, { backgroundColor: colors.success + '25', borderColor: colors.success + '50' }]}>
                <Text style={[s.chipText, { color: colors.success }]}>Done ✓</Text>
              </View>
            )}
          </View>
        </View>
        {prevRef && (
          <Text style={s.prevWeightBadge}>{prevRef.avg}kg</Text>
        )}
        <TouchableOpacity
          style={s.infoBtn}
          onPress={e => { e.stopPropagation?.(); onInfo(); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="information-circle-outline" size={22} color={colors.info} />
        </TouchableOpacity>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} style={{ marginLeft: 2 }} />
      </TouchableOpacity>

      {expanded && (
        <View style={s.exExpanded}>
          {/* Exercise details */}
          <View style={s.exDetails}>
            <DetailRow icon="body-outline" label="Muscles" value={exercise.muscles} />
            <DetailRow icon="construct-outline" label="Equipment" value={exercise.equipment} />
            <DetailRow icon="bulb-outline" label="Form Tip" value={exercise.tips} />
            {exercise.postureNote && (
              <View style={s.postureNote}>
                <Text style={s.postureNoteText}>{exercise.postureNote}</Text>
              </View>
            )}
          </View>

          {/* Set tracker */}
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

/* ─── Set Tracker ───────────────────────────────────────────────── */

function SetTracker({ sets, exercise, onSetUpdate, prevRef, accentColor }) {
  return (
    <View style={st.container}>
      <View style={st.header}>
        <View style={st.headerLeft}>
          <Ionicons name="barbell" size={14} color={accentColor} style={{ marginRight: 6 }} />
          <Text style={[st.headerTitle, { color: accentColor }]}>TRACK SETS</Text>
        </View>
        {prevRef && (
          <Text style={st.prevRef}>
            Last session: {prevRef.avg} kg × {prevRef.sets} sets
          </Text>
        )}
      </View>

      {/* Column labels */}
      <View style={st.colRow}>
        <Text style={[st.colLabel, { width: 42 }]}>SET</Text>
        <Text style={[st.colLabel, { flex: 1 }]}>WEIGHT</Text>
        <Text style={[st.colLabel, { width: 70 }]}>FEEL</Text>
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
      <Text style={{ fontSize: 10, color: colors.textMuted }}>{label}</Text>
    </View>
  );
}

/* ─── Set Row ───────────────────────────────────────────────────── */

function SetRow({ setNum, set, isNext, onUpdate, accentColor }) {
  return (
    <View>
      <View style={[
        sr.row,
        set.completed && sr.rowDone,
        isNext && !set.completed && sr.rowActive,
      ]}>
        {/* Set number */}
        <View style={[sr.setNumBadge, set.completed && { backgroundColor: colors.success + '30' }]}>
          <Text style={[sr.setNum, set.completed && { color: colors.success }]}>{setNum}</Text>
        </View>

        {/* Weight input */}
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

        {/* Feedback display (after done) */}
        <View style={{ width: 70, alignItems: 'center' }}>
          {set.completed && set.feedback ? (
            <View style={[sr.fbDoneChip, { backgroundColor: getFeedbackColor(set.feedback) + '25', borderColor: getFeedbackColor(set.feedback) + '60' }]}>
              <Ionicons name={getFeedbackIcon(set.feedback)} size={12} color={getFeedbackColor(set.feedback)} />
              <Text style={[sr.fbDoneText, { color: getFeedbackColor(set.feedback) }]}>
                {set.feedback.charAt(0).toUpperCase() + set.feedback.slice(1)}
              </Text>
            </View>
          ) : !set.completed ? (
            <Text style={{ fontSize: 11, color: colors.textMuted }}>—</Text>
          ) : (
            <Text style={{ fontSize: 11, color: colors.textMuted }}>rate it</Text>
          )}
        </View>

        {/* Complete toggle */}
        <TouchableOpacity
          style={sr.checkBtn}
          onPress={() => {
            if (set.completed) {
              // Uncomplete — clear feedback too
              onUpdate('completed', false);
              onUpdate('feedback', null);
            } else {
              if (!set.weight) {
                // Allow completing without weight (bodyweight)
              }
              onUpdate('completed', true);
            }
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

      {/* Feedback prompt — appears inline below the row when set just completed */}
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

      {/* Auto-suggestion hint */}
      {set.completed && set.feedback && set.feedback !== 'good' && (
        <View style={sr.suggestionHint}>
          <Ionicons
            name={set.feedback === 'easy' ? 'trending-up' : 'trending-down'}
            size={12}
            color={getFeedbackColor(set.feedback)}
            style={{ marginRight: 4 }}
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

function SectionLabel({ text, icon, color }) {
  return (
    <View style={[s.sectionLabel, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[s.sectionLabelText, { color }]}>{text}</Text>
    </View>
  );
}

<<<<<<< HEAD
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

=======
>>>>>>> 15f82f6 (feat: per-set weight tracking with smart suggestions)
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
          {trainingCount}-day personalised split. Weight tracked per set — the app learns your strength and suggests increases automatically.
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
                    + {workout.postureWarmup?.length ?? 0} posture warm-up · {workout.postureCooldown?.length ?? 0} cooldown
                  </Text>
                </>
              ) : (
                <Text style={s.weekWorkout}>Rest Day · active recovery</Text>
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
    <View style={{ paddingHorizontal: 16 }}>
      <View style={s.postureBanner}>
        <Ionicons name="warning" size={15} color={colors.warning} style={{ marginRight: 8 }} />
        <Text style={s.postureBannerText}>
          These are embedded in your workouts. This tab is your reference guide — also do critical ones at your desk.
        </Text>
      </View>
      <PostureGuideSection title="Critical — Also Do At Your Desk" exercises={critical} color={colors.secondary} expandedId={expandedId} setExpandedId={setExpandedId} />
      <PostureGuideSection title="High Priority" exercises={high} color={colors.warning} expandedId={expandedId} setExpandedId={setExpandedId} />
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
              <Text style={[s.guideRow, { color: colors.accentLight }]}>⏱ <Text style={[s.guideRowLabel, { color: colors.accentLight }]}>Frequency: </Text>{ex.frequency}</Text>
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
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.card,
    borderRadius: 12, padding: 14, marginTop: 24, borderWidth: 1, borderColor: colors.border,
  },
  restTipText: { flex: 1, fontSize: 13, color: colors.textSec, lineHeight: 20 },

  workoutHeader: {
    backgroundColor: colors.card, borderRadius: 14, padding: 16,
    marginTop: 8, marginBottom: 10, flexDirection: 'row',
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

  progressBar: {
    marginBottom: 12,
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressTrack: {
    height: 6, backgroundColor: colors.surface, borderRadius: 3, overflow: 'hidden', marginBottom: 6,
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabel: { fontSize: 11, color: colors.textSec, textAlign: 'right' },

  postureBlock: { borderRadius: 14, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
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
  exExpanded: { borderTopWidth: 1, borderTopColor: colors.border },
  infoBtn: { padding: 2 },
  exColorBar: { width: 3, height: 40, borderRadius: 2 },
  exName: { fontSize: 14, color: colors.text, fontWeight: '600', marginBottom: 6 },
  exMeta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { backgroundColor: colors.surface, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: 'transparent' },
  chipText: { fontSize: 10, color: colors.textSec, fontWeight: '500' },
  prevWeightBadge: {
    fontSize: 11, color: colors.accentLight, fontWeight: '700',
    backgroundColor: colors.accentDim + '40', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  exDetails: {
    paddingHorizontal: 14, paddingBottom: 12, gap: 8, paddingTop: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
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
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.card,
    borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border, gap: 12,
  },
  weekDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  weekRowTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  weekDay: { fontSize: 13, color: colors.text, fontWeight: '700' },
  weekWorkout: { fontSize: 12, color: colors.textSec, marginTop: 2 },
  weekPosture: { fontSize: 11, color: colors.accentLight, marginTop: 3, fontStyle: 'italic' },
  todayBadge: { backgroundColor: colors.accentDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  todayBadgeText: { fontSize: 10, color: colors.accentLight, fontWeight: '700' },

  postureBanner: {
    flexDirection: 'row', backgroundColor: colors.warning + '18', borderRadius: 12,
    padding: 14, marginTop: 8, marginBottom: 16, borderWidth: 1,
    borderColor: colors.warning + '40', alignItems: 'flex-start',
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

/* ─── Set Tracker Styles ─────────────────────────────────────────── */

const st = StyleSheet.create({
  container: {
    margin: 12,
    backgroundColor: colors.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  prevRef: { fontSize: 10, color: colors.textMuted, fontStyle: 'italic' },
  colRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface + '80',
  },
  colLabel: { fontSize: 9, color: colors.textMuted, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  legend: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 2,
    backgroundColor: colors.surface + '50',
  },
});

/* ─── Set Row Styles ─────────────────────────────────────────────── */

const sr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '80',
    gap: 4,
  },
  rowActive: { backgroundColor: colors.accentDim + '15' },
  rowDone: { backgroundColor: colors.success + '08' },

  setNumBadge: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  setNum: { fontSize: 13, color: colors.textSec, fontWeight: '700' },

  weightRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  suggestedLabel: { fontSize: 9, color: colors.accentLight, fontWeight: '600', letterSpacing: 0.4, marginBottom: 2 },
  weightInput: {
    width: 60, height: 36,
    backgroundColor: colors.card,
    borderRadius: 8, borderWidth: 1, borderColor: colors.border,
    textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.text,
  },
  weightInputDone: {
    backgroundColor: colors.success + '15',
    borderColor: colors.success + '40',
    color: colors.success,
  },
  kgLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },

  fbDoneChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3,
    borderWidth: 1,
  },
  fbDoneText: { fontSize: 10, fontWeight: '700' },

  checkBtn: { width: 36, alignItems: 'center', justifyContent: 'center' },

  feedbackPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '80',
    gap: 8,
  },
  feedbackPromptLabel: { fontSize: 11, color: colors.textSec, fontWeight: '600', marginRight: 4 },
  fbBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1,
  },
  fbBtnText: { fontSize: 12, fontWeight: '700' },

  suggestionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 56,
    paddingVertical: 5,
    backgroundColor: colors.surface + '60',
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '80',
  },
  suggestionHintText: { fontSize: 10, fontWeight: '600' },
});

/* ─── Modal Styles ───────────────────────────────────────────────── */

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
