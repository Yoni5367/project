import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { CheckCircle, Shield, ArrowLeft } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { paymentsAPI } from '../services/api';
import { colors, spacing, radius, fontSize, shadow } from '../theme';

const PLANS = [
  { id: 'monthly', label: 'Monthly', price: 150, months: 1 },
  { id: '3month', label: '3 Months', price: 400, months: 3, save: '11%', popular: true },
  { id: '6month', label: '6 Months', price: 750, months: 6, save: '17%' },
];
const GATEWAYS = [
  { id: 'telebirr', name: 'Telebirr', color: '#0077B6' },
  { id: 'cbe', name: 'CBE Birr', color: '#1B5E20' },
  { id: 'dashen', name: 'Dashen Bank', color: '#B71C1C' },
  { id: 'awash', name: 'Awash Bank', color: '#E65100' },
];

export default function PaymentScreen({ navigation }) {
  const { refreshUser } = useAuth();
  const [plan, setPlan] = useState('monthly');
  const [gateway, setGateway] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const selectedPlan = PLANS.find(p => p.id === plan);

  const handlePay = async () => {
    if (!gateway) return;
    setLoading(true);
    try {
      const { payment_id } = await paymentsAPI.initiate(plan, gateway);
      await paymentsAPI.confirm(payment_id);
      await refreshUser();
      setSuccess(true);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIcon}><CheckCircle size={44} color={colors.green} /></View>
        <Text style={styles.successTitle}>Payment Successful!</Text>
        <Text style={styles.successSub}>Your account is now active for {selectedPlan.months} month{selectedPlan.months > 1 ? 's' : ''}.</Text>
        <TouchableOpacity style={styles.successBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.successBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={20} color={colors.dark} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Subscribe</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xxl, paddingBottom: 120 }}>
        <Text style={styles.sectionLabel}>Choose a plan</Text>
        <View style={styles.plansRow}>
          {PLANS.map(p => {
            const active = plan === p.id;
            return (
              <TouchableOpacity key={p.id} style={[styles.planCard, active && styles.planCardActive]} onPress={() => setPlan(p.id)}>
                {p.popular && <View style={styles.popularBadge}><Text style={styles.popularText}>Popular</Text></View>}
                {p.save && <Text style={styles.saveText}>Save {p.save}</Text>}
                <Text style={[styles.planPrice, active && { color: colors.teal }]}>{p.price}</Text>
                <Text style={styles.planUnit}>ETB / {p.months}mo</Text>
                <Text style={styles.planLabel}>{p.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Payment Method</Text>
        <View style={styles.gatewayGrid}>
          {GATEWAYS.map(g => {
            const active = gateway === g.id;
            return (
              <TouchableOpacity key={g.id} style={[styles.gatewayCard, active && { borderColor: g.color, backgroundColor: `${g.color}10` }]} onPress={() => setGateway(g.id)}>
                <View style={[styles.gatewayIcon, { backgroundColor: g.color }]}><Text style={styles.gatewayIconText}>{g.name.slice(0, 3)}</Text></View>
                <Text style={[styles.gatewayName, active && { color: g.color }]}>{g.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Plan</Text>
            <Text style={styles.summaryValue}>{selectedPlan.label}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Method</Text>
            <Text style={styles.summaryValue}>{gateway ? GATEWAYS.find(g => g.id === gateway)?.name : '—'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotal}>{selectedPlan.price} ETB</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.payBtn, !gateway && styles.payBtnDisabled]} onPress={handlePay} disabled={!gateway || loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.payBtnText}>Pay {selectedPlan.price} ETB</Text>}
        </TouchableOpacity>
        <View style={styles.secureRow}>
          <Shield size={11} color={colors.gray400} />
          <Text style={styles.secureText}>Secure local Ethiopian payment</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xxl, paddingTop: 56, paddingBottom: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.dark },
  sectionLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.gray700, marginBottom: spacing.md, marginTop: spacing.md },
  plansRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  planCard: { flex: 1, backgroundColor: 'white', borderRadius: radius.md, borderWidth: 2, borderColor: colors.gray200, padding: spacing.md, alignItems: 'center', ...shadow.sm },
  planCardActive: { borderColor: colors.teal, backgroundColor: colors.tealLight },
  popularBadge: { position: 'absolute', top: -8, backgroundColor: colors.teal, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  popularText: { color: 'white', fontSize: 9, fontWeight: '700' },
  saveText: { position: 'absolute', top: 6, right: 6, fontSize: 9, color: colors.gold, fontWeight: '700' },
  planPrice: { fontSize: fontSize.xl, fontWeight: '800', color: colors.dark, marginTop: 8 },
  planUnit: { fontSize: 9.5, color: colors.gray400 },
  planLabel: { fontSize: fontSize.xs, fontWeight: '600', color: colors.dark, marginTop: 4 },
  gatewayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  gatewayCard: { flexBasis: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'white', borderRadius: radius.md, borderWidth: 2, borderColor: colors.gray200, padding: spacing.md },
  gatewayIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  gatewayIconText: { color: 'white', fontSize: 9, fontWeight: '700' },
  gatewayName: { fontSize: fontSize.sm, fontWeight: '600', color: colors.dark },
  summaryCard: { backgroundColor: 'white', borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.gray200 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  summaryLabel: { color: colors.gray500, fontSize: fontSize.sm },
  summaryValue: { fontWeight: '500', fontSize: fontSize.sm, color: colors.dark },
  divider: { height: 1, backgroundColor: colors.gray100, marginVertical: spacing.sm },
  summaryTotalLabel: { fontWeight: '700', fontSize: fontSize.base, color: colors.dark },
  summaryTotal: { fontSize: fontSize.xl, fontWeight: '800', color: colors.teal },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', padding: spacing.xxl, paddingBottom: 30, borderTopWidth: 1, borderTopColor: colors.gray100 },
  payBtn: { backgroundColor: colors.teal, height: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  payBtnDisabled: { backgroundColor: colors.gray300 },
  payBtnText: { color: 'white', fontWeight: '700', fontSize: fontSize.base },
  secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 10 },
  secureText: { fontSize: 11, color: colors.gray400 },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream, padding: spacing.xxl },
  successIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  successTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.dark, marginBottom: 8 },
  successSub: { fontSize: fontSize.sm, color: colors.gray500, textAlign: 'center', marginBottom: spacing.xxxl },
  successBtn: { backgroundColor: colors.teal, paddingHorizontal: 40, paddingVertical: 14, borderRadius: radius.md },
  successBtnText: { color: 'white', fontWeight: '700', fontSize: fontSize.base },
});
