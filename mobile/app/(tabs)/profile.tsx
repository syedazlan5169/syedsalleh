import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Palette } from '@/constants/theme';
import { useThemePalette } from '@/context/ThemePreferenceContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { formatPersonName } from '@/utils/text';

import { apiPut } from '../../apiClient';
import { useAuth } from '../../context/AuthContext';

export default function ProfileTabScreen() {
  const palette = useThemePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const { user, logout, updateUser, token } = useAuth();
  const router = useRouter();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Sync form fields with user data
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  const handleSaveProfile = async () => {
    if (!token || !user) return;

    setProfileError(null);
    setProfileSuccess(false);

    if (!name.trim() || !email.trim()) {
      setProfileError('Name and email are required');
      return;
    }

    setSavingProfile(true);
    try {
      const response = (await apiPut('/api/profile', token, {
        name: name.trim(),
        email: email.trim(),
      })) as { user: { id: number; name: string; email: string }; message: string };

      updateUser(response.user);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      console.log('Profile update error:', err);
      setProfileError(err?.message ?? 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async () => {
    if (!token) return;

    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setSavingPassword(true);
    try {
      await apiPut('/api/profile/password', token, {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });

      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      console.log('Password update error:', err);
      setPasswordError(err?.message ?? 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) {
    return null;
  }

  const displayName = formatPersonName(user.name);
  const hasProfileChanges = name !== user.name || email !== user.email;
  const hasPasswordChanges = currentPassword || newPassword || confirmPassword;

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

        {/* Profile Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={palette.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={palette.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {profileError && <Text style={styles.errorText}>{profileError}</Text>}
          {profileSuccess && (
            <Text style={styles.successText}>Profile updated successfully!</Text>
          )}

          <TouchableOpacity
            style={[
              styles.saveButton,
              (!hasProfileChanges || savingProfile) && styles.saveButtonDisabled,
            ]}
            onPress={handleSaveProfile}
            disabled={!hasProfileChanges || savingProfile}
          >
            {savingProfile ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Profile</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Change Password */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Change Password</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Current Password</Text>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter current password"
              placeholderTextColor={palette.textMuted}
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password (min 8 characters)"
              placeholderTextColor={palette.textMuted}
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor={palette.textMuted}
              secureTextEntry
            />
          </View>

          {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
          {passwordSuccess && (
            <Text style={styles.successText}>Password updated successfully!</Text>
          )}

          <TouchableOpacity
            style={[
              styles.saveButton,
              (!hasPasswordChanges || savingPassword) && styles.saveButtonDisabled,
            ]}
            onPress={handleSavePassword}
            disabled={!hasPasswordChanges || savingPassword}
          >
            {savingPassword ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Change Password</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceLabel}>Theme</Text>
            <ThemeToggle />
          </View>
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
    inputGroup: {
      gap: 8,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.text,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: palette.text,
      backgroundColor: palette.surface,
      fontSize: 16,
    },
    errorText: {
      color: palette.danger,
      fontSize: 14,
      marginTop: 4,
    },
    successText: {
      color: '#10B981',
      fontSize: 14,
      marginTop: 4,
    },
    saveButton: {
      backgroundColor: palette.tint,
      borderRadius: 14,
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
      minHeight: 50,
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
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
