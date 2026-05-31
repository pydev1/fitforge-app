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

  const bmi = userProfile.height && userProfile.weight
    ? (userProfile.weight / Math.pow(userProfile.height / 100, 2)).toFixed(1)
    : '—';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>{getGreeting()},</Text>
            <Text style={s.name}>{userProfile.name || 'Athlete'}</Text>
          </View>
          <TouchableOpacity style={s.settingsBtn} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-sharp" size={22} color={colors.textSec} />
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={s.statsRow}>
          <StatCard icon="scale-outline" label="Weight" value={currentWeight ?? '—'} unit="kg" />
          <StatCard icon="body-outline" label="Waist" value={userProfile.waist ?? '—'} unit={userProfile.waist ? 'cm' : ''} />
          <StatCard icon="fitness-outline" label="BMI" value={bmi} unit="" />
          <StatCard icon="barbell-outline" label="Sessions" value={`${totalWorkouts}`} unit="" />
        </View>

        {/* Today's Workout */}
        <Text style={s.section}>Today's Session</Text>
        <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Workout')}>
          {!todayWorkout || todayWorkout.isRest ? (
            <View style={[s.workoutCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.workoutSubtitle}>{todayWorkout?.dayName ?? DAYS[new Date().getDay()]}</Text>
                <Text style={s.workoutTitle}>Rest Day 😴</Text>
                <Text style={s.workoutFocus}>Recovery is where the gains happen</Text>
              </View>
              <Ionicons name="moon-outline" size={44} color={colors.accentLight} style={{ opacity: 0.5 }} />
            </View>
          ) : (
            <LinearGradient
              colors={[todayWorkout.color + 'CC', todayWorkout.color]}
              style={s.workoutCard}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.workoutSubtitleLight}>{todayWorkout.dayName}</Text>
                <Text style={s.workoutTitleLight}>{todayWorkout.name}</Text>
                <Text style={s.workoutFocusLight}>{todayWorkout.focus}</Text>
                <View style={s.workoutMeta}>
                  <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.75)" />
                  <Text style={s.workoutMetaTxt}>{todayWorkout.duration}</Text>
                  <Ionicons name="barbell-outline" size={13} color="rgba(255,255,255,0.75)" style={{ marginLeft: 10 }} />
                  <Text style={s.workoutMetaTxt}>{todayWorkout.exercises?.length ?? 0} exercises</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.5)" />
            </LinearGradient>
          )}
        </TouchableOpacity>

        {/* Quick Actions */}
        <Text style={s.section}>Quick Actions</Text>
        <View style={s.actionsRow}>
          <Action icon="chatbubble-ellipses" label="Coach" color={colors.accent} onPress={() => navigation.navigate('Coach')} />
          <Action icon="camera" label="Photo Scan" color={colors.secondary} onPress={() => navigation.navigate('Scan')} />
          <Action icon="stats-chart" label="Progress" color={colors.success} onPress={() => navigation.navigate('Progress')} />
          <Action icon="body" label="Posture Fix" color={colors.warning} onPress={() => navigation.navigate('Workout', { tab: 'posture' })} />
        </View>

        {/* Progress Snapshot */}
        {weightDelta !== null && (
          <>
            <Text style={s.section}>Since Day 1</Text>
            <View style={s.snapshotRow}>
              <SnapshotCard
                label="Weight Change"
                value={`${parseFloat(weightDelta) > 0 ? '+' : ''}${weightDelta} kg`}
                color={parseFloat(weightDelta) <= 0 ? colors.success : colors.warning}
              />
              <SnapshotCard label="Total Workouts" value={`${totalWorkouts}`} color={colors.accentLight} />
            </View>
          </>
        )}

        {/* Plan info chip */}
        {generatedPlan && (
          <View style={s.planChip}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} style={{ marginRight: 6 }} />
            <Text style={s.planChipText}>
              {Object.values(generatedPlan.schedule).filter(Boolean).length}-day personalised plan active
            </Text>
          </View>
        )}

        {/* Motivation */}
        <LinearGradient colors={[colors.surface, colors.card]} style={s.quoteCard}>
          <Ionicons name="flame" size={22} color={colors.warning} style={{ marginBottom: 10 }} />
          <Text style={s.quoteText}>"{quote.quote}"</Text>
          <Text style={s.quoteAuthor}>— {quote.author}</Text>
        </LinearGradient>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value, unit }) {
  return (
    <View style={sc.card}>
      <Ionicons name={icon} size={17} color={colors.accentLight} style={{ marginBottom: 4 }} />
      <Text style={sc.value}>{value}<Text style={sc.unit}>{unit}</Text></Text>
      <Text style={sc.label}>{label}</Text>
    </View>
  );
}

function Action({ icon, label, color, onPress }) {
  return (
    <TouchableOpacity style={ac.wrap} onPress={onPress} activeOpacity={0.7}>
      <View style={[ac.icon, { backgroundColor: color + '25' }]}>
        <Ionicons name={icon} size={23} color={color} />
      </View>
      <Text style={ac.label}>{label}</Text>
    </TouchableOpacity>
  );
}

function SnapshotCard({ label, value, color }) {
  return (
    <View style={sn.card}>
      <Text style={[sn.value, { color }]}>{value}</Text>
      <Text style={sn.label}>{label}</Text>
    </View>
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
    paddingBottom: 4,
  },
  greeting: { fontSize: 13, color: colors.textSec, fontWeight: '400' },
  name: { fontSize: 26, color: colors.text, fontWeight: '700', marginTop: 2 },
  settingsBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  section: {
    fontSize: 17, color: colors.text, fontWeight: '700',
    marginHorizontal: 20, marginTop: 20, marginBottom: 10,
  },
  workoutCard: {
    marginHorizontal: 20, borderRadius: 18, padding: 20,
    flexDirection: 'row', alignItems: 'center',
  },
  workoutSubtitle: { fontSize: 12, color: colors.textSec, fontWeight: '500', marginBottom: 4 },
  workoutTitle: { fontSize: 22, color: colors.text, fontWeight: '700', marginBottom: 4 },
  workoutFocus: { fontSize: 13, color: colors.textSec },
  workoutSubtitleLight: { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: '500', marginBottom: 4 },
  workoutTitleLight: { fontSize: 22, color: '#fff', fontWeight: '700', marginBottom: 4 },
  workoutFocusLight: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 10 },
  workoutMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  workoutMetaTxt: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  actionsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10 },
  snapshotRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10 },
  planChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: colors.success + '15',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  planChipText: { fontSize: 12, color: colors.textSec },
  quoteCard: {
    margin: 20, marginTop: 24, borderRadius: 18, padding: 22,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  quoteText: {
    fontSize: 14, color: colors.text, fontStyle: 'italic',
    textAlign: 'center', lineHeight: 22, fontWeight: '500',
  },
  quoteAuthor: { fontSize: 12, color: colors.textSec, marginTop: 10, fontWeight: '500' },
});

const sc = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: colors.card, borderRadius: 12,
    padding: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  value: { fontSize: 15, color: colors.text, fontWeight: '700' },
  unit: { fontSize: 9, color: colors.textSec, fontWeight: '400' },
  label: { fontSize: 9, color: colors.textMuted, marginTop: 2 },
});

const ac = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center' },
  icon: {
    width: 54, height: 54, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  label: { fontSize: 10, color: colors.textSec, textAlign: 'center', fontWeight: '600' },
});

const sn = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: colors.card, borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: colors.border,
  },
  value: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  label: { fontSize: 12, color: colors.textSec },
});
