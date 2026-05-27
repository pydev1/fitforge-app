import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';

export default function SettingsScreen({ navigation }) {
  const { state, dispatch } = useApp();

  const [name, setName] = useState(state.userName);
  const [apiKey, setApiKey] = useState(state.apiKey);
  const [height, setHeight] = useState(String(state.userProfile.height));
  const [weight, setWeight] = useState(String(state.userProfile.weight));
  const [waist, setWaist] = useState(String(state.userProfile.waist));
  const [showKey, setShowKey] = useState(false);

  function save() {
    if (name.trim()) dispatch({ type: 'SET_USER_NAME', payload: name.trim() });
    dispatch({ type: 'SET_API_KEY', payload: apiKey.trim() });
    const h = parseFloat(height);
    const w = parseFloat(weight);
    const wst = parseFloat(waist);
    if (!isNaN(h) && !isNaN(w) && !isNaN(wst)) {
      dispatch({ type: 'UPDATE_PROFILE', payload: { height: h, weight: w, waist: wst } });
    }
    Alert.alert('Saved!', 'Your settings have been updated.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  }

  const bmi = (parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2));

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-down" size={22} color={colors.textSec} />
          </TouchableOpacity>
          <Text style={s.title}>Settings</Text>
          <TouchableOpacity style={s.saveBtn} onPress={save}>
            <Text style={s.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* API Key Section */}
        <Section title="Anthropic API Key" icon="key-outline">
          <Text style={s.sectionNote}>
            Required to use the AI Coach and Photo Scan features. Get your key at console.anthropic.com.
          </Text>
          <View style={s.keyRow}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="sk-ant-api03-..."
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={s.eyeBtn} onPress={() => setShowKey(!showKey)}>
              <Ionicons name={showKey ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSec} />
            </TouchableOpacity>
          </View>
          {apiKey ? (
            <View style={s.keyStatus}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={s.keyStatusText}>API key is set</Text>
            </View>
          ) : (
            <View style={s.keyStatus}>
              <Ionicons name="warning-outline" size={14} color={colors.warning} />
              <Text style={[s.keyStatusText, { color: colors.warning }]}>No API key — AI features disabled</Text>
            </View>
          )}
        </Section>

        {/* Profile Section */}
        <Section title="Your Profile" icon="person-outline">
          <Field label="Display Name" value={name} onChange={setName} placeholder="Your name" />
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Field label="Height (cm)" value={height} onChange={setHeight} placeholder="172" numeric />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field label="Weight (kg)" value={weight} onChange={setWeight} placeholder="67" numeric />
            </View>
          </View>
          <Field label="Waist (cm)" value={waist} onChange={setWaist} placeholder="87" numeric />
          {!isNaN(bmi) && (
            <View style={s.bmiRow}>
              <Text style={s.bmiLabel}>BMI: </Text>
              <Text style={[s.bmiValue, { color: getBmiColor(bmi) }]}>{bmi.toFixed(1)}</Text>
              <Text style={s.bmiCat}> · {getBmiCategory(bmi)}</Text>
            </View>
          )}
        </Section>

        {/* Your Setup */}
        <Section title="Your Setup" icon="barbell-outline">
          <InfoRow label="Equipment" value="Dumbbells · Incline Bench · Resistance Band" />
          <InfoRow label="Body Type" value="Skinny-Fat (recomposition focus)" />
          <InfoRow label="Job Type" value="Desk Job (posture correction included)" />
          <InfoRow label="Goal" value="Body recomposition — lose belly fat, build muscle" />
          <Text style={s.setupNote}>
            These are pre-configured for your profile. The AI coach and workouts are tailored to these details.
          </Text>
        </Section>

        {/* App Info */}
        <Section title="About" icon="information-circle-outline">
          <InfoRow label="App" value="FitForge" />
          <InfoRow label="AI Model" value="Claude claude-sonnet-4-6 (Anthropic)" />
          <InfoRow label="Version" value="1.0.0" />
        </Section>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, icon, children }) {
  return (
    <View style={ss.section}>
      <View style={ss.sectionHeader}>
        <Ionicons name={icon} size={16} color={colors.accentLight} />
        <Text style={ss.sectionTitle}>{title}</Text>
      </View>
      <View style={ss.sectionBody}>{children}</View>
    </View>
  );
}

function Field({ label, value, onChange, placeholder, numeric }) {
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <TextInput
        style={f.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={ir.row}>
      <Text style={ir.label}>{label}</Text>
      <Text style={ir.value}>{value}</Text>
    </View>
  );
}

function getBmiColor(bmi) {
  if (bmi < 18.5) return colors.info;
  if (bmi < 25) return colors.success;
  if (bmi < 30) return colors.warning;
  return colors.secondary;
}

function getBmiCategory(bmi) {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 18, color: colors.text, fontWeight: '700' },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  saveBtnText: { fontSize: 13, color: colors.white, fontWeight: '700' },
  sectionNote: {
    fontSize: 12,
    color: colors.textSec,
    lineHeight: 18,
    marginBottom: 12,
  },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    backgroundColor: colors.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    fontFamily: 'monospace',
  },
  eyeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  keyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  keyStatusText: { fontSize: 12, color: colors.success },
  row: { flexDirection: 'row' },
  bmiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: colors.bg,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bmiLabel: { fontSize: 13, color: colors.textSec },
  bmiValue: { fontSize: 14, fontWeight: '700' },
  bmiCat: { fontSize: 13, color: colors.textSec },
  setupNote: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 10,
    lineHeight: 17,
    fontStyle: 'italic',
  },
});

const ss = StyleSheet.create({
  section: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 13, color: colors.textSec, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionBody: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
});

const f = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontSize: 12, color: colors.textSec, marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: colors.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
});

const ir = StyleSheet.create({
  row: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: { fontSize: 11, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  value: { fontSize: 13, color: colors.text },
});
