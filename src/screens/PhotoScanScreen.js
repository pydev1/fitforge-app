import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { analyzePhoto } from '../services/anthropicService';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');

export default function PhotoScanScreen({ navigation }) {
  const { state } = useApp();
  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [result, setResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  async function pickFromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to use this feature.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.6,
      base64: true,
    });
    if (!picked.canceled && picked.assets?.[0]) {
      const asset = picked.assets[0];
      setImageUri(asset.uri);
      setImageBase64(asset.base64);
      setMimeType(asset.mimeType || 'image/jpeg');
      setResult(null);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera access to use this feature.');
      return;
    }
    const taken = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.6,
      base64: true,
    });
    if (!taken.canceled && taken.assets?.[0]) {
      const asset = taken.assets[0];
      setImageUri(asset.uri);
      setImageBase64(asset.base64);
      setMimeType(asset.mimeType || 'image/jpeg');
      setResult(null);
    }
  }

  async function analyse() {
    if (!state.apiKey) {
      Alert.alert(
        'API Key Required',
        'Add your Anthropic API key in Settings to use photo analysis.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => navigation.navigate('Settings') },
        ],
      );
      return;
    }
    if (!imageBase64) return;
    setAnalyzing(true);
    setResult(null);
    try {
      const text = await analyzePhoto(imageBase64, mimeType, state.apiKey, state.userProfile);
      setResult(text);
    } catch (err) {
      Alert.alert('Analysis failed', err.message || 'Something went wrong. Check your API key.');
    } finally {
      setAnalyzing(false);
    }
  }

  function reset() {
    setImageUri(null);
    setImageBase64(null);
    setResult(null);
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Photo Scan</Text>
          <Text style={s.subtitle}>AI-powered exercise analysis</Text>
        </View>

        {/* Info Banner */}
        <View style={s.infoBanner}>
          <Ionicons name="information-circle-outline" size={16} color={colors.info} style={{ marginRight: 8 }} />
          <Text style={s.infoText}>
            Take or upload a photo — of yourself, your setup, your posture — and Claude will analyse it and suggest exercises tailored to you.
          </Text>
        </View>

        {/* Image Area */}
        {imageUri ? (
          <View style={s.imageContainer}>
            <Image source={{ uri: imageUri }} style={s.image} resizeMode="cover" />
            <TouchableOpacity style={s.resetBtn} onPress={reset}>
              <Ionicons name="close-circle" size={28} color={colors.secondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.placeholder}>
            <Ionicons name="image-outline" size={56} color={colors.textMuted} />
            <Text style={s.placeholderText}>No image selected</Text>
            <Text style={s.placeholderSub}>Try a photo of your posture, equipment, or workout area</Text>
          </View>
        )}

        {/* Buttons */}
        {!imageUri ? (
          <View style={s.pickRow}>
            <TouchableOpacity style={s.pickBtn} onPress={takePhoto}>
              <Ionicons name="camera" size={22} color={colors.white} />
              <Text style={s.pickBtnText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.pickBtn, s.pickBtnSecondary]} onPress={pickFromGallery}>
              <Ionicons name="images-outline" size={22} color={colors.accentLight} />
              <Text style={[s.pickBtnText, { color: colors.accentLight }]}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.pickRow}>
            <TouchableOpacity
              style={[s.pickBtn, s.analyseBtn, analyzing && s.analyseBtnDisabled]}
              onPress={analyse}
              disabled={analyzing}
            >
              {analyzing
                ? <ActivityIndicator size="small" color={colors.white} />
                : <Ionicons name="sparkles" size={22} color={colors.white} />
              }
              <Text style={s.pickBtnText}>
                {analyzing ? 'Analysing...' : 'Analyse with AI'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Result */}
        {analyzing && (
          <View style={s.loadingCard}>
            <ActivityIndicator size="large" color={colors.accentLight} />
            <Text style={s.loadingText}>Claude is analysing your photo...</Text>
            <Text style={s.loadingSubText}>Checking posture, equipment, and building your recommendations</Text>
          </View>
        )}

        {result && (
          <View style={s.resultCard}>
            <View style={s.resultHeader}>
              <Ionicons name="sparkles" size={18} color={colors.accentLight} />
              <Text style={s.resultTitle}>AI Analysis</Text>
            </View>
            <Text style={s.resultText}>{result}</Text>
            <TouchableOpacity style={s.newScanBtn} onPress={reset}>
              <Ionicons name="refresh" size={16} color={colors.accentLight} />
              <Text style={s.newScanBtnText}>New Scan</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tips */}
        {!imageUri && !result && (
          <View style={s.tipsCard}>
            <Text style={s.tipsTitle}>What to photograph</Text>
            {TIPS.map((tip) => (
              <View key={tip.text} style={s.tipRow}>
                <Text style={s.tipIcon}>{tip.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.tipHead}>{tip.head}</Text>
                  <Text style={s.tipText}>{tip.text}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const TIPS = [
  { icon: '🧍', head: 'Side posture shot', text: 'Stand sideways for a full-body posture analysis — forward head, shoulder rounding, pelvic tilt.' },
  { icon: '💪', head: 'Mid-workout selfie', text: 'Snap yourself during an exercise for form feedback and muscle engagement tips.' },
  { icon: '🏋️', head: 'Your home gym', text: 'Show your equipment setup and get exercise ideas based on exactly what you own.' },
  { icon: '🪑', head: 'Your desk setup', text: 'Photo of your workstation to get specific posture correction advice for your environment.' },
];

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 28, color: colors.text, fontWeight: '700' },
  subtitle: { fontSize: 13, color: colors.textSec, marginTop: 2 },
  infoBanner: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.info + '18',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.info + '35',
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 12, color: colors.textSec, lineHeight: 19 },
  imageContainer: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: { width: '100%', height: 260 },
  resetBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: colors.bg,
    borderRadius: 14,
  },
  placeholder: {
    marginHorizontal: 16,
    height: 200,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderText: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  placeholderSub: { fontSize: 12, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 24 },
  pickRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 14,
  },
  pickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  pickBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.accentLight,
  },
  analyseBtn: { backgroundColor: colors.secondary },
  analyseBtnDisabled: { opacity: 0.6 },
  pickBtnText: { fontSize: 14, color: colors.white, fontWeight: '700' },
  loadingCard: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingText: { fontSize: 15, color: colors.text, fontWeight: '600' },
  loadingSubText: { fontSize: 12, color: colors.textSec, textAlign: 'center', lineHeight: 19 },
  resultCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultTitle: { fontSize: 15, color: colors.text, fontWeight: '700' },
  resultText: { fontSize: 13, color: colors.textSec, lineHeight: 21 },
  newScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 6,
  },
  newScanBtnText: { fontSize: 13, color: colors.accentLight, fontWeight: '600' },
  tipsCard: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipsTitle: { fontSize: 14, color: colors.text, fontWeight: '700', marginBottom: 14 },
  tipRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  tipIcon: { fontSize: 22, width: 30, textAlign: 'center' },
  tipHead: { fontSize: 13, color: colors.text, fontWeight: '600', marginBottom: 2 },
  tipText: { fontSize: 12, color: colors.textSec, lineHeight: 18 },
});
