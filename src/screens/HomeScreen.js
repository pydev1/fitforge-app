import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { MOTIVATIONAL_QUOTES } from '../data/workoutData';
import { colors } from '../theme/colors';
import { toLocalDateKey, fromLocalDateKey } from '../utils/date';

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
    if (workoutId) return generatedPlan.workouts?.[workoutId] ?? null;
  }
  return null;
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
  const { state } = useApp();
  const { userProfile, progress, generatedPlan } = state;

  const today = toLocalDateKey();
  const todayWorkout = getTodayWorkout(generatedPlan);
  const todayDone = progress.completedWorkouts.some(w => w.date === today);
  const nextWorkout = (todayDone || todayWorkout?.isRest) ? getNextWorkout(generatedPlan) : null;
  const lastCompletedWorkout = progress.completedWorkouts.length > 0
    ? [...progress.completedWorkouts].sort((a, b) => b.date.localeCompare(a.date))[0]
    : null;
  const lastCompletedName = lastCompletedWorkout
    ? (generatedPlan?.workouts?.[lastCompletedWorkout.type]?.name || lastCompletedWorkout.type)
    : null;

  const currentWeight = progress.weight[progress.weight.length - 1]?.value ?? userProfile.weight;
  const firstWeight = progress.weight[0];
  const weightDelta = progress.weight.length >= 2 && firstWeight && currentWeight != null
    ? (currentWeight - firstWeight.value).toFixed(1)
    : null;
  const showWeightDelta = weightDelta !== null && parseFloat(weightDelta) !== 0;

  const totalWorkouts = progress.completedWorkouts.length;
  const streak = getStreak(progress.completedWorkouts);

  const currentWaist = progress.waist?.[progress.waist.length - 1]?.value ?? userProfile.waist;
  const startWaist = progress.waist?.[0]?.value ?? userProfile.waist;
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
                    <Text style={s.ctaRestInfoText}>{nextWorkout.name}</Text>
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
                  <Text style={s.ctaDoneNext}>Next up: {nextWorkout.name} tomorrow</Text>
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
                onPress={() => navigation.navigate('Workouts', { tab: 'posture' })}
                activeOpacity={0.85}
              >
                <Text style={s.beginBtnText}>Begin</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
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
    fontFamily: 'Figtree_400Regular_Italic',
    fontSize: 13,
    color: colors.textSec,
  },
  name: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 36,
    color: colors.text,
    letterSpacing: 1,
    marginTop: 1,
  },
  contextLine: {
    fontFamily: 'Figtree_400Regular_Italic',
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
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 12,
    color: colors.heroTextMuted,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  heroValueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  heroNumber: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 56,
    color: colors.heroText,
    lineHeight: 58,
  },
  heroUnit: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 18,
    color: colors.heroTextSec,
    marginBottom: 8,
  },
  heroGoal: {
    fontFamily: 'Figtree_400Regular_Italic',
    fontSize: 12,
    color: colors.heroTextMuted,
    marginTop: 2,
  },

  weekBlock: { alignItems: 'flex-end' },
  weekLabel: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 11,
    color: colors.heroTextMuted,
    marginBottom: 3,
  },
  weekCount: {
    fontFamily: 'Figtree_400Regular_Italic',
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
    fontFamily: 'Figtree_700Bold',
    fontSize: 8,
    color: colors.heroTextMuted,
  },
  weekSquareLabelActive: { color: '#fff' },

  // Fix 2: blue fill, dark unfilled track
  journeyWrap: { marginBottom: 14 },
  journeyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  journeyLabel: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 10,
    color: colors.heroTextMuted,
  },
  journeyTrack: {
    height: 5,
    backgroundColor: '#2e3a60',
    borderRadius: 3,
    overflow: 'visible',
    position: 'relative',
  },
  journeyFill: {
    height: '100%',
    backgroundColor: '#72aed4',
    borderRadius: 3,
  },
  journeyDot: {
    position: 'absolute',
    top: -4,
    width: 13, height: 13,
    borderRadius: 7,
    backgroundColor: '#72aed4',
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
    fontFamily: 'Figtree_400Regular_Italic',
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
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 11,
    color: colors.textMuted,
  },
  ctaRestInfoText: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 12,
    color: colors.textSec,
    flex: 1,
  },
  ctaTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 30,
    color: colors.text,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  ctaSub: {
    fontFamily: 'Figtree_400Regular_Italic',
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
    fontFamily: 'Figtree_500Medium',
    fontSize: 12,
    color: colors.textMuted,
  },
  ctaMetaDot: {
    fontFamily: 'Figtree_500Medium',
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
    fontFamily: 'Figtree_700Bold',
    fontSize: 15,
    color: '#fff',
  },
  ctaDoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  ctaDoneTitle: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 15,
    color: colors.success,
    marginBottom: 4,
  },
  ctaDoneNext: {
    fontFamily: 'Figtree_400Regular_Italic',
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
    fontFamily: 'Figtree_400Regular_Italic',
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
    fontFamily: 'Figtree_400Regular_Italic',
    fontSize: 14,
    color: colors.textSec,
    textAlign: 'center',
    lineHeight: 22,
  },
  quoteAuthor: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
  },
});

const hs = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center' },
  value: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
    color: colors.heroText,
    letterSpacing: 0.5,
  },
  unit: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 13,
    color: colors.heroTextSec,
  },
  sub: {
    fontFamily: 'Figtree_400Regular_Italic',
    fontSize: 9,
    color: colors.heroTextMuted,
    marginTop: 1,
  },
  label: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 10,
    color: colors.heroTextMuted,
    marginTop: 2,
  },
});
