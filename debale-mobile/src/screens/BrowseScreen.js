import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList,
  TouchableOpacity, ActivityIndicator, ScrollView
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { listingsAPI, usersAPI } from '../services/api';
import RoomCard from '../components/RoomCard';
import { colors, spacing, radius, fontSize, shadow } from '../theme';

const FILTER_OPTIONS = {
  type: ['Single Room', 'Shared Apartment', 'Studio'],
  gender: ['any', 'male_only', 'female_only'],
  furnished: ['Fully Furnished', 'Semi-Furnished', 'Unfurnished'],
};

export default function BrowseScreen({ navigation }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ type: '', gender: '', furnished: '' });
  const [saved, setSaved] = useState([]);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filters.type) params.type = filters.type;
      if (filters.gender) params.gender = filters.gender;
      if (filters.furnished) params.furnished = filters.furnished;
      const { listings: data } = await listingsAPI.browse(params);
      setListings(data || []);
    } catch (err) {
      console.error('Browse error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [search, filters]);

  useEffect(() => {
    const debounce = setTimeout(fetchListings, 400);
    return () => clearTimeout(debounce);
  }, [fetchListings]);

  const toggleFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: prev[key] === value ? '' : value }));
  };

  const handleSave = async (listingId) => {
    if (!user) return;
    try {
      const { saved: isSaved } = await usersAPI.toggleSaved(listingId);
      setSaved(prev => isSaved ? [...prev, listingId] : prev.filter(id => id !== listingId));
    } catch (err) { console.error(err); }
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Browse Rooms</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Search size={17} color={colors.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by location..."
            placeholderTextColor={colors.gray400}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}><X size={16} color={colors.gray400} /></TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal size={18} color={activeFilterCount > 0 ? 'white' : colors.gray600} />
          {activeFilterCount > 0 && (
            <View style={styles.filterCountBadge}><Text style={styles.filterCountText}>{activeFilterCount}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      {/* Filter chips panel */}
      {showFilters && (
        <ScrollView style={styles.filterPanel} showsVerticalScrollIndicator={false}>
          {Object.entries(FILTER_OPTIONS).map(([key, options]) => (
            <View key={key} style={{ marginBottom: spacing.lg }}>
              <Text style={styles.filterGroupLabel}>{key === 'type' ? 'Room Type' : key === 'gender' ? 'Gender' : 'Furnishing'}</Text>
              <View style={styles.chipRow}>
                {options.map(opt => {
                  const active = filters[key] === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => toggleFilter(key, opt)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {opt.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Results */}
      {loading ? (
        <ActivityIndicator color={colors.teal} style={{ marginTop: 60 }} />
      ) : listings.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🏠</Text>
          <Text style={styles.emptyTitle}>No rooms found</Text>
          <Text style={styles.emptySub}>Try adjusting your search or filters</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.md, paddingHorizontal: spacing.xxl }}
          contentContainerStyle={{ gap: spacing.md, paddingBottom: 30, paddingTop: spacing.sm }}
          renderItem={({ item }) => (
            <RoomCard
              room={item}
              width="100%"
              onPress={() => navigation.navigate('ListingDetail', { id: item.id })}
              onSave={() => handleSave(item.id)}
              saved={saved.includes(item.id)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: spacing.xxl, paddingTop: 60, paddingBottom: spacing.md },
  headerTitle: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.dark },
  searchRow: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xxl, marginBottom: spacing.md },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'white',
    borderRadius: radius.md, paddingHorizontal: 14, height: 46, ...shadow.sm,
  },
  searchInput: { flex: 1, fontSize: fontSize.base, color: colors.dark },
  filterBtn: {
    width: 46, height: 46, borderRadius: radius.md, backgroundColor: 'white',
    alignItems: 'center', justifyContent: 'center', ...shadow.sm,
  },
  filterBtnActive: { backgroundColor: colors.teal },
  filterCountBadge: {
    position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center',
  },
  filterCountText: { color: 'white', fontSize: 10, fontWeight: '700' },
  filterPanel: { maxHeight: 220, backgroundColor: 'white', marginHorizontal: spacing.xxl, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md, ...shadow.sm },
  filterGroupLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.gray700, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1, borderColor: colors.gray200 },
  chipActive: { backgroundColor: colors.tealLight, borderColor: colors.teal },
  chipText: { fontSize: fontSize.xs, color: colors.gray600, textTransform: 'capitalize' },
  chipTextActive: { color: colors.teal, fontWeight: '600' },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.dark },
  emptySub: { fontSize: fontSize.sm, color: colors.gray500, marginTop: 4 },
});
