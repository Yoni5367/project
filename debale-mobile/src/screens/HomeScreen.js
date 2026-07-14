import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, FlatList, Modal, Animated, ActivityIndicator
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Search, X, Sparkles, FileText, Users, Bell } from 'lucide-react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useAuth } from '../context/AuthContext';
import { listingsAPI, usersAPI } from '../services/api';
import RoomCard from '../components/RoomCard';
import { colors, spacing, radius, fontSize, shadow } from '../theme';

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [popular, setPopular] = useState([]);
  const [availableSoon, setAvailableSoon] = useState([]);
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    const fetchHome = async () => {
      try {
        const [popularRes, soonRes] = await Promise.all([
          listingsAPI.browse({ sort: 'newest', limit: 6 }),
          listingsAPI.browse({ sort: 'price_asc', limit: 6 }),
        ]);
        setPopular(popularRes.listings || []);
        setAvailableSoon(soonRes.listings || []);
      } catch (err) {
        console.error('Home fetch error:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHome();
  }, []);

  // Gentle auto-appearing login modal for guests — dismissible, shown once per session
  useEffect(() => {
    if (!user) {
      const timer = setTimeout(() => {
        setShowLoginModal(true);
        Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }).start();
      }, 1400);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const dismissModal = () => {
    Animated.timing(slideAnim, { toValue: 300, duration: 220, useNativeDriver: true }).start(() => {
      setShowLoginModal(false);
    });
  };

  const handleSave = async (listingId) => {
    if (!user) { setShowLoginModal(true); return; }
    try {
      const { saved: isSaved } = await usersAPI.toggleSaved(listingId);
      setSaved(prev => isSaved ? [...prev, listingId] : prev.filter(id => id !== listingId));
    } catch (err) { console.error(err); }
  };

  const goToListing = (id) => navigation.navigate('ListingDetail', { id });

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{user ? `Hi, ${user.name?.split(' ')[0]} 👋` : 'Welcome to'}</Text>
            <Text style={styles.brand}>debale</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {user && (
              <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.bellBtn}>
                <Bell size={18} color={colors.gray600} />
              </TouchableOpacity>
            )}
            <Svg width={36} height={29} viewBox="0 0 60 48" fill="none">
              <Path d="M6 28 L30 8 L54 28" stroke={colors.teal} strokeWidth={4} strokeLinecap="round" />
              <Circle cx={18} cy={28} r={7} fill={colors.teal} opacity={0.95} />
              <Circle cx={42} cy={28} r={7} fill={colors.teal} opacity={0.95} />
              <Rect x={26} y={32} width={8} height={14} rx={2} fill={colors.gold} />
            </Svg>
          </View>
        </View>

        {/* Search bar */}
        <TouchableOpacity style={styles.searchBar} onPress={() => navigation.navigate('Browse')}>
          <Search size={18} color={colors.gray400} />
          <Text style={styles.searchPlaceholder}>{t('search_start') || 'Start your search'}</Text>
        </TouchableOpacity>

        {/* Quick access tiles */}
        <View style={styles.tilesRow}>
          {[
            { Icon: Search, label: 'Browse Rooms', onPress: () => navigation.navigate('Browse') },
            { Icon: FileText, label: 'My Applications', onPress: () => navigation.navigate('Dashboard') },
            { Icon: Sparkles, label: 'AI Assistant', onPress: () => navigation.navigate('AIAgent') },
          ].map(({ Icon, label, onPress }) => (
            <TouchableOpacity key={label} style={styles.tile} onPress={onPress}>
              <View style={styles.tileIcon}><Icon size={20} color={colors.teal} /></View>
              <Text style={styles.tileLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: 40 }} />
        ) : (
          <>
            <Section title="Popular Rooms in Addis Ababa" data={popular} onPress={goToListing} onSave={handleSave} saved={saved} />
            <Section title="Available Next Month" data={availableSoon} onPress={goToListing} onSave={handleSave} saved={saved} />
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Gentle login modal overlay */}
      <Modal visible={showLoginModal} transparent animationType="fade" onRequestClose={dismissModal}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalSheet, { transform: [{ translateY: slideAnim }] }]}>
            <TouchableOpacity style={styles.closeBtn} onPress={dismissModal}>
              <X size={20} color={colors.dark} />
            </TouchableOpacity>

            <View style={styles.modalLogo}>
              <Svg width={48} height={38} viewBox="0 0 60 48" fill="none">
                <Path d="M6 28 L30 8 L54 28" stroke={colors.teal} strokeWidth={4} strokeLinecap="round" />
                <Circle cx={18} cy={28} r={7} fill={colors.teal} opacity={0.95} />
                <Circle cx={42} cy={28} r={7} fill={colors.teal} opacity={0.95} />
                <Rect x={26} y={32} width={8} height={14} rx={2} fill={colors.gold} />
              </Svg>
            </View>

            <Text style={styles.modalTitle}>Log in or sign up</Text>
            <Text style={styles.modalSub}>Find your perfect housemate in Ethiopia</Text>

            <View style={styles.inputWrap}>
              <TextInput style={styles.input} placeholder="Phone number or email" placeholderTextColor={colors.gray400} />
            </View>

            <TouchableOpacity
              style={styles.continueBtn}
              onPress={() => { dismissModal(); navigation.navigate('Login'); }}
            >
              <Text style={styles.continueBtnText}>Continue</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.signupBtn}
              onPress={() => { dismissModal(); navigation.navigate('Register'); }}
            >
              <Users size={16} color={colors.teal} />
              <Text style={styles.signupBtnText}>Create a New Account</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={dismissModal} style={{ marginTop: spacing.lg }}>
              <Text style={styles.continueBrowsing}>Continue browsing as guest</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

function Section({ title, data, onPress, onSave, saved }) {
  if (!data?.length) return null;
  return (
    <View style={{ marginTop: spacing.xxl }}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <FlatList
        data={data}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing.xxl, gap: spacing.md }}
        renderItem={({ item }) => (
          <RoomCard
            room={item}
            onPress={() => onPress(item.id)}
            onSave={() => onSave(item.id)}
            saved={saved.includes(item.id)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xxl, paddingTop: 60, paddingBottom: spacing.lg,
  },
  greeting: { fontSize: fontSize.sm, color: colors.gray500 },
  brand: { fontSize: 24, fontWeight: '700', color: colors.dark, letterSpacing: -0.5 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: spacing.xxl,
    backgroundColor: 'white', borderRadius: radius.full, paddingHorizontal: 18, height: 50, ...shadow.sm,
  },
  bellBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  searchPlaceholder: { color: colors.gray400, fontSize: fontSize.base },
  tilesRow: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xxl, marginTop: spacing.xl },
  tile: { flex: 1, alignItems: 'center', backgroundColor: 'white', borderRadius: radius.md, paddingVertical: 14, ...shadow.sm },
  tileIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  tileLabel: { fontSize: 10.5, color: colors.gray600, fontWeight: '500', textAlign: 'center', paddingHorizontal: 4 },
  sectionHeader: { paddingHorizontal: spacing.xxl, marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.dark },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: 'white', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.xxl, paddingTop: spacing.lg, alignItems: 'center',
  },
  closeBtn: { alignSelf: 'flex-end', padding: 4 },
  modalLogo: { marginTop: spacing.md, marginBottom: spacing.lg },
  modalTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.dark, marginBottom: 4 },
  modalSub: { fontSize: fontSize.sm, color: colors.gray500, marginBottom: spacing.xl, textAlign: 'center' },
  inputWrap: {
    width: '100%', borderWidth: 1.5, borderColor: colors.gray200, borderRadius: radius.sm,
    height: 50, paddingHorizontal: 16, justifyContent: 'center', marginBottom: spacing.lg,
  },
  input: { fontSize: fontSize.base, color: colors.dark },
  continueBtn: { width: '100%', height: 50, borderRadius: radius.sm, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  continueBtnText: { color: 'white', fontWeight: '600', fontSize: fontSize.md },
  dividerRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: spacing.lg, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.gray200 },
  dividerText: { color: colors.gray400, fontSize: fontSize.sm },
  signupBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
    height: 50, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.tealMid, backgroundColor: colors.tealLight,
  },
  signupBtnText: { color: colors.teal, fontWeight: '600', fontSize: fontSize.base },
  continueBrowsing: { color: colors.gray400, fontSize: fontSize.sm, textDecorationLine: 'underline' },
});
