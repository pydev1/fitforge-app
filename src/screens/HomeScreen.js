import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { MOTIVATIONAL_QUOTES } from '../data/workoutData';
import { colors } from '../theme/colors';
import { themedStyles } from '../theme/themed';
import { fonts } from '../theme/fonts';
import { toLocalDateKey, fromLocalDateKey, daysBetweenLocalDateKeys } from '../utils/date';
import {
  RESTART_GAP_DAYS, getWeekContext,
  applyProgression, isBandExercise, getNextSessionWeight,
} from '../utils/progression';
import { isTwoDumbbell, getDumbbellLadder, snapToLoad } from '../utils/equipment';
import { makeWorkoutExercise, getPlanForDate } from '../utils/workoutGenerator';
import {
  getActiveTrip, getCurrentOrUpcomingTrip, getActiveDeload, deloadEndDate,
  getDeloadSuggestion, describeDeloadSuggestion, pausedDaysBetween, addDays,
} from '../utils/recovery';
import { getWorkoutSuggestions } from '../services/anthropicService';
import ActivityRings from '../components/ActivityRings';

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

// Looks up each upcoming date's own plan, so the travel plan only applies on
// dates inside a trip and the normal plan picks up again the day you're back.
function getNextWorkout(state) {
  const today = new Date();
  for (let i = 1; i <= 7; i++) {
    const next = new Date(today);
    next.setDate(today.getDate() + i);
    const dateKey = toLocalDateKey(next);
    const plan = getPlanForDate(state, dateKey);
    if (!plan) continue;
    const dayName = DAYS[next.getDay()];
    const workoutId = plan.schedule?.[dayName];
    if (workoutId) {
      const workout = plan.workouts?.[workoutId];
      if (workout) return { workout, daysUntil: i, dayName, dateKey };
    }
  }
  return null;
}

function prettyDate(dateKey) {
  return fromLocalDateKey(dateKey).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
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
  const { userProfile, progress } = state;

  // Force re-render every time this tab gains focus so date-sensitive
  // values (today, todayWorkout, streak) are never stale after midnight.
  const [, setFocusTick] = useState(0);
  useFocusEffect(useCallback(() => { setFocusTick(t => t + 1); }, []));

  const today = toLocalDateKey();
  // During a trip this is the short travel plan; otherwise the normal plan.
  const generatedPlan = getPlanForDate(state, today);
  const todayWorkout = getTodayWorkout(generatedPlan);
  const todayDone = progress.completedWorkouts.some(w => w.date === today);
  const nextWorkout = (todayDone || todayWorkout?.isRest) ? getNextWorkout(state) : null;
  const nextSessionWorkout = getNextWorkout(state);
  const { programWeek, loadEase } = getWeekContext(state, today);
  const lastCompletedWorkout = progress.completedWorkouts.length > 0
    ? [...progress.completedWorkouts].sort((a, b) => b.date.localeCompare(a.date))[0]
    : null;
  const lastCompletedName = lastCompletedWorkout
    ? (state.generatedPlan?.workouts?.[lastCompletedWorkout.type]?.name
      || (lastCompletedWorkout.type === 'travel' ? 'Travel Workout' : lastCompletedWorkout.type))
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
  // Trip days don't count as time off — that's what travel mode is for.
  const restart = state.restart;
  const activeTrip = getActiveTrip(state.trips, today);
  const upcomingTrip = activeTrip ? null : getCurrentOrUpcomingTrip(state.trips, today);
  const lastActivity = getLastActivityDate(progress);
  const daysSinceLast = lastActivity
    ? daysBetweenLocalDateKeys(lastActivity, today) - pausedDaysBetween(state.trips, lastActivity, today)
    : null;
  const showWelcomeBack =
    !activeTrip &&
    daysSinceLast != null && daysSinceLast >= RESTART_GAP_DAYS &&
    (!restart || restart.date <= lastActivity) &&
    state.restartSnoozedOn !== today;
  const rampActive = !!loadEase && (loadEase.factor ?? 1) < 1.0 && !(progress.completedWorkouts || []).some(w => w.date >= loadEase.date);

  // Adaptive deloads: offer a recovery week when the logs say you need one.
  const activeDeload = getActiveDeload(state.deloads, today);
  const deloadSuggestion = (state.deloadMode || 'adaptive') === 'adaptive' && !showWelcomeBack && !rampActive
    ? getDeloadSuggestion({
      setLogs: progress.setLogs, deloads: state.deloads, trips: state.trips,
      restart, deloadSnoozedOn: state.deloadSnoozedOn, today,
    })
    : null;
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
          {/* Profile avatar → Settings */}
          <TouchableOpacity style={s.settingsBtn} onPress={() => navigation.navigate('Settings')} accessibilityLabel="Settings">
            <Text style={s.avatarText}>{(userProfile.name || 'A').trim().charAt(0).toUpperCase()}</Text>
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
        {!showWelcomeBack && !activeTrip && rampActive && (
          <View style={s.rampChip}>
            <Ionicons name="refresh" size={13} color={colors.accentLight} />
            <Text style={s.rampChipText}>
              {loadEase.mode === 'travel' ? 'Welcome home' : 'Easing back in'} · loads set ~{Math.round((1 - (loadEase.factor ?? 1)) * 100)}% lighter
            </Text>
          </View>
        )}

        {/* ── Travel mode ── */}
        {activeTrip && (
          <TouchableOpacity style={s.travelCard} onPress={() => navigation.navigate('Settings')} activeOpacity={0.9}>
            <Ionicons name="airplane" size={20} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={s.travelTitle}>Travel mode · back {prettyDate(addDays(activeTrip.end, 1))}</Text>
              <Text style={s.travelSub}>
                Programme paused at week {Math.min(programWeek, 12)}. {activeTrip.kit === 'gym'
                  ? 'Normal workouts if you can — no pressure.'
                  : `${activeTrip.daysPerWeek || 3} short sessions a week + 8–10k steps a day.`}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        {upcomingTrip && daysBetweenLocalDateKeys(today, upcomingTrip.start) <= 14 && (
          <View style={s.rampChip}>
            <Ionicons name="airplane-outline" size={13} color={colors.warning} />
            <Text style={[s.rampChipText, { color: colors.warning }]}>
              Travel mode starts {prettyDate(upcomingTrip.start)}
            </Text>
          </View>
        )}

        {/* ── Adaptive deload ── */}
        {activeDeload && !activeTrip && (
          <View style={s.deloadCard}>
            <Ionicons name="leaf" size={20} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={s.deloadTitle}>Recovery week · until {prettyDate(addDays(deloadEndDate(activeDeload), -1))}</Text>
              <Text style={s.deloadSub}>Same workouts, ~40% lighter, one set fewer. You'll come back stronger.</Text>
            </View>
            <TouchableOpacity
              style={s.deloadGhostBtn}
              onPress={() => dispatch({ type: 'END_DELOAD', payload: today })}
              activeOpacity={0.85}
            >
              <Text style={s.deloadGhostText}>End early</Text>
            </TouchableOpacity>
          </View>
        )}
        {deloadSuggestion && (
          <View style={s.deloadCard}>
            <Ionicons name="leaf-outline" size={20} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={s.deloadTitle}>Time for a lighter week?</Text>
              <Text style={s.deloadSub}>{describeDeloadSuggestion(deloadSuggestion)}</Text>
              <View style={s.deloadBtnRow}>
                <TouchableOpacity
                  style={s.deloadBtn}
                  onPress={() => dispatch({ type: 'START_DELOAD', payload: { start: today, reason: deloadSuggestion.reason } })}
                  activeOpacity={0.85}
                >
                  <Text style={s.deloadBtnText}>Start recovery week</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.deloadGhostBtn}
                  onPress={() => dispatch({ type: 'SNOOZE_DELOAD', payload: today })}
                  activeOpacity={0.85}
                >
                  <Text style={s.deloadGhostText}>I'm fine</Text>
                </TouchableOpacity>
              </View>
            </View>
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

        {/* ── Activity rings: training (outer) + waist goal (inner) ── */}
        <View style={s.ringCard}>
          <View style={s.ringRow}>
            <ActivityRings
              size={176}
              stroke={15}
              gap={5}
              rings={[
                { progress: weekTotal ? weekDone / weekTotal : 0, color: colors.ring1, track: colors.ring1Soft },
                { progress: waistProgress, color: colors.ring2, track: colors.ring2Soft },
              ]}
            >
              <Text style={s.ringValue}>
                {weekDone}<Text style={s.ringValueOf}>/{weekTotal}</Text>
              </Text>
              <Text style={s.ringValueLabel}>{generatedPlan?.isTravel ? 'travel sessions' : 'sessions'}</Text>
            </ActivityRings>

            <View style={s.ringLegend}>
              <View style={s.legendItem}>
                <Text style={[s.legendValue, { color: colors.ring1 }]}>{weekDone} of {weekTotal}</Text>
                <Text style={s.legendLabel}>Workouts this week</Text>
              </View>
              <View style={s.legendItem}>
                <Text style={[s.legendValue, { color: colors.ring2 }]}>
                  {currentWaist != null ? `${Math.round(waistProgress * 100)}%` : '—'}
                </Text>
                <Text style={s.legendLabel}>Waist goal · {targetWaist} cm</Text>
              </View>
            </View>
          </View>

          <View style={s.weekDotsRow}>
            {weekActivity.map((d, i) => (
              <View key={i} style={s.weekDotCol}>
                <View style={[
                  s.weekDot,
                  d.active && s.weekDotActive,
                  d.isToday && !d.active && s.weekDotToday,
                ]}>
                  {d.active && <Ionicons name="checkmark" size={14} color={colors.onAccent} />}
                </View>
                <Text style={[s.weekDotLabel, d.isToday && s.weekDotLabelToday]}>{d.dayLetter}</Text>
              </View>
            ))}
          </View>
          <Text style={s.weekCaption}>
            {todayWorkout?.isRest
              ? (weekLeft > 0 ? `${weekLeft} session${weekLeft === 1 ? '' : 's'} left this week · rest today` : 'Week complete · rest today')
              : (weekLeft > 0 ? `${weekDone} done, ${weekLeft} to go this week` : `${weekDone} done — week nailed`)}
          </Text>
        </View>

        {/* ── Body stats ── */}
        <View style={s.statRow}>
          <HeroStat
            icon="resize-outline"
            label="Waist"
            value={currentWaist ?? '—'}
            unit="cm"
            sub={startWaist && currentWaist && startWaist !== currentWaist
              ? `${currentWaist < startWaist ? '−' : '+'}${Math.abs(currentWaist - startWaist).toFixed(1)} cm`
              : null}
            good={currentWaist != null && startWaist != null && currentWaist < startWaist}
          />
          <HeroStat
            icon="scale-outline"
            label="Weight"
            value={currentWeight ?? '—'}
            unit="kg"
            sub={showWeightDelta ? `${parseFloat(weightDelta) > 0 ? '+' : '−'}${Math.abs(parseFloat(weightDelta))} kg` : null}
            good={showWeightDelta && parseFloat(weightDelta) < 0}
          />
          <HeroStat
            icon="flame-outline"
            label="Streak"
            value={`${streak}`}
            unit={streak === 1 ? 'day' : 'days'}
            sub={`${totalWorkouts} total`}
          />
        </View>

        {/* ── Waist journey ── */}
        <View style={s.journeyCard}>
          <View style={s.journeyRow}>
            <Text style={s.journeyTitle}>Waist journey</Text>
            <Text style={s.journeyLabel}>{startWaist ?? '—'} → {targetWaist} cm</Text>
          </View>
          <View style={s.journeyTrack}>
            <View style={[s.journeyFill, { width: `${Math.max(waistProgress * 100, 2)}%` }]} />
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
              <Ionicons name="arrow-forward" size={16} color={colors.accentLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Next session prep card ── */}
        {nextSessionWorkout && (
          <NextSessionPrepCard
            nextWorkout={nextSessionWorkout}
            setLogs={progress.setLogs || []}
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
              {Object.values(generatedPlan.schedule).filter(Boolean).length}-day {generatedPlan.isTravel ? 'travel' : 'personalised'} plan active
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

function NextSessionPrepCard({ nextWorkout, setLogs, completedWorkouts, swaps: savedSwaps, primaryGoal }) {
  const { state } = useApp();
  const today = toLocalDateKey();
  const { workout, daysUntil, dayName, dateKey } = nextWorkout;
  // Judge the week as it will be on the day of that session (trip, deload…).
  const { mod, loadEase: restart } = getWeekContext(state, dateKey || today);
  const swaps = mod.isTravel ? {} : savedSwaps;

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
            <Text style={pc.deloadTextStrong}>Recovery week — go lighter.</Text>
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

function HeroStat({ icon, label, value, unit, sub, good }) {
  return (
    <View style={hs.wrap}>
      <View style={hs.top}>
        <Ionicons name={icon} size={15} color={colors.textSec} />
        <Text style={hs.label}>{label}</Text>
      </View>
      <Text style={hs.value} numberOfLines={1}>
        {value}
        {unit ? <Text style={hs.unit}> {unit}</Text> : null}
      </Text>
      {sub ? <Text style={[hs.sub, good && { color: colors.success }]}>{sub}</Text> : <Text style={hs.sub}> </Text>}
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────── */

// Shared card recipe: white (or dark-grey) rounded card, hairline border.
const card = () => ({
  backgroundColor: colors.card,
  borderRadius: 22,
  borderWidth: 1,
  borderColor: colors.border,
});

const s = themedStyles(() => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
  },
  greeting: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSec },
  name: { fontFamily: fonts.display, fontSize: 28, color: colors.text, marginTop: 1, letterSpacing: -0.3 },
  contextLine: { fontFamily: fonts.body, fontSize: 14, color: colors.textSec, marginTop: 3 },
  avatarText: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.onAccent },
  settingsBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },

  // Notice cards (welcome back, travel, deload)
  restartCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: colors.accentDim, borderRadius: 22, padding: 16,
  },
  restartIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  restartTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.accentLight },
  restartSub: { fontFamily: fonts.body, fontSize: 13, color: colors.textSec, lineHeight: 18, marginTop: 2 },
  rampChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16, marginBottom: 12, alignSelf: 'flex-start',
    backgroundColor: colors.accentDim, borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  rampChipText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.accentLight },
  travelCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: colors.warningDim, borderRadius: 22, padding: 16,
  },
  travelTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.warning },
  travelSub: { fontFamily: fonts.body, fontSize: 13, color: colors.textSec, lineHeight: 18, marginTop: 2 },
  deloadCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: colors.successDim, borderRadius: 22, padding: 16,
  },
  deloadTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.success },
  deloadSub: { fontFamily: fonts.body, fontSize: 13, color: colors.textSec, lineHeight: 18, marginTop: 2 },
  deloadBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  deloadBtn: { backgroundColor: colors.success, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 },
  deloadBtnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.isDark ? colors.bg : colors.onAccent },
  deloadGhostBtn: { paddingHorizontal: 12, paddingVertical: 9 },
  deloadGhostText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textSec },
  completeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: colors.warningDim, borderRadius: 22, padding: 16,
  },
  completeTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  completeSub: { fontFamily: fonts.body, fontSize: 13, color: colors.textSec, lineHeight: 18 },
  completeBtn: { backgroundColor: colors.warning, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  completeBtnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.onAccent },

  // Rings card
  ringCard: { ...card(), marginHorizontal: 16, padding: 18 },
  ringRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ringValue: { fontFamily: fonts.displayBlack, fontSize: 34, color: colors.ring1, letterSpacing: -0.5 },
  ringValueOf: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.textMuted },
  ringValueLabel: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSec, marginTop: -2 },
  ringLegend: { flex: 1, gap: 18 },
  legendItem: {},
  legendValue: { fontFamily: fonts.display, fontSize: 24, letterSpacing: -0.3 },
  legendLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.textSec, marginTop: 1 },
  weekDotsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  weekDotCol: { alignItems: 'center', gap: 5 },
  weekDot: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 3, borderColor: colors.ring1Soft,
    alignItems: 'center', justifyContent: 'center',
  },
  weekDotActive: { backgroundColor: colors.ring1, borderColor: colors.ring1 },
  weekDotToday: { borderColor: colors.accent },
  weekDotLabel: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textMuted },
  weekDotLabelToday: { fontFamily: fonts.bodyBold, color: colors.text },
  weekCaption: { fontFamily: fonts.body, fontSize: 13, color: colors.textSec, textAlign: 'center', marginTop: 12 },

  // Stat tiles + journey
  statRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 12 },
  journeyCard: { ...card(), marginHorizontal: 16, marginTop: 12, padding: 16 },
  journeyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  journeyTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  journeyLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSec },
  journeyTrack: { height: 10, borderRadius: 5, backgroundColor: colors.ring2Soft, overflow: 'hidden' },
  journeyFill: { height: '100%', borderRadius: 5, backgroundColor: colors.ring2 },

  // Today CTA
  ctaCard: { ...card(), marginHorizontal: 16, marginTop: 12, padding: 18 },
  ctaCardDone: { backgroundColor: colors.successDim, borderColor: 'transparent' },
  ctaCardRest: {},
  ctaEyebrow: {
    alignSelf: 'flex-start',
    fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.accentLight,
    backgroundColor: colors.accentDim, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden', marginBottom: 10,
  },
  ctaTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.text, letterSpacing: -0.2 },
  ctaSub: { fontFamily: fonts.body, fontSize: 14, color: colors.textSec, marginTop: 3, lineHeight: 19 },
  ctaMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  ctaMetaTxt: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textMuted },
  ctaMetaDot: { color: colors.textMuted },
  ctaRestRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ctaRestInfo: { flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' },
  ctaRestInfoLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textMuted },
  ctaRestInfoText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text, flexShrink: 1 },
  ctaDoneRow: { flexDirection: 'row', alignItems: 'center' },
  ctaDoneTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.success },
  ctaDoneNext: { fontFamily: fonts.body, fontSize: 13, color: colors.textSec, marginTop: 3 },
  beginBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    alignSelf: 'flex-start', marginTop: 16,
    backgroundColor: colors.accent, borderRadius: 999,
    paddingHorizontal: 22, paddingVertical: 12,
  },
  beginBtnRest: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    alignSelf: 'flex-start', marginTop: 14,
    backgroundColor: colors.accentDim, borderRadius: 999,
    paddingHorizontal: 18, paddingVertical: 10,
  },
  beginBtnText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.accentLight },

  planChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center',
    marginTop: 14, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, backgroundColor: colors.card,
  },
  planPip: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.ring1 },
  planChipText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSec },

  quoteCard: { ...card(), marginHorizontal: 16, marginTop: 12, padding: 18 },
  quoteText: { fontFamily: fonts.body, fontSize: 15, color: colors.text, lineHeight: 22 },
  quoteAuthor: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSec, marginTop: 8 },
}));

const hs = themedStyles(() => ({
  wrap: { ...card(), flex: 1, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSec },
  value: { fontFamily: fonts.display, fontSize: 22, color: colors.text, letterSpacing: -0.3 },
  unit: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSec },
  sub: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textMuted, marginTop: 2 },
}));

const pc = themedStyles(() => ({
  card: { ...card(), marginHorizontal: 16, marginTop: 12, padding: 18 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  eyebrow: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.accentLight, letterSpacing: 0.6, marginBottom: 3 },
  title: { fontFamily: fonts.display, fontSize: 19, color: colors.text },
  focus: { fontFamily: fonts.body, fontSize: 13, color: colors.textSec, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: 8 },
  deloadBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: colors.successDim, borderRadius: 18, padding: 10, marginBottom: 12,
  },
  deloadText: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.textSec, lineHeight: 18 },
  deloadTextStrong: { fontFamily: fonts.bodyBold, color: colors.success },
  aiNote: { marginBottom: 10 },
  aiNoteText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.accentLight },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  exName: { flex: 1, minWidth: 0, marginRight: 10, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginRight: 12, fontVariant: ['tabular-nums'] },
  weight: {
    fontFamily: fonts.bodyBold, fontSize: 14, color: colors.accentLight,
    minWidth: 64, textAlign: 'right', fontVariant: ['tabular-nums'],
  },
  weightNew: { color: colors.textMuted, fontFamily: fonts.bodyMedium },
  setOut: {
    flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  setOutLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSec, marginLeft: 6 },
  setOutWeights: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.accentLight },
}));
