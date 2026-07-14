import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MessageSquare, Home } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { applicationsAPI, listingsAPI } from '../services/api';
import { colors, spacing, radius, fontSize, shadow } from '../theme';

export default function MessagesScreen({ navigation }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      if (user.role === 'seeker') {
        const { applications } = await applicationsAPI.mine();
        setConversations((applications || []).filter(a => a.status === 'accepted').map(a => ({
          id: a.id,
          name: a.listings?.users?.name || 'Provider',
          subtitle: a.listings?.title,
        })));
      } else {
        const { listings } = await listingsAPI.mine();
        const accepted = [];
        for (const listing of listings || []) {
          if (listing.status !== 'filled' && listing.status !== 'active') continue;
          try {
            const { applicants } = await applicationsAPI.forListing(listing.id);
            (applicants || []).filter(a => a.status === 'accepted').forEach(a => {
              accepted.push({ id: a.id, name: a.users?.name || 'Seeker', subtitle: listing.title });
            });
          } catch {}
        }
        setConversations(accepted);
      }
    } catch (err) {
      console.error('Messages error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { fetchConversations(); }, [fetchConversations]));

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={colors.teal} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.sub}>Conversations unlock after acceptance</Text>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.empty}>
          <MessageSquare size={40} color={colors.gray300} />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySub}>Messaging opens up once a match is accepted</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.xxl, gap: spacing.sm }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Chat', { applicationId: item.id, name: item.name })}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{item.name.charAt(0)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <View style={styles.subRow}><Home size={11} color={colors.gray400} /><Text style={styles.subtitle}>{item.subtitle}</Text></View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
  header: { paddingHorizontal: spacing.xxl, paddingTop: 56, paddingBottom: spacing.lg },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.dark },
  sub: { fontSize: fontSize.sm, color: colors.gray500, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'white', borderRadius: radius.md, padding: spacing.lg, ...shadow.sm },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: 'white', fontWeight: '700', fontSize: fontSize.md },
  name: { fontWeight: '600', fontSize: fontSize.base, color: colors.dark },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  subtitle: { fontSize: fontSize.xs, color: colors.gray500 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: spacing.xxxl },
  emptyTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.dark, marginTop: 8 },
  emptySub: { fontSize: fontSize.sm, color: colors.gray500, textAlign: 'center' },
});
