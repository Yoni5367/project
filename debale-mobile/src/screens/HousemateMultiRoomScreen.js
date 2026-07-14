import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Image
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Home, MapPin, Users, Search } from 'lucide-react-native';
import { housemateAPI } from '../services/api';
import { colors, spacing, radius, fontSize, shadow } from '../theme';

export default function HousemateMultiRoomScreen({ navigation }) {
  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState(null);

  const fetchListings = useCallback(async (city = '') => {
    try {
      const params = {};
      if (city) params.city = city;
      const [listRes, groupRes] = await Promise.all([
        housemateAPI.getMultiRoom(params),
        housemateAPI.myGroup().catch(() => ({ group: null })),
      ]);
      setListings(listRes.listings || []);
      setTotal(listRes.total || 0);
      setGroup(groupRes.group);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchListings().finally(() => setLoading(false));
  }, [fetchListings]));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchListings(search);
    setRefreshing(false);
  };

  const handleSearch = () => fetchListings(search);

  const handleApply = async (listingId) => {
    if (!group) {
      Alert.alert('No Group', 'You need to build a group before applying. Find housemates first.');
      return;
    }
    if (group.status !== 'forming') {
      Alert.alert('Cannot Apply', `Your group status is "${group.status}". Only forming groups can apply.`);
      return;
    }

    try {
      await housemateAPI.apply(group.id, listingId);
      Alert.alert('Applied!', 'Your group application has been submitted.', [
        { text: 'View Group', onPress: () => navigation.navigate('HousemateGroup') },
        { text: 'OK' },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={colors.teal} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Multi-Room Homes</Text>
        {group && group.status === 'forming' && (
          <View style={styles.groupBadge}>
            <Users size={14} color="white" />
            <Text style={styles.groupBadgeText}>{group.members?.length || 0}</Text>
          </View>
        )}
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Search size={16} color={colors.gray400} />
          <TextInput style={styles.searchInput} value={search}
            onChangeText={setSearch} placeholder="Search by city..."
            placeholderTextColor={colors.gray400} onSubmitEditing={handleSearch} />
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={listings}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: spacing.xxl, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
        ListHeaderComponent={() => (
          <View style={{ marginBottom: spacing.md }}>
            <Text style={styles.countText}>{total} multi-room listings available</Text>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Home size={48} color={colors.gray300} />
            <Text style={styles.emptyTitle}>No multi-room listings found</Text>
            <Text style={styles.emptySub}>Try a different city or check back later.</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.photos?.[0] ? (
              <Image source={{ uri: item.photos[0] }} style={styles.cardImg} />
            ) : (
              <View style={[styles.cardImg, { backgroundColor: colors.tealLight, alignItems: 'center', justifyContent: 'center' }]}>
                <Home size={28} color={colors.teal} opacity={0.4} />
              </View>
            )}
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <View style={styles.cardLoc}><MapPin size={12} color={colors.gray400} /><Text style={styles.cardLocText}>{item.city}</Text></View>
              <View style={styles.cardRow}>
                <Text style={styles.cardPrice}>{item.price?.toLocaleString()} ETB</Text>
                <View style={styles.slotsBadge}>
                  <Text style={styles.slotsText}>{item.open_slots} room{item.open_slots !== 1 ? 's' : ''} open</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.applyBtn, (!group || group.status !== 'forming') && styles.applyBtnDisabled]}
                onPress={() => handleApply(item.id)}
              >
                <Text style={styles.applyBtnText}>
                  {!group ? 'Build a Group First' : group.status !== 'forming' ? `${group.status} group` : 'Apply as Group'}
                </Text>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xxl, paddingTop: 56, paddingBottom: spacing.md },
  backBtn: { padding: 8, borderRadius: radius.sm, backgroundColor: colors.gray100 },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.dark, flex: 1 },
  groupBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.teal, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  groupBadgeText: { color: 'white', fontWeight: '700', fontSize: 10.5 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xxl, marginBottom: spacing.md },
  searchInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: radius.sm, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.gray200 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: fontSize.sm, color: colors.dark },
  searchBtn: { backgroundColor: colors.teal, borderRadius: radius.sm, paddingHorizontal: 16, paddingVertical: 10 },
  searchBtnText: { color: 'white', fontWeight: '600', fontSize: fontSize.sm },
  countText: { fontSize: fontSize.sm, color: colors.gray500 },
  card: { backgroundColor: 'white', borderRadius: radius.md, marginBottom: spacing.md, overflow: 'hidden', ...shadow.sm },
  cardImg: { width: '100%', height: 140 },
  cardBody: { padding: spacing.lg },
  cardTitle: { fontWeight: '700', fontSize: fontSize.base, color: colors.dark },
  cardLoc: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  cardLocText: { fontSize: fontSize.xs, color: colors.gray500 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  cardPrice: { fontWeight: '700', fontSize: fontSize.md, color: colors.teal },
  slotsBadge: { backgroundColor: colors.greenLight, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  slotsText: { fontSize: 10.5, fontWeight: '600', color: colors.green },
  applyBtn: { backgroundColor: colors.teal, borderRadius: radius.sm, paddingVertical: 12, alignItems: 'center', marginTop: spacing.md },
  applyBtnDisabled: { backgroundColor: colors.gray200 },
  applyBtnText: { color: 'white', fontWeight: '600', fontSize: fontSize.sm },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.dark, marginTop: spacing.md },
  emptySub: { fontSize: fontSize.sm, color: colors.gray500, textAlign: 'center', marginTop: 4 },
});
