import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import SeekerFormScreen from '../screens/SeekerFormScreen';
import ProviderFormScreen from '../screens/ProviderFormScreen';
import PaymentScreen from '../screens/PaymentScreen';
import AgreementScreen from '../screens/AgreementScreen';
import AIAgentScreen from '../screens/AIAgentScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import HousemateEntryScreen from '../screens/HousemateEntryScreen';
import HousemateIntakeScreen from '../screens/HousemateIntakeScreen';
import HousemateSuggestionsScreen from '../screens/HousemateSuggestionsScreen';
import HousemateGroupScreen from '../screens/HousemateGroupScreen';
import HousemateMultiRoomScreen from '../screens/HousemateMultiRoomScreen';
import HousemateGroupApplicantsScreen from '../screens/HousemateGroupApplicantsScreen';
import MainTabs from './MainTabs';

const Stack = createNativeStackNavigator();

// AppStack is always reachable — guests browse freely (Main),
// Login/Register/Forms/Payment/Agreement/AI are pushed on top whenever needed.
function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="SeekerForm" component={SeekerFormScreen} />
      <Stack.Screen name="ProviderForm" component={ProviderFormScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="Agreement" component={AgreementScreen} />
      <Stack.Screen name="AIAgent" component={AIAgentScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="HousemateIntake" component={HousemateIntakeScreen} />
      <Stack.Screen name="HousemateSuggestions" component={HousemateSuggestionsScreen} />
      <Stack.Screen name="HousemateGroup" component={HousemateGroupScreen} />
      <Stack.Screen name="HousemateMultiRoom" component={HousemateMultiRoomScreen} />
      <Stack.Screen name="HousemateGroupApplicants" component={HousemateGroupApplicantsScreen} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.teal }}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="App" component={AppStack} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
