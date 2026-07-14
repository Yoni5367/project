import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Check, X, Users, ChevronRight } from 'lucide-react-native';
import { housemateAPI } from '../services/api';
import { colors, spacing, radius, fontSize, shadow } from '../theme';

export default function HousemateSuggestionsScreen({ navigation }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await housemateAPI.getSuggestions();
      setSuggestions(res.suggestions || []);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchSuggestions().finally(() => setLoading(false));
  }, [fetchSuggestions]));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSuggestions();
    setRefreshing(false);
  };

  const handleAccept = async (userId) => {
    setActionLoading(userId);
    try {
      await housemateAPI.acceptSuggestion(userId);
      Alert.alert('Added to group!', 'This person has been added to your housemate group.', [
        { text: 'View Group', onPress: () => navigation.navigate('HousemateGroup') },
        { text: 'Continue Browsing' },
      ]);
      setSuggestions(prev => prev.filter(s => s.user.id !== userId));
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (userId) => {
    setActionLoading(userId);
    try {
      await housemateAPI.declineSuggestion(userId);
      setSuggestions(prev => prev.filter(s => s.user.id !== userId));
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={colors.teal} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.dark} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.myGroupBtn} onPress={() => navigation.navigate('HousemateGroup')}>
          <Users size={16} color={colors.teal} />
          <Text style={styles.myGroupBtnText}>My Group</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={suggestions}
        keyExtractor={item => item.user.id}
        contentContainerStyle={{ padding: spacing.xxl, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
        ListHeaderComponent={() => (
          <View style={{ marginBottom: spacing.lg }}>
            <Text style={styles.title}>Suggested Housemates</Text>
            <Text style={styles.subtitle}>AI-matched based on your preferences. Accept the ones you like to build your group.</Text>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Users size={48} color={colors.gray300} />
            <Text style={styles.emptyTitle}>No suggestions yet</Text>
            <Text style={styles.emptySub}>Complete your intake form to get AI-matched with compatible seekers.</Text>
            <TouchableOpacity style={styles.intakeBtn} onPress={() => navigation.navigate('HousemateIntake')}>
              <Text style={styles.intakeBtnText}>Complete Intake Form</Text>
            </TouchableOpacity>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.user?.name?.charAt(0) || '?'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{item.user?.name || 'Unknown'}</Text>
                <View style={styles.pctBadge}>
                  <Text style={styles.pctText}>{item.compatibility_pct}% match</Text>
                </View>
              </View>
            </View>
            <Text style={styles.explanation}>{item.ai_explanation}</Text>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.declineBtn]}
                onPress={() => handleDecline(item.user.id)}
                disabled={actionLoading === item.user.id}
              >
                {actionLoading === item.user.id ? (
                  <ActivityIndicator size="small" color={colors.red} />
                ) : (
                  <><X size={16} color={colors.red} /><Text style={[styles.actionText, { color: colors.red }]}>Decline</Text></>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={() => handleAccept(item.user.id)}
                disabled={actionLoading === item.user.id}
              >
                {actionLoading === item.user.id ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <><Check size={16} color="white" /><Text style={[styles.actionText, { color: 'white' }]}>Accept</Text></>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xxl, paddingTop: 56, paddingBottom: spacing.md },
  backBtn: { padding: 8, borderRadius: radius.sm, backgroundColor: colors.gray100 },
  myGroupBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.tealLight, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full },
  myGroupBtnText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.teal },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.dark },
  subtitle: { fontSize: fontSize.sm, color: colors.gray500, marginTop: 4 },
  card: { backgroundColor: 'white', borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md, ...shadow.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: 'white', fontWeight: '700', fontSize: fontSize.md },
  cardName: { fontWeight: '700', fontSize: fontSize.base, color: colors.dark },
  pctBadge: { backgroundColor: colors.tealLight, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 4 },
  pctText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.teal },
  explanation: { fontSize: fontSize.sm, color: colors.gray600, lineHeight: 20, marginBottom: spacing.md },
  cardActions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: radius.sm },
  declineBtn: { backgroundColor: colors.redLight, borderWidth: 1, borderColor: colors.redLight },
  acceptBtn: { backgroundColor: colors.teal },
  actionText: { fontWeight: '600', fontSize: fontSize.sm },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.dark, marginTop: spacing.md },
  emptySub: { fontSize: fontSize.sm, color: colors.gray500, textAlign: 'center', marginTop: 4 },
  intakeBtn: { backgroundColor: colors.teal, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 24, marginTop: spacing.lg },
  intakeBtnText: { color: 'white', fontWeight: '700', fontSize: fontSize.sm },
});
