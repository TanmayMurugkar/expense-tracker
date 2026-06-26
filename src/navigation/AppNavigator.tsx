import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { DashboardScreen } from '../screens/DashboardScreen';
import { UploadScreen } from '../screens/UploadScreen';

type TabParamList = {
  Dashboard: undefined;
  Upload: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
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
          tabBarIcon: ({ color, size }) => {
            const icon: Record<string, keyof typeof Ionicons.glyphMap> = {
              Dashboard: 'pie-chart',
              Upload: 'cloud-upload',
            };
            return <Ionicons name={icon[route.name]} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Upload" component={UploadScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
