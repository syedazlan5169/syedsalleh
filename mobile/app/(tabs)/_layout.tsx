import { Tabs } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemePalette } from '@/context/ThemePreferenceContext';
import { useAuth } from '@/context/AuthContext';

export default function TabLayout() {
  const palette = useThemePalette();
  const { user, token } = useAuth();
  const insets = useSafeAreaInsets();
  const isAdmin = user?.is_admin === true;
  const isAuthenticated = !!token && !!user;
  const safePaddingBottom = Math.max(insets.bottom, 8);
  const tabBarHeight = 60 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.tint,
        tabBarInactiveTintColor: palette.textMuted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: isAuthenticated
          ? {
              backgroundColor: palette.surface,
              borderTopColor: palette.border,
              borderTopWidth: 1,
              height: tabBarHeight,
              paddingBottom: safePaddingBottom,
              paddingTop: 8,
            }
          : { display: 'none' }, // Hide tab bar when not authenticated
        tabBarShowLabel: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={28} name={focused ? 'house.fill' : 'house'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="magnifyingglass" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="statistics"
        options={{
          title: 'Statistics',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={28} name={focused ? 'chart.bar.fill' : 'chart.bar'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={28} name={focused ? 'message.fill' : 'message'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={28} name={focused ? 'person.fill' : 'person'} color={color} />
          ),
        }}
      />
      {isAdmin ? (
        <Tabs.Screen
          name="admin"
          options={{
            title: 'Admin',
            tabBarIcon: ({ color, focused }) => (
              <IconSymbol size={28} name={focused ? 'shield.fill' : 'shield'} color={color} />
            ),
          }}
        />
      ) : (
        <Tabs.Screen
          name="admin"
          options={{
            href: null, // Completely hide from tab bar for non-admins
          }}
        />
      )}
    </Tabs>
  );
}
