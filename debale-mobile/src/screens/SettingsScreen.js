import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Switch, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  User, Globe, Lock, Bell, Shield, ChevronRight, LogOut, Check, ChevronLeft
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { colors, spacing, radius, fontSize, shadow } from '../theme';

const SECTIONS = [
  { key: 'account', label: 'Account', Icon: User },
  { key: 'language', label: 'Language', Icon: Globe },
  { key: 'password', label: 'Password', Icon: Lock },
  { key: 'notifications', label: 'Notifications', Icon: Bell },
  { key: 'privacy', label: 'Privacy', Icon: Shield },
];

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const [section, setSection] = useState(null);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({ email: true, sms: true, interview: true });

  const changeLanguage = (lng) => i18n.changeLanguage(lng);

  const handleChangePassword = async () => {
    if (pw.next !== pw.confirm) return Alert.alert('Passwords do not match');
    if (pw.next.length < 6) return Alert.alert('Password must be at least 6 characters');
    setSaving(true);
    try {
      await authAPI.changePassword({ currentPassword: pw.current, newPassword: pw.next });
      Alert.alert('Success', 'Password updated');
      setPw({ current: '', next: '', confirm: '' });
      setSection(null);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Detail view for a selected section
  if (section) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSection(null)} style={styles.backBtn}><ChevronLeft size={20} color={colors.dark} /></TouchableOpacity>
          <Text style={styles.title}>{SECTIONS.find(s => s.key === section)?.label}</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.xxl }}>
          {section === 'account' && (
            <View style={styles.card}>
              <View style={styles.profileRow}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{user?.name?.charAt(0)}</Text></View>
                <View>
                  <Text style={styles.profileName}>{user?.name}</Text>
                  <Text style={styles.profileEmail}>{user?.email}</Text>
                  <View style={styles.roleBadge}><Text style={styles.roleBadgeText}>{user?.role === 'provider' ? 'Room Provider' : 'Room Seeker'}</Text></View>
                </View>
              </View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Phone</Text><Text style={styles.infoValue}>{user?.phone || 'Not set'}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Verified</Text><Text style={styles.infoValue}>{user?.verified ? '✓ Yes' : 'Not yet'}</Text></View>
            </View>
          )}

          {section === 'language' && (
            <View style={{ gap: spacing.md }}>
              {[['en', 'English', '🇬🇧'], ['am', 'አማርኛ (Amharic)', '🇪🇹']].map(([code, label, flag]) => {
                const active = i18n.language === code;
                return (
                  <TouchableOpacity key={code} style={[styles.langCard, active && styles.langCardActive]} onPress={() => changeLanguage(code)}>
                    <Text style={styles.flagEmoji}>{flag}</Text>
                    <Text style={[styles.langLabel, active && { color: colors.teal }]}>{label}</Text>
                    {active && <Check size={18} color={colors.teal} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {section === 'password' && (
            <View style={styles.card}>
              <Text style={styles.label}>Current Password</Text>
              <TextInput style={styles.input} secureTextEntry value={pw.current} onChangeText={v => setPw({ ...pw, current: v })} />
              <Text style={styles.label}>New Password</Text>
              <TextInput style={styles.input} secureTextEntry value={pw.next} onChangeText={v => setPw({ ...pw, next: v })} />
              <Text style={styles.label}>Confirm New Password</Text>
              <TextInput style={styles.input} secureTextEntry value={pw.confirm} onChangeText={v => setPw({ ...pw, confirm: v })} />
              <TouchableOpacity style={styles.saveBtn} onPress={handleChangePassword} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? 'Updating...' : 'Update Password'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {section === 'notifications' && (
            <View style={styles.card}>
              {[['email', 'Email notifications'], ['sms', 'SMS notifications'], ['interview', 'Interview reminders']].map(([key, label]) => (
                <View key={key} style={styles.switchRow}>
                  <Text style={styles.switchLabel}>{label}</Text>
                  <Switch
                    value={notifPrefs[key]}
                    onValueChange={(v) => setNotifPrefs(prev => ({ ...prev, [key]: v }))}
                    trackColor={{ true: colors.teal, false: colors.gray200 }}
                  />
                </View>
              ))}
            </View>
          )}

          {section === 'privacy' && (
            <View style={{ gap: spacing.md }}>
              {[
                ['Profile Visibility', 'Visible to providers when you apply'],
                ['Phone Number', 'Revealed only after acceptance'],
                ['ID Documents', 'Stored securely, visible only to admins'],
              ].map(([title, desc]) => (
                <View key={title} style={styles.privacyCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.privacyTitle}>{title}</Text>
                    <Text style={styles.privacyDesc}>{desc}</Text>
                  </View>
                  <View style={styles.protectedBadge}><Text style={styles.protectedText}>Protected</Text></View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // Main settings list
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings')}</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xxl }}>
        <View style={styles.card}>
          {SECTIONS.map(({ key, label, Icon }, i) => (
            <TouchableOpacity key={key} style={[styles.listRow, i < SECTIONS.length - 1 && styles.listRowBorder]} onPress={() => setSection(key)}>
              <Icon size={18} color={colors.gray600} />
              <Text style={styles.listRowLabel}>{label}</Text>
              <ChevronRight size={16} color={colors.gray300} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <LogOut size={16} color={colors.red} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xxl, paddingTop: 56, paddingBottom: spacing.lg },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.dark },
  card: { backgroundColor: 'white', borderRadius: radius.md, ...shadow.sm, marginBottom: spacing.xl, padding: spacing.lg },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  listRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray50 },
  listRowLabel: { flex: 1, fontSize: fontSize.base, color: colors.dark, fontWeight: '500' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.redLight, borderRadius: radius.md, paddingVertical: 14, marginBottom: 40 },
  logoutText: { color: colors.red, fontWeight: '600', fontSize: fontSize.base },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: spacing.lg },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: 'white', fontWeight: '700', fontSize: fontSize.lg },
  profileName: { fontSize: fontSize.md, fontWeight: '700', color: colors.dark },
  profileEmail: { fontSize: fontSize.sm, color: colors.gray500 },
  roleBadge: { backgroundColor: colors.tealLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, marginTop: 4, alignSelf: 'flex-start' },
  roleBadgeText: { fontSize: 10.5, color: colors.teal, fontWeight: '600' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.gray50 },
  infoLabel: { color: colors.gray500, fontSize: fontSize.sm },
  infoValue: { fontWeight: '500', fontSize: fontSize.sm, color: colors.dark },
  langCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'white', borderRadius: radius.md, padding: spacing.lg, borderWidth: 2, borderColor: colors.gray200 },
  langCardActive: { borderColor: colors.teal, backgroundColor: colors.tealLight },
  flagEmoji: { fontSize: 22 },
  langLabel: { flex: 1, fontSize: fontSize.base, fontWeight: '600', color: colors.dark },
  label: { fontSize: fontSize.sm, fontWeight: '500', color: colors.gray700, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: colors.gray200, borderRadius: radius.sm, paddingHorizontal: 14, height: 46, fontSize: fontSize.base, marginBottom: spacing.md },
  saveBtn: { backgroundColor: colors.teal, borderRadius: radius.sm, paddingVertical: 13, alignItems: 'center', marginTop: spacing.sm },
  saveBtnText: { color: 'white', fontWeight: '600' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.gray50 },
  switchLabel: { fontSize: fontSize.sm, color: colors.dark },
  privacyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: radius.md, padding: spacing.lg, ...shadow.sm },
  privacyTitle: { fontWeight: '600', fontSize: fontSize.sm, color: colors.dark },
  privacyDesc: { fontSize: fontSize.xs, color: colors.gray500, marginTop: 2 },
  protectedBadge: { backgroundColor: colors.greenLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  protectedText: { color: colors.green, fontSize: 10.5, fontWeight: '600' },
});
