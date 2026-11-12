import React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { useApp } from '../context/AppContext';

import HomeScreen from '../screens/HomeScreen';
import WorkoutScreen from '../screens/WorkoutScreen';
import CoachScreen from '../screens/CoachScreen';
import ProgressScreen from '../screens/ProgressScreen';
import SettingsScreen from '../screens/SettingsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import RestartScreen from '../screens/RestartScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TAB_ICONS = {
  Home:      ['home',                'home-outline'],
  Workouts:  ['barbell',             'barbell-outline'],
  Coach:     ['chatbubble-ellipses', 'chatbubble-ellipses-outline'],
  Progress:  ['stats-chart',         'stats-chart-outline'],
};

// Material-style tab: a soft pill sits behind the active icon, and the label
// goes bold — the active tab reads at a glance without shouting in colour.
function TabIcon({ routeName, focused }) {
  const [active, inactive] = TAB_ICONS[routeName];
  return (
    <View style={{
      width: 60, height: 32, borderRadius: 16,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: focused ? colors.accentDim : 'transparent',
    }}>
      <Ionicons name={focused ? active : inactive} size={21} color={focused ? colors.accentLight : colors.textSec} />
    </View>
  );
}

function TabLabel({ label, focused }) {
  return (
    <Text style={{
      fontFamily: focused ? fonts.bodyBold : fonts.bodyMedium,
      fontSize: 12,
      color: focused ? colors.text : colors.textSec,
      marginTop: 2,
    }}>
      {label}
    </Text>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 72 + insets.bottom,
          paddingBottom: 10 + insets.bottom,
          paddingTop: 10,
          elevation: 0,
        },
        tabBarIcon: ({ focused }) => <TabIcon routeName={route.name} focused={focused} />,
        tabBarLabel: ({ focused }) => <TabLabel label={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Workouts" component={WorkoutScreen} />
      <Tab.Screen name="Coach" component={CoachScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
    </Tab.Navigator>
  );
}

// Navigation state survives a theme switch (the tree remounts under a new key),
// so changing Appearance in Settings doesn't throw you back to Home.
let savedNavState;

function navTheme() {
  const base = colors.isDark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.accent,
      background: colors.bg,
      card: colors.card,
      text: colors.text,
      border: colors.border,
    },
  };
}

export default function AppNavigator() {
  const { state } = useApp();

  if (!state.isLoaded) return null;

  if (!state.isOnboarded) {
    return (
      <NavigationContainer theme={navTheme()}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer
      theme={navTheme()}
      initialState={savedNavState}
      onStateChange={(navState) => { savedNavState = navState; }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ presentation: 'modal', cardStyle: { backgroundColor: colors.bg } }}
        />
        <Stack.Screen
          name="Restart"
          component={RestartScreen}
          options={{ presentation: 'modal', cardStyle: { backgroundColor: colors.bg } }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
