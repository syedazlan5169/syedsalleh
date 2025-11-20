import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemePreferenceProvider, useThemePreference } from '../context/ThemePreferenceContext';
import {
  addNotificationResponseReceivedListener,
  registerForPushNotifications,
} from '../services/notifications';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <RootLayoutInner />
    </ThemePreferenceProvider>
  );
}

function RootLayoutInner() {
  const { colorScheme } = useThemePreference();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <NotificationHandler />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
          <Stack.Screen name="people/my" options={{ title: 'My People' }} />
          <Stack.Screen name="people/all" options={{ title: 'All People' }} />
          <Stack.Screen name="people/favorites" options={{ title: 'Favorites' }} />
          <Stack.Screen name="people/create" options={{ title: 'Add Person' }} />
          <Stack.Screen name="people/[id]" options={{ title: 'Person Detail' }} />
          <Stack.Screen name="people/[id]/edit" options={{ title: 'Edit Person' }} />
          <Stack.Screen name="admin/users" options={{ title: 'Manage Users' }} />
          <Stack.Screen name="admin/activity" options={{ title: 'Activity Log' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
      </AuthProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

function NotificationHandler() {
  const { token } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    if (token) {
      // Register for push notifications when user is logged in
      registerForPushNotifications(token);
    }
  }, [token]);

  useEffect(() => {
    // Handle notification taps
    responseListener.current = addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      
      if (data?.type === 'chat_message') {
        // Navigate to chat screen when chat message notification is tapped
        router.push('/chat');
      } else if (data?.person_id) {
        // Navigate to person detail if app is open (for both person_created and birthday_reminder)
        const currentSegments = segments;
        if (currentSegments.length > 0) {
          router.push({
            pathname: '/people/[id]',
            params: { id: String(data.person_id) },
          });
        }
      } else if (data?.type === 'birthday_reminder' && !data?.person_id) {
        // If multiple birthdays, navigate to notifications screen
        router.push('/notifications');
      }
    });

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [router, segments]);

  return null;
}
