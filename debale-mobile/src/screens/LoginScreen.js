import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, fontSize, shadow } from '../theme';

export default function LoginScreen({ navigation }) {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) return setError('Please fill in all fields');
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate('Main');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Svg width={48} height={38} viewBox="0 0 60 48" fill="none">
            <Path d="M6 28 L30 8 L54 28" stroke={colors.teal} strokeWidth={4} strokeLinecap="round" />
            <Circle cx={18} cy={28} r={7} fill={colors.teal} opacity={0.95} />
            <Circle cx={42} cy={28} r={7} fill={colors.teal} opacity={0.95} />
            <Rect x={26} y={32} width={8} height={14} rx={2} fill={colors.gold} />
          </Svg>
          <Text style={styles.brand}>debale</Text>
        </View>

        <Text style={styles.title}>{t('login_title')}</Text>
        <Text style={styles.subtitle}>{t('login_sub')}</Text>

        {error ? (
          <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>
        ) : null}

        {/* Email */}
        <Text style={styles.label}>{t('email')}</Text>
        <View style={styles.inputWrap}>
          <Mail size={17} color={colors.gray400} />
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.gray400}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* Password */}
        <View style={styles.labelRow}>
          <Text style={styles.label}>{t('password')}</Text>
          <TouchableOpacity><Text style={styles.forgotLink}>{t('forgot_password')}</Text></TouchableOpacity>
        </View>
        <View style={styles.inputWrap}>
          <Lock size={17} color={colors.gray400} />
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.gray400}
            secureTextEntry={!showPw}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPw(!showPw)}>
            {showPw ? <EyeOff size={17} color={colors.gray400} /> : <Eye size={17} color={colors.gray400} />}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.loginBtnText}>{t('sign_in')}</Text>}
        </TouchableOpacity>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>{t('no_account')} </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>{t('sign_up')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.demoBox}>
          <Text style={styles.demoTitle}>🔑 Admin Login</Text>
          <Text style={styles.demoText}>admin@debale.et / Admin@Debale2025</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  scroll: { padding: spacing.xxl, paddingTop: 70, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.xxxl },
  brand: { fontSize: 24, fontWeight: '700', color: colors.dark, letterSpacing: -0.5 },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.dark, marginBottom: 4 },
  subtitle: { fontSize: fontSize.base, color: colors.gray500, marginBottom: spacing.xxl },
  errorBox: { backgroundColor: colors.redLight, padding: 12, borderRadius: radius.sm, marginBottom: spacing.lg },
  errorText: { color: colors.red, fontSize: fontSize.sm },
  label: { fontSize: fontSize.sm, fontWeight: '500', color: colors.gray700, marginBottom: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  forgotLink: { fontSize: fontSize.sm, color: colors.teal },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: colors.gray200, borderRadius: radius.sm,
    paddingHorizontal: 14, marginBottom: spacing.lg, backgroundColor: 'white', height: 50,
  },
  input: { flex: 1, fontSize: fontSize.base, color: colors.dark },
  loginBtn: {
    backgroundColor: colors.teal, height: 50, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm, ...shadow.sm,
  },
  loginBtnText: { color: 'white', fontSize: fontSize.md, fontWeight: '600' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xxl },
  footerText: { color: colors.gray500, fontSize: fontSize.sm },
  footerLink: { color: colors.teal, fontWeight: '600', fontSize: fontSize.sm },
  demoBox: { marginTop: spacing.xxxl, padding: 14, backgroundColor: colors.tealLight, borderRadius: radius.sm },
  demoTitle: { fontSize: fontSize.xs, fontWeight: '600', color: colors.gray700, marginBottom: 4 },
  demoText: { fontSize: fontSize.xs, color: colors.gray600 },
});
