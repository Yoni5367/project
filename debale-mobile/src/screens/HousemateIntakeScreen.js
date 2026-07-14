import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert
} from 'react-native';
import { ArrowLeft, ChevronRight, Users } from 'lucide-react-native';
import { housemateAPI } from '../services/api';
import { colors, spacing, radius, fontSize, shadow } from '../theme';

const STEPS = ['Languages & Social', 'Lifestyle', 'Budget & City', 'Review'];
const SOCIABILITY_OPTS = ['very_social', 'balanced', 'prefers_quiet'];
const SLEEP_OPTS = ['early_bird', 'night_owl', 'flexible'];
const CLEAN_OPTS = ['tidy', 'moderate', 'relaxed'];
const SMOKE_OPTS = ['non_smoker', 'occasional', 'smoker'];
const GUEST_OPTS = ['frequent', 'occasional', 'rarely'];

export default function HousemateIntakeScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    languages: [], sociability: '', lifestyle_notes: '',
    sleep_schedule: '', cleanliness: '', smoking: '',
    guests_habit: '', budget_min: '', budget_max: '', preferred_city: '',
  });
  const [langInput, setLangInput] = useState('');

  useEffect(() => {
    housemateAPI.getIntake()
      .then(res => {
        if (res.intake) {
          const i = res.intake;
          setForm({
            languages: i.languages || [],
            sociability: i.sociability || '',
            lifestyle_notes: i.lifestyle_notes || '',
            sleep_schedule: i.sleep_schedule || '',
            cleanliness: i.cleanliness || '',
            smoking: i.smoking || '',
            guests_habit: i.guests_habit || '',
            budget_min: i.budget_min?.toString() || '',
            budget_max: i.budget_max?.toString() || '',
            preferred_city: i.preferred_city || '',
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addLanguage = () => {
    const trimmed = langInput.trim();
    if (trimmed && !form.languages.includes(trimmed)) {
      setForm(f => ({ ...f, languages: [...f.languages, trimmed] }));
    }
    setLangInput('');
  };

  const removeLanguage = (lang) => {
    setForm(f => ({ ...f, languages: f.languages.filter(l => l !== lang) }));
  };

  const toggleOption = (field, value) => {
    setForm(f => ({ ...f, [field]: f[field] === value ? '' : value }));
  };

  const canProceed = () => {
    if (step === 0) return form.languages.length > 0 && form.sociability;
    if (step === 1) return form.sleep_schedule && form.cleanliness && form.smoking && form.guests_habit;
    if (step === 2) return !!form.budget_min && !!form.budget_max && !!form.preferred_city;
    return true;
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await housemateAPI.saveIntake({
        ...form,
        budget_min: Number(form.budget_min),
        budget_max: Number(form.budget_max),
      });
      Alert.alert('Saved!', 'Your housemate profile is complete.', [
        { text: 'Find Matches', onPress: () => navigation.replace('HousemateSuggestions') },
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderChips = (field, options) => (
    <View style={styles.chipRow}>
      {options.map(o => {
        const active = form[field] === o;
        return (
          <TouchableOpacity
            key={o}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => toggleOption(field, o)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {o.replace(/_/g, ' ')}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={colors.teal} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 0 ? navigation.goBack() : setStep(s => s - 1)} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.dark} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <Text style={styles.stepIndicator}>{step + 1}/{STEPS.length}</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.title}>Find Me a Group</Text>
        <Text style={styles.subtitle}>Tell us about yourself so we can find compatible housemates.</Text>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
        </View>

        {step === 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Languages You Speak</Text>
            <View style={styles.langRow}>
              <TextInput style={styles.input} value={langInput} onChangeText={setLangInput}
                placeholder="e.g. Amharic, English" placeholderTextColor={colors.gray400} />
              <TouchableOpacity style={styles.addBtn} onPress={addLanguage}><Text style={styles.addBtnText}>Add</Text></TouchableOpacity>
            </View>
            <View style={styles.langTags}>
              {form.languages.map(l => (
                <TouchableOpacity key={l} style={styles.langTag} onPress={() => removeLanguage(l)}>
                  <Text style={styles.langTagText}>{l} ✕</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.sectionTitle}>Sociability</Text>
            <Text style={styles.hint}>How do you prefer social interactions at home?</Text>
            {renderChips('sociability', SOCIABILITY_OPTS)}
          </View>
        )}

        {step === 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sleep Schedule</Text>
            {renderChips('sleep_schedule', SLEEP_OPTS)}
            <Text style={styles.sectionTitle}>Cleanliness</Text>
            {renderChips('cleanliness', CLEAN_OPTS)}
            <Text style={styles.sectionTitle}>Smoking</Text>
            {renderChips('smoking', SMOKE_OPTS)}
            <Text style={styles.sectionTitle}>Guests</Text>
            <Text style={styles.hint}>How often do you have guests over?</Text>
            {renderChips('guests_habit', GUEST_OPTS)}
            <Text style={styles.sectionTitle}>Additional Notes</Text>
            <TextInput style={[styles.input, styles.textArea]} value={form.lifestyle_notes}
              onChangeText={t => setForm(f => ({ ...f, lifestyle_notes: t }))}
              placeholder="Anything else the AI should consider..." placeholderTextColor={colors.gray400}
              multiline numberOfLines={3} />
          </View>
        )}

        {step === 2 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Budget Range (ETB)</Text>
            <View style={styles.budgetRow}>
              <TextInput style={[styles.input, { flex: 1 }]} value={form.budget_min}
                onChangeText={t => setForm(f => ({ ...f, budget_min: t }))}
                placeholder="Min" placeholderTextColor={colors.gray400} keyboardType="numeric" />
              <Text style={styles.budgetDash}>–</Text>
              <TextInput style={[styles.input, { flex: 1 }]} value={form.budget_max}
                onChangeText={t => setForm(f => ({ ...f, budget_max: t }))}
                placeholder="Max" placeholderTextColor={colors.gray400} keyboardType="numeric" />
            </View>
            <Text style={styles.sectionTitle}>Preferred City</Text>
            <TextInput style={styles.input} value={form.preferred_city}
              onChangeText={t => setForm(f => ({ ...f, preferred_city: t }))}
              placeholder="e.g. Addis Ababa" placeholderTextColor={colors.gray400} />
          </View>
        )}

        {step === 3 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Review Your Profile</Text>
            {[
              ['Languages', form.languages.join(', ')],
              ['Sociability', form.sociability.replace(/_/g, ' ')],
              ['Sleep Schedule', form.sleep_schedule.replace(/_/g, ' ')],
              ['Cleanliness', form.cleanliness.replace(/_/g, ' ')],
              ['Smoking', form.smoking.replace(/_/g, ' ')],
              ['Guests', form.guests_habit.replace(/_/g, ' ')],
              ['Budget', `${form.budget_min}–${form.budget_max} ETB`],
              ['City', form.preferred_city],
              ...(form.lifestyle_notes ? [['Notes', form.lifestyle_notes]] : []),
            ].map(([label, value]) => (
              <View key={label} style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>{label}</Text>
                <Text style={styles.reviewValue}>{value}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, (!canProceed() || saving) && styles.primaryBtnDisabled]}
          disabled={!canProceed() || saving}
          onPress={() => step === 3 ? handleSubmit() : setStep(s => s + 1)}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.primaryBtnText}>{step === 3 ? 'Save & Find Matches' : 'Continue'}</Text>
          )}
          {!saving && <ChevronRight size={18} color="white" />}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xxl, paddingTop: 56, paddingBottom: spacing.md },
  backBtn: { padding: 8, borderRadius: radius.sm, backgroundColor: colors.gray100 },
  stepIndicator: { fontSize: fontSize.sm, color: colors.gray500, fontWeight: '600' },
  body: { paddingHorizontal: spacing.xxl },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.dark },
  subtitle: { fontSize: fontSize.sm, color: colors.gray500, marginTop: 4, marginBottom: spacing.lg },
  progressBar: { height: 4, backgroundColor: colors.gray200, borderRadius: 2, marginBottom: spacing.xl, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.teal, borderRadius: 2 },
  section: { marginBottom: spacing.xl },
  sectionTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.dark, marginTop: spacing.lg, marginBottom: spacing.sm },
  hint: { fontSize: fontSize.xs, color: colors.gray500, marginBottom: spacing.sm },
  input: { backgroundColor: 'white', borderRadius: radius.sm, padding: 14, fontSize: fontSize.sm, color: colors.dark, borderWidth: 1, borderColor: colors.gray200 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  langRow: { flexDirection: 'row', gap: spacing.sm },
  addBtn: { backgroundColor: colors.teal, borderRadius: radius.sm, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { color: 'white', fontWeight: '600', fontSize: fontSize.sm },
  langTags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  langTag: { backgroundColor: colors.tealLight, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  langTagText: { fontSize: fontSize.xs, color: colors.teal, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.full, backgroundColor: 'white', borderWidth: 1, borderColor: colors.gray200 },
  chipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { fontSize: fontSize.xs, color: colors.gray600, fontWeight: '500' },
  chipTextActive: { color: 'white' },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  budgetDash: { fontSize: fontSize.lg, color: colors.gray400 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  reviewLabel: { fontSize: fontSize.sm, color: colors.gray500 },
  reviewValue: { fontSize: fontSize.sm, fontWeight: '600', color: colors.dark, maxWidth: '60%', textAlign: 'right' },
  primaryBtn: { flexDirection: 'row', backgroundColor: colors.teal, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: 'white', fontWeight: '700', fontSize: fontSize.base },
});
