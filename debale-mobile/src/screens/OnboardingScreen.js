import { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Search, Sparkles, Shield, ChevronRight } from 'lucide-react-native';
import { colors, spacing, radius, fontSize } from '../theme';

const { width } = Dimensions.get('window');

export default function OnboardingScreen({ navigation }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);

  const slides = [
    { Icon: Search, title: t('onboard_1_title'), sub: t('onboard_1_sub'), color: colors.teal, bg: colors.tealLight },
    { Icon: Sparkles, title: t('onboard_2_title'), sub: t('onboard_2_sub'), color: colors.gold, bg: colors.goldLight },
    { Icon: Shield, title: t('onboard_3_title'), sub: t('onboard_3_sub'), color: colors.purple, bg: colors.purpleLight },
  ];

  const handleNext = () => {
    if (index < slides.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1 });
      setIndex(index + 1);
    } else {
      navigation.replace('App');
    }
  };

  const handleSkip = () => navigation.replace('App');

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
        <Text style={styles.skipText}>{t('skip')}</Text>
      </TouchableOpacity>

      <FlatList
        ref={listRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.iconCircle, { backgroundColor: item.bg }]}>
              <item.Icon size={56} color={item.color} strokeWidth={1.6} />
            </View>
            <Text style={styles.slideTitle}>{item.title}</Text>
            <Text style={styles.slideSub}>{item.sub}</Text>
          </View>
        )}
      />

      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
        <Text style={styles.nextText}>{index === slides.length - 1 ? t('get_started') : t('next')}</Text>
        <ChevronRight size={18} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  skipBtn: { position: 'absolute', top: 56, right: spacing.xl, zIndex: 10 },
  skipText: { color: colors.gray500, fontSize: fontSize.sm, fontWeight: '500' },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxxl, paddingTop: 100 },
  iconCircle: {
    width: 140, height: 140, borderRadius: 70,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xxxl,
  },
  slideTitle: {
    fontSize: fontSize.xxl, fontWeight: '700', color: colors.dark,
    textAlign: 'center', marginBottom: spacing.md,
  },
  slideSub: {
    fontSize: fontSize.base, color: colors.gray500, textAlign: 'center', lineHeight: 22,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: spacing.xxl },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gray200 },
  dotActive: { backgroundColor: colors.teal, width: 24 },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.teal, marginHorizontal: spacing.xxl, marginBottom: spacing.xxxl,
    paddingVertical: 16, borderRadius: radius.md,
  },
  nextText: { color: 'white', fontSize: fontSize.md, fontWeight: '600' },
});
