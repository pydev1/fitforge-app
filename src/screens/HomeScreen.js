import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { MOTIVATIONAL_QUOTES } from '../data/workoutData';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { toLocalDateKey, fromLocalDateKey, daysBetweenLocalDateKeys } from '../utils/date';
import {
  RESTART_GAP_DAYS, getProgramWeek, getProgressionModifier,
  applyProgression, isBandExercise, getNextSessionWeight,
} from '../utils/progression';
import { isTwoDumbbell, getDumbbellLadder, snapToLoad } from '../utils/equipment';
import { makeWorkoutExercise } from '../utils/workoutGenerator';
import { getWorkoutSuggestions } from '../services/anthropicService';

function getLastActivityDate(progress) {
  const dates = [
    ...(progress.completedWorkouts || []).map(w => w.date),
    ...(progress.setLogs || []).map(l => l.date),
  ].filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1] : null;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getDailyQuote() {
  return MOTIVATIONAL_QUOTES[new Date().getDay() % MOTIVATIONAL_QUOTES.length];
}

function getTodayWorkout(generatedPlan) {
  if (!generatedPlan) return null;
  const dayName = DAYS[new Date().getDay()];
  const workoutId = generatedPlan.schedule?.[dayName];
  if (!workoutId) return { isRest: true, dayName };
  const workout = generatedPlan.workouts?.[workoutId];
  return workout ? { ...workout, dayName } : { isRest: true, dayName };
}

function getNextWorkout(generatedPlan) {
  if (!generatedPlan) return null;
  const today = new Date();
  for (let i = 1; i <= 7; i++) {
    const next = new Date(today);
    next.setDate(today.getDate() + i);
    const dayName = DAYS[next.getDay()];
    const workoutId = generatedPlan.schedule?.[dayName];
    if (workoutId) {
      const workout = generatedPlan.workouts?.[workoutId];
      if (workout) return { workout, daysUntil: i, dayName };
    }
  }
  return null;
}

// "tomorrow" only when it's literally the next day; otherwise name the day so a
// rest day in between never gets mislabeled (e.g. "on Thursday", "next Monday").
function whenLabel(daysUntil, dayName) {
  if (daysUntil === 1) return 'tomorrow';
  if (daysUntil >= 7) return `next ${dayName}`;
  return `on ${dayName}`;
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

function getWeekStats(generatedPlan, completedWorkouts) {
  const today = new Date();
  const sinceMonday = (today.getDay() + 6) % 7;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - sinceMonday);
  weekStart.setHours(0, 0, 0, 0);
  const doneThisWeek = completedWorkouts.filter(w => {
    const d = fromLocalDateKey(w.date);
    return d >= weekStart;
  }).length;
  const scheduled = generatedPlan
    ? Object.values(generatedPlan.schedule).filter(Boolean).length
    : 0;
  return { done: doneThisWeek, total: scheduled };
}

function getWeekActivity(completedWorkouts) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sinceMonday = (today.getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(today);
    day.setDate(today.getDate() - sinceMonday + i);
    const isToday = i === sinceMonday;
    const isFuture = day > today;
    const active = completedWorkouts.some(w =>
      fromLocalDateKey(w.date).getTime() === day.getTime()
    );
    return { dayLetter: DAY_LETTERS[day.getDay()], active, isToday, isFuture };
  });
}

function getContextCard(progress, generatedPlan, userProfile, todayWorkout, todayDone) {
  const today = toLocalDateKey();
  const completedWorkouts = progress.completedWorkouts || [];
  const name = userProfile.name || 'Athlete';

  if (todayDone && todayWorkout && !todayWorkout.isRest) {
    return {
      type: 'dynamic',
      icon: 'nutrition-outline',
      text: `Recovery mode: ${todayWorkout.name} done. Protein within 45 min matters.`,
    };
  }

  if (!todayWorkout || todayWorkout.isRest) {
    return {
      type: 'dynamic',
      icon: 'bed-outline',
      text: 'Recovery day: light walking, 2–3 litres of water, and 7–8 hours of sleep. That\'s the work today.',
    };
  }

  const streak = getStreak(completedWorkouts);
  if (streak >= 3) {
    return {
      type: 'dynamic',
      icon: 'flame',
      text: `${streak} days straight, ${name}. The habit is forming.`,
    };
  }

  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 1 || dayOfWeek === 2) {
    const offset = dayOfWeek === 1 ? 7 : 8;
    const lastMonday = new Date();
    lastMonday.setDate(lastMonday.getDate() - offset);
    lastMonday.setHours(0, 0, 0, 0);
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    lastSunday.setHours(23, 59, 59, 999);
    const lastWeekCount = completedWorkouts.filter(w => {
      const d = fromLocalDateKey(w.date);
      return d >= lastMonday && d <= lastSunday;
    }).length;
    const scheduled = generatedPlan
      ? Object.values(generatedPlan.schedule).filter(Boolean).length
      : 0;
    if (lastWeekCount > 0 && scheduled > 0) {
      return {
        type: 'dynamic',
        icon: 'calendar-outline',
        text: `New week. You went ${lastWeekCount} for ${scheduled} last week — let's beat that.`,
      };
    }
  }

  return { type: 'quote', ...getDailyQuote() };
}

export default function HomeScreen({ navigation }) {
  const { state, dispatch } = useApp();
  const { userProfile, progress, generatedPlan } = state;

  // Force re-render every time this tab gains focus so date-sensitive
  // values (today, todayWorkout, streak) are never stale after midnight.
  const [, setFocusTick] = useState(0);
  useFocusEffect(useCallback(() => { setFocusTick(t => t + 1); }, []));

  const today = toLocalDateKey();
  const todayWorkout = getTodayWorkout(generatedPlan);
  const todayDone = progress.completedWorkouts.some(w => w.date === today);
  const nextWorkout = (todayDone || todayWorkout?.isRest) ? getNextWorkout(generatedPlan) : null;
  const nextSessionWorkout = getNextWorkout(generatedPlan);
  const programWeek = getProgramWeek(progress.completedWorkouts, state.restart?.date);
  const lastCompletedWorkout = progress.completedWorkouts.length > 0
    ? [...progress.completedWorkouts].sort((a, b) => b.date.localeCompare(a.date))[0]
    : null;
  const lastCompletedName = lastCompletedWorkout
    ? (generatedPlan?.workouts?.[lastCompletedWorkout.type]?.name || lastCompletedWorkout.type)
    : null;

  // Derive first/last by DATE (never trust array index — older data may be unsorted)
  const weightByDate = [...progress.weight].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const waistByDate = [...(progress.waist || [])].sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const currentWeight = weightByDate[weightByDate.length - 1]?.value ?? userProfile.weight;
  const firstWeight = weightByDate[0];
  const weightDelta = weightByDate.length >= 2 && firstWeight && currentWeight != null
    ? (currentWeight - firstWeight.value).toFixed(1)
    : null;
  const showWeightDelta = weightDelta !== null && parseFloat(weightDelta) !== 0;

  const totalWorkouts = progress.completedWorkouts.length;
  const streak = getStreak(progress.completedWorkouts);

  const currentWaist = waistByDate[waistByDate.length - 1]?.value ?? userProfile.waist;
  const startWaist = waistByDate[0]?.value ?? userProfile.waist;
  const targetWaist = 80;

  const waistProgress = startWaist && currentWaist && startWaist > targetWaist
    ? Math.min(1, Math.max(0, (startWaist - currentWaist) / (startWaist - targetWaist)))
    : 0;

  const { done: weekDone, total: weekTotal } = getWeekStats(generatedPlan, progress.completedWorkouts);
  const weekLeft = Math.max(0, weekTotal - weekDone);
  const weekActivity = getWeekActivity(progress.completedWorkouts);

  const contextLine = todayWorkout?.isRest
    ? `Rest day — recover well, ${userProfile.name || 'Athlete'}.`
    : todayWorkout
    ? `${todayWorkout.name} today — ${todayWorkout.focus}.`
    : 'Let\'s get moving today.';

  const contextCard = getContextCard(progress, generatedPlan, userProfile, todayWorkout, todayDone);

  // Detraining re-entry: after a real break, offer a guided restart. Hidden once
  // a restart is recorded (its date is newer than the last session) or snoozed today.
  const restart = state.restart;
  const lastActivity = getLastActivityDate(progress);
  const daysSinceLast = lastActivity ? daysBetweenLocalDateKeys(lastActivity, today) : null;
  const showWelcomeBack =
    daysSinceLast != null && daysSinceLast >= RESTART_GAP_DAYS &&
    (!restart || restart.date <= lastActivity) &&
    state.restartSnoozedOn !== today;
  const rampActive = !!restart && (restart.factor ?? 1) < 1.0 && !(progress.completedWorkouts || []).some(w => w.date >= restart.date);
  const programComplete = programWeek >= 13 && !showWelcomeBack;

  function handleNewCycle() {
    dispatch({ type: 'RESTART_PROGRAM', payload: { date: today, factor: 1.0, mode: 'cycle', weeksOff: 0 } });
  }
  const weeksSinceLast = daysSinceLast != null ? Math.round(daysSinceLast / 7) : 0;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>{getGreeting()}</Text>
            <Text style={s.name}>{userProfile.name || 'Athlete'}</Text>
            <Text style={s.contextLine}>{contextLine}</Text>
          </View>
          <TouchableOpacity style={s.settingsBtn} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-sharp" size={20} color={colors.textSec} />
          </TouchableOpacity>
        </View>

        {/* ── Welcome-back restart prompt (after a real break) ── */}
        {showWelcomeBack && (
          <TouchableOpacity
            style={s.restartCard}
            onPress={() => navigation.navigate('Restart')}
            activeOpacity={0.9}
          >
            <View style={s.restartIcon}>
              <Ionicons name="refresh" size={20} color={colors.onAccent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.restartTitle}>Welcome back{weeksSinceLast >= 2 ? ` — ${weeksSinceLast} weeks off` : ''}</Text>
              <Text style={s.restartSub}>Restart smart: ease your loads back without losing any progress.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.accentLight} />
          </TouchableOpacity>
        )}

        {/* ── Easing-back indicator (restart applied, first block not yet trained) ── */}
        {!showWelcomeBack && rampActive && (
          <View style={s.rampChip}>
            <Ionicons name="refresh" size={13} color={colors.accentLight} />
            <Text style={s.rampChipText}>
              Easing back in · loads set ~{Math.round((1 - (restart.factor ?? 1)) * 100)}% lighter
            </Text>
          </View>
        )}

        {/* ── Programme complete ── */}
        {programComplete && (
          <View style={s.completeCard}>
            <Ionicons name="trophy" size={22} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={s.completeTitle}>12 weeks complete</Text>
              <Text style={s.completeSub}>Your weights carry over — start cycle 2 whenever you're ready.</Text>
            </View>
            <TouchableOpacity style={s.completeBtn} onPress={handleNewCycle} activeOpacity={0.85}>
              <Text style={s.completeBtnText}>Next cycle</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Hero stats card ── */}
        <View style={s.heroCard}>
          <View style={s.heroTopRow}>
            <View>
              <Text style={s.heroLabel}>Waist</Text>
              <View style={s.heroValueRow}>
                <Text style={s.heroNumber}>{currentWaist ?? '—'}</Text>
                <Text style={s.heroUnit}>cm</Text>
              </View>
              <Text style={s.heroGoal}>goal is {targetWaist} cm</Text>
            </View>
            <View style={s.weekBlock}>
              <Text style={s.weekLabel}>This week</Text>
              <Text style={s.weekCount}>
                {todayWorkout?.isRest
                  ? (weekLeft > 0 ? `${weekLeft} remaining this week` : 'Week complete · rest today')
                  : (weekLeft > 0 ? `${weekDone} done, ${weekLeft} to go` : `${weekDone} done — nailed it`)
                }
              </Text>
              <View style={s.weekDots}>
                {weekActivity.map((d, i) => (
                  <View key={i} style={[
                    s.weekSquare,
                    d.active && s.weekSquareActive,
                    d.isToday && !d.active && s.weekSquareToday,
                    d.isFuture && s.weekSquareFuture,
                  ]}>
                    <Text style={[
                      s.weekSquareLabel,
                      d.active && s.weekSquareLabelActive,
                    ]}>{d.dayLetter}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Progress bar — fix 2: blue fill, empty dot at start */}
          <View style={s.journeyWrap}>
            <View style={s.journeyRow}>
              <Text style={s.journeyLabel}>Start {startWaist ?? '—'} cm</Text>
              <Text style={s.journeyLabel}>Target {targetWaist} cm</Text>
            </View>
            <View style={s.journeyTrack}>
              <View style={[s.journeyFill, { width: `${waistProgress * 100}%` }]} />
              {waistProgress === 0 && (
                <View style={[s.journeyDot, { left: 0, marginLeft: 0 }]} />
              )}
              {waistProgress > 0 && waistProgress < 1 && (
                <View style={[s.journeyDot, { left: `${waistProgress * 100}%` }]} />
              )}
            </View>
          </View>

          <View style={s.heroDivider} />

          {/* Secondary stats — fix 3: Streak replaces Change */}
          <View style={s.heroSecRow}>
            <HeroStat
              label="Weight"
              value={currentWeight ?? '—'}
              unit="kg"
              sub={showWeightDelta ? `${parseFloat(weightDelta) > 0 ? '+' : ''}${weightDelta} kg` : null}
            />
            <View style={s.heroStatDivider} />
            <HeroStat
              label="Streak"
              value={`${streak}`}
              unit={streak === 1 ? 'day' : 'days'}
            />
            <View style={s.heroStatDivider} />
            <HeroStat label="Sessions" value={`${totalWorkouts}`} unit="" />
          </View>
        </View>

        {/* ── Today's workout CTA — fix 1: completion state ── */}
        <View style={[s.ctaCard, todayDone && !todayWorkout?.isRest && s.ctaCardDone, todayWorkout?.isRest && s.ctaCardRest]}>
          <Text style={s.ctaEyebrow}>
            {(!todayWorkout || todayWorkout.isRest)
              ? 'Today · Rest'
              : todayDone
              ? 'Today'
              : 'Up next for you today'}
          </Text>
          {!todayWorkout || todayWorkout.isRest ? (
            <View style={s.ctaRestRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.ctaTitle}>Rest day 😴</Text>
                <Text style={s.ctaSub}>Recover well — muscles grow when you rest</Text>
                {lastCompletedName && (
                  <View style={s.ctaRestInfo}>
                    <Text style={s.ctaRestInfoLabel}>Last session  </Text>
                    <Text style={s.ctaRestInfoText}>{lastCompletedName}</Text>
                  </View>
                )}
                {nextWorkout && (
                  <View style={s.ctaRestInfo}>
                    <Text style={s.ctaRestInfoLabel}>Next up  </Text>
                    <Text style={s.ctaRestInfoText}>{nextWorkout.workout.name} · {whenLabel(nextWorkout.daysUntil, nextWorkout.dayName)}</Text>
                  </View>
                )}
              </View>
              <Ionicons name="moon-outline" size={36} color={colors.textMuted} />
            </View>
          ) : todayDone ? (
            <View style={s.ctaDoneRow}>
              <Ionicons name="checkmark-circle" size={28} color={colors.success} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.ctaDoneTitle}>✓ {todayWorkout.name} — done today</Text>
                {nextWorkout && (
                  <Text style={s.ctaDoneNext}>Next up: {nextWorkout.workout.name} {whenLabel(nextWorkout.daysUntil, nextWorkout.dayName)}</Text>
                )}
              </View>
            </View>
          ) : (
            <>
              <Text style={s.ctaTitle}>{todayWorkout.name}</Text>
              <Text style={s.ctaSub}>{todayWorkout.focus}</Text>
              <View style={s.ctaMeta}>
                <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                <Text style={s.ctaMetaTxt}>{todayWorkout.duration}</Text>
                <Text style={s.ctaMetaDot}>·</Text>
                <Text style={s.ctaMetaTxt}>{todayWorkout.exercises?.length ?? 0} exercises</Text>
              </View>
              <TouchableOpacity
                style={s.beginBtn}
                onPress={() => navigation.navigate('Workouts', { tab: 'today' })}
                activeOpacity={0.85}
              >
                <Text style={[s.beginBtnText, { color: colors.onAccent }]}>Begin</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.onAccent} />
              </TouchableOpacity>
            </>
          )}
          {todayWorkout?.isRest && (
            <TouchableOpacity
              style={s.beginBtnRest}
              onPress={() => navigation.navigate('Workouts', { tab: 'posture' })}
              activeOpacity={0.85}
            >
              <Text style={s.beginBtnText}>View posture routine</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Next session prep card ── */}
        {nextSessionWorkout && (
          <NextSessionPrepCard
            nextWorkout={nextSessionWorkout}
            setLogs={progress.setLogs || []}
            restart={state.restart}
            completedWorkouts={progress.completedWorkouts}
            swaps={state.swaps}
            primaryGoal={userProfile.goals?.[0] || 'general_fitness'}
          />
        )}

        {/* ── Plan chip ── */}
        {generatedPlan && (
          <View style={s.planChip}>
            <View style={s.planPip} />
            <Text style={s.planChipText}>
              {Object.values(generatedPlan.schedule).filter(Boolean).length}-day personalised plan active
            </Text>
          </View>
        )}

        {/* ── Dynamic context card — fix 8 ── */}
        <View style={s.quoteCard}>
          <Ionicons
            name={contextCard.type === 'dynamic' ? contextCard.icon : 'flame'}
            size={18}
            color={contextCard.type === 'dynamic' ? colors.info : colors.warning}
            style={{ marginBottom: 8 }}
          />
          {contextCard.type === 'dynamic' ? (
            <Text style={s.quoteText}>{contextCard.text}</Text>
          ) : (
            <>
              <Text style={s.quoteText}>"{contextCard.quote}"</Text>
              <Text style={s.quoteAuthor}>— {contextCard.author}</Text>
            </>
          )}
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function NextSessionPrepCard({ nextWorkout, setLogs, restart, completedWorkouts, swaps, primaryGoal }) {
  const { state } = useApp();
  const today = toLocalDateKey();
  const programWeek = getProgramWeek(completedWorkouts, restart?.date);
  const mod = getProgressionModifier(programWeek);
  const { workout, daysUntil, dayName } = nextWorkout;

  // "Ramp" mirrors WorkoutScreen's gate: during a post-restart easing block,
  // deterministic eased loads are enforced and the AI is skipped entirely.
  const rampActive = !!restart && (restart.factor ?? 1) < 1.0 && !completedWorkouts.some(w => w.date >= restart.date);

  // Progressed + swapped exercises — same objects WorkoutScreen will render
  // tomorrow (correct phase-adjusted rep target, correct swapped identity),
  // not the raw plan. Built once and reused for both the AI call and the rows
  // below so the two can never drift apart from each other.
  const progressedExercises = (workout.exercises || []).map(orig => {
    const altId = swaps?.[orig.id];
    const base = altId ? (makeWorkoutExercise(altId, primaryGoal) || orig) : orig;
    return applyProgression(base, mod);
  });

  // Fetch the SAME AI suggestions WorkoutScreen will use tomorrow, so this
  // preview doesn't quietly diverge from what actually shows up on the day —
  // the whole point of "prep the night before" breaks if the two disagree.
  const [aiSuggestions, setAiSuggestions] = React.useState({});
  const [aiError, setAiError] = React.useState(null);
  React.useEffect(() => {
    if (!progressedExercises.length || !state.apiKey || mod.isDeload || rampActive) {
      setAiSuggestions({});
      setAiError(null);
      return;
    }
    let cancelled = false;
    setAiError(null);
    getWorkoutSuggestions(progressedExercises, setLogs, state.userProfile, state.apiKey)
      .then(res => {
        if (cancelled) return;
        if (res?.suggestions) {
          const map = {};
          res.suggestions.forEach(sug => { if (sug.weight != null) map[sug.id] = sug; });
          setAiSuggestions(map);
        } else if (res?.error) {
          setAiError(res.message || 'AI request failed');
        }
      })
      .catch(e => { if (!cancelled) setAiError(e?.message || 'AI request failed'); });
    return () => { cancelled = true; };
  }, [workout?.id, state.apiKey, mod.isDeload, rampActive]);

  const rows = progressedExercises.map(ex => {
    const isBand = isBandExercise(ex.equipment);
    const twoDb = isTwoDumbbell(ex);
    const ladder = getDumbbellLadder(ex);
    const hasDumbbell = !!ladder;
    const ruleWeight = isBand ? null : getNextSessionWeight(setLogs, ex, today, mod.isDeload, restart);

    // Same exercise-level restart-easing check WorkoutScreen makes (has this
    // specific exercise been retrained since the restart date yet?), so the
    // AI-vs-rule precedence matches exactly, not just the deload/ramp gate.
    const lastLog = setLogs
      .filter(l => l.exerciseId === ex.id)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    const restartActiveForEx = !!restart && !!lastLog && lastLog.date < restart.date;

    const aiWeight = aiSuggestions[ex.id]?.weight;
    const rawWeight = isBand ? null
      : (mod.isDeload || restartActiveForEx) ? ruleWeight
      : (aiWeight != null ? aiWeight : ruleWeight);
    const weight = rawWeight != null && ladder ? snapToLoad(rawWeight, ladder) : rawWeight;

    let weightLabel;
    if (isBand)          weightLabel = 'Band';
    else if (weight === 0) weightLabel = 'Bodyweight';
    else if (weight == null) weightLabel = 'New';
    else                 weightLabel = `${weight} ${twoDb ? 'kg/db' : 'kg'}`;

    return { id: ex.id, name: ex.name, sets: ex.sets, reps: ex.reps, weight, weightLabel, hasDumbbell, isNew: weight == null && !isBand, isAi: aiWeight != null && !mod.isDeload && !restartActiveForEx };
  });

  // Deduplicated, sorted dumbbell weights for the "set out" summary
  const dbWeights = [...new Set(
    rows.filter(r => r.hasDumbbell && r.weight > 0).map(r => r.weight)
  )].sort((a, b) => a - b);

  const whenStr = daysUntil === 1 ? 'Tomorrow' : daysUntil >= 7 ? `Next ${dayName}` : dayName;
  const usesAi = rows.some(r => r.isAi);

  return (
    <View style={pc.card}>
      <View style={pc.header}>
        <View style={{ flex: 1 }}>
          <Text style={pc.eyebrow}>PREP · {whenStr.toUpperCase()}</Text>
          <Text style={pc.title}>{workout.name}</Text>
          <Text style={pc.focus}>{workout.focus}</Text>
        </View>
        <Ionicons name="barbell-outline" size={22} color={colors.accent} />
      </View>

      {mod.isDeload && (
        <View style={pc.deloadBanner}>
          <Ionicons name="leaf" size={13} color={colors.success} />
          <Text style={pc.deloadText}>
            <Text style={pc.deloadTextStrong}>Deload week — recover.</Text>
            {' '}Weights below are eased ~40%, not your working weights.
          </Text>
        </View>
      )}

      {!mod.isDeload && usesAi && (
        <View style={pc.aiNote}>
          <Text style={pc.aiNoteText}>✦ AI-adjusted — matches what tomorrow's workout screen will show</Text>
        </View>
      )}

      {!mod.isDeload && !usesAi && aiError && (
        <View style={pc.aiNote}>
          <Text style={[pc.aiNoteText, { color: colors.secondary }]}>
            ⚠ AI coach unavailable — showing calculated weights instead. ({aiError})
          </Text>
        </View>
      )}

      <View style={pc.divider} />

      {rows.map(row => (
        <View key={row.id} style={pc.row}>
          <Text style={pc.exName} numberOfLines={1}>{row.name}</Text>
          <Text style={pc.meta}>{row.sets}×{row.reps}</Text>
          <Text style={[pc.weight, row.isNew && pc.weightNew]}>{row.weightLabel}</Text>
        </View>
      ))}

      {dbWeights.length > 0 && (
        <View style={pc.setOut}>
          <Ionicons name="cube-outline" size={12} color={colors.accent} />
          <Text style={pc.setOutLabel}>Set out: </Text>
          <Text style={pc.setOutWeights}>{dbWeights.join('  ·  ')} kg</Text>
        </View>
      )}
    </View>
  );
}

function HeroStat({ label, value, unit, sub }) {
  return (
    <View style={hs.wrap}>
      <Text style={hs.value}>
        {value}
        {unit ? <Text style={hs.unit}> {unit}</Text> : null}
      </Text>
      {sub ? <Text style={hs.sub}>{sub}</Text> : null}
      <Text style={hs.label}>{label}</Text>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  greeting: {
    fontFamily: fonts.bodyItalic,
    fontSize: 13,
    color: colors.textSec,
  },
  name: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: colors.text,
    letterSpacing: 1,
    marginTop: 1,
  },
  contextLine: {
    fontFamily: fonts.bodyItalic,
    fontSize: 13,
    color: colors.textSec,
    marginTop: 2,
  },
  settingsBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
    marginTop: 2,
  },

  restartCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: colors.accentDim,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.accent + '66',
  },
  restartIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  restartTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.accentLight,
  },
  restartSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSec,
    lineHeight: 17,
    marginTop: 2,
  },
  rampChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 20,
    marginBottom: 14,
    alignSelf: 'flex-start',
    backgroundColor: colors.accentDim,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.accent + '40',
  },
  rampChipText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.accentLight,
  },

  completeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: colors.heroCardDeep,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.warning + '55',
  },
  completeTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.text,
    marginBottom: 2,
  },
  completeSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSec,
    lineHeight: 16,
  },
  completeBtn: {
    backgroundColor: colors.warning,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  completeBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.onAccent,
  },

  heroCard: {
    marginHorizontal: 20,
    backgroundColor: colors.heroCard,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.heroCardBorder,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  // Fix 7: removed textTransform: 'uppercase'
  heroLabel: {
    fontFamily: fonts.dataMedium,
    fontSize: 12,
    color: colors.heroTextMuted,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  heroValueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  heroNumber: {
    fontFamily: fonts.display,
    fontSize: 56,
    color: colors.heroText,
    lineHeight: 58,
  },
  heroUnit: {
    fontFamily: fonts.dataMedium,
    fontSize: 18,
    color: colors.heroTextSec,
    marginBottom: 8,
  },
  heroGoal: {
    fontFamily: fonts.bodyItalic,
    fontSize: 12,
    color: colors.heroTextMuted,
    marginTop: 2,
  },

  weekBlock: { alignItems: 'flex-end' },
  weekLabel: {
    fontFamily: fonts.dataMedium,
    fontSize: 11,
    color: colors.heroTextMuted,
    marginBottom: 3,
  },
  weekCount: {
    fontFamily: fonts.bodyItalic,
    fontSize: 12,
    color: colors.heroTextSec,
    marginBottom: 8,
  },
  weekDots: { flexDirection: 'row', gap: 5 },
  weekSquare: {
    width: 24, height: 24, borderRadius: 7,
    backgroundColor: colors.heroCardDeep,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  weekSquareActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  weekSquareToday: {
    borderColor: colors.heroTextSec,
    borderWidth: 1.5,
  },
  weekSquareFuture: { opacity: 0.4 },
  weekSquareLabel: {
    fontFamily: fonts.dataSemiBold,
    fontSize: 8,
    color: colors.heroTextMuted,
  },
  weekSquareLabelActive: { color: colors.onAccent },

  // Fix 2: blue fill, dark unfilled track
  journeyWrap: { marginBottom: 14 },
  journeyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  journeyLabel: {
    fontFamily: fonts.dataMedium,
    fontSize: 10,
    color: colors.heroTextMuted,
  },
  journeyTrack: {
    height: 5,
    backgroundColor: colors.heroCardDeep,
    borderRadius: 3,
    overflow: 'visible',
    position: 'relative',
  },
  journeyFill: {
    height: '100%',
    backgroundColor: colors.info,
    borderRadius: 3,
  },
  journeyDot: {
    position: 'absolute',
    top: -4,
    width: 13, height: 13,
    borderRadius: 7,
    backgroundColor: colors.info,
    borderWidth: 2,
    borderColor: colors.heroCard,
    marginLeft: -6,
  },

  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
  },
  heroSecRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStatDivider: {
    width: 1, height: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginHorizontal: 2,
  },

  ctaCard: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: colors.ctaCard,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ctaCardDone: {
    borderColor: colors.success + '40',
    backgroundColor: colors.ctaCard,
  },
  ctaCardRest: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  ctaEyebrow: {
    fontFamily: fonts.dataMedium,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
  },
  ctaRestRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  ctaRestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  ctaRestInfoLabel: {
    fontFamily: fonts.dataMedium,
    fontSize: 11,
    color: colors.textMuted,
  },
  ctaRestInfoText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textSec,
    flex: 1,
  },
  ctaTitle: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.text,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  ctaSub: {
    fontFamily: fonts.bodyItalic,
    fontSize: 13,
    color: colors.textSec,
    marginBottom: 10,
  },
  ctaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 14,
  },
  ctaMetaTxt: {
    fontFamily: fonts.dataMedium,
    fontSize: 12,
    color: colors.textMuted,
  },
  ctaMetaDot: {
    fontFamily: fonts.dataMedium,
    fontSize: 12,
    color: colors.textMuted,
  },
  beginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  beginBtnRest: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    marginTop: 10,
  },
  beginBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: '#fff',
  },
  ctaDoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  ctaDoneTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.success,
    marginBottom: 4,
  },
  ctaDoneNext: {
    fontFamily: fonts.bodyItalic,
    fontSize: 12,
    color: colors.textSec,
  },

  planChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    gap: 8,
  },
  planPip: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.accent,
  },
  planChipText: {
    fontFamily: fonts.bodyItalic,
    fontSize: 12,
    color: colors.textMuted,
  },

  quoteCard: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quoteText: {
    fontFamily: fonts.bodyItalic,
    fontSize: 14,
    color: colors.textSec,
    textAlign: 'center',
    lineHeight: 22,
  },
  quoteAuthor: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
  },
});

const hs = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center' },
  value: {
    fontFamily: fonts.dataSemiBold,
    fontSize: 22,
    color: colors.heroText,
    letterSpacing: 0.5,
  },
  unit: {
    fontFamily: fonts.dataMedium,
    fontSize: 13,
    color: colors.heroTextSec,
  },
  sub: {
    fontFamily: fonts.data,
    fontSize: 9,
    color: colors.heroTextMuted,
    marginTop: 1,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    color: colors.heroTextMuted,
    marginTop: 2,
  },
});

const pc = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: colors.heroCardDeep,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.heroCardBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  eyebrow: {
    fontFamily: fonts.dataMedium,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.heroText,
    letterSpacing: 0.5,
  },
  focus: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 10,
  },
  deloadBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: colors.success + '15',
    borderRadius: 10,
    padding: 8,
    marginBottom: 10,
  },
  deloadText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSec,
    lineHeight: 15,
  },
  deloadTextStrong: {
    fontFamily: fonts.bodySemiBold,
    color: colors.success,
  },
  aiNote: {
    marginBottom: 10,
  },
  aiNoteText: {
    fontFamily: fonts.bodyItalic,
    fontSize: 10,
    color: colors.accentLight,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  exName: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.text,
  },
  meta: {
    fontFamily: fonts.data,
    fontSize: 12,
    color: colors.textMuted,
    marginRight: 10,
  },
  weight: {
    fontFamily: fonts.dataSemiBold,
    fontSize: 13,
    color: colors.accentLight,
    minWidth: 60,
    textAlign: 'right',
  },
  weightNew: {
    color: colors.textMuted,
    fontFamily: fonts.bodyItalic,
  },
  setOut: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  setOutLabel: {
    fontFamily: fonts.dataMedium,
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 5,
  },
  setOutWeights: {
    fontFamily: fonts.dataSemiBold,
    fontSize: 11,
    color: colors.accent,
  },
});
