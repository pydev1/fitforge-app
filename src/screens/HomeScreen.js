import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { daysBetweenLocalDateKeys, fromLocalDateKey, getLocalWeekDateKey, toLocalDateKey } from '../utils/date';

const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAYS_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEK_START = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getTodayIndex() {
  const jsDay = new Date().getDay(); // 0=Sun
  return jsDay === 0 ? 6 : jsDay - 1; // convert to 0=Mon
}

function getTodayWorkout(generatedPlan) {
  if (!generatedPlan) return null;
  const dayName = DAYS_FULL[getTodayIndex()];
  const workoutId = generatedPlan.schedule?.[dayName];
  if (!workoutId) return { isRest: true, dayName };
  const workout = generatedPlan.workouts?.[workoutId];
  return workout ? { ...workout, dayName } : { isRest: true, dayName };
}

function getThisWeekCompleted(completedWorkouts) {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - getTodayIndex());
  monday.setHours(0, 0, 0, 0);
  return completedWorkouts
    .filter(w => fromLocalDateKey(w.date) >= monday)
    .map(w => w.date);
}

export default function HomeScreen({ navigation }) {
  const { state } = useApp();
  const { userProfile, progress, generatedPlan } = state;

  const todayWorkout = getTodayWorkout(generatedPlan);
  const todayIdx = getTodayIndex();
  const currentWeight = progress.weight[progress.weight.length - 1]?.value ?? userProfile.weight;
  const totalWorkouts = progress.completedWorkouts.length;
  const thisWeekDone = getThisWeekCompleted(progress.completedWorkouts);
  const today = toLocalDateKey();

  const sortedWorkouts = [...progress.completedWorkouts].sort((a, b) => b.date.localeCompare(a.date));
  const lastWorkout = sortedWorkouts[0];
  const daysSinceLast = lastWorkout
    ? daysBetweenLocalDateKeys(lastWorkout.date, today)
    : null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>{getGreeting()}</Text>
            <Text style={s.name}>{userProfile.name || 'Athlete'}</Text>
          </View>
          <TouchableOpacity style={s.settingsBtn} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={20} color={colors.textSec} />
          </TouchableOpacity>
        </View>

        {/* Stats Strip */}
        <View style={s.statsStrip}>
          <StatItem value={currentWeight ?? '—'} unit={currentWeight ? 'kg' : ''} label="Weight" />
          <View style={s.statsDivider} />
          <StatItem value={userProfile.waist ?? '—'} unit={userProfile.waist ? 'cm' : ''} label="Waist" />
          <View style={s.statsDivider} />
          <StatItem value={totalWorkouts} unit="" label="Sessions" />
        </View>

        {/* Absence warning */}
        {daysSinceLast !== null && daysSinceLast >= 3 && (
          <TouchableOpacity style={s.absenceCard} onPress={() => navigation.navigate('Coach')} activeOpacity={0.85}>
            <Ionicons name="warning-outline" size={18} color={colors.warning} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.absenceTitle}>
                {daysSinceLast >= 7 ? `${daysSinceLast} days without training` : `${daysSinceLast} days since your last session`}
              </Text>
              <Text style={s.absenceSub}>Tap to talk to your coach — let's get back on track</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Today's Workout */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Today</Text>
          <Text style={s.sectionDay}>{DAYS_FULL[todayIdx]}</Text>
        </View>

        <TouchableOpacity activeOpacity={0.88} onPress={() => navigation.navigate('Workout')}>
          {!todayWorkout || todayWorkout.isRest ? (
            <View style={s.restCard}>
              <View style={s.restLeft}>
                <Text style={s.restTitle}>Rest Day</Text>
                <Text style={s.restSub}>Recovery is where the gains happen</Text>
                <View style={s.restTip}>
                  <Ionicons name="leaf-outline" size={13} color={colors.success} />
                  <Text style={s.restTipText}>Light stretching or posture routine</Text>
                </View>
              </View>
              <Ionicons name="moon-outline" size={40} color={colors.textMuted} />
            </View>
          ) : (
            <LinearGradient
              colors={[todayWorkout.color + 'DD', todayWorkout.color + 'AA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.workoutCard}
            >
              <View style={{ flex: 1 }}>
                <View style={s.workoutBadge}>
                  <Text style={s.workoutBadgeText}>
                    {thisWeekDone.includes(today) ? 'Completed' : 'Up Next'}
                  </Text>
                </View>
                <Text style={s.workoutTitle}>{todayWorkout.name}</Text>
                <Text style={s.workoutFocus}>{todayWorkout.focus}</Text>
                <View style={s.workoutMeta}>
                  <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.7)" />
                  <Text style={s.workoutMetaTxt}>{todayWorkout.duration}</Text>
                  <Text style={s.workoutMetaDot}>·</Text>
                  <Text style={s.workoutMetaTxt}>{todayWorkout.exercises?.length ?? 0} exercises</Text>
                </View>
              </View>
              <View style={s.workoutArrow}>
                <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.9)" />
              </View>
            </LinearGradient>
          )}
        </TouchableOpacity>

        {/* Week at a glance */}
        {generatedPlan && (
          <>
            <Text style={s.sectionTitle2}>This Week</Text>
            <View style={s.weekRow}>
              {DAYS_FULL.map((day, i) => {
                const workoutId = generatedPlan.schedule?.[day];
                const isToday = i === todayIdx;
                const dateStr = getLocalWeekDateKey(i);
                const isDone = thisWeekDone.includes(dateStr);
                const hasWorkout = !!workoutId;
                const workoutColor = workoutId ? generatedPlan.workouts?.[workoutId]?.color : null;

                return (
                  <View key={day} style={s.weekDay}>
                    <Text style={[s.weekDayLabel, isToday && { color: colors.accent }]}>
                      {DAYS_SHORT[i]}
                    </Text>
                    <View style={[
                      s.weekDot,
                      isToday && s.weekDotToday,
                      isDone && { backgroundColor: colors.success },
                      !isDone && hasWorkout && { backgroundColor: workoutColor || colors.accent },
                      !hasWorkout && s.weekDotRest,
                    ]}>
                      {isDone && <Ionicons name="checkmark" size={10} color="#fff" />}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Quick Access */}
        <Text style={s.sectionTitle2}>Quick Access</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.actionScroll}
        >
          <ActionCard
            icon="chatbubble-ellipses"
            title="Coach"
            subtitle="Ask anything"
            color={colors.accent}
            bg={colors.accentDim}
            onPress={() => navigation.navigate('Coach')}
          />
          <ActionCard
            icon="stats-chart"
            title="Progress"
            subtitle="Weight & strength"
            color={colors.success}
            bg={colors.successDim}
            onPress={() => navigation.navigate('Progress')}
          />
          <ActionCard
            icon="body"
            title="Posture Fix"
            subtitle="5-min routine"
            color={colors.info}
            bg={colors.infoDim}
            onPress={() => navigation.navigate('Workout', { tab: 'posture' })}
          />
          <ActionCard
            icon="camera"
            title="Form Check"
            subtitle="Get feedback"
            color={colors.secondary}
            bg={colors.secondaryDim}
            onPress={() => navigation.navigate('Scan')}
          />
        </ScrollView>

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({ value, unit, label }) {
  return (
    <View style={s.statItem}>
      <Text style={s.statValue}>
        {value}
        {unit ? <Text style={s.statUnit}> {unit}</Text> : null}
      </Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function ActionCard({ icon, title, subtitle, color, bg, onPress }) {
  return (
    <TouchableOpacity style={[s.actionCard, { borderTopColor: color }]} onPress={onPress} activeOpacity={0.8}>
      <View style={[s.actionIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={s.actionTitle}>{title}</Text>
      <Text style={s.actionSub}>{subtitle}</Text>
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
    paddingTop: 20,
    paddingBottom: 8,
  },
  greeting: { fontSize: 14, color: colors.textMuted, fontWeight: '400' },
  name: { fontSize: 28, color: colors.text, fontWeight: '800', marginTop: 2, letterSpacing: -0.5 },
  settingsBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
  },

  // Stats strip
  statsStrip: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statsDivider: { width: 1, backgroundColor: colors.border },
  statValue: { fontSize: 22, color: colors.text, fontWeight: '700' },
  statUnit: { fontSize: 13, color: colors.textSec, fontWeight: '400' },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 3, fontWeight: '500' },

  // Section headers
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 18, color: colors.text, fontWeight: '700' },
  sectionDay: { fontSize: 13, color: colors.textMuted },
  sectionTitle2: {
    fontSize: 18, color: colors.text, fontWeight: '700',
    marginHorizontal: 20, marginTop: 24, marginBottom: 12,
  },

  // Rest card
  restCard: {
    marginHorizontal: 20,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  restLeft: { flex: 1 },
  restTitle: { fontSize: 22, color: colors.text, fontWeight: '700', marginBottom: 4 },
  restSub: { fontSize: 13, color: colors.textSec, marginBottom: 12 },
  restTip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  restTipText: { fontSize: 12, color: colors.success },

  // Workout card
  workoutCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: 130,
  },
  workoutBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 10,
  },
  workoutBadgeText: { fontSize: 10, color: 'rgba(255,255,255,0.85)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  workoutTitle: { fontSize: 24, color: '#fff', fontWeight: '800', letterSpacing: -0.3 },
  workoutFocus: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 3, marginBottom: 12 },
  workoutMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  workoutMetaTxt: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  workoutMetaDot: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  workoutArrow: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },

  // Week dots
  weekRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
  },
  weekDay: { alignItems: 'center', gap: 6 },
  weekDayLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  weekDot: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  weekDotToday: { borderWidth: 2, borderColor: colors.accent },
  weekDotRest: { backgroundColor: colors.cardAlt },

  // Action cards
  actionScroll: { paddingHorizontal: 20, gap: 10, paddingRight: 20 },
  actionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    width: 120,
    borderTopWidth: 3,
  },
  actionIcon: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  actionTitle: { fontSize: 14, color: colors.text, fontWeight: '700', marginBottom: 2 },
  actionSub: { fontSize: 11, color: colors.textMuted },

  absenceCard: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: colors.warningDim,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.warning + '40',
  },
  absenceTitle: { fontSize: 13, color: colors.warning, fontWeight: '700' },
  absenceSub: { fontSize: 11, color: colors.textSec, marginTop: 2 },
});
