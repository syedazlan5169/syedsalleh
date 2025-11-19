import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Palette } from '@/constants/theme';
import { useThemePalette } from '@/context/ThemePreferenceContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { formatPersonName } from '@/utils/text';

import { useAuth } from '../../context/AuthContext';

export default function ProfileTabScreen() {
  const palette = useThemePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  if (!user) {
    return null;
  }

  const displayName = formatPersonName(user.name);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {displayName?.charAt(0) || user.name?.charAt(0) || 'U'}
            </Text>
          </View>
          <Text style={styles.name}>{displayName || user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceLabel}>Theme</Text>
            <ThemeToggle />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/people/my')}
          >
            <Text style={styles.actionButtonText}>My People</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/people/create')}
          >
            <Text style={styles.actionButtonText}>Add Person</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sign out</Text>
        </TouchableOpacity>
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
    header: {
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 16,
      backgroundColor: palette.surface,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: palette.text,
    },
    content: {
      padding: 20,
      gap: 20,
    },
    profileCard: {
      backgroundColor: palette.elevated,
      borderRadius: 24,
      padding: 24,
      alignItems: 'center',
      shadowColor: palette.shadow,
      shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 22,
      elevation: 6,
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: palette.tint,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    avatarText: {
      color: '#fff',
      fontSize: 38,
      fontWeight: '700',
    },
    name: {
      fontSize: 24,
      fontWeight: '700',
      color: palette.text,
      marginBottom: 4,
    },
    email: {
      fontSize: 16,
      color: palette.textMuted,
    },
    section: {
      backgroundColor: palette.elevated,
      borderRadius: 20,
      padding: 20,
      gap: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: palette.text,
      marginBottom: 8,
    },
    preferenceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    preferenceLabel: {
      fontSize: 16,
      color: palette.text,
    },
    actionButton: {
      backgroundColor: palette.surface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: palette.border,
    },
    actionButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: palette.text,
    },
    logoutButton: {
      marginTop: 8,
      height: 50,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.danger,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    logoutButtonText: {
      color: palette.danger,
      fontWeight: '600',
      fontSize: 16,
    },
  });

