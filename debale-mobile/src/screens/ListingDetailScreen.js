import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  Dimensions, ActivityIndicator, Alert
} from 'react-native';
import {
  ArrowLeft, MapPin, Wifi, Zap, Droplets, Bookmark, BadgeCheck,
  Check, X as XIcon, Home as HomeIcon, Phone, Star
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { listingsAPI, applicationsAPI, usersAPI } from '../services/api';
import { colors, spacing, radius, fontSize, shadow } from '../theme';

const { width } = Dimensions.get('window');

export default function ListingDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { user } = useAuth();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    listingsAPI.get(id)
      .then(({ listing }) => setListing(listing))
      .catch(err => Alert.alert('Error', err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleApply = async () => {
    if (!user) return navigation.navigate('Login');
    if (!user.subscribed) {
      return Alert.alert('Subscription Required', 'Subscribe to apply for rooms.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Subscribe', onPress: () => navigation.navigate('Dashboard') },
      ]);
    }
    setApplying(true);
    try {
      await applicationsAPI.apply(id);
      setApplied(true);
    } catch (err) {
      Alert.alert('Could not apply', err.message);
    } finally {
      setApplying(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      const { saved: isSaved } = await usersAPI.toggleSaved(id);
      setSaved(isSaved);
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return (
      <View style={styles.centered}><ActivityIndicator size="large" color={colors.teal} /></View>
    );
  }
  if (!listing) {
    return (
      <View style={styles.centered}><Text>Listing not found</Text></View>
    );
  }

  const photos = listing.photos?.length > 0 ? listing.photos : [null];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Photo carousel */}
        <View style={styles.photoWrap}>
          <ScrollView
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          >
            {photos.map((photo, i) => (
              <View key={i} style={{ width, height: 280 }}>
                {photo ? (
                  <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <View style={[styles.imagePlaceholder, { backgroundColor: colors.tealLight }]}>
                    <HomeIcon size={64} color={colors.teal} opacity={0.25} />
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} color={colors.dark} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Bookmark size={18} color={saved ? colors.gold : colors.gray500} fill={saved ? colors.gold : 'none'} />
          </TouchableOpacity>

          {photos.length > 1 && (
            <View style={styles.dotsRow}>
              {photos.map((_, i) => (
                <View key={i} style={[styles.dot, i === photoIndex && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Title */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>{listing.title}</Text>
            {listing.users?.verified && (
              <View style={styles.verifiedPill}>
                <BadgeCheck size={12} color={colors.teal} />
                <Text style={styles.verifiedPillText}>Verified</Text>
              </View>
            )}
          </View>
          <View style={styles.locationRow}>
            <MapPin size={14} color={colors.gray500} />
            <Text style={styles.location}>{listing.city}{listing.neighborhood ? `, ${listing.neighborhood}` : ''}</Text>
          </View>

          {/* Amenities */}
          <View style={styles.amenityRow}>
            {listing.includes_wifi && <Amenity Icon={Wifi} label="WiFi" />}
            {listing.includes_electricity && <Amenity Icon={Zap} label="Electricity" />}
            {listing.includes_water && <Amenity Icon={Droplets} label="Water" />}
          </View>

          {/* Details card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Room Details</Text>
            <View style={styles.detailGrid}>
              {[
                ['Type', listing.property_type],
                ['Furnishing', listing.furnishing],
                ['Lease', listing.lease_duration],
                ['Gender Pref.', listing.preferred_gender || 'Any'],
              ].map(([k, v]) => (
                <View key={k} style={styles.detailItem}>
                  <Text style={styles.detailLabel}>{k}</Text>
                  <Text style={styles.detailValue}>{v || '—'}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Rules card */}
          {(listing.house_rules || listing.deal_breakers) && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>House Rules</Text>
              {listing.house_rules && <Text style={styles.ruleText}>{listing.house_rules}</Text>}
              {listing.deal_breakers && (
                <>
                  <Text style={[styles.cardTitle, { marginTop: 12, fontSize: fontSize.sm }]}>Deal Breakers</Text>
                  <Text style={styles.ruleText}>{listing.deal_breakers}</Text>
                </>
              )}
              <View style={styles.tagRow}>
                {[
                  ['Smoking', listing.smoking_allowed],
                  ['Pets', listing.pets_allowed],
                ].map(([k, v]) => (
                  <View key={k} style={styles.tagItem}>
                    {v ? <Check size={12} color={colors.green} /> : <XIcon size={12} color={colors.red} />}
                    <Text style={styles.tagText}>{k}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Provider card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Room Provider</Text>
            <View style={styles.providerRow}>
              <View style={styles.providerAvatar}>
                <Text style={styles.providerAvatarText}>{listing.users?.name?.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.providerName}>{listing.users?.name}</Text>
                  {listing.users?.verified && <BadgeCheck size={14} color={colors.teal} />}
                </View>
                <Text style={styles.providerSub}>Contact revealed after acceptance</Text>
              </View>
              <Phone size={16} color={colors.gray300} />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky apply bar */}
      <View style={styles.stickyBar}>
        <View>
          <Text style={styles.stickyPrice}>{listing.price?.toLocaleString()} <Text style={styles.stickyUnit}>ETB/mo</Text></Text>
        </View>
        {applied ? (
          <View style={styles.appliedBadge}>
            <Check size={16} color={colors.green} />
            <Text style={styles.appliedText}>Applied</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.applyBtn} onPress={handleApply} disabled={applying}>
            {applying ? <ActivityIndicator color="white" /> : <Text style={styles.applyBtnText}>Apply Now</Text>}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function Amenity({ Icon, label }) {
  return (
    <View style={styles.amenityChip}>
      <Icon size={13} color={colors.teal} />
      <Text style={styles.amenityText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
  photoWrap: { position: 'relative' },
  imagePlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  backBtn: {
    position: 'absolute', top: 50, left: spacing.lg, width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', ...shadow.sm,
  },
  saveBtn: {
    position: 'absolute', top: 50, right: spacing.lg, width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', ...shadow.sm,
  },
  dotsRow: { position: 'absolute', bottom: 14, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.6)' },
  dotActive: { backgroundColor: 'white', width: 18 },
  content: { padding: spacing.xxl },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.dark, flex: 1 },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.tealLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  verifiedPillText: { fontSize: 10.5, color: colors.teal, fontWeight: '600' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, marginBottom: spacing.lg },
  location: { fontSize: fontSize.sm, color: colors.gray500 },
  amenityRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.xl, flexWrap: 'wrap' },
  amenityChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.tealLight, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full },
  amenityText: { fontSize: fontSize.xs, color: colors.teal, fontWeight: '500' },
  card: { backgroundColor: 'white', borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.lg, ...shadow.sm },
  cardTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.dark, marginBottom: spacing.md },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  detailItem: { width: '47%', backgroundColor: colors.gray50, padding: 10, borderRadius: radius.sm },
  detailLabel: { fontSize: 10.5, color: colors.gray400, marginBottom: 2 },
  detailValue: { fontSize: fontSize.sm, fontWeight: '600', color: colors.dark },
  ruleText: { fontSize: fontSize.sm, color: colors.gray600, lineHeight: 20 },
  tagRow: { flexDirection: 'row', gap: 16, marginTop: spacing.md },
  tagItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tagText: { fontSize: fontSize.xs, color: colors.gray600 },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  providerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  providerAvatarText: { color: 'white', fontWeight: '700', fontSize: fontSize.md },
  providerName: { fontWeight: '600', fontSize: fontSize.base, color: colors.dark },
  providerSub: { fontSize: fontSize.xs, color: colors.gray400, marginTop: 2 },
  stickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xxl, paddingVertical: spacing.lg, paddingBottom: 30,
    borderTopWidth: 1, borderTopColor: colors.gray100, ...shadow.lg,
  },
  stickyPrice: { fontSize: fontSize.xl, fontWeight: '800', color: colors.teal },
  stickyUnit: { fontSize: fontSize.xs, color: colors.gray400, fontWeight: '400' },
  applyBtn: { backgroundColor: colors.teal, paddingHorizontal: 32, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  applyBtnText: { color: 'white', fontWeight: '700', fontSize: fontSize.base },
  appliedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.greenLight, paddingHorizontal: 18, height: 46, borderRadius: radius.md },
  appliedText: { color: colors.green, fontWeight: '700' },
});
