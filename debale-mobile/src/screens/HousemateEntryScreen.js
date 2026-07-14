import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { housemateAPI } from '../services/api';
import { colors } from '../theme';

export default function HousemateEntryScreen({ navigation }) {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === 'provider') {
      navigation.replace('HousemateGroupApplicants');
      return;
    }

    housemateAPI.getIntake()
      .then(res => {
        if (res.intake) {
          navigation.replace('HousemateSuggestions');
        } else {
          navigation.replace('HousemateIntake');
        }
      })
      .catch(() => navigation.replace('HousemateIntake'));
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream }}>
      <ActivityIndicator size="large" color={colors.teal} />
    </View>
  );
}
