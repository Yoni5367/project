import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Home, Search, LayoutDashboard, MessageSquare, Settings as SettingsIcon, Users } from 'lucide-react-native';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';

import HomeScreen from '../screens/HomeScreen';
import BrowseScreen from '../screens/BrowseScreen';
import ListingDetailScreen from '../screens/ListingDetailScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import AIAgentScreen from '../screens/AIAgentScreen';
import SeekerDashboardScreen from '../screens/SeekerDashboardScreen';
import ProviderDashboardScreen from '../screens/ProviderDashboardScreen';
import ApplicantManagementScreen from '../screens/ApplicantManagementScreen';
import SeekerFormScreen from '../screens/SeekerFormScreen';
import ProviderFormScreen from '../screens/ProviderFormScreen';
import PaymentScreen from '../screens/PaymentScreen';
import AgreementScreen from '../screens/AgreementScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ChatScreen from '../screens/ChatScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ComingSoonScreen from '../screens/ComingSoonScreen';
import HousemateEntryScreen from '../screens/HousemateEntryScreen';
import HousemateIntakeScreen from '../screens/HousemateIntakeScreen';
import HousemateSuggestionsScreen from '../screens/HousemateSuggestionsScreen';
import HousemateGroupScreen from '../screens/HousemateGroupScreen';
import HousemateMultiRoomScreen from '../screens/HousemateMultiRoomScreen';
import HousemateGroupApplicantsScreen from '../screens/HousemateGroupApplicantsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeFeed" component={HomeScreen} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="AIAgent" component={AIAgentScreen} />
    </Stack.Navigator>
  );
}

function BrowseStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BrowseList" component={BrowseScreen} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
    </Stack.Navigator>
  );
}

function DashboardRouter({ navigation, route }) {
  const { user } = useAuth();
  return user?.role === 'provider'
    ? <ProviderDashboardScreen navigation={navigation} route={route} />
    : <SeekerDashboardScreen navigation={navigation} route={route} />;
}

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardHome" component={DashboardRouter} />
      <Stack.Screen name="ApplicantManagement" component={ApplicantManagementScreen} />
      <Stack.Screen name="SeekerForm" component={SeekerFormScreen} />
      <Stack.Screen name="ProviderForm" component={ProviderFormScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="Agreement" component={AgreementScreen} />
    </Stack.Navigator>
  );
}

function MessagesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ConversationList" component={MessagesScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}

function GroupStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HousemateEntry" component={HousemateEntryScreen} />
      <Stack.Screen name="HousemateIntake" component={HousemateIntakeScreen} />
      <Stack.Screen name="HousemateSuggestions" component={HousemateSuggestionsScreen} />
      <Stack.Screen name="HousemateGroup" component={HousemateGroupScreen} />
      <Stack.Screen name="HousemateMultiRoom" component={HousemateMultiRoomScreen} />
      <Stack.Screen name="HousemateGroupApplicants" component={HousemateGroupApplicantsScreen} />
    </Stack.Navigator>
  );
}

export default function MainTabs() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: user?.role === 'provider' ? colors.gold : colors.teal,
        tabBarInactiveTintColor: colors.gray400,
        tabBarStyle: { height: 64, paddingTop: 6, paddingBottom: 10, borderTopColor: colors.gray100 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarIcon: ({ color }) => {
          const icons = { Home, Browse: Search, Dashboard: LayoutDashboard, Messages: MessageSquare, Settings: SettingsIcon, Group: Users };
          const Icon = icons[route.name];
          return <Icon size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ title: t('home') }} />
      <Tab.Screen name="Browse" component={BrowseStack} options={{ title: t('browse') }} />
      <Tab.Screen name="Dashboard" component={user ? DashboardStack : ComingSoonScreen} options={{ title: t('dashboard') }} initialParams={{ label: 'Your Dashboard' }} />
      <Tab.Screen name="Group" component={user ? GroupStack : ComingSoonScreen} options={{ title: 'Group' }} initialParams={{ label: 'Find a Group' }} />
      <Tab.Screen name="Messages" component={user ? MessagesStack : ComingSoonScreen} options={{ title: t('messages') }} initialParams={{ label: 'Messages' }} />
      <Tab.Screen name="Settings" component={user ? SettingsScreen : ComingSoonScreen} options={{ title: t('settings') }} initialParams={{ label: 'Settings' }} />
    </Tab.Navigator>
  );
}
