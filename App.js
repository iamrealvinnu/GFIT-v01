import 'react-native-gesture-handler';
import { LogBox, Platform } from 'react-native';
import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BRAND_COLORS, UI_COLORS } from './src/constants/Colors';
import SplashScreen from './src/screens/SplashScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import GymPlansScreen from './src/screens/GymPlansScreen';
import PhoneNumberScreen from './src/screens/PhoneNumberScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import WorkoutsScreen from './src/screens/WorkoutsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ChatScreen from './src/screens/ChatScreen';
import TermsOfServiceScreen from './src/screens/TermsOfServiceScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';
import KnowMoreVideoScreen from './src/screens/KnowMoreVideoScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import PrivacySecurityScreen from './src/screens/PrivacySecurityScreen';
import PersonalInformationScreen from './src/screens/PersonalInformationScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const insets = useSafeAreaInsets();

  const tabBarBaseStyle = {
    backgroundColor: UI_COLORS.BACKGROUND_DARK,
    borderTopWidth: 1,
    borderTopColor: UI_COLORS.BORDER_LIGHT,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    paddingBottom: insets.bottom, // Use only insets.bottom for automatic adjustment
    height: 60 + insets.bottom,   // Height adjusts with insets
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Workouts') {
            iconName = focused ? 'fitness' : 'fitness-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: BRAND_COLORS.YELLOW,
        tabBarInactiveTintColor: UI_COLORS.TEXT_MUTED,
        headerShown: false,
        tabBarStyle: tabBarBaseStyle,
        tabBarItemStyle: {
          paddingVertical: Platform.OS === 'android' ? 8 : 5, // Slightly more padding for Android hardware nav
        },
        tabBarHideOnKeyboard: true, // Hide tab bar when keyboard is open
        gestureEnabled: true, // Enable gestures for navigation
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Workouts" component={WorkoutsScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { isAuthenticated } = useAuth();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="GymPlans" component={GymPlansScreen} />
          <Stack.Screen name="PhoneNumber" component={PhoneNumberScreen} />
          <Stack.Screen name="KnowMoreVideo" component={KnowMoreVideoScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="MainApp" component={MainTabs} />
          <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
          <Stack.Screen name="PersonalInformation" component={PersonalInformationScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = React.useState(true);

  const handleSplashComplete = () => {
    setIsLoading(false);
  };

  if (__DEV__) {
    LogBox.ignoreLogs([
      "The action 'NAVIGATE' with payload",
      'was not handled by any navigator',
      'useInsertionEffect must not schedule updates',
    ]);

    const origWarn = console.warn;
    console.warn = (...args) => {
      const msg = String(args[0] || '');
      if (
        msg.includes("The action 'NAVIGATE' with payload") ||
        msg.includes('was not handled by any navigator') ||
        msg.includes('useInsertionEffect must not schedule updates')
      ) return;
      origWarn(...args);
    };

    const origError = console.error;
    console.error = (...args) => {
      const msg = String(args[0] || '');
      if (msg.includes('useInsertionEffect must not schedule updates')) return;
      origError(...args);
    };

    const ow = console.warn;
    console.warn = (...a) => {
      const s = String(a[0] || '');
      if (s.includes('[expo-av]: Expo AV has been deprecated')) return;
      ow(...a);
    };
  }

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <NavigationContainer
          onStateChange={(state) => {
            console.log('Navigation State:', JSON.stringify(state, null, 2));
          }}
        >
          <StatusBar style="auto" />
          {isLoading ? (
            <SplashScreen onAnimationComplete={handleSplashComplete} />
          ) : (
            <AppNavigator />
          )}
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthProvider>
  );
}