import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { ChevronLeft, ChevronRight, Upload } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../services/api';
import { colors, spacing, radius, fontSize, shadow } from '../theme';

const STEPS = ['Personal Info', 'Lifestyle', 'Location & Budget', 'Review'];

export default function SeekerFormScreen({ navigation }) {
  const { clearJustRegistered, refreshUser } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    age: '', gender: '', occupation: '',
    sleep_schedule: '', cleanliness: '', smoking: 'no', drinking: 'no', pets: 'no_pets',
    housemate_gender: '', languages: '', intro: '',
    budget_min: '', budget_max: '', move_in_date: '', city: '', neighborhood: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const finish = async () => {
    setSaving(true);
    try {
      await usersAPI.updateSeekerProfile(form);
      await refreshUser();
    } catch (err) {
      console.error('Profile save error:', err.message);
    } finally {
      setSaving(false);
      clearJustRegistered();
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate('Main');
    }
  };

  const Chip = ({ active, label, onPress }) => (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderStep = () => {
    if (step === 0) return (
      <View>
        <Field label="Age">
          <TextInput style={styles.input} keyboardType="number-pad" placeholder="25" placeholderTextColor={colors.gray400}
            value={form.age} onChangeText={v => set('age', v)} />
        </Field>
        <Text style={styles.label}>Gender</Text>
        <View style={styles.chipRow}>
          {['male', 'female', 'other'].map(g => (
            <Chip key={g} label={g} active={form.gender === g} onPress={() => set('gender', g)} />
          ))}
        </View>
        <Text style={styles.label}>Occupation</Text>
        <View style={styles.chipRow}>
          {['employed', 'student', 'self_employed'].map(o => (
            <Chip key={o} label={o.replace('_', ' ')} active={form.occupation === o} onPress={() => set('occupation', o)} />
          ))}
        </View>
        <Field label="Languages Spoken">
          <TextInput style={styles.input} placeholder="Amharic, English..." placeholderTextColor={colors.gray400}
            value={form.languages} onChangeText={v => set('languages', v)} />
        </Field>
        <Text style={styles.label}>ID Photo</Text>
        <TouchableOpacity style={styles.uploadBox}>
          <Upload size={22} color={colors.gray400} />
          <Text style={styles.uploadText}>Tap to upload ID photo</Text>
        </TouchableOpacity>
      </View>
    );

    if (step === 1) return (
      <View>
        <Text style={styles.label}>Sleep Schedule</Text>
        <View style={styles.chipRow}>
          {['early_bird', 'night_owl', 'flexible'].map(s => (
            <Chip key={s} label={s.replace('_', ' ')} active={form.sleep_schedule === s} onPress={() => set('sleep_schedule', s)} />
          ))}
        </View>
        <Text style={styles.label}>Cleanliness</Text>
        <View style={styles.chipRow}>
          {['very_clean', 'average', 'relaxed'].map(c => (
            <Chip key={c} label={c.replace('_', ' ')} active={form.cleanliness === c} onPress={() => set('cleanliness', c)} />
          ))}
        </View>
        <Text style={styles.label}>Smoking</Text>
        <View style={styles.chipRow}>
          {['no', 'yes'].map(v => <Chip key={v} label={v} active={form.smoking === v} onPress={() => set('smoking', v)} />)}
        </View>
        <Text style={styles.label}>Pets</Text>
        <View style={styles.chipRow}>
          {['no_pets', 'have_pets', 'fine_with_pets'].map(p => (
            <Chip key={p} label={p.replace(/_/g, ' ')} active={form.pets === p} onPress={() => set('pets', p)} />
          ))}
        </View>
        <Text style={styles.label}>Preferred Housemate Gender</Text>
        <View style={styles.chipRow}>
          {['any', 'male_only', 'female_only'].map(g => (
            <Chip key={g} label={g.replace('_', ' ')} active={form.housemate_gender === g} onPress={() => set('housemate_gender', g)} />
          ))}
        </View>
        <Field label="Short Introduction">
          <TextInput
            style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
            placeholder="Tell potential housemates about yourself..."
            placeholderTextColor={colors.gray400}
            multiline maxLength={300}
            value={form.intro} onChangeText={v => set('intro', v)}
          />
        </Field>
      </View>
    );

    if (step === 2) return (
      <View>
        <View style={styles.row}>
          <Field label="Min Budget (ETB)" style={{ flex: 1 }}>
            <TextInput style={styles.input} keyboardType="number-pad" placeholder="2000" placeholderTextColor={colors.gray400}
              value={form.budget_min} onChangeText={v => set('budget_min', v)} />
          </Field>
          <Field label="Max Budget (ETB)" style={{ flex: 1 }}>
            <TextInput style={styles.input} keyboardType="number-pad" placeholder="6000" placeholderTextColor={colors.gray400}
              value={form.budget_max} onChangeText={v => set('budget_max', v)} />
          </Field>
        </View>
        <Field label="Move-in Date">
          <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={colors.gray400}
            value={form.move_in_date} onChangeText={v => set('move_in_date', v)} />
        </Field>
        <Text style={styles.label}>City</Text>
        <View style={styles.chipRow}>
          {['Addis Ababa', 'Dire Dawa', 'Bahir Dar', 'Hawassa'].map(c => (
            <Chip key={c} label={c} active={form.city === c} onPress={() => set('city', c)} />
          ))}
        </View>
        <Field label="Neighborhood">
          <TextInput style={styles.input} placeholder="e.g. Bole, CMC..." placeholderTextColor={colors.gray400}
            value={form.neighborhood} onChangeText={v => set('neighborhood', v)} />
        </Field>
      </View>
    );

    if (step === 3) return (
      <View>
        <View style={styles.reviewCard}>
          {[
            ['Age', form.age], ['Gender', form.gender], ['Occupation', form.occupation],
            ['Budget', form.budget_min && form.budget_max ? `${form.budget_min}–${form.budget_max} ETB` : '—'],
            ['City', form.city], ['Sleep', form.sleep_schedule],
          ].map(([k, v]) => (
            <View key={k} style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>{k}</Text>
              <Text style={styles.reviewValue}>{v || '—'}</Text>
            </View>
          ))}
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoBoxTitle}>What's next?</Text>
          <Text style={styles.infoBoxText}>Subscribe (150 ETB/month) to unlock browsing and applying to rooms.</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>Step {step + 1} of {STEPS.length}: {STEPS[step]}</Text>
        <View style={styles.progressRow}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]} />
          ))}
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 30 }}>
        {renderStep()}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 ? (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(s => s - 1)}>
            <ChevronLeft size={18} color={colors.teal} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        ) : <View />}

        {step < STEPS.length - 1 ? (
          <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(s => s + 1)}>
            <Text style={styles.nextBtnText}>Next</Text>
            <ChevronRight size={18} color="white" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.nextBtn} onPress={finish} disabled={saving}>
            {saving ? <ActivityIndicator color="white" /> : <Text style={styles.nextBtnText}>Finish</Text>}
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children, style }) {
  return (
    <View style={[{ marginBottom: spacing.lg }, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: spacing.xxl, paddingTop: 56, paddingBottom: spacing.lg },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.dark },
  subtitle: { fontSize: fontSize.sm, color: colors.gray500, marginTop: 2, marginBottom: spacing.md },
  progressRow: { flexDirection: 'row', gap: 6 },
  progressDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.gray200 },
  progressDotActive: { backgroundColor: colors.teal },
  scroll: { flex: 1, paddingHorizontal: spacing.xxl },
  label: { fontSize: fontSize.sm, fontWeight: '500', color: colors.gray700, marginBottom: 8 },
  input: {
    borderWidth: 1.5, borderColor: colors.gray200, borderRadius: radius.sm,
    paddingHorizontal: 14, height: 48, fontSize: fontSize.base, color: colors.dark, backgroundColor: 'white',
  },
  row: { flexDirection: 'row', gap: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.lg },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.gray200, backgroundColor: 'white' },
  chipActive: { backgroundColor: colors.tealLight, borderColor: colors.teal },
  chipText: { fontSize: fontSize.sm, color: colors.gray600, textTransform: 'capitalize' },
  chipTextActive: { color: colors.teal, fontWeight: '600' },
  uploadBox: {
    borderWidth: 2, borderColor: colors.gray200, borderStyle: 'dashed', borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', paddingVertical: 28, backgroundColor: colors.gray50, gap: 8,
  },
  uploadText: { fontSize: fontSize.sm, color: colors.gray500 },
  reviewCard: { backgroundColor: 'white', borderRadius: radius.md, padding: spacing.lg, ...shadow.sm },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.gray50 },
  reviewLabel: { color: colors.gray500, fontSize: fontSize.sm },
  reviewValue: { fontWeight: '600', color: colors.dark, fontSize: fontSize.sm, textTransform: 'capitalize' },
  infoBox: { backgroundColor: colors.goldLight, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.lg },
  infoBoxTitle: { fontWeight: '700', color: colors.dark, marginBottom: 4 },
  infoBoxText: { fontSize: fontSize.sm, color: colors.gray600, lineHeight: 19 },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xxl, paddingVertical: spacing.lg, borderTopWidth: 1, borderTopColor: colors.gray100, backgroundColor: 'white',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 6 },
  backBtnText: { color: colors.teal, fontWeight: '600', fontSize: fontSize.base },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.teal, paddingHorizontal: 24, height: 46, borderRadius: radius.sm },
  nextBtnText: { color: 'white', fontWeight: '600', fontSize: fontSize.base },
});
