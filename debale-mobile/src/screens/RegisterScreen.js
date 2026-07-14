import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Modal, FlatList
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Home, Search, ChevronDown } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, fontSize, shadow } from '../theme';
import countryCodes from '../data/countryCodes';

export default function RegisterScreen({ navigation }) {
  const { t } = useTranslation();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '', role: 'seeker' });
  const [countryCode, setCountryCode] = useState(countryCodes[0]);
  const [localPhone, setLocalPhone] = useState('');
  const [showCodePicker, setShowCodePicker] = useState(false);
  const [codeSearch, setCodeSearch] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleRegister = async () => {
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    if (!form.name || !form.email) return setError('Please fill in all required fields');
    const fullPhone = countryCode.code + localPhone;
    setLoading(true);
    setError('');
    try {
      const user = await register({ name: form.name, email: form.email, phone: fullPhone, password: form.password, role: form.role });
      navigation.replace(user.role === 'provider' ? 'ProviderForm' : 'SeekerForm');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('register_title')}</Text>
        <Text style={styles.subtitle}>{t('register_sub')}</Text>

        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

        {/* Role selector */}
        <View style={styles.roleRow}>
          {[
            { role: 'seeker', Icon: Search, label: t('room_seeker'), desc: t('seeker_desc') },
            { role: 'provider', Icon: Home, label: t('room_provider'), desc: t('provider_desc') },
          ].map(({ role, Icon, label, desc }) => {
            const active = form.role === role;
            return (
              <TouchableOpacity
                key={role}
                style={[styles.roleCard, active && styles.roleCardActive]}
                onPress={() => set('role', role)}
              >
                <Icon size={20} color={active ? colors.teal : colors.gray400} />
                <Text style={[styles.roleLabel, active && { color: colors.teal }]}>{label}</Text>
                <Text style={styles.roleDesc}>{desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>{t('full_name')}</Text>
        <View style={styles.inputWrap}>
          <TextInput style={styles.input} placeholder="Abebe Kebede" placeholderTextColor={colors.gray400}
            value={form.name} onChangeText={(v) => set('name', v)} />
        </View>

        <Text style={styles.label}>{t('email')}</Text>
        <View style={styles.inputWrap}>
          <TextInput style={styles.input} placeholder="you@email.com" placeholderTextColor={colors.gray400}
            autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={(v) => set('email', v)} />
        </View>

        <Text style={styles.label}>{t('phone')}</Text>
        <View style={styles.phoneRow}>
          <TouchableOpacity onPress={() => setShowCodePicker(true)} style={styles.codePicker}>
            <Text style={{ fontSize: 22 }}>{countryCode.flag}</Text>
            <Text style={{ fontWeight: '600', fontSize: fontSize.base }}>{countryCode.code}</Text>
            <ChevronDown size={16} color={colors.gray400} />
          </TouchableOpacity>
          <View style={styles.phoneInputWrap}>
            <TextInput style={styles.phoneInput} placeholder="91 234 5678" placeholderTextColor={colors.gray400}
              keyboardType="phone-pad" value={localPhone} onChangeText={(v) => setLocalPhone(v.replace(/[^0-9]/g, ''))} />
          </View>
        </View>

        <Modal visible={showCodePicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontWeight: '600', fontSize: fontSize.md }}>Select Country</Text>
                <TouchableOpacity onPress={() => { setShowCodePicker(false); setCodeSearch(''); }}>
                  <Text style={{ color: colors.teal, fontWeight: '600' }}>Close</Text>
                </TouchableOpacity>
              </View>
              <TextInput style={styles.modalSearch} placeholder="Search country..." placeholderTextColor={colors.gray400}
                value={codeSearch} onChangeText={setCodeSearch} />
              <FlatList
                data={countryCodes.filter(c => c.name.toLowerCase().includes(codeSearch.toLowerCase()) || c.code.includes(codeSearch))}
                keyExtractor={(item) => item.code + item.iso}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => { setCountryCode(item); setShowCodePicker(false); setCodeSearch(''); }}
                    style={[styles.countryRow, countryCode.iso === item.iso && { backgroundColor: colors.tealLight }]}>
                    <Text style={{ fontSize: 20 }}>{item.flag}</Text>
                    <Text style={{ fontWeight: '500', fontSize: fontSize.sm, width: 55 }}>{item.code}</Text>
                    <Text style={{ color: colors.gray600, fontSize: fontSize.sm }}>{item.name}</Text>
                  </TouchableOpacity>
                )}
                style={{ maxHeight: 350 }}
              />
            </View>
          </View>
        </Modal>

        <Text style={styles.label}>{t('password')}</Text>
        <View style={styles.inputWrap}>
          <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor={colors.gray400}
            secureTextEntry={!showPw} value={form.password} onChangeText={(v) => set('password', v)} />
          <TouchableOpacity onPress={() => setShowPw(!showPw)}>
            {showPw ? <EyeOff size={17} color={colors.gray400} /> : <Eye size={17} color={colors.gray400} />}
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>{t('confirm_password')}</Text>
        <View style={styles.inputWrap}>
          <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor={colors.gray400}
            secureTextEntry={!showPw} value={form.confirmPassword} onChangeText={(v) => set('confirmPassword', v)} />
        </View>

        <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.registerBtnText}>{t('create_account')}</Text>}
        </TouchableOpacity>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>{t('have_account')} </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>{t('sign_in')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  scroll: { padding: spacing.xxl, paddingTop: 60, paddingBottom: 50 },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.dark, marginBottom: 4 },
  subtitle: { fontSize: fontSize.base, color: colors.gray500, marginBottom: spacing.xxl },
  errorBox: { backgroundColor: colors.redLight, padding: 12, borderRadius: radius.sm, marginBottom: spacing.lg },
  errorText: { color: colors.red, fontSize: fontSize.sm },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.xl },
  roleCard: {
    flex: 1, padding: 14, borderRadius: radius.md, borderWidth: 2, borderColor: colors.gray200, backgroundColor: 'white',
  },
  roleCardActive: { borderColor: colors.teal, backgroundColor: colors.tealLight },
  roleLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.dark, marginTop: 8 },
  roleDesc: { fontSize: fontSize.xs, color: colors.gray500, marginTop: 2 },
  label: { fontSize: fontSize.sm, fontWeight: '500', color: colors.gray700, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: colors.gray200, borderRadius: radius.sm,
    paddingHorizontal: 14, marginBottom: spacing.lg, backgroundColor: 'white', height: 50,
  },
  input: { flex: 1, fontSize: fontSize.base, color: colors.dark },
  registerBtn: {
    backgroundColor: colors.teal, height: 50, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm, ...shadow.sm,
  },
  registerBtnText: { color: 'white', fontSize: fontSize.md, fontWeight: '600' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xxl },
  footerText: { color: colors.gray500, fontSize: fontSize.sm },
  footerLink: { color: colors.teal, fontWeight: '600', fontSize: fontSize.sm },
  phoneRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.lg },
  codePicker: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: colors.gray200, borderRadius: radius.sm,
    paddingHorizontal: 12, backgroundColor: 'white', height: 50,
  },
  phoneInputWrap: {
    flex: 1, borderWidth: 1.5, borderColor: colors.gray200, borderRadius: radius.sm,
    paddingHorizontal: 14, backgroundColor: 'white', height: 50, justifyContent: 'center',
  },
  phoneInput: { fontSize: fontSize.base, color: colors.dark },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '70%' },
  modalSearch: { borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.sm, padding: 10, fontSize: fontSize.base, marginBottom: 12 },
  countryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 8, borderRadius: radius.sm },
});
