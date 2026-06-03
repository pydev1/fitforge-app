import React from 'react';
import { View } from 'react-native';
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

const TAB_ICONS = {
  Home:    ['home',                'home-outline'],
  Workout: ['barbell',             'barbell-outline'],
  Coach:   ['chatbubble-ellipses', 'chatbubble-ellipses-outline'],
  Scan:    ['camera',              'camera-outline'],
  Progress:['stats-chart',         'stats-chart-outline'],
};

function TabIcon({ name, focused }) {
  const [active, inactive] = TAB_ICONS[name];
  return (
    <View style={{
      width: 52,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: focused ? colors.accent + '28' : 'transparent',
    }}>
      <Ionicons
        name={focused ? active : inactive}
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
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 58 + insets.bottom,
          paddingBottom: insets.bottom || 6,
          paddingTop: 6,
          paddingHorizontal: 8,
        },
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Workout" component={WorkoutScreen} />
      <Tab.Screen name="Coach" component={CoachScreen} />
      <Tab.Screen name="Scan" component={PhotoScanScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
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
