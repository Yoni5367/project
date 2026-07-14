import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, ChevronRight, Plus, X as XIcon } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { listingsAPI, uploadAPI } from '../services/api';
import { colors, spacing, radius, fontSize, shadow } from '../theme';

const STEPS = ['Room Details', 'Photos', 'Requirements', 'Review'];

export default function ProviderFormScreen({ navigation }) {
  const { clearJustRegistered } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [form, setForm] = useState({
    title: '', property_type: '', price: '', furnishing: '', lease_duration: '',
    city: '', neighborhood: '',
    includes_wifi: false, includes_electricity: false, includes_water: false,
    photos: [],
    preferred_gender: '', smoking_allowed: false, pets_allowed: false,
    house_rules: '', deal_breakers: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission needed', 'Allow photo access to upload room photos.');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled) return;

    setUploadingPhoto(true);
    try {
      const { url } = await uploadAPI.photo(result.assets[0], 'photos');
      set('photos', [...form.photos, url]);
    } catch (err) {
      Alert.alert('Upload failed', err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = (url) => set('photos', form.photos.filter(p => p !== url));

  const finish = async () => {
    setSaving(true);
    try {
      await listingsAPI.create(form);
      clearJustRegistered();
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate('Main');
    } catch (err) {
      Alert.alert('Could not publish listing', err.message);
    } finally {
      setSaving(false);
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
        <Field label="Listing Title">
          <TextInput style={styles.input} placeholder="Bright Room in Bole" placeholderTextColor={colors.gray400}
            value={form.title} onChangeText={v => set('title', v)} />
        </Field>
        <Text style={styles.label}>Property Type</Text>
        <View style={styles.chipRow}>
          {['Single Room', 'Shared Apartment', 'Studio'].map(t => (
            <Chip key={t} label={t} active={form.property_type === t} onPress={() => set('property_type', t)} />
          ))}
        </View>
        <Field label="Monthly Rent (ETB)">
          <TextInput style={styles.input} keyboardType="number-pad" placeholder="3500" placeholderTextColor={colors.gray400}
            value={form.price} onChangeText={v => set('price', v)} />
        </Field>
        <Text style={styles.label}>Rent Includes</Text>
        <View style={styles.chipRow}>
          {[['includes_wifi', 'WiFi'], ['includes_electricity', 'Electricity'], ['includes_water', 'Water']].map(([key, label]) => (
            <Chip key={key} label={label} active={form[key]} onPress={() => set(key, !form[key])} />
          ))}
        </View>
        <Text style={styles.label}>Furnishing</Text>
        <View style={styles.chipRow}>
          {['Fully Furnished', 'Semi-Furnished', 'Unfurnished'].map(f => (
            <Chip key={f} label={f} active={form.furnishing === f} onPress={() => set('furnishing', f)} />
          ))}
        </View>
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

    if (step === 1) return (
      <View>
        <Text style={styles.label}>Room Photos ({form.photos.length})</Text>
        <Text style={styles.hint}>Upload at least 2 photos so seekers can see the room</Text>
        <View style={styles.photoGrid}>
          {form.photos.map((url) => (
            <View key={url} style={styles.photoThumb}>
              <Image source={{ uri: url }} style={styles.photoImg} />
              <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removePhoto(url)}>
                <XIcon size={12} color="white" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addPhotoTile} onPress={pickImage} disabled={uploadingPhoto}>
            {uploadingPhoto ? <ActivityIndicator color={colors.teal} /> : <Plus size={26} color={colors.gray400} />}
          </TouchableOpacity>
        </View>
      </View>
    );

    if (step === 2) return (
      <View>
        <Text style={styles.label}>Preferred Housemate Gender</Text>
        <View style={styles.chipRow}>
          {['any', 'male_only', 'female_only'].map(g => (
            <Chip key={g} label={g.replace('_', ' ')} active={form.preferred_gender === g} onPress={() => set('preferred_gender', g)} />
          ))}
        </View>
        <Text style={styles.label}>Smoking Allowed</Text>
        <View style={styles.chipRow}>
          <Chip label="Yes" active={form.smoking_allowed === true} onPress={() => set('smoking_allowed', true)} />
          <Chip label="No" active={form.smoking_allowed === false} onPress={() => set('smoking_allowed', false)} />
        </View>
        <Text style={styles.label}>Pets Allowed</Text>
        <View style={styles.chipRow}>
          <Chip label="Yes" active={form.pets_allowed === true} onPress={() => set('pets_allowed', true)} />
          <Chip label="No" active={form.pets_allowed === false} onPress={() => set('pets_allowed', false)} />
        </View>
        <Field label="House Rules">
          <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline
            placeholder="e.g. No loud music after 10pm..." placeholderTextColor={colors.gray400}
            value={form.house_rules} onChangeText={v => set('house_rules', v)} />
        </Field>
        <Field label="Deal Breakers">
          <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline
            placeholder="e.g. No smoking indoors..." placeholderTextColor={colors.gray400}
            value={form.deal_breakers} onChangeText={v => set('deal_breakers', v)} />
        </Field>
      </View>
    );

    if (step === 3) return (
      <View>
        <View style={styles.reviewCard}>
          {[
            ['Title', form.title], ['Type', form.property_type], ['Rent', form.price ? `${form.price} ETB` : '—'],
            ['Furnishing', form.furnishing], ['City', form.city], ['Photos', `${form.photos.length} uploaded`],
          ].map(([k, v]) => (
            <View key={k} style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>{k}</Text>
              <Text style={styles.reviewValue}>{v || '—'}</Text>
            </View>
          ))}
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoBoxTitle}>Next: Subscribe & Publish</Text>
          <Text style={styles.infoBoxText}>Subscribe (200 ETB/month) to publish this listing and start receiving applicants.</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.title}>List Your Room</Text>
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
          <TouchableOpacity style={[styles.nextBtn, { backgroundColor: colors.gold }]} onPress={finish} disabled={saving}>
            {saving ? <ActivityIndicator color="white" /> : <Text style={styles.nextBtnText}>Publish Listing</Text>}
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
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
  progressDotActive: { backgroundColor: colors.gold },
  scroll: { flex: 1, paddingHorizontal: spacing.xxl },
  label: { fontSize: fontSize.sm, fontWeight: '500', color: colors.gray700, marginBottom: 8 },
  hint: { fontSize: fontSize.xs, color: colors.gray400, marginBottom: spacing.md },
  input: {
    borderWidth: 1.5, borderColor: colors.gray200, borderRadius: radius.sm,
    paddingHorizontal: 14, height: 48, fontSize: fontSize.base, color: colors.dark, backgroundColor: 'white',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.lg },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.gray200, backgroundColor: 'white' },
  chipActive: { backgroundColor: colors.goldLight, borderColor: colors.gold },
  chipText: { fontSize: fontSize.sm, color: colors.gray600, textTransform: 'capitalize' },
  chipTextActive: { color: colors.gold, fontWeight: '600' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  photoThumb: { width: 100, height: 100, borderRadius: radius.md, overflow: 'hidden', position: 'relative' },
  photoImg: { width: '100%', height: '100%' },
  removePhotoBtn: {
    position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  addPhotoTile: {
    width: 100, height: 100, borderRadius: radius.md, borderWidth: 2, borderColor: colors.gray200,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gray50,
  },
  reviewCard: { backgroundColor: 'white', borderRadius: radius.md, padding: spacing.lg, ...shadow.sm },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.gray50 },
  reviewLabel: { color: colors.gray500, fontSize: fontSize.sm },
  reviewValue: { fontWeight: '600', color: colors.dark, fontSize: fontSize.sm, maxWidth: '60%', textAlign: 'right' },
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
