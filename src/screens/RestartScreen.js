import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { toLocalDateKey, fromLocalDateKey, daysBetweenLocalDateKeys } from '../utils/date';
import { weeksAway, detrainingFactor, RESTART_MODES } from '../utils/progression';

function lastActivityDate(progress) {
  const dates = [
    ...(progress.completedWorkouts || []).map(w => w.date),
    ...(progress.setLogs || []).map(l => l.date),
  ].filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1] : null;
}

function humanGap(days) {
  if (days == null) return 'a while';
  if (days < 14) return `${days} day${days === 1 ? '' : 's'}`;
  const weeks = Math.round(days / 7);
  if (weeks < 8) return `${weeks} weeks`;
  const months = Math.round(days / 30);
  return `${months} month${months === 1 ? '' : 's'}`;
}

export default function RestartScreen({ navigation }) {
  const { state, dispatch } = useApp();
  const { progress, userProfile } = state;
  const [mode, setMode] = useState('auto');

  const today = toLocalDateKey();
  const lastDate = lastActivityDate(progress);
  const daysOff = lastDate ? daysBetweenLocalDateKeys(lastDate, today) : null;
  const weeksOff = lastDate ? weeksAway(lastDate, today) : 0;
  const factor = detrainingFactor(weeksOff, mode);
  const easePct = Math.round((1 - factor) * 100);
  const name = userProfile?.name || 'athlete';

  // Illustrative ramp: first session eased, climbing back to previous over ~4 sessions.
  const rampBars = Array.from({ length: 4 }, (_, i) =>
    Math.round((factor + (1 - factor) * (i / 3)) * 100)
  );

  const lastPretty = lastDate
    ? fromLocalDateKey(lastDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  function confirmRestart() {
    dispatch({
      type: 'RESTART_PROGRAM',
      payload: { date: today, weeksOff, factor, mode },
    });
    navigation.goBack();
  }

  function notNow() {
    dispatch({ type: 'SNOOZE_RESTART', payload: today });
    navigation.goBack();
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topBar}>
        <TouchableOpacity style={s.closeBtn} onPress={notNow}>
          <Ionicons name="chevron-down" size={22} color={colors.textSec} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroBadge}>
            <Ionicons name="refresh" size={22} color={colors.onAccent} />
          </View>
          <Text style={s.heroTitle}>WELCOME BACK</Text>
          <Text style={s.heroSub}>
            {lastDate
              ? `It's been ${humanGap(daysOff)} since your last session${lastPretty ? ` on ${lastPretty}` : ''}, ${name}.`
              : `Ready to restart your program, ${name}?`}
          </Text>
        </View>

        {/* Reassurance */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <Ionicons name="flash" size={16} color={colors.accentLight} />
            <Text style={s.cardHeadText}>Muscle memory is real</Text>
          </View>
          <Text style={s.body}>
            Time off dials your strength down a little — but it comes back far faster than it took to build.
            Instead of grinding last month's weights, we'll start you a touch lighter and let your logged
            progression climb you right back up.
          </Text>
        </View>

        {/* Ramp visualization */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Your ramp back</Text>
          <Text style={s.cardCaption}>
            Starting ~{easePct}% lighter, building to your previous loads over the first few sessions.
          </Text>
          <View style={s.chart}>
            {rampBars.map((pct, i) => (
              <View key={i} style={s.chartCol}>
                <View style={s.chartTrack}>
                  <View style={[s.chartFill, { height: `${pct}%`, backgroundColor: i === 0 ? colors.accent : colors.info }]} />
                </View>
                <Text style={s.chartPct}>{pct}%</Text>
                <Text style={s.chartLabel}>{i === 0 ? 'Now' : `S${i + 1}`}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Mode selector */}
        <Text style={s.sectionLabel}>How much easier to start?</Text>
        {RESTART_MODES.map(m => {
          const selected = mode === m.id;
          const f = detrainingFactor(weeksOff, m.id);
          return (
            <TouchableOpacity
              key={m.id}
              style={[s.modeCard, selected && s.modeCardActive]}
              onPress={() => setMode(m.id)}
              activeOpacity={0.85}
            >
              <View style={[s.radio, selected && s.radioOn]}>
                {selected && <View style={s.radioDot} />}
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.modeTop}>
                  <Text style={[s.modeLabel, selected && { color: colors.text }]}>{m.label}</Text>
                  <Text style={[s.modePct, selected && { color: colors.accentLight }]}>
                    −{Math.round((1 - f) * 100)}%
                  </Text>
                </View>
                <Text style={s.modeBlurb}>{m.blurb}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Guarantee */}
        <View style={s.keepCard}>
          <Text style={s.keepTitle}>Nothing is lost</Text>
          {[
            'Weight & waist measurements',
            'Every logged set and personal best',
            'Your full workout history & streak record',
          ].map(t => (
            <View key={t} style={s.keepRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={s.keepText}>{t}</Text>
            </View>
          ))}
          <Text style={s.keepNote}>
            We only ease your next few suggested loads and reset the 12-week programme to Week 1. Your records stay
            exactly as they are.
          </Text>
        </View>

        {/* Actions */}
        <TouchableOpacity style={s.primaryBtn} onPress={confirmRestart} activeOpacity={0.85}>
          <Ionicons name="refresh" size={18} color={colors.onAccent} />
          <Text style={s.primaryBtnText}>Restart my program</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.secondaryBtn} onPress={notNow} activeOpacity={0.85}>
          <Text style={s.secondaryBtnText}>Not now — keep going as I was</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 8 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
  },
  scroll: { flex: 1, paddingHorizontal: 20 },

  hero: { alignItems: 'center', paddingTop: 8, paddingBottom: 20 },
  heroBadge: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  heroTitle: {
    fontFamily: fonts.display, fontSize: 44, color: colors.text,
    letterSpacing: 2, lineHeight: 46,
  },
  heroSub: {
    fontFamily: fonts.bodyItalic, fontSize: 14, color: colors.textSec,
    textAlign: 'center', marginTop: 6, lineHeight: 20, paddingHorizontal: 10,
  },

  card: {
    backgroundColor: colors.card, borderRadius: 18, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardHeadText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.accentLight },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text, marginBottom: 4 },
  cardCaption: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, lineHeight: 17, marginBottom: 14 },
  body: { fontFamily: fonts.body, fontSize: 13, color: colors.textSec, lineHeight: 20 },

  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, height: 120 },
  chartCol: { flex: 1, alignItems: 'center' },
  chartTrack: {
    width: '100%', height: 80, backgroundColor: colors.heroCardDeep, borderRadius: 8,
    justifyContent: 'flex-end', overflow: 'hidden',
  },
  chartFill: { width: '100%', borderRadius: 8 },
  chartPct: { fontFamily: fonts.dataSemiBold, fontSize: 12, color: colors.text, marginTop: 6 },
  chartLabel: { fontFamily: fonts.dataMedium, fontSize: 10, color: colors.textMuted, marginTop: 1 },

  sectionLabel: {
    fontFamily: fonts.dataSemiBold, fontSize: 12, color: colors.textSec,
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 8, marginBottom: 10,
  },
  modeCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  modeCardActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  radioOn: { borderColor: colors.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  modeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modeLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textSec },
  modePct: { fontFamily: fonts.dataSemiBold, fontSize: 13, color: colors.textMuted },
  modeBlurb: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, lineHeight: 17, marginTop: 3 },

  keepCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginTop: 12, marginBottom: 20,
    borderWidth: 1, borderColor: colors.border,
  },
  keepTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text, marginBottom: 10 },
  keepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  keepText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSec, flex: 1 },
  keepNote: { fontFamily: fonts.bodyItalic, fontSize: 11, color: colors.textMuted, lineHeight: 16, marginTop: 4 },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.accent, borderRadius: 16, paddingVertical: 16,
  },
  primaryBtnText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onAccent },
  secondaryBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, marginTop: 4 },
  secondaryBtnText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textMuted },
});
