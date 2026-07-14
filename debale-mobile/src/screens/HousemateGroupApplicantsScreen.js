import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Users, Check, X } from 'lucide-react-native';
import { housemateAPI } from '../services/api';
import { colors, spacing, radius, fontSize, shadow } from '../theme';

export default function HousemateGroupApplicantsScreen({ navigation }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchApplications = useCallback(async () => {
    try {
      const res = await housemateAPI.getGroupApplications();
      setApplications(res.applications || []);
    } catch (err) {
      console.error(err.message);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchApplications().finally(() => setLoading(false));
  }, [fetchApplications]));

  const handleDecision = async (appId, status) => {
    setActionLoading(appId);
    try {
      await housemateAPI.updateGroupAppStatus(appId, status);
      Alert.alert('Done', `Group application ${status}.`);
      setApplications(prev => prev.filter(a => a.id !== appId));
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={colors.gold} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group Applicants</Text>
      </View>

      <FlatList
        data={applications}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: spacing.xxl, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchApplications} tintColor={colors.gold} />}
        ListHeaderComponent={() => (
          <Text style={styles.countText}>{applications.length} pending group {applications.length === 1 ? 'application' : 'applications'}</Text>
        )}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Users size={48} color={colors.gray300} />
            <Text style={styles.emptyTitle}>No pending group applications</Text>
            <Text style={styles.emptySub}>Group applications from seekers will appear here.</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Users size={20} color={colors.gold} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Group Application</Text>
                <Text style={styles.cardSub}>Members: {item.member_count || '?'} — {item.listing_title}</Text>
              </View>
            </View>
            <Text style={styles.cardDesc}>Applied to your multi-room listing.</Text>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={() => handleDecision(item.id, 'rejected')}
                disabled={actionLoading === item.id}
              >
                {actionLoading === item.id ? (
                  <ActivityIndicator size="small" color={colors.red} />
                ) : (
                  <><X size={16} color={colors.red} /><Text style={[styles.actionText, { color: colors.red }]}>Reject Group</Text></>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={() => handleDecision(item.id, 'accepted')}
                disabled={actionLoading === item.id}
              >
                {actionLoading === item.id ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <><Check size={16} color="white" /><Text style={[styles.actionText, { color: 'white' }]}>Accept Group</Text></>
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.allOrNothing}>Deciding accepts or rejects the entire group — no partial approvals.</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xxl, paddingTop: 56, paddingBottom: spacing.md },
  backBtn: { padding: 8, borderRadius: radius.sm, backgroundColor: colors.gray100 },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.dark, flex: 1 },
  countText: { fontSize: fontSize.sm, color: colors.gray500, marginBottom: spacing.md },
  card: { backgroundColor: 'white', borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md, ...shadow.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.sm },
  cardTitle: { fontWeight: '700', fontSize: fontSize.base, color: colors.dark },
  cardSub: { fontSize: fontSize.xs, color: colors.gray500, marginTop: 2 },
  cardDesc: { fontSize: fontSize.sm, color: colors.gray600, marginBottom: spacing.md },
  cardActions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: radius.sm },
  rejectBtn: { backgroundColor: colors.redLight, borderWidth: 1, borderColor: colors.redLight },
  acceptBtn: { backgroundColor: colors.gold || '#B8860B' },
  actionText: { fontWeight: '700', fontSize: fontSize.sm },
  allOrNothing: { fontSize: 10.5, color: colors.gray400, textAlign: 'center', fontStyle: 'italic' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.dark, marginTop: spacing.md },
  emptySub: { fontSize: fontSize.sm, color: colors.gray500, textAlign: 'center', marginTop: 4 },
});
