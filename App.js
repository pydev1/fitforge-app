import 'react-native-gesture-handler';
import React from 'react';
import { View, ActivityIndicator, Text, TextInput, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  Roboto_400Regular,
  Roboto_400Regular_Italic,
  Roboto_500Medium,
  Roboto_600SemiBold,
  Roboto_700Bold,
  Roboto_700Bold_Italic,
  Roboto_800ExtraBold,
} from '@expo-google-fonts/roboto';
import { AppProvider, useApp } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import { colors, applyTheme, getThemeScheme } from './src/theme/colors';

// App-wide default body font. Screens that set their own fontFamily override
// this; anything unstyled still renders in the brand face.
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.style = [{ fontFamily: 'Roboto_400Regular' }, Text.defaultProps.style];
TextInput.defaultProps = TextInput.defaultProps || {};
TextInput.defaultProps.style = [{ fontFamily: 'Roboto_400Regular' }, TextInput.defaultProps.style];

// Picks light/dark from Settings → Appearance ('system' follows the phone).
// The palette is swapped in place, then the navigator is remounted under a new
// key so every screen re-renders with the new colours. App state (logs,
// profile, trips) lives above this in AppProvider and is untouched.
function ThemedApp() {
  const { state } = useApp();
  const systemScheme = useColorScheme();
  const pref = state.appearance || 'system';
  const scheme = pref === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : pref;
  applyTheme(scheme);
  const active = getThemeScheme();

  return (
    <View key={active} style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={colors.isDark ? 'light' : 'dark'} backgroundColor={colors.bg} />
      <AppNavigator />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Roboto_400Regular,
    Roboto_400Regular_Italic,
    Roboto_500Medium,
    Roboto_600SemiBold,
    Roboto_700Bold,
    Roboto_700Bold_Italic,
    Roboto_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppProvider>
        <ThemedApp />
      </AppProvider>
    </SafeAreaProvider>
  );
}
