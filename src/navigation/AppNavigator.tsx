import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthProvider';
import { useAppLock } from '../context/AppLockProvider';
import { isDeviceCompromised } from '../services/security';
import { AuthScreen } from '../screens/AuthScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { LockScreen } from '../screens/LockScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { UploadScreen } from '../screens/UploadScreen';
import { LedgerScreen } from '../screens/LedgerScreen';
import { ProfileStack } from './ProfileStack';

const ONBOARDED_KEY = 'has_onboarded';

type TabParamList = {
  Dashboard: undefined;
  Upload: undefined;
  Ledger: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator();

const TAB_ICONS: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = {
  Dashboard: 'pie-chart',
  Upload: 'cloud-upload',
  Ledger: 'list',
  Profile: 'person',
};

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#4ECDC4',
        tabBarInactiveTintColor: '#AAA',
        tabBarStyle: {
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 10,
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Upload" component={UploadScreen} />
      <Tab.Screen name="Ledger" component={LedgerScreen} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
}

function CompromisedGate() {
  return (
    <View style={styles.gate}>
      <Ionicons name="warning" size={56} color="#E5484D" />
      <Text style={styles.gateTitle}>Device not supported</Text>
      <Text style={styles.gateBody}>
        For your security, Expense Tracker cannot run on a rooted or jailbroken
        device. Financial data could be exposed to malware on a compromised
        device.
      </Text>
    </View>
  );
}

export function AppNavigator() {
  const { session, initializing } = useAuth();
  const { locked } = useAppLock();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [compromised] = useState(() => isDeviceCompromised());

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDED_KEY).then((v) => setOnboarded(v === 'true'));
  }, []);

  function finishOnboarding() {
    AsyncStorage.setItem(ONBOARDED_KEY, 'true');
    setOnboarded(true);
  }

  // Hard block on compromised devices — before auth, onboarding, anything.
  if (compromised) return <CompromisedGate />;

  if (initializing || onboarded === null) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#4ECDC4" />
      </View>
    );
  }

  // First-run walkthrough, before authentication.
  if (!session && !onboarded) {
    return <OnboardingScreen onDone={finishOnboarding} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <Stack.Screen name="App" component={AppTabs} />
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>

      {/* Inactivity lock overlay — sits above everything while signed in. */}
      {session && locked && <LockScreen />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7FA',
  },
  gate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7FA',
    padding: 36,
    gap: 14,
  },
  gateTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A2E' },
  gateBody: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 21 },
});
