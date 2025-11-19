import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiPost, apiDelete } from '../apiClient';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(token: string): Promise<string | null> {
  try {
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    // Get the Expo push token
    const expoPushToken = await Notifications.getExpoPushTokenAsync({
      projectId: 'b2b0bd94-6d02-48bc-81f5-0cd40628047a', // From app.json
    });

    const pushToken = expoPushToken.data;

    // Determine platform
    const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

    // Register token with backend
    try {
      await apiPost(
        '/api/device-tokens',
        token,
        {
          token: pushToken,
          platform,
        }
      );
      console.log('Push token registered successfully');
    } catch (error) {
      console.error('Failed to register push token:', error);
    }

    return pushToken;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

export async function unregisterPushToken(token: string, pushToken: string): Promise<void> {
  try {
    await apiDelete(`/api/device-tokens/${pushToken}`, token);
    console.log('Push token unregistered successfully');
  } catch (error) {
    console.error('Failed to unregister push token:', error);
  }
}

export function addNotificationReceivedListener(
  listener: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(listener);
}

export function addNotificationResponseReceivedListener(
  listener: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(listener);
}

