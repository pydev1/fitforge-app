import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { useApp } from '../context/AppContext';

import HomeScreen from '../screens/HomeScreen';
import WorkoutScreen from '../screens/WorkoutScreen';
import CoachScreen from '../screens/CoachScreen';
import PhotoScanScreen from '../screens/PhotoScanScreen';
import ProgressScreen from '../screens/ProgressScreen';
import SettingsScreen from '../screens/SettingsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TABS = [
  { name: 'Home', icon: 'home', iconOutline: 'home-outline' },
  { name: 'Workout', icon: 'barbell', iconOutline: 'barbell-outline' },
  { name: 'Coach', icon: 'chatbubble-ellipses', iconOutline: 'chatbubble-ellipses-outline' },
  { name: 'Scan', icon: 'camera', iconOutline: 'camera-outline' },
  { name: 'Progress', icon: 'stats-chart', iconOutline: 'stats-chart-outline' },
];

function TabIcon({ iconActive, iconInactive, focused }) {
  return (
    <View style={[nav.iconWrap, focused && nav.iconWrapActive]}>
      <Ionicons
        name={focused ? iconActive : iconInactive}
        size={22}
        color={focused ? colors.accentLight : colors.textMuted}
      />
    </View>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const tab = TABS.find(t => t.name === route.name);
        return {
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopWidth: 0,
            elevation: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            height: 62 + insets.bottom,
            paddingBottom: insets.bottom || 8,
            paddingTop: 6,
            paddingHorizontal: 4,
          },
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconActive={tab.icon}
              iconInactive={tab.iconOutline}
              focused={focused}
            />
          ),
        };
      }}
    >
      {TABS.map(t => (
        <Tab.Screen key={t.name} name={t.name} component={
          t.name === 'Home' ? HomeScreen :
          t.name === 'Workout' ? WorkoutScreen :
          t.name === 'Coach' ? CoachScreen :
          t.name === 'Scan' ? PhotoScanScreen :
          ProgressScreen
        } />
      ))}
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { state } = useApp();

  if (!state.isLoaded) return null;

  if (!state.isOnboarded) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ presentation: 'modal', cardStyle: { backgroundColor: colors.bg } }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const nav = StyleSheet.create({
  iconWrap: {
    width: 52,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.accentDim,
  },
});
