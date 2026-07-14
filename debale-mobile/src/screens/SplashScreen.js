import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { colors } from '../theme';

export default function SplashScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      navigation.replace('Onboarding');
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
        <Svg width={72} height={58} viewBox="0 0 60 48" fill="none">
          <Path d="M6 28 L30 8 L54 28" stroke="white" strokeWidth={4} strokeLinecap="round" />
          <Circle cx={18} cy={28} r={7} fill="white" opacity={0.95} />
          <Circle cx={42} cy={28} r={7} fill="white" opacity={0.95} />
          <Rect x={26} y={32} width={8} height={14} rx={2} fill={colors.gold} />
        </Svg>
        <Text style={styles.title}>debale</Text>
        <Text style={styles.subtitle}>Ethiopia's Housemate Platform</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: 'white',
    marginTop: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6,
  },
});
