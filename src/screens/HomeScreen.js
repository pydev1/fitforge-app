import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { MOTIVATIONAL_QUOTES } from '../data/workoutData';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

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

function getContextLine(todayWorkout) {
  if (!todayWorkout) return 'Let\'s get moving today.';
  if (todayWorkout.isRest) return 'Rest day today — you\'ve earned it.';
  return `${todayWorkout.name} today — ${todayWorkout.focus}.`;
}

// Count workouts done this week and total scheduled
function getWeekStats(generatedPlan, completedWorkouts) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  // Days since Monday
  const sinceMonday = (dayOfWeek + 6) % 7;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - sinceMonday);
  weekStart.setHours(0, 0, 0, 0);

  const doneThisWeek = completedWorkouts.filter(w => {
    const d = new Date(w.date);
    return d >= weekStart;
  }).length;

  const scheduled = generatedPlan
    ? Object.values(generatedPlan.schedule).filter(Boolean).length
    : 0;

  return { done: doneThisWeek, total: scheduled };
}

// 7-day activity array (Sun=0 to Sat=6, today is last)
function getWeekActivity(completedWorkouts) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Build from Monday of this week
  const dayOfWeek = today.getDay();
  const sinceMonday = (dayOfWeek + 6) % 7;

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(today);
    day.setDate(today.getDate() - sinceMonday + i);
    const isToday = i === sinceMonday;
    const isFuture = day > today;
    const active = completedWorkouts.some(w => {
      const d = new Date(w.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === day.getTime();
    });
    return { dayLetter: DAY_LETTERS[day.getDay()], active, isToday, isFuture };
  });
}

export default function HomeScreen({ navigation }) {
  const { state } = useApp();
  const { userProfile, progress, generatedPlan } = state;

  const todayWorkout = getTodayWorkout(generatedPlan);
  const quote = getDailyQuote();

  const currentWeight = progress.weight[progress.weight.length - 1]?.value ?? userProfile.weight;
  const firstWeight = progress.weight[0];
  const weightDelta = firstWeight && currentWeight != null
    ? (currentWeight - firstWeight.value).toFixed(1)
    : null;
  const totalWorkouts = progress.completedWorkouts.length;

  const currentWaist = progress.waist?.[progress.waist.length - 1]?.value ?? userProfile.waist;
  const startWaist = progress.waist?.[0]?.value ?? userProfile.waist;
  const targetWaist = 80; // from goal card

  // Waist progress 0–1 toward target
  const waistProgress = startWaist && currentWaist && startWaist > targetWaist
    ? Math.min(1, Math.max(0, (startWaist - currentWaist) / (startWaist - targetWaist)))
    : 0;

  const { done: weekDone, total: weekTotal } = getWeekStats(generatedPlan, progress.completedWorkouts);
  const weekLeft = Math.max(0, weekTotal - weekDone);
  const weekActivity = getWeekActivity(progress.completedWorkouts);

  const contextLine = getContextLine(todayWorkout);

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

        {/* ── Hero stats card (blue) ── */}
        <View style={s.heroCard}>
          {/* Primary metric – waist */}
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
                {weekDone} done{weekLeft > 0 ? `, ${weekLeft} to go` : ' — nailed it'}
              </Text>
              {/* Rounded-square week tracker */}
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

          {/* Journey progress bar */}
          <View style={s.journeyWrap}>
            <View style={s.journeyRow}>
              <Text style={s.journeyLabel}>Start {startWaist ?? '—'} cm</Text>
              <Text style={s.journeyLabel}>Target {targetWaist} cm</Text>
            </View>
            <View style={s.journeyTrack}>
              <View style={[s.journeyFill, { width: `${waistProgress * 100}%` }]} />
              {waistProgress > 0 && waistProgress < 1 && (
                <View style={[s.journeyDot, { left: `${waistProgress * 100}%` }]} />
              )}
            </View>
          </View>

          {/* Divider */}
          <View style={s.heroDivider} />

          {/* Secondary stats row */}
          <View style={s.heroSecRow}>
            <HeroStat label="Weight" value={currentWeight ?? '—'} unit="kg" />
            <View style={s.heroStatDivider} />
            <HeroStat
              label="Change"
              value={weightDelta !== null ? `${parseFloat(weightDelta) > 0 ? '+' : ''}${weightDelta}` : '—'}
              unit={weightDelta !== null ? 'kg' : ''}
              positive={weightDelta !== null && parseFloat(weightDelta) <= 0}
            />
            <View style={s.heroStatDivider} />
            <HeroStat label="Sessions" value={`${totalWorkouts}`} unit="" />
          </View>
        </View>

        {/* ── Today's workout CTA ── */}
        <View style={s.ctaCard}>
          <Text style={s.ctaEyebrow}>Up next for you today</Text>
          {!todayWorkout || todayWorkout.isRest ? (
            <View style={s.ctaRestRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.ctaTitle}>Rest day 😴</Text>
                <Text style={s.ctaSub}>Recovery is where the gains happen</Text>
              </View>
              <Ionicons name="moon-outline" size={36} color={colors.textMuted} />
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
            </>
          )}
          <TouchableOpacity
            style={[s.beginBtn, todayWorkout?.isRest && s.beginBtnRest]}
            onPress={() => navigation.navigate('Workouts')}
            activeOpacity={0.85}
          >
            <Text style={s.beginBtnText}>
              {todayWorkout?.isRest ? 'View posture routine' : 'Begin'}
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
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

        {/* ── Motivation quote ── */}
        <View style={s.quoteCard}>
          <Ionicons name="flame" size={18} color={colors.warning} style={{ marginBottom: 8 }} />
          <Text style={s.quoteText}>"{quote.quote}"</Text>
          <Text style={s.quoteAuthor}>— {quote.author}</Text>
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function HeroStat({ label, value, unit, positive }) {
  return (
    <View style={hs.wrap}>
      <Text style={hs.value}>
        {value}
        {unit ? <Text style={hs.unit}> {unit}</Text> : null}
      </Text>
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

  // Hero card
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
  heroLabel: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 12,
    color: colors.heroTextMuted,
    textTransform: 'uppercase',
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
  weekSquareFuture: {
    opacity: 0.4,
  },
  weekSquareLabel: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 8,
    color: colors.heroTextMuted,
  },
  weekSquareLabelActive: { color: '#fff' },

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
    height: 5, backgroundColor: colors.heroCardDeep,
    borderRadius: 3, overflow: 'visible', position: 'relative',
  },
  journeyFill: {
    height: '100%',
    backgroundColor: '#ff7848',
    borderRadius: 3,
  },
  journeyDot: {
    position: 'absolute',
    top: -4,
    width: 13, height: 13,
    borderRadius: 7,
    backgroundColor: '#ff7848',
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

  // CTA card
  ctaCard: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: colors.ctaCard,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
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
    alignItems: 'center',
    marginBottom: 14,
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
    backgroundColor: colors.surface,
  },
  beginBtnText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 15,
    color: '#fff',
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
  label: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 10,
    color: colors.heroTextMuted,
    marginTop: 2,
  },
});
