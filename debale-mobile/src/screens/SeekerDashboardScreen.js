import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, ActivityIndicator, RefreshControl, Image
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
  Home, Bookmark, User, CreditCard, MapPin, Calendar,
  CheckCircle, XCircle, Clock, FileText, Search, LogOut
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { applicationsAPI, usersAPI, paymentsAPI } from '../services/api';
import { colors, spacing, radius, fontSize, shadow } from '../theme';

const STATUS_CFG = {
  pending:   { label: 'Pending',    color: colors.gray500, bg: colors.gray100,    Icon: Clock },
  shortlist: { label: 'Shortlisted',color: colors.purple,  bg: colors.purpleLight,Icon: CheckCircle },
  interview: { label: 'Interview',  color: colors.purple,  bg: colors.purpleLight,Icon: Calendar },
  accepted:  { label: 'Accepted 🎉',color: colors.green,   bg: colors.greenLight, Icon: CheckCircle },
  rejected:  { label: 'Rejected',   color: colors.red,     bg: colors.redLight,   Icon: XCircle },
};

const TABS = [
  { key: 'applications', label: 'Applications', Icon: Home },
  { key: 'saved',        label: 'Saved',         Icon: Bookmark },
  { key: 'profile',      label: 'Profile',       Icon: User },
  { key: 'subscription', label: 'Plan',          Icon: CreditCard },
];

export default function SeekerDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('applications');
  const [applications, setApplications] = useState([]);
  const [saved, setSaved] = useState([]);
  const [subStatus, setSubStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [appsRes, subRes] = await Promise.all([applicationsAPI.mine(), paymentsAPI.status()]);
      setApplications(appsRes.applications || []);
      setSubStatus(subRes);
    } catch (err) { console.error(err.message); }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]));

  useEffect(() => {
    if (tab === 'saved') usersAPI.getSaved().then(r => setSaved(r.saved || [])).catch(console.error);
  }, [tab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const hasAccepted = applications.some(a => a.status === 'accepted');
  const daysLeft = subStatus?.days_left || 0;

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={colors.teal} /></View>;

  return (
    <View style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userRow}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{user?.name?.charAt(0)}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{user?.name}</Text>
              <Text style={styles.greetingSub}>Room Seeker</Text>
            </View>
            <TouchableOpacity onPress={logout} style={styles.logoutIcon}><LogOut size={18} color={colors.red} /></TouchableOpacity>
          </View>
        </View>

        {/* Accepted CTA */}
        {hasAccepted && (
          <TouchableOpacity
            style={styles.ctaCard}
            onPress={() => navigation.navigate('Agreement', { applicationId: applications.find(a => a.status === 'accepted')?.id })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaTitle}>🎉 Application accepted!</Text>
              <Text style={styles.ctaSub}>Tap to complete the housemate agreement.</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Subscription banner */}
        {subStatus && (
          <View style={[styles.subBanner, daysLeft <= 5 && styles.subBannerWarning]}>
            <Text style={styles.subBannerText}>
              {subStatus.subscribed
                ? `Subscription active — ${daysLeft} days left`
                : 'No active subscription'}
            </Text>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsGrid}>
          {[
            ['Applied', applications.length, colors.teal, colors.tealLight],
            ['Pending', applications.filter(a => a.status === 'pending').length, colors.gray500, colors.gray100],
            ['Interview', applications.filter(a => a.status === 'interview').length, colors.purple, colors.purpleLight],
            ['Accepted', applications.filter(a => a.status === 'accepted').length, colors.green, colors.greenLight],
          ].map(([label, val, color, bg]) => (
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

        {/* Content */}
        <View style={styles.content}>
          {tab === 'applications' && (
            applications.length === 0 ? (
              <Empty emoji="📭" title="No applications yet" sub="Start browsing and apply to rooms you like" />
            ) : (
              applications.map(app => {
                const cfg = STATUS_CFG[app.status] || STATUS_CFG.pending;
                return (
                  <View key={app.id} style={[styles.appCard, app.status === 'accepted' && { borderColor: colors.teal }]}>
                    <View style={styles.appCardLeft}>
                      <View style={styles.appIcon}><Home size={18} color={colors.teal} /></View>
                      <View>
                        <Text style={styles.appTitle}>{app.listings?.title}</Text>
                        <View style={styles.appLocRow}><MapPin size={10} color={colors.gray400} /><Text style={styles.appLoc}>{app.listings?.city}</Text></View>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <Text style={styles.appPrice}>{app.listings?.price?.toLocaleString()} ETB</Text>
                      <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                        <cfg.Icon size={10} color={cfg.color} />
                        <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                      {app.status === 'accepted' && (
                        <TouchableOpacity onPress={() => navigation.navigate('Agreement', { applicationId: app.id })}>
                          <Text style={styles.linkText}>Agreement →</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )
          )}

          {tab === 'saved' && (
            saved.length === 0 ? (
              <Empty emoji="🔖" title="No saved rooms" sub="Tap the bookmark icon on any listing to save it" />
            ) : (
              <View style={{ gap: spacing.md }}>
                {saved.map(s => (
                  <View key={s.id} style={styles.savedCard}>
                    {s.listings?.photos?.[0] ? (
                      <Image source={{ uri: s.listings.photos[0] }} style={styles.savedImg} />
                    ) : (
                      <View style={[styles.savedImg, { backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center' }]}>
                        <Home size={20} color={colors.teal} opacity={0.4} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.appTitle}>{s.listings?.title}</Text>
                      <Text style={styles.appLoc}>{s.listings?.city}</Text>
                      <Text style={styles.appPrice}>{s.listings?.price?.toLocaleString()} ETB/mo</Text>
                    </View>
                  </View>
                ))}
              </View>
            )
          )}

          {tab === 'profile' && (
            <View style={styles.profileCard}>
              <View style={styles.profileHeader}>
                <View style={[styles.avatar, { width: 60, height: 60 }]}><Text style={[styles.avatarText, { fontSize: 22 }]}>{user?.name?.charAt(0)}</Text></View>
                <View>
                  <Text style={styles.profileName}>{user?.name}</Text>
                  <Text style={styles.profileEmail}>{user?.email}</Text>
                </View>
              </View>
              <View style={styles.profileGrid}>
                {[
                  ['Budget', user?.budget_min && user?.budget_max ? `${user.budget_min}–${user.budget_max} ETB` : 'Not set'],
                  ['City', user?.city || 'Not set'],
                  ['Occupation', user?.occupation || 'Not set'],
                  ['Sleep', user?.sleep_schedule || 'Not set'],
                ].map(([k, v]) => (
                  <View key={k} style={styles.profileItem}>
                    <Text style={styles.profileItemLabel}>{k}</Text>
                    <Text style={styles.profileItemValue}>{v}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('SeekerForm')}>
                <Text style={styles.editBtnText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
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
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: 'white', fontWeight: '700', fontSize: fontSize.md },
  greeting: { fontSize: fontSize.md, fontWeight: '700', color: colors.dark },
  greetingSub: { fontSize: fontSize.xs, color: colors.gray500 },
  logoutIcon: { padding: 8, backgroundColor: colors.redLight, borderRadius: radius.sm },
  ctaCard: { backgroundColor: colors.teal, marginHorizontal: spacing.xxl, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md, flexDirection: 'row' },
  ctaTitle: { color: 'white', fontWeight: '700', fontSize: fontSize.base },
  ctaSub: { color: 'rgba(255,255,255,0.85)', fontSize: fontSize.xs, marginTop: 2 },
  subBanner: { backgroundColor: colors.tealLight, marginHorizontal: spacing.xxl, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.lg },
  subBannerWarning: { backgroundColor: colors.redLight },
  subBannerText: { fontSize: fontSize.sm, color: colors.dark, fontWeight: '500' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.xxl, marginBottom: spacing.lg },
  statCard: { flexBasis: '47%', flexGrow: 1, backgroundColor: 'white', borderRadius: radius.md, padding: spacing.md, ...shadow.sm },
  statLabel: { fontSize: fontSize.xs, color: colors.gray500, marginBottom: 4 },
  statValue: { fontSize: fontSize.xxl, fontWeight: '800' },
  tabRow: { marginBottom: spacing.lg },
  tabChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: 'white', borderWidth: 1, borderColor: colors.gray200 },
  tabChipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  tabChipText: { fontSize: fontSize.xs, color: colors.gray600, fontWeight: '500' },
  tabChipTextActive: { color: 'white' },
  content: { paddingHorizontal: spacing.xxl, paddingBottom: 40 },
  appCard: { backgroundColor: 'white', borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.gray100, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...shadow.sm },
  appCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  appIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center' },
  appTitle: { fontWeight: '600', fontSize: fontSize.sm, color: colors.dark },
  appLocRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  appLoc: { fontSize: fontSize.xs, color: colors.gray500 },
  appPrice: { fontWeight: '700', color: colors.teal, fontSize: fontSize.sm },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.full },
  statusPillText: { fontSize: 10.5, fontWeight: '600' },
  linkText: { fontSize: fontSize.xs, color: colors.teal, fontWeight: '600' },
  savedCard: { flexDirection: 'row', gap: 12, backgroundColor: 'white', borderRadius: radius.md, padding: spacing.md, ...shadow.sm },
  savedImg: { width: 60, height: 60, borderRadius: radius.sm },
  profileCard: { backgroundColor: 'white', borderRadius: radius.md, padding: spacing.xl, ...shadow.sm },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: spacing.lg },
  profileName: { fontSize: fontSize.lg, fontWeight: '700', color: colors.dark },
  profileEmail: { fontSize: fontSize.sm, color: colors.gray500 },
  profileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  profileItem: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.gray50, borderRadius: radius.sm, padding: spacing.sm },
  profileItemLabel: { fontSize: 10.5, color: colors.gray400, marginBottom: 2 },
  profileItemValue: { fontSize: fontSize.sm, fontWeight: '600', color: colors.dark },
  editBtn: { backgroundColor: colors.teal, borderRadius: radius.sm, paddingVertical: 12, alignItems: 'center' },
  editBtnText: { color: 'white', fontWeight: '600', fontSize: fontSize.sm },
  subRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  subPlanLabel: { fontSize: fontSize.md, fontWeight: '700', color: colors.dark, textTransform: 'capitalize' },
  progressTrack: { height: 7, backgroundColor: colors.gray100, borderRadius: 4, overflow: 'hidden', marginBottom: spacing.sm },
  progressFill: { height: '100%', backgroundColor: colors.teal, borderRadius: 4 },
  daysLeftText: { fontSize: fontSize.sm, color: colors.gray500, marginBottom: spacing.lg },
  empty: { alignItems: 'center', paddingVertical: 50 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.dark },
  emptySub: { fontSize: fontSize.sm, color: colors.gray500, marginTop: 4, textAlign: 'center' },
});
