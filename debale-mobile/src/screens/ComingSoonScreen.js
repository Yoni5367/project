import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, fontSize, radius } from '../theme';

export default function ComingSoonScreen({ route, navigation }) {
  const { label, phase } = route.params || {};
  const { user, logout } = useAuth();

  // Guest viewing a screen that requires login
  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>🔒</Text>
        <Text style={styles.title}>Sign in required</Text>
        <Text style={styles.sub}>{label || 'This section'} is available once you're logged in.</Text>
        <TouchableOpacity style={styles.signInBtn} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.signInText}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={{ marginTop: spacing.md }}>
          <Text style={styles.linkText}>Create an account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🚧</Text>
      <Text style={styles.title}>{label || 'Coming Soon'}</Text>
      <Text style={styles.sub}>{phase ? `This screen will be built in Phase ${phase}` : 'Coming soon'}</Text>

      <View style={styles.userCard}>
        <Text style={styles.userLabel}>Logged in as</Text>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <Text style={styles.userRole}>{user?.role?.toUpperCase()}</Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream, padding: spacing.xxl },
  emoji: { fontSize: 48, marginBottom: spacing.lg },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.dark, marginBottom: 6 },
  sub: { fontSize: fontSize.sm, color: colors.gray500, marginBottom: spacing.xxxl, textAlign: 'center' },
  userCard: {
    backgroundColor: 'white', borderRadius: radius.md, padding: spacing.xl, width: '100%',
    borderWidth: 1, borderColor: colors.gray100, marginBottom: spacing.xl,
  },
  userLabel: { fontSize: fontSize.xs, color: colors.gray400, marginBottom: 4 },
  userName: { fontSize: fontSize.md, fontWeight: '700', color: colors.dark },
  userEmail: { fontSize: fontSize.sm, color: colors.gray500, marginTop: 2 },
  userRole: { fontSize: fontSize.xs, color: colors.teal, fontWeight: '600', marginTop: 8 },
  logoutBtn: { paddingVertical: 12, paddingHorizontal: 28, borderRadius: radius.sm, backgroundColor: colors.redLight },
  logoutText: { color: colors.red, fontWeight: '600', fontSize: fontSize.sm },
  signInBtn: { backgroundColor: colors.teal, paddingVertical: 12, paddingHorizontal: 36, borderRadius: radius.sm },
  signInText: { color: 'white', fontWeight: '600', fontSize: fontSize.sm },
  linkText: { color: colors.teal, fontSize: fontSize.sm, fontWeight: '500' },
});
