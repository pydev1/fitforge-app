import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import { scheduleDailyReminder, cancelReminder } from './src/services/notificationService';

function NotificationManager() {
  const { state } = useApp();

  useEffect(() => {
    if (!state.isLoaded) return;
    if (state.reminderEnabled && state.isOnboarded) {
      scheduleDailyReminder(state.reminderHour, 0, state.userProfile?.name);
    } else {
      cancelReminder();
    }
  }, [state.isLoaded, state.reminderEnabled, state.reminderHour, state.isOnboarded]);

  return null;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="light" backgroundColor="#141218" />
        <NotificationManager />
        <AppNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}
