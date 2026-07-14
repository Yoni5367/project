import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { BadgeCheck, Bookmark, MapPin, Home as HomeIcon } from 'lucide-react-native';
import { colors, spacing, radius, fontSize, shadow } from '../theme';

export default function RoomCard({ room, onPress, onSave, saved, width = 220 }) {
  return (
    <TouchableOpacity style={[styles.card, { width }]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.imageWrap}>
        {room.photos?.length > 0 ? (
          <Image source={{ uri: room.photos[0] }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <HomeIcon size={36} color={colors.teal} opacity={0.3} />
          </View>
        )}

        <View style={styles.badgeRow}>
          {room.users?.verified && (
            <View style={styles.verifiedBadge}>
              <BadgeCheck size={11} color={colors.teal} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
          <Bookmark size={14} color={saved ? colors.gold : colors.gray400} fill={saved ? colors.gold : 'none'} />
        </TouchableOpacity>
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{room.title}</Text>
        <View style={styles.locationRow}>
          <MapPin size={11} color={colors.gray500} />
          <Text style={styles.location} numberOfLines={1}>{room.city}{room.neighborhood ? `, ${room.neighborhood}` : ''}</Text>
        </View>
        <Text style={styles.price}>
          {room.price?.toLocaleString()} <Text style={styles.priceUnit}>ETB/mo</Text>
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: radius.lg, overflow: 'hidden', ...shadow.sm },
  imageWrap: { height: 130, backgroundColor: colors.tealLight, position: 'relative' },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  badgeRow: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', gap: 4 },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.full,
  },
  verifiedText: { fontSize: 9.5, color: colors.teal, fontWeight: '600' },
  saveBtn: {
    position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', ...shadow.sm,
  },
  info: { padding: spacing.md },
  title: { fontSize: fontSize.sm, fontWeight: '600', color: colors.dark, marginBottom: 3 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  location: { fontSize: fontSize.xs, color: colors.gray500, flexShrink: 1 },
  price: { fontSize: fontSize.base, fontWeight: '700', color: colors.teal },
  priceUnit: { fontSize: fontSize.xs, fontWeight: '400', color: colors.gray400 },
});
