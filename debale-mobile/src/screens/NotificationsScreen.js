import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  ArrowLeft, Bell, CheckCircle, XCircle, Calendar, CreditCard, Home, MessageSquare, FileText, Check
} from 'lucide-react-native';
import { notificationsAPI } from '../services/api';
import { colors, spacing, radius, fontSize, shadow } from '../theme';

const TYPE_CFG = {
  accepted:     { Icon: CheckCircle,   color: colors.green,  bg: colors.greenLight },
  rejected:     { Icon: XCircle,       color: colors.red,    bg: colors.redLight },
  interview:    { Icon: Calendar,      color: colors.purple, bg: colors.purpleLight },
  application:  { Icon: Home,          color: colors.teal,   bg: colors.tealLight },
  subscription: { Icon: CreditCard,    color: colors.gold,   bg: colors.goldLight },
  message:      { Icon: MessageSquare, color: colors.gray500,bg: colors.gray100 },
  agreement:    { Icon: FileText,      color: colors.teal,   bg: colors.tealLight },
};

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const { notifications: data } = await notificationsAPI.getAll();
      setNotifications(data || []);
    } catch (err) { console.error(err.message); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const markAllRead = async () => {
    try {
      await notificationsAPI.readAll();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) { console.error(err); }
  };

  const markRead = async (id) => {
    try {
      await notificationsAPI.readOne(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) { console.error(err); }
  };

  const unread = notifications.filter(n => !n.read).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={20} color={colors.dark} /></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.sub}>{unread} unread</Text>
        </View>
        {unread > 0 && (
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
            <Check size={12} color={colors.teal} />
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.teal} style={{ marginTop: 60 }} />
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <Bell size={40} color={colors.gray300} />
          <Text style={styles.emptyTitle}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.xxl, gap: spacing.sm, paddingBottom: 30 }}
          renderItem={({ item }) => {
            const cfg = TYPE_CFG[item.type] || TYPE_CFG.message;
            return (
              <TouchableOpacity style={[styles.card, !item.read && styles.cardUnread]} onPress={() => markRead(item.id)}>
                <View style={[styles.icon, { backgroundColor: cfg.bg }]}><cfg.Icon size={18} color={cfg.color} /></View>
                <View style={{ flex: 1 }}>
                  <View style={styles.cardTop}>
                    <Text style={[styles.cardTitle, !item.read && { fontWeight: '700' }]}>{item.title}</Text>
                    {!item.read && <View style={styles.dot} />}
                  </View>
                  <Text style={styles.cardBody}>{item.body}</Text>
                  <Text style={styles.cardTime}>{new Date(item.created_at).toLocaleDateString()}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xxl, paddingTop: 56, paddingBottom: spacing.lg },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.dark },
  sub: { fontSize: fontSize.xs, color: colors.gray500 },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.tealLight, borderRadius: radius.sm },
  markAllText: { fontSize: 11, color: colors.teal, fontWeight: '600' },
  card: { flexDirection: 'row', gap: 12, backgroundColor: 'white', borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.gray100 },
  cardUnread: { borderColor: colors.tealMid, backgroundColor: 'rgba(14,124,107,0.03)' },
  icon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: fontSize.sm, color: colors.dark, fontWeight: '500', flex: 1 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.teal },
  cardBody: { fontSize: fontSize.xs, color: colors.gray500, marginTop: 3, lineHeight: 17 },
  cardTime: { fontSize: 10.5, color: colors.gray400, marginTop: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.dark, marginTop: 8 },
});
