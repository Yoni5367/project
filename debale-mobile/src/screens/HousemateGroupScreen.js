import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Send, UserPlus, Home, MessageSquare } from 'lucide-react-native';
import { housemateAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, fontSize, shadow } from '../theme';

export default function HousemateGroupScreen({ navigation }) {
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [applying, setApplying] = useState(false);
  const listRef = useRef(null);

  const fetchGroup = useCallback(async () => {
    try {
      const res = await housemateAPI.myGroup();
      setGroup(res.group);
      if (res.group) {
        const msgRes = await housemateAPI.getMessages(res.group.id);
        setMessages(msgRes.messages || []);
      }
    } catch (err) {
      console.error(err.message);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchGroup().finally(() => setLoading(false));
  }, [fetchGroup]));

  const sendMessage = async () => {
    if (!input.trim() || !group) return;
    setSending(true);
    const content = input.trim();
    setInput('');
    try {
      const { message } = await housemateAPI.sendMessage(group.id, content);
      setMessages(prev => [...prev, message]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      console.error(err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={colors.teal} /></View>;

  if (!group) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={20} color={colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Group</Text>
        </View>
        <View style={styles.empty}>
          <UserPlus size={48} color={colors.gray300} />
          <Text style={styles.emptyTitle}>No Group Yet</Text>
          <Text style={styles.emptySub}>Accept suggestions to start building your housemate group.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('HousemateSuggestions')}>
            <Text style={styles.primaryBtnText}>Find Housemates</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const statusLabel = { forming: 'Forming', applying: 'Applied', accepted: 'Accepted 🎉', rejected: 'Rejected' };
  const statusColor = { forming: colors.gray500, applying: colors.purple, accepted: colors.green, rejected: colors.red };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Group</Text>
        <View style={[styles.statusBadge, { backgroundColor: (statusColor[group.status] || colors.gray500) + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor[group.status] || colors.gray500 }]}>
            {statusLabel[group.status] || group.status}
          </Text>
        </View>
      </View>

      {/* Members */}
      <View style={styles.membersSection}>
        <Text style={styles.sectionTitle}>Members ({group.members?.length || 0})</Text>
        <FlatList
          horizontal
          data={group.members || []}
          keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.memberCard}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>{item.name?.charAt(0) || '?'}</Text>
              </View>
              <Text style={styles.memberName}>{item.name || 'Unknown'}</Text>
            </View>
          )}
          ListFooterComponent={
            <TouchableOpacity style={styles.addMemberBtn} onPress={() => navigation.navigate('HousemateSuggestions')}>
              <UserPlus size={20} color={colors.teal} />
              <Text style={styles.addMemberText}>Add</Text>
            </TouchableOpacity>
          }
        />
      </View>

      {/* Group info / Apply */}
      {group.status === 'forming' && (
        <View style={styles.applyPrompt}>
          <Home size={20} color={colors.teal} />
          <Text style={{ flex: 1, fontSize: fontSize.sm, color: colors.dark }}>
            Ready to move in together? Find a multi-room apartment and apply as a group.
          </Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.navigate('HousemateMultiRoom')}>
            <Text style={styles.browseBtnText}>Browse</Text>
          </TouchableOpacity>
        </View>
      )}

      {group.listing && (
        <View style={styles.listingCard}>
          <Text style={styles.listingTitle}>{group.listing.title}</Text>
          <Text style={styles.listingSub}>{group.listing.city} — {group.listing.price?.toLocaleString()} ETB</Text>
          {group.application && (
            <View style={[styles.statusBadge, { backgroundColor: (statusColor[group.application.status] || colors.gray500) + '20', alignSelf: 'flex-start', marginTop: 6 }]}>
              <Text style={[styles.statusText, { color: statusColor[group.application.status] || colors.gray500 }]}>
                Application: {group.application.status}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Chat */}
      <View style={styles.chatHeader}>
        <MessageSquare size={16} color={colors.teal} />
        <Text style={styles.chatHeaderText}>Group Chat</Text>
      </View>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => item.id}
        style={styles.chatList}
        contentContainerStyle={{ padding: spacing.md }}
        renderItem={({ item }) => {
          const isMe = item.sender_id === user?.id;
          return (
            <View style={[styles.msgBubble, isMe ? styles.msgMine : styles.msgOther]}>
              {!isMe && <Text style={styles.msgSender}>{item.users?.name || 'User'}</Text>}
              <Text style={[styles.msgText, isMe && { color: 'white' }]}>{item.content}</Text>
              <Text style={[styles.msgTime, isMe && { color: 'rgba(255,255,255,0.7)' }]}>
                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          );
        }}
      />

      <View style={styles.inputRow}>
        <TextInput style={styles.chatInput} value={input} onChangeText={setInput}
          placeholder="Type a message..." placeholderTextColor={colors.gray400} />
        <TouchableOpacity style={[styles.sendBtn, !input.trim() && { opacity: 0.5 }]}
          disabled={!input.trim() || sending} onPress={sendMessage}>
          {sending ? <ActivityIndicator size="small" color="white" /> : <Send size={18} color="white" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xxl, paddingTop: 56, paddingBottom: spacing.md },
  backBtn: { padding: 8, borderRadius: radius.sm, backgroundColor: colors.gray100 },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.dark, flex: 1 },
  statusBadge: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 10.5, fontWeight: '600' },
  membersSection: { paddingHorizontal: spacing.xxl, marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.dark, marginBottom: spacing.sm },
  memberCard: { alignItems: 'center', marginRight: spacing.md },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  memberAvatarText: { color: 'white', fontWeight: '700', fontSize: fontSize.sm },
  memberName: { fontSize: 10.5, color: colors.gray600, fontWeight: '500' },
  addMemberBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.teal, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  addMemberText: { fontSize: 9, color: colors.teal, fontWeight: '600', marginTop: 1 },
  applyPrompt: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.tealLight, marginHorizontal: spacing.xxl, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md },
  browseBtn: { backgroundColor: colors.teal, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 8 },
  browseBtnText: { color: 'white', fontWeight: '600', fontSize: fontSize.xs },
  listingCard: { backgroundColor: 'white', marginHorizontal: spacing.xxl, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md, ...shadow.sm },
  listingTitle: { fontWeight: '700', fontSize: fontSize.sm, color: colors.dark },
  listingSub: { fontSize: fontSize.xs, color: colors.gray500, marginTop: 2 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.xxl, marginBottom: spacing.sm },
  chatHeaderText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.dark },
  chatList: { flex: 1, backgroundColor: colors.gray50, marginHorizontal: spacing.xxl, borderRadius: radius.md, marginBottom: spacing.sm },
  msgBubble: { maxWidth: '80%', padding: 10, borderRadius: radius.md, marginBottom: 8 },
  msgMine: { backgroundColor: colors.teal, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  msgOther: { backgroundColor: 'white', alignSelf: 'flex-start', borderBottomLeftRadius: 4, ...shadow.sm },
  msgSender: { fontSize: 10, fontWeight: '600', color: colors.teal, marginBottom: 2 },
  msgText: { fontSize: fontSize.sm, color: colors.dark, lineHeight: 18 },
  msgTime: { fontSize: 9, color: colors.gray400, marginTop: 2, alignSelf: 'flex-end' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xxl, paddingVertical: spacing.sm, paddingBottom: 30 },
  chatInput: { flex: 1, backgroundColor: 'white', borderRadius: radius.full, paddingHorizontal: 16, paddingVertical: 12, fontSize: fontSize.sm, borderWidth: 1, borderColor: colors.gray200 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.dark, marginTop: spacing.md },
  emptySub: { fontSize: fontSize.sm, color: colors.gray500, textAlign: 'center', marginTop: 4 },
  primaryBtn: { backgroundColor: colors.teal, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 24, marginTop: spacing.lg },
  primaryBtnText: { color: 'white', fontWeight: '700', fontSize: fontSize.sm },
});
