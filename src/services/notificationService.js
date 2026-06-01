import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestPermissions() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDailyReminder(hour, minute, name) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const granted = await requestPermissions();
  if (!granted) return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Time to train, ${name || 'Athlete'}`,
      body: "Your workout is waiting. 5 minutes is enough to start — open the app.",
      sound: true,
      data: { screen: 'Workout' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
  return true;
}

export async function cancelReminder() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
