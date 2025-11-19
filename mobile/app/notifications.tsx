import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { Palette } from '@/constants/theme';
import { useThemePalette } from '@/context/ThemePreferenceContext';
import { formatPersonName } from '@/utils/text';

import { apiGet, apiPatch, apiPost } from '../apiClient';
import { useAuth } from '../context/AuthContext';
import type { Notification, NotificationsResponse } from '../types/api';

export default function NotificationsScreen() {
  const palette = useThemePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const { token } = useAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingReadId, setMarkingReadId] = useState<number | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const json = (await apiGet('/api/notifications', token)) as NotificationsResponse;
      setNotifications(json.notifications ?? []);
      setUnreadCount(json.unread_count ?? 0);
    } catch (err: any) {
      console.log('Notifications error:', err);
      setError(err?.message ?? 'Unable to load notifications');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      router.replace('/');
    }
  }, [token, router]);

  useEffect(() => {
    if (token) {
      loadNotifications();
    }
  }, [token, loadNotifications]);

  const handleMarkAsRead = async (notificationId: number) => {
    if (!token) return;
    setMarkingReadId(notificationId);
    try {
      await apiPatch(`/api/notifications/${notificationId}/read`, token, {});
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, read: true, read_at: new Date().toISOString() }
            : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      console.log('Mark as read error:', err);
    } finally {
      setMarkingReadId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!token) return;
    try {
      await apiPost('/api/notifications/mark-all-read', token, {});
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() })),
      );
      setUnreadCount(0);
    } catch (err: any) {
      console.log('Mark all as read error:', err);
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.read && markingReadId !== notification.id) {
      handleMarkAsRead(notification.id);
    }
    if (notification.person_id) {
      router.push({ pathname: '/people/[id]', params: { id: String(notification.person_id) } });
    }
  };

  const unreadNotifications = notifications.filter((n) => !n.read);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerStyle: { backgroundColor: palette.surface },
          headerTitleStyle: { color: palette.text },
          headerShadowVisible: false,
          headerRight:
            unreadNotifications.length > 0
              ? () => (
                  <TouchableOpacity onPress={handleMarkAllAsRead}>
                    <Text style={styles.headerAction}>Mark all read</Text>
                  </TouchableOpacity>
                )
              : undefined,
        }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadNotifications} tintColor={palette.tint} />
        }
      >
        {loading && notifications.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator color={palette.tint} />
            <Text style={styles.helperText}>Loading notifications…</Text>
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : notifications.length === 0 ? (
          <Text style={styles.helperText}>No notifications yet.</Text>
        ) : (
          <>
            {notifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationCard,
                  !notification.read && styles.unreadCard,
                ]}
                onPress={() => handleNotificationPress(notification)}
                activeOpacity={0.7}
              >
                <View style={styles.notificationContent}>
                  <View style={styles.notificationHeader}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    {!notification.read && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.notificationMessage}>{notification.message}</Text>
                  <Text style={styles.notificationTime}>
                    {notification.created_at
                      ? new Date(notification.created_at).toLocaleString()
                      : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (palette: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },
    content: {
      padding: 16,
      gap: 12,
    },
    centered: {
      alignItems: 'center',
      marginTop: 24,
    },
    helperText: {
      marginTop: 12,
      color: palette.textMuted,
      textAlign: 'center',
    },
    errorText: {
      marginTop: 12,
      color: palette.danger,
      textAlign: 'center',
    },
    headerAction: {
      color: palette.tint,
      fontWeight: '600',
      marginRight: 8,
      fontSize: 16,
    },
    notificationCard: {
      backgroundColor: palette.elevated,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: palette.border,
      marginBottom: 8,
    },
    unreadCard: {
      borderLeftWidth: 4,
      borderLeftColor: palette.tint,
      backgroundColor: palette.surface,
    },
    notificationContent: {
      gap: 8,
    },
    notificationHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    notificationTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: palette.text,
      flex: 1,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: palette.tint,
    },
    notificationMessage: {
      fontSize: 14,
      color: palette.textMuted,
      lineHeight: 20,
    },
    notificationTime: {
      fontSize: 12,
      color: palette.textMuted,
      marginTop: 4,
    },
  });

