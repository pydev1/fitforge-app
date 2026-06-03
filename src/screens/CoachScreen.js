import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { sendChatMessage } from '../services/anthropicService';
import { colors } from '../theme/colors';

const QUICK_PROMPTS = [
  "What should I eat today?",
  "Can we adjust today's workout?",
  "My body is feeling sore",
  "How do I lose belly fat?",
  "Quick posture fix",
  "When should I increase weights?",
];

function buildWelcomeMessage(profile) {
  if (!profile?.name) {
    return "Hey! Ready to get after it?\n\nTell me what's on your mind — training, nutrition, recovery. I'll give you something practical you can act on today.";
  }
  const goalStr = profile.goals?.length
    ? profile.goals[0].replace(/_/g, ' ')
    : 'general fitness';
  const equipStr = profile.equipment?.length
    ? profile.equipment.map(e => e.replace(/_/g, ' ')).join(', ')
    : 'bodyweight training';
  return `Hey ${profile.name}! Good to see you.\n\nYour goal is ${goalStr} and you've got ${equipStr} to work with. I've got your full profile — just ask me anything and I'll tailor it to you.\n\nWhat's on your mind?`;
}

export default function CoachScreen({ navigation }) {
  const { state, dispatch } = useApp();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const WELCOME_MESSAGE = {
    role: 'assistant',
    content: buildWelcomeMessage(state.userProfile),
    id: 'welcome',
  };

  const messages = state.chatHistory.length === 0
    ? [WELCOME_MESSAGE]
    : state.chatHistory;

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, loading]);

  async function send(text) {
    const content = (text || input).trim();
    if (!content || loading) return;
    setInput('');

    if (!state.apiKey) {
      Alert.alert(
        'API key needed',
        'Add your Anthropic API key in Settings to chat with your coach.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Go to Settings', onPress: () => navigation.navigate('Settings') },
        ],
      );
      return;
    }

    const userMsg = { role: 'user', content, id: Date.now().toString() };
    dispatch({ type: 'ADD_MESSAGE', payload: userMsg });
    setLoading(true);

    try {
      const history = state.chatHistory.length === 0 ? [] : state.chatHistory;
      const allMessages = [...history, userMsg];
      const reply = await sendChatMessage(allMessages, state.apiKey, state.userProfile);
      const aiMsg = { role: 'assistant', content: reply, id: (Date.now() + 1).toString() };
      dispatch({ type: 'ADD_MESSAGE', payload: aiMsg });
    } catch (err) {
      Alert.alert('Error', err.message || 'Something went wrong. Check your API key in Settings.');
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    Alert.alert('Start fresh?', 'This will clear the conversation history.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => dispatch({ type: 'CLEAR_CHAT' }) },
    ]);
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.avatar}>
              <Ionicons name="barbell-outline" size={18} color={colors.white} />
            </View>
            <View>
              <Text style={s.headerTitle}>Your Coach</Text>
              <Text style={s.headerSub}>Knows your full profile · always in your corner</Text>
            </View>
          </View>
          <TouchableOpacity onPress={clearChat} style={s.clearBtn}>
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Quick Prompts */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.quickScroll}
          contentContainerStyle={s.quickContent}
        >
          {QUICK_PROMPTS.map((p) => (
            <TouchableOpacity key={p} style={s.quickChip} onPress={() => send(p)} disabled={loading}>
              <Text style={s.quickChipText}>{p}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={s.messages}
          contentContainerStyle={s.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => (
            <Bubble key={msg.id} message={msg} />
          ))}
          {loading && <TypingIndicator />}
        </ScrollView>

        {/* Input */}
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder="Message your coach..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={500}
            onSubmitEditing={() => send()}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnDisabled]}
            onPress={() => send()}
            disabled={!input.trim() || loading}
          >
            {loading
              ? <ActivityIndicator size="small" color={colors.white} />
              : <Ionicons name="send" size={18} color={colors.white} />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <View style={[s.bubbleWrap, isUser ? s.bubbleWrapUser : s.bubbleWrapAI]}>
      {!isUser && (
        <View style={s.aiBubbleAvatar}>
          <Ionicons name="barbell-outline" size={12} color={colors.white} />
        </View>
      )}
      <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAI]}>
        <Text style={[s.bubbleText, isUser ? s.bubbleTextUser : s.bubbleTextAI]}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}

function TypingIndicator() {
  return (
    <View style={[s.bubbleWrap, s.bubbleWrapAI]}>
      <View style={s.aiBubbleAvatar}>
        <Ionicons name="barbell-outline" size={12} color={colors.white} />
      </View>
      <View style={[s.bubble, s.bubbleAI, s.typingBubble]}>
        <View style={s.dots}>
          <View style={[s.dot, { opacity: 1 }]} />
          <View style={[s.dot, { opacity: 0.6 }]} />
          <View style={[s.dot, { opacity: 0.3 }]} />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, color: colors.text, fontWeight: '700' },
  headerSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  clearBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickScroll: { maxHeight: 44, borderBottomWidth: 1, borderBottomColor: colors.border },
  quickContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  quickChip: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickChipText: { fontSize: 12, color: colors.textSec, fontWeight: '500' },
  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 10, paddingBottom: 8 },
  bubbleWrap: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4 },
  bubbleWrapUser: { justifyContent: 'flex-end' },
  bubbleWrapAI: { justifyContent: 'flex-start', gap: 8 },
  aiBubbleAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 18,
    padding: 12,
    paddingHorizontal: 14,
  },
  bubbleUser: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  bubbleTextUser: { color: colors.white },
  bubbleTextAI: { color: colors.text },
  typingBubble: { paddingVertical: 14 },
  dots: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.accentLight,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    color: colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.accentDim, opacity: 0.5 },
});
