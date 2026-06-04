import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { MOTIVATIONAL_QUOTES } from '../data/workoutData';
import { colors } from '../theme/colors';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
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

// Returns array of 7 booleans: did user work out on each of the last 7 days?
function getLast7DayActivity(completedWorkouts) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (6 - i));
    return completedWorkouts.some(w => {
      const d = new Date(w.date || w.completedAt || 0);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === day.getTime();
    });
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

  const bmi = userProfile.height && userProfile.weight
    ? (userProfile.weight / Math.pow(userProfile.height / 100, 2)).toFixed(1)
    : '—';

  const weekActivity = getLast7DayActivity(progress.completedWorkouts);
  const hasWeightProgress = weightDelta !== null;
  const goalIsWeight = userProfile.goals?.some(g =>
    typeof g === 'string' && (g.toLowerCase().includes('weight') || g.toLowerCase().includes('loss') || g.toLowerCase().includes('fat'))
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>{getGreeting()},</Text>
            <Text style={s.name}>{userProfile.name || 'Athlete'} 👊</Text>
          </View>
          <TouchableOpacity style={s.settingsBtn} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-sharp" size={22} color={colors.textSec} />
          </TouchableOpacity>
        </View>

        {/* ── Today's Session – #1 CTA ── */}
        <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Workout')} style={{ marginHorizontal: 16 }}>
          {!todayWorkout || todayWorkout.isRest ? (
            <View style={s.restCard}>
              <View style={s.restCardInner}>
                <Text style={s.restLabel}>{todayWorkout?.dayName ?? DAYS[new Date().getDay()]}</Text>
                <Text style={s.restTitle}>Rest Day 😴</Text>
                <Text style={s.restSub}>Recovery is where the gains happen</Text>
              </View>
              <Ionicons name="moon-outline" size={40} color={colors.accentLight} style={{ opacity: 0.4 }} />
            </View>
          ) : (
            <LinearGradient
              colors={[todayWorkout.color + 'DD', todayWorkout.color + 'AA']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.workoutCard}
            >
              {/* CTA label badge */}
              <View style={s.ctaBadge}>
                <Text style={s.ctaBadgeText}>START TODAY</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.workoutDay}>{todayWorkout.dayName}</Text>
                <Text style={s.workoutName}>{todayWorkout.name}</Text>
                <Text style={s.workoutFocus}>{todayWorkout.focus}</Text>
                <View style={s.workoutMeta}>
                  <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.75)" />
                  <Text style={s.workoutMetaTxt}>{todayWorkout.duration}</Text>
                  <Ionicons name="barbell-outline" size={13} color="rgba(255,255,255,0.75)" style={{ marginLeft: 10 }} />
                  <Text style={s.workoutMetaTxt}>{todayWorkout.exercises?.length ?? 0} exercises</Text>
                </View>
              </View>
              <View style={s.workoutChevron}>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
              </View>
            </LinearGradient>
          )}
        </TouchableOpacity>

        {/* ── Stats – hero + secondary ── */}
        <View style={s.statsWrap}>
          {/* Hero metric */}
          <View style={s.heroCard}>
            <View style={s.heroTop}>
              <Ionicons
                name={goalIsWeight || hasWeightProgress ? 'trending-down-outline' : 'barbell-outline'}
                size={18} color={colors.accent}
              />
              <Text style={s.heroLabel}>
                {goalIsWeight || hasWeightProgress ? 'Weight' : 'Sessions'}
              </Text>
            </View>
            <Text style={s.heroValue}>
              {goalIsWeight || hasWeightProgress
                ? (currentWeight != null ? `${currentWeight}` : '—')
                : `${totalWorkouts}`}
              <Text style={s.heroUnit}>
                {goalIsWeight || hasWeightProgress ? ' kg' : ''}
              </Text>
            </Text>
            {hasWeightProgress && (
              <View style={s.deltaBadge}>
                <Text style={[s.deltaText, { color: parseFloat(weightDelta) <= 0 ? colors.success : colors.warning }]}>
                  {parseFloat(weightDelta) > 0 ? '+' : ''}{weightDelta} kg from start
                </Text>
              </View>
            )}
          </View>

          {/* Secondary metrics */}
          <View style={s.secondaryCol}>
            <SecondaryCard icon="body-outline" label="Waist" value={currentWaist ?? '—'} unit={currentWaist ? 'cm' : ''} />
            <SecondaryCard icon="fitness-outline" label="BMI" value={bmi} unit="" />
            <SecondaryCard icon="barbell-outline" label="Sessions" value={`${totalWorkouts}`} unit="" />
          </View>
        </View>

        {/* ── 7-day activity sparkline ── */}
        <View style={s.sparkWrap}>
          <Text style={s.sparkTitle}>Last 7 Days</Text>
          <View style={s.sparkBars}>
            {weekActivity.map((active, i) => {
              const dayLetter = ['S','M','T','W','T','F','S'][(new Date().getDay() - 6 + i + 7) % 7];
              const isToday = i === 6;
              return (
                <View key={i} style={s.sparkCol}>
                  <View style={[
                    s.sparkBar,
                    active ? s.sparkBarActive : s.sparkBarInactive,
                    isToday && s.sparkBarToday,
                  ]} />
                  <Text style={[s.sparkDay, isToday && { color: colors.accent }]}>{dayLetter}</Text>
                </View>
              );
            })}
          </View>
          <Text style={s.sparkSub}>
            {weekActivity.filter(Boolean).length}/7 active days this week
          </Text>
        </View>

        {/* ── Compact Quick Actions ── */}
        <View style={s.quickRow}>
          <QuickAction icon="chatbubble-ellipses" label="AI Coach" color={colors.accent}
            onPress={() => navigation.navigate('Coach')} />
          <QuickAction icon="camera" label="Scan" color={colors.secondary}
            onPress={() => navigation.navigate('Scan')} />
          <QuickAction icon="stats-chart" label="Progress" color={colors.success}
            onPress={() => navigation.navigate('Progress')} />
          <QuickAction icon="body" label="Posture" color={colors.warning}
            onPress={() => navigation.navigate('Workout', { tab: 'posture' })} />
        </View>

        {/* Plan chip */}
        {generatedPlan && (
          <View style={s.planChip}>
            <Ionicons name="checkmark-circle" size={13} color={colors.accent} style={{ marginRight: 6 }} />
            <Text style={s.planChipText}>
              {Object.values(generatedPlan.schedule).filter(Boolean).length}-day personalised plan active
            </Text>
          </View>
        )}

        {/* Motivation */}
        <LinearGradient colors={[colors.surface, colors.card]} style={s.quoteCard}>
          <Ionicons name="flame" size={20} color={colors.warning} style={{ marginBottom: 10 }} />
          <Text style={s.quoteText}>"{quote.quote}"</Text>
          <Text style={s.quoteAuthor}>— {quote.author}</Text>
        </LinearGradient>

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SecondaryCard({ icon, label, value, unit }) {
  return (
    <View style={sc.card}>
      <Ionicons name={icon} size={13} color={colors.textMuted} />
      <Text style={sc.value}>{value}<Text style={sc.unit}>{unit}</Text></Text>
      <Text style={sc.label}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, color, onPress }) {
  return (
    <TouchableOpacity style={qa.wrap} onPress={onPress} activeOpacity={0.7}>
      <View style={[qa.icon, { backgroundColor: color + '20', borderColor: color + '40' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={qa.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  greeting: { fontSize: 13, color: colors.textSec, fontWeight: '400' },
  name: { fontSize: 26, color: colors.text, fontWeight: '700', marginTop: 2 },
  settingsBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },

  // Today CTA - rest variant
  restCard: {
    backgroundColor: colors.card,
    borderRadius: 20, padding: 20,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  restCardInner: { flex: 1 },
  restLabel: { fontSize: 11, color: colors.textSec, fontWeight: '500', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  restTitle: { fontSize: 22, color: colors.text, fontWeight: '700', marginBottom: 4 },
  restSub: { fontSize: 13, color: colors.textSec },

  // Today CTA - active workout variant
  workoutCard: {
    borderRadius: 20, padding: 20,
    flexDirection: 'row', alignItems: 'center',
    minHeight: 120,
  },
  ctaBadge: {
    position: 'absolute', top: 14, right: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  ctaBadgeText: { fontSize: 9, color: '#fff', fontWeight: '700', letterSpacing: 1 },
  workoutDay: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '500', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  workoutName: { fontSize: 22, color: '#fff', fontWeight: '700', marginBottom: 4 },
  workoutFocus: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 10 },
  workoutMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  workoutMetaTxt: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  workoutChevron: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Stats
  statsWrap: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 14, gap: 10,
  },
  heroCard: {
    flex: 3, backgroundColor: colors.cardElevated,
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: colors.accent + '35',
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  heroLabel: { fontSize: 12, color: colors.textSec, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroValue: { fontSize: 36, color: colors.text, fontWeight: '800', lineHeight: 40 },
  heroUnit: { fontSize: 16, color: colors.textSec, fontWeight: '400' },
  deltaBadge: {
    marginTop: 8, backgroundColor: colors.bg,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  deltaText: { fontSize: 11, fontWeight: '600' },
  secondaryCol: { flex: 2, gap: 8 },

  // Sparkline
  sparkWrap: {
    marginHorizontal: 16, marginTop: 14,
    backgroundColor: colors.card,
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  sparkTitle: { fontSize: 12, color: colors.textSec, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  sparkBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 40 },
  sparkCol: { flex: 1, alignItems: 'center', gap: 4 },
  sparkBar: { width: '100%', borderRadius: 4 },
  sparkBarActive: { height: 36, backgroundColor: colors.accent + 'CC' },
  sparkBarInactive: { height: 12, backgroundColor: colors.border },
  sparkBarToday: { borderWidth: 1, borderColor: colors.accent },
  sparkDay: { fontSize: 9, color: colors.textMuted, fontWeight: '600' },
  sparkSub: { fontSize: 11, color: colors.textMuted, marginTop: 8 },

  // Compact Quick Actions
  quickRow: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 14, gap: 8,
  },

  // Plan chip
  planChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: colors.accent + '12',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.accent + '25',
  },
  planChipText: { fontSize: 12, color: colors.textSec },

  // Quote
  quoteCard: {
    margin: 16, marginTop: 14, borderRadius: 18, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  quoteText: {
    fontSize: 14, color: colors.text, fontStyle: 'italic',
    textAlign: 'center', lineHeight: 22, fontWeight: '500',
  },
  quoteAuthor: { fontSize: 12, color: colors.textSec, marginTop: 8, fontWeight: '500' },
});

const sc = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: colors.card,
    borderRadius: 12, padding: 10,
    alignItems: 'flex-start', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
    gap: 2,
  },
  value: { fontSize: 16, color: colors.text, fontWeight: '700' },
  unit: { fontSize: 10, color: colors.textSec, fontWeight: '400' },
  label: { fontSize: 10, color: colors.textMuted },
});

const qa = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center' },
  icon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 5, borderWidth: 1,
  },
  label: { fontSize: 10, color: colors.textSec, textAlign: 'center', fontWeight: '600' },
});
