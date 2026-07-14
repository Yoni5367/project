import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Home, Users, CreditCard, TrendingUp, MapPin, Plus, LogOut
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { listingsAPI, applicationsAPI, paymentsAPI } from '../services/api';
import { colors, spacing, radius, fontSize, shadow } from '../theme';

const TABS = [
  { key: 'overview',    label: 'Overview',  Icon: TrendingUp },
  { key: 'listings',    label: 'Listings',  Icon: Home },
  { key: 'subscription',label: 'Plan',      Icon: CreditCard },
];

export default function ProviderDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('overview');
  const [listings, setListings] = useState([]);
  const [recentApplicants, setRecentApplicants] = useState([]);
  const [subStatus, setSubStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [listRes, subRes] = await Promise.all([listingsAPI.mine(), paymentsAPI.status()]);
      const myListings = listRes.listings || [];
      setListings(myListings);
      setSubStatus(subRes);
      const active = myListings.find(l => l.status === 'active');
      if (active) {
        const appRes = await applicationsAPI.forListing(active.id);
        setRecentApplicants((appRes.applicants || []).slice(0, 5));
      } else {
        setRecentApplicants([]);
      }
    } catch (err) { console.error(err.message); }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const daysLeft = subStatus?.days_left || 0;
  const activeListings = listings.filter(l => l.status === 'active');
  const filledListings = listings.filter(l => l.status === 'filled');

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={colors.gold} /></View>;

  return (
    <View style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userRow}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{user?.name?.charAt(0)}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{user?.name}</Text>
              <Text style={styles.greetingSub}>Room Provider</Text>
            </View>
            <TouchableOpacity onPress={logout} style={styles.logoutIcon}><LogOut size={18} color={colors.red} /></TouchableOpacity>
          </View>
        </View>

        {/* New listing CTA */}
        <TouchableOpacity style={styles.newListingBtn} onPress={() => navigation.navigate('ProviderForm')}>
          <Plus size={16} color="white" />
          <Text style={styles.newListingText}>New Listing</Text>
        </TouchableOpacity>

        {/* Subscription banner */}
        {subStatus && (
          <View style={[styles.subBanner, daysLeft <= 5 && styles.subBannerWarning]}>
            <Text style={styles.subBannerText}>
              {subStatus.subscribed ? `Subscription active — ${daysLeft} days left` : 'No active subscription'}
            </Text>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsGrid}>
          {[
            ['Active', activeListings.length, colors.gold, colors.goldLight],
            ['Applicants', recentApplicants.length, colors.teal, colors.tealLight],
            ['Filled', filledListings.length, colors.green, colors.greenLight],
            ['Total', listings.length, colors.purple, colors.purpleLight],
          ].map(([label, val, color]) => (
            <View key={label} style={styles.statCard}>
              <Text style={styles.statLabel}>{label}</Text>
              <Text style={[styles.statValue, { color }]}>{val}</Text>
            </View>
          ))}
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow} contentContainerStyle={{ paddingHorizontal: spacing.xxl, gap: 8 }}>
          {TABS.map(({ key, label, Icon }) => {
            const active = tab === key;
            return (
              <TouchableOpacity key={key} style={[styles.tabChip, active && styles.tabChipActive]} onPress={() => setTab(key)}>
                <Icon size={14} color={active ? 'white' : colors.gray600} />
                <Text style={[styles.tabChipText, active && styles.tabChipTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.content}>
          {tab === 'overview' && (
            recentApplicants.length === 0 ? (
              <Empty emoji="📭" title="No applicants yet" sub="Publish a listing to start receiving applications" />
            ) : (
              <>
                <Text style={styles.sectionTitle}>Recent Applicants</Text>
                {recentApplicants.map(a => (
                  <View key={a.id} style={styles.applicantRow}>
                    <View style={styles.appCardLeft}>
                      <View style={[styles.appIcon, { backgroundColor: colors.tealLight }]}>
                        <Text style={{ color: colors.teal, fontWeight: '700' }}>{a.users?.name?.charAt(0)}</Text>
                      </View>
                      <View>
                        <Text style={styles.appTitle}>{a.users?.name}</Text>
                        <Text style={styles.appLoc}>{a.users?.occupation || 'Not specified'}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.matchScore, { color: a.match_score >= 80 ? colors.green : a.match_score >= 60 ? colors.gold : colors.red }]}>
                        {a.match_score}%
                      </Text>
                    </View>
                  </View>
                ))}
                {activeListings[0] && (
                  <TouchableOpacity style={styles.viewAllBtn} onPress={() => navigation.navigate('ApplicantManagement', { listingId: activeListings[0].id })}>
                    <Text style={styles.viewAllText}>View All Applicants</Text>
                  </TouchableOpacity>
                )}
              </>
            )
          )}

          {tab === 'listings' && (
            listings.length === 0 ? (
              <Empty emoji="🏠" title="No listings yet" sub="Create your first room listing" />
            ) : (
              listings.map(l => (
                <View key={l.id} style={styles.listingCard}>
                  <View style={styles.appCardLeft}>
                    {l.photos?.[0] ? (
                      <Image source={{ uri: l.photos[0] }} style={styles.listingImg} />
                    ) : (
                      <View style={[styles.listingImg, { backgroundColor: colors.goldLight, alignItems: 'center', justifyContent: 'center' }]}>
                        <Home size={18} color={colors.gold} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.appTitle}>{l.title}</Text>
                      <View style={styles.appLocRow}><MapPin size={10} color={colors.gray400} /><Text style={styles.appLoc}>{l.city}</Text></View>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={styles.appPrice}>{l.price?.toLocaleString()} ETB</Text>
                    <View style={[styles.statusPill, { backgroundColor: l.status === 'active' ? colors.greenLight : colors.gray100 }]}>
                      <Text style={[styles.statusPillText, { color: l.status === 'active' ? colors.green : colors.gray500 }]}>{l.status}</Text>
                    </View>
                    {l.status === 'active' && (
                      <TouchableOpacity onPress={() => navigation.navigate('ApplicantManagement', { listingId: l.id })}>
                        <Text style={styles.linkText}>View Applicants</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )
          )}

          {tab === 'subscription' && (
            <View style={styles.profileCard}>
              <View style={styles.subRow}>
                <Text style={styles.subPlanLabel}>{subStatus?.plan ? `${subStatus.plan} Plan` : 'No active plan'}</Text>
                <View style={[styles.statusPill, { backgroundColor: subStatus?.subscribed ? colors.greenLight : colors.redLight }]}>
                  <Text style={[styles.statusPillText, { color: subStatus?.subscribed ? colors.green : colors.red }]}>
                    {subStatus?.subscribed ? 'Active' : 'Expired'}
                  </Text>
                </View>
              </View>
              {subStatus?.subscribed && (
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.min((daysLeft / 30) * 100, 100)}%` }]} />
                </View>
              )}
              <Text style={styles.daysLeftText}>{daysLeft} days remaining</Text>
              <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('Payment')}>
                <Text style={styles.editBtnText}>Renew Subscription</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Empty({ emoji, title, sub }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
  header: { paddingHorizontal: spacing.xxl, paddingTop: 56, paddingBottom: spacing.lg },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: 'white', fontWeight: '700', fontSize: fontSize.md },
  greeting: { fontSize: fontSize.md, fontWeight: '700', color: colors.dark },
  greetingSub: { fontSize: fontSize.xs, color: colors.gray500 },
  logoutIcon: { padding: 8, backgroundColor: colors.redLight, borderRadius: radius.sm },
  newListingBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.gold, marginHorizontal: spacing.xxl, borderRadius: radius.sm, paddingVertical: 12, marginBottom: spacing.lg },
  newListingText: { color: 'white', fontWeight: '600', fontSize: fontSize.sm },
  subBanner: { backgroundColor: colors.goldLight, marginHorizontal: spacing.xxl, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.lg },
  subBannerWarning: { backgroundColor: colors.redLight },
  subBannerText: { fontSize: fontSize.sm, color: colors.dark, fontWeight: '500' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.xxl, marginBottom: spacing.lg },
  statCard: { flexBasis: '47%', flexGrow: 1, backgroundColor: 'white', borderRadius: radius.md, padding: spacing.md, ...shadow.sm },
  statLabel: { fontSize: fontSize.xs, color: colors.gray500, marginBottom: 4 },
  statValue: { fontSize: fontSize.xxl, fontWeight: '800' },
  tabRow: { marginBottom: spacing.lg },
  tabChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: 'white', borderWidth: 1, borderColor: colors.gray200 },
  tabChipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  tabChipText: { fontSize: fontSize.xs, color: colors.gray600, fontWeight: '500' },
  tabChipTextActive: { color: 'white' },
  content: { paddingHorizontal: spacing.xxl, paddingBottom: 40 },
  sectionTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.dark, marginBottom: spacing.md },
  applicantRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm },
  appCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  appIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  appTitle: { fontWeight: '600', fontSize: fontSize.sm, color: colors.dark },
  appLocRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  appLoc: { fontSize: fontSize.xs, color: colors.gray500 },
  appPrice: { fontWeight: '700', color: colors.teal, fontSize: fontSize.sm },
  matchScore: { fontSize: fontSize.lg, fontWeight: '800' },
  viewAllBtn: { backgroundColor: colors.teal, borderRadius: radius.sm, paddingVertical: 12, alignItems: 'center', marginTop: spacing.sm },
  viewAllText: { color: 'white', fontWeight: '600', fontSize: fontSize.sm },
  listingCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'white', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, ...shadow.sm },
  listingImg: { width: 46, height: 46, borderRadius: 10 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.full },
  statusPillText: { fontSize: 10.5, fontWeight: '600', textTransform: 'capitalize' },
  linkText: { fontSize: fontSize.xs, color: colors.teal, fontWeight: '600' },
  profileCard: { backgroundColor: 'white', borderRadius: radius.md, padding: spacing.xl, ...shadow.sm },
  subRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  subPlanLabel: { fontSize: fontSize.md, fontWeight: '700', color: colors.dark, textTransform: 'capitalize' },
  progressTrack: { height: 7, backgroundColor: colors.gray100, borderRadius: 4, overflow: 'hidden', marginBottom: spacing.sm },
  progressFill: { height: '100%', backgroundColor: colors.gold, borderRadius: 4 },
  daysLeftText: { fontSize: fontSize.sm, color: colors.gray500, marginBottom: spacing.lg },
  editBtn: { backgroundColor: colors.gold, borderRadius: radius.sm, paddingVertical: 12, alignItems: 'center' },
  editBtnText: { color: 'white', fontWeight: '600', fontSize: fontSize.sm },
  empty: { alignItems: 'center', paddingVertical: 50 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.dark },
  emptySub: { fontSize: fontSize.sm, color: colors.gray500, marginTop: 4, textAlign: 'center' },
});
