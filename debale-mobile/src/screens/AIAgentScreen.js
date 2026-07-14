import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { ArrowLeft, Send, Sparkles, Bot, User as UserIcon } from 'lucide-react-native';
import { askGroq, DEBALE_SYSTEM_PROMPT } from '../services/groq';
import { colors, spacing, radius, fontSize } from '../theme';

const QUICK_QUESTIONS = [
  'How do I apply for a room?',
  'What happens after acceptance?',
  'How much does a subscription cost?',
  'ደባሌ እንዴት ይሰራል?',
];

const INITIAL = {
  role: 'assistant',
  content: "Hi! I'm the Debale AI Assistant 🏠\n\nAsk me anything about finding a room, listing your space, or how the platform works.",
};

export default function AIAgentScreen({ navigation }) {
  const [messages, setMessages] = useState([INITIAL]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const reply = await askGroq([...history, { role: 'user', content: msg }], DEBALE_SYSTEM_PROMPT);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting. Try again shortly.", error: true }]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={20} color={colors.dark} /></TouchableOpacity>
        <View style={styles.headerIcon}><Sparkles size={16} color={colors.gold} /></View>
        <View>
          <Text style={styles.headerTitle}>Debale AI</Text>
          <Text style={styles.headerSub}>Powered by Groq · Llama 3</Text>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: spacing.xxl, gap: spacing.md }}
        renderItem={({ item }) => (
          <View style={[styles.msgRow, item.role === 'user' && { justifyContent: 'flex-end' }]}>
            {item.role !== 'user' && (
              <View style={[styles.avatar, { backgroundColor: item.error ? colors.redLight : colors.goldLight }]}>
                <Bot size={14} color={item.error ? colors.red : colors.gold} />
              </View>
            )}
            <View style={[styles.bubble, item.role === 'user' ? styles.bubbleMe : styles.bubbleThem]}>
              <Text style={[styles.bubbleText, item.role === 'user' && { color: 'white' }]}>{item.content}</Text>
            </View>
            {item.role === 'user' && (
              <View style={[styles.avatar, { backgroundColor: colors.teal }]}><UserIcon size={14} color="white" /></View>
            )}
          </View>
        )}
        ListFooterComponent={loading ? (
          <View style={styles.msgRow}>
            <View style={[styles.avatar, { backgroundColor: colors.goldLight }]}><Bot size={14} color={colors.gold} /></View>
            <View style={[styles.bubble, styles.bubbleThem]}><ActivityIndicator size="small" color={colors.gray400} /></View>
          </View>
        ) : null}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />

      {messages.length === 1 && (
        <View style={styles.quickRow}>
          {QUICK_QUESTIONS.map(q => (
            <TouchableOpacity key={q} style={styles.quickChip} onPress={() => send(q)}>
              <Text style={styles.quickChipText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask me anything..."
          placeholderTextColor={colors.gray400}
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]} onPress={() => send()} disabled={!input.trim() || loading}>
          <Send size={16} color={input.trim() ? 'white' : colors.gray400} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xxl, paddingTop: 56, paddingBottom: spacing.md, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  backBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  headerIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.goldLight, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontWeight: '700', fontSize: fontSize.base, color: colors.dark },
  headerSub: { fontSize: 10.5, color: colors.gray400 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '72%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.md },
  bubbleMe: { backgroundColor: colors.teal, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: 'white', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.gray100 },
  bubbleText: { fontSize: fontSize.sm, color: colors.dark, lineHeight: 19 },
  quickRow: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.sm, gap: 6 },
  quickChip: { backgroundColor: 'white', borderRadius: radius.sm, padding: 10, borderWidth: 1, borderColor: colors.gray200, marginBottom: 6 },
  quickChipText: { fontSize: fontSize.xs, color: colors.gray700 },
  inputRow: { flexDirection: 'row', gap: 10, padding: spacing.md, paddingBottom: 24, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: colors.gray100, alignItems: 'flex-end' },
  input: { flex: 1, borderWidth: 1.5, borderColor: colors.gray200, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: fontSize.sm, maxHeight: 100 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: colors.gray100 },
});
