import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { ArrowLeft, Send } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { messagesAPI } from '../services/api';
import { colors, spacing, radius, fontSize } from '../theme';

export default function ChatScreen({ route, navigation }) {
  const { applicationId, name } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    messagesAPI.get(applicationId)
      .then(({ messages }) => setMessages(messages || []))
      .catch(err => console.error(err.message))
      .finally(() => setLoading(false));
  }, [applicationId]);

  const send = async () => {
    if (!input.trim()) return;
    setSending(true);
    const content = input.trim();
    setInput('');
    try {
      const { message } = await messagesAPI.send(applicationId, content);
      setMessages(prev => [...prev, message]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      console.error(err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={colors.teal} /></View>;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={20} color={colors.dark} /></TouchableOpacity>
        <View style={styles.avatar}><Text style={styles.avatarText}>{name?.charAt(0)}</Text></View>
        <Text style={styles.headerName}>{name}</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item, i) => item.id || String(i)}
        contentContainerStyle={{ padding: spacing.xxl, gap: spacing.sm }}
        renderItem={({ item }) => {
          const isMe = item.sender_id === user.id;
          return (
            <View style={[styles.bubbleRow, isMe && { justifyContent: 'flex-end' }]}>
              <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                <Text style={[styles.bubbleText, isMe && { color: 'white' }]}>{item.content}</Text>
              </View>
            </View>
          );
        }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={colors.gray400}
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]} onPress={send} disabled={!input.trim() || sending}>
          <Send size={16} color={input.trim() ? 'white' : colors.gray400} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xxl, paddingTop: 56, paddingBottom: spacing.md, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  backBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: 'white', fontWeight: '700', fontSize: fontSize.sm },
  headerName: { fontWeight: '600', fontSize: fontSize.base, color: colors.dark },
  bubbleRow: { flexDirection: 'row' },
  bubble: { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.md },
  bubbleMe: { backgroundColor: colors.teal, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: 'white', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.gray100 },
  bubbleText: { fontSize: fontSize.sm, color: colors.dark, lineHeight: 19 },
  inputRow: { flexDirection: 'row', gap: 10, padding: spacing.md, paddingBottom: 24, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: colors.gray100, alignItems: 'flex-end' },
  input: { flex: 1, borderWidth: 1.5, borderColor: colors.gray200, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: fontSize.sm, maxHeight: 100 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: colors.gray100 },
});
