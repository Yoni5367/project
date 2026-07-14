import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Alert
} from 'react-native';
import {
  ArrowLeft, Calendar, CheckCircle, XCircle, Star, Phone
} from 'lucide-react-native';
import { applicationsAPI } from '../services/api';
import { colors, spacing, radius, fontSize, shadow } from '../theme';

const STATUS_CFG = {
  pending:   { label: 'New',         color: colors.teal,   bg: colors.tealLight },
  shortlist: { label: 'Shortlisted', color: colors.purple,  bg: colors.purpleLight },
  interview: { label: 'Interview',   color: colors.gold,    bg: colors.goldLight },
  rejected:  { label: 'Rejected',    color: colors.red,     bg: colors.redLight },
  accepted:  { label: 'Accepted',    color: colors.green,   bg: colors.greenLight },
};

const FILTERS = ['all', 'pending', 'shortlist', 'interview', 'accepted', 'rejected'];

export default function ApplicantManagementScreen({ route, navigation }) {
  const { listingId } = route.params;
  const [applicants, setApplicants] = useState([]);
  const [listingTitle, setListingTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showInterview, setShowInterview] = useState(false);
  const [showAccept, setShowAccept] = useState(false);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');

  const fetchApplicants = useCallback(async () => {
    setLoading(true);
    try {
      const { applicants: data, listing_title } = await applicationsAPI.forListing(listingId);
      setApplicants(data || []);
      setListingTitle(listing_title || '');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => { fetchApplicants(); }, [fetchApplicants]);

  const handleStatusUpdate = async (id, status) => {
    setActionLoading(true);
    try {
      await applicationsAPI.updateStatus(id, status);
      setApplicants(prev => prev.map(a => {
        if (a.id === id) return { ...a, status };
        if (status === 'accepted' && ['pending', 'shortlist', 'interview'].includes(a.status)) return { ...a, status: 'rejected' };
        return a;
      }));
      setShowAccept(false);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleInterview = async () => {
    if (!interviewDate || !interviewTime) return Alert.alert('Missing info', 'Enter both date and time');
    setActionLoading(true);
    try {
      const scheduledAt = new Date(`${interviewDate}T${interviewTime}`).toISOString();
      await applicationsAPI.scheduleInterview(selected, scheduledAt);
      setApplicants(prev => prev.map(a => a.id === selected ? { ...a, status: 'interview', interview_at: scheduledAt } : a));
      setShowInterview(false);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = filter === 'all' ? applicants : applicants.filter(a => a.status === filter);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.dark} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Applicants</Text>
          {listingTitle ? <Text style={styles.headerSub}>{listingTitle}</Text> : null}
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: spacing.xxl, gap: 8 }}>
        {FILTERS.map(f => {
          const active = filter === f;
          const count = f === 'all' ? applicants.length : applicants.filter(a => a.status === f).length;
          return (
            <TouchableOpacity key={f} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={colors.teal} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyTitle}>No applicants here</Text>
            </View>
          ) : filtered.map(a => {
            const cfg = STATUS_CFG[a.status] || STATUS_CFG.pending;
            const isOpen = selected === a.id;
            return (
              <TouchableOpacity key={a.id} style={styles.card} onPress={() => setSelected(isOpen ? null : a.id)} activeOpacity={0.9}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardLeft}>
                    <View style={[styles.avatar, { backgroundColor: cfg.bg }]}>
                      <Text style={[styles.avatarText, { color: cfg.color }]}>{a.users?.name?.charAt(0)}</Text>
                    </View>
                    <View>
                      <Text style={styles.name}>{a.users?.name}</Text>
                      <Text style={styles.sub}>{a.users?.gender || '—'}, {a.users?.age || '—'} · {a.users?.occupation || 'Not specified'}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={[styles.score, { color: a.match_score >= 80 ? colors.green : a.match_score >= 60 ? colors.gold : colors.red }]}>{a.match_score}%</Text>
                    <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                      <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>
                </View>

                {a.interview_at && (
                  <View style={styles.interviewBanner}>
                    <Calendar size={12} color={colors.gold} />
                    <Text style={styles.interviewText}>{new Date(a.interview_at).toLocaleString()}</Text>
                  </View>
                )}

                {isOpen && a.users?.intro && (
                  <View style={styles.introBox}>
                    <Text style={styles.introText}>{a.users.intro}</Text>
                  </View>
                )}

                {isOpen && a.status === 'accepted' && a.users?.phone && (
                  <View style={styles.contactBox}>
                    <Phone size={13} color={colors.green} />
                    <Text style={styles.contactText}>{a.users.phone}</Text>
                  </View>
                )}

                {a.status === 'accepted' && (
                  <TouchableOpacity
                    style={styles.agreementBtn}
                    onPress={() => navigation.navigate('Agreement', { applicationId: a.id })}
                  >
                    <Text style={styles.agreementBtnText}>📄 Open Housemate Agreement →</Text>
                  </TouchableOpacity>
                )}

                {!['accepted', 'rejected'].includes(a.status) && (
                  <View style={styles.actionRow}>
                    {a.status !== 'shortlist' && (
                      <TouchableOpacity style={styles.actionBtnPurple} onPress={() => handleStatusUpdate(a.id, 'shortlist')}>
                        <Star size={11} color={colors.purple} />
                        <Text style={styles.actionTextPurple}>Shortlist</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.actionBtnOutline} onPress={() => { setSelected(a.id); setShowInterview(true); }}>
                      <Calendar size={11} color={colors.gray600} />
                      <Text style={styles.actionTextOutline}>Interview</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtnGreen} onPress={() => { setSelected(a.id); setShowAccept(true); }}>
                      <CheckCircle size={11} color="white" />
                      <Text style={styles.actionTextWhite}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtnRed} onPress={() => handleStatusUpdate(a.id, 'rejected')}>
                      <XCircle size={11} color="white" />
                      <Text style={styles.actionTextWhite}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Interview modal */}
      <Modal visible={showInterview} transparent animationType="slide" onRequestClose={() => setShowInterview(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>🤖 Schedule Interview</Text>
            <Text style={styles.modalSub}>AI will notify the applicant automatically.</Text>
            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} placeholder="2025-06-15" placeholderTextColor={colors.gray400} value={interviewDate} onChangeText={setInterviewDate} />
            <Text style={styles.label}>Time (HH:MM)</Text>
            <TextInput style={styles.input} placeholder="15:00" placeholderTextColor={colors.gray400} value={interviewTime} onChangeText={setInterviewTime} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowInterview(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleInterview} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color="white" /> : <Text style={styles.modalConfirmText}>Confirm</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Accept confirmation modal */}
      <Modal visible={showAccept} transparent animationType="slide" onRequestClose={() => setShowAccept(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Accept this applicant?</Text>
            <Text style={styles.modalSub}>This will reveal your phone number to them, reject all other applicants, and mark your listing as filled.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAccept(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirmBtn, { backgroundColor: colors.green }]} onPress={() => handleStatusUpdate(selected, 'accepted')} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color="white" /> : <Text style={styles.modalConfirmText}>Yes, Accept</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xxl, paddingTop: 56, paddingBottom: spacing.lg },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.dark },
  headerSub: { fontSize: fontSize.xs, color: colors.gray500 },
  filterRow: { marginBottom: spacing.md },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, backgroundColor: 'white', borderWidth: 1, borderColor: colors.gray200 },
  filterChipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  filterChipText: { fontSize: fontSize.xs, color: colors.gray600 },
  filterChipTextActive: { color: 'white', fontWeight: '600' },
  list: { paddingHorizontal: spacing.xxl, paddingBottom: 40, gap: spacing.md },
  card: { backgroundColor: 'white', borderRadius: radius.md, padding: spacing.lg, ...shadow.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '700', fontSize: fontSize.base },
  name: { fontWeight: '600', fontSize: fontSize.sm, color: colors.dark },
  sub: { fontSize: fontSize.xs, color: colors.gray500, marginTop: 2 },
  score: { fontSize: fontSize.lg, fontWeight: '800' },
  statusPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.full },
  statusPillText: { fontSize: 10.5, fontWeight: '600' },
  interviewBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.goldLight, padding: 8, borderRadius: radius.sm, marginTop: spacing.sm },
  interviewText: { fontSize: fontSize.xs, color: colors.dark },
  introBox: { backgroundColor: colors.gray50, padding: spacing.sm, borderRadius: radius.sm, marginTop: spacing.sm },
  introText: { fontSize: fontSize.xs, color: colors.gray600, lineHeight: 17 },
  contactBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.greenLight, padding: 8, borderRadius: radius.sm, marginTop: spacing.sm },
  contactText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.green },
  agreementBtn: { backgroundColor: colors.tealLight, borderRadius: radius.sm, paddingVertical: 10, alignItems: 'center', marginTop: spacing.sm },
  agreementBtnText: { fontSize: fontSize.xs, color: colors.teal, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 6, marginTop: spacing.md, flexWrap: 'wrap' },
  actionBtnPurple: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.purpleLight, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.sm },
  actionTextPurple: { fontSize: 11, color: colors.purple, fontWeight: '600' },
  actionBtnOutline: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.gray200, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.sm },
  actionTextOutline: { fontSize: 11, color: colors.gray600, fontWeight: '600' },
  actionBtnGreen: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.green, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.sm },
  actionBtnRed: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.red, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.sm },
  actionTextWhite: { fontSize: 11, color: 'white', fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.dark },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.xxl },
  modalSheet: { backgroundColor: 'white', borderRadius: radius.lg, padding: spacing.xxl },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.dark, marginBottom: 6 },
  modalSub: { fontSize: fontSize.sm, color: colors.gray500, marginBottom: spacing.lg, lineHeight: 19 },
  label: { fontSize: fontSize.sm, fontWeight: '500', color: colors.gray700, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: colors.gray200, borderRadius: radius.sm, paddingHorizontal: 14, height: 46, fontSize: fontSize.base, marginBottom: spacing.md },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: spacing.md },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.gray200, alignItems: 'center' },
  modalCancelText: { color: colors.gray600, fontWeight: '600' },
  modalConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.sm, backgroundColor: colors.teal, alignItems: 'center' },
  modalConfirmText: { color: 'white', fontWeight: '600' },
});
