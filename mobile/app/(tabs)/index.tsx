import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Palette } from '@/constants/theme';
import { useThemePalette } from '@/context/ThemePreferenceContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { formatPersonName } from '@/utils/text';

import { apiGet } from '../../apiClient';
import { useAuth } from '../../context/AuthContext';
import type { DashboardData, NotificationsResponse } from '../../types/api';

export default function HomeScreen() {
  const router = useRouter();
  const palette = useThemePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  // --- Auth state ---
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  const { token, user, isLoading: authLoading, login, register, logout, getRememberedEmail } = useAuth();

  // Load remembered email on mount (only for login mode)
  useEffect(() => {
    if (isRegisterMode) {
      // Clear email when in register mode
      setEmail('');
      return;
    }

    const loadRememberedEmail = async () => {
      const rememberedEmail = await getRememberedEmail();
      if (rememberedEmail) {
        setEmail(rememberedEmail);
        setRememberMe(true);
      }
    };
    loadRememberedEmail();
  }, [getRememberedEmail, isRegisterMode]);

  // --- Dashboard state ---
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loadingDash, setLoadingDash] = useState(false);
  const [dashError, setDashError] = useState<string | null>(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const handleRegister = async () => {
    setLoginError(null);
    setRegisterSuccess(false);

    if (!name.trim() || !email.trim() || !password || !passwordConfirmation) {
      setLoginError('All fields are required');
      return;
    }

    if (password.length < 8) {
      setLoginError('Password must be at least 8 characters');
      return;
    }

    if (password !== passwordConfirmation) {
      setLoginError('Passwords do not match');
      return;
    }

    setLoadingLogin(true);
    try {
      await register(name.trim(), email.trim(), password, passwordConfirmation);
      setRegisterSuccess(true);
      // Clear form
      setName('');
      setEmail('');
      setPassword('');
      setPasswordConfirmation('');
      // Switch back to login mode after 3 seconds
      setTimeout(() => {
        setIsRegisterMode(false);
        setRegisterSuccess(false);
      }, 3000);
    } catch (err: any) {
      setLoginError(err?.message ?? 'Registration failed');
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleLogin = async () => {
    setLoginError(null);
    setRegisterSuccess(false);

    if (!email || !password) {
      setLoginError('Please fill in both email and password.');
      return;
    }

    setLoadingLogin(true);

    try {
      await login(email, password, rememberMe);
      setPassword('');
      setDashboard(null);
      setDashError(null);
    } catch (err: any) {
      console.log('Login error:', err);
      if (err?.requiresApproval) {
        setLoginError('Your account is pending admin approval. Please wait for approval before signing in.');
      } else {
        setLoginError(err?.message ?? 'Login failed');
      }
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleLogout = () => {
    logout();
    setPassword('');
    setLoginError(null);
    setDashboard(null);
    setDashError(null);
  };

  const loadDashboard = useCallback(async () => {
    if (!token) {
      setDashboard(null);
      setDashError(null);
      return;
    }

    try {
      setLoadingDash(true);
      setDashError(null);
      const json = (await apiGet('/api/dashboard', token)) as DashboardData;
      setDashboard(json);
    } catch (err: any) {
      console.log('Dashboard error:', err);
      // Check if user needs approval
      if (err?.message?.includes('pending admin approval') || err?.message?.includes('requires_approval')) {
        setDashError('Your account is pending admin approval. Please wait for approval.');
        // Logout user if they're not approved
        logout();
        setPassword('');
      } else {
        setDashError(err?.message ?? 'Failed to load dashboard');
      }
    } finally {
      setLoadingDash(false);
    }
  }, [token, logout]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);


  if (authLoading) {
    return (
      <View style={[styles.centerScreen]}>
        <ActivityIndicator size="large" color={palette.tint} />
        <Text style={[styles.loadingText, { color: palette.textMuted }]}>
          Loading…
        </Text>
      </View>
    );
  }

  if (!token || !user) {
    return (
      <KeyboardAvoidingView
        style={[styles.authScreen]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.toggleRow}>
          <ThemeToggle />
        </View>

        <Image
          source={require('../../assets/images/login.png')}
          style={styles.loginImage}
          resizeMode="contain"
        />

        <View style={styles.authCard}>
          {isRegisterMode && (
            <>
              <Text style={styles.authLabel}>Name</Text>
              <TextInput
                style={styles.authInput}
                placeholder="Full name"
                placeholderTextColor={palette.textMuted}
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
              />
            </>
          )}

          <Text style={styles.authLabel}>Email</Text>
          <TextInput
            style={styles.authInput}
            placeholder="you@example.com"
            placeholderTextColor={palette.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.authLabel}>Password</Text>
          <TextInput
            style={styles.authInput}
            placeholder={isRegisterMode ? 'At least 8 characters' : '••••••••'}
            placeholderTextColor={palette.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {isRegisterMode && (
            <>
              <Text style={styles.authLabel}>Confirm Password</Text>
              <TextInput
                style={styles.authInput}
                placeholder="Confirm password"
                placeholderTextColor={palette.textMuted}
                secureTextEntry
                value={passwordConfirmation}
                onChangeText={setPasswordConfirmation}
              />
            </>
          )}

          {!isRegisterMode && (
            <View style={styles.rememberMeRow}>
              <Text style={[styles.rememberMeLabel, { color: palette.text }]}>
                Remember me
              </Text>
              <Switch
                value={rememberMe}
                onValueChange={setRememberMe}
                trackColor={{ false: palette.border, true: palette.tint }}
                thumbColor={rememberMe ? palette.tint : '#fff'}
              />
            </View>
          )}

          {loginError && <Text style={styles.errorText}>{loginError}</Text>}
          {registerSuccess && (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>
                Registration successful! Your account is pending admin approval. You can sign in once approved.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, loadingLogin && styles.buttonDisabled]}
            onPress={isRegisterMode ? handleRegister : handleLogin}
            disabled={loadingLogin}
          >
            {loadingLogin ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isRegisterMode ? 'Create Account' : 'Sign in'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchAuthButton}
            onPress={() => {
              setIsRegisterMode(!isRegisterMode);
              setLoginError(null);
              setRegisterSuccess(false);
              setPassword('');
              setPasswordConfirmation('');
              // Clear email when switching to register mode
              if (!isRegisterMode) {
                setEmail('');
                setName('');
              }
            }}
          >
            <Text style={styles.switchAuthText}>
              {isRegisterMode
                ? 'Already have an account? Sign in'
                : "Don't have an account? Create one"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (loadingDash && !dashboard && !dashError) {
    return (
      <View style={[styles.centerScreen]}>
        <ActivityIndicator size="large" color={palette.tint} />
        <Text style={[styles.loadingText, { color: palette.textMuted }]}>
          Preparing your workspace…
        </Text>
      </View>
    );
  }

  if (dashError && !dashboard) {
    return (
      <View style={styles.centerScreen}>
        <Text style={[styles.errorText, { textAlign: 'center' }]}>{dashError}</Text>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleLogout}>
          <Text style={styles.secondaryButtonText}>Log out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const heroName = formatPersonName(dashboard?.user.name ?? user.name);

  return (
    <View style={styles.screen}>
      <View style={styles.dashboardHeader}>
        <Text style={styles.dashboardHeaderTitle}>Dashboard</Text>
        {token && (
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/notifications')}
          >
            <IconSymbol size={24} name="bell" color={palette.text} />
            {unreadNotificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loadingDash} onRefresh={loadDashboard} />
        }
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Welcome back, {heroName || user.name}</Text>

          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.heroButton}
              onPress={() => router.push('/people/my')}
            >
              <Text style={styles.heroButtonLabel}>My People</Text>
              <Text style={styles.heroButtonValue}>
                {dashboard?.stats.my_people_count ?? 0}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroButton}
              onPress={() => router.push('/people/all')}
            >
              <Text style={styles.heroButtonLabel}>All People</Text>
              <Text style={styles.heroButtonValue}>
                {dashboard?.stats.all_people_count ?? 0}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroButton}
              onPress={() => router.push('/people/favorites')}
            >
              <Text style={styles.heroButtonLabel}>Favourite</Text>
              <Text style={styles.heroButtonValue}>
                {dashboard?.stats.favorites_count ?? 0}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroButton}
              onPress={() => router.push('/people/create')}
            >
              <Text style={styles.heroButtonLabel}>Add Person</Text>
              <Text style={styles.heroButtonValue}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Birthdays</Text>
            <Text style={styles.sectionSubtitle}>Next 30 days</Text>
          </View>

          {dashboard?.upcoming_birthdays.length === 0 ? (
            <Text style={[styles.emptyText]}>
              No birthdays coming up. You’re all caught up.
            </Text>
          ) : (
            dashboard?.upcoming_birthdays.map((p) => (
              <View key={p.id} style={styles.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle}>{formatPersonName(p.name) || p.name}</Text>
                  <Text style={styles.listSubtitle}>
                    {p.days_until === 0
                      ? 'Today'
                      : p.days_until === 1
                      ? 'Tomorrow'
                      : `in ${p.days_until} days`}
                  </Text>
                </View>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{p.next_birthday_date}</Text>
                </View>
              </View>
            ))
          )}
        </View>


      </ScrollView>
    </View>
  );
}

const createStyles = (palette: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: palette.background,
    },
    dashboardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 16,
      backgroundColor: palette.surface,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    dashboardHeaderTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: palette.text,
    },
    notificationButton: {
      position: 'relative',
      padding: 8,
    },
    notificationBadge: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: palette.danger,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    notificationBadgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 40,
      gap: 20,
    },
    centerScreen: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.background,
      padding: 24,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
    },
    heroCard: {
      backgroundColor: palette.elevated,
      borderRadius: 28,
      padding: 24,
      shadowColor: palette.shadow,
      shadowOpacity: 0.18,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 12 },
      elevation: 6,
    },
    heroEyebrow: {
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      fontSize: 12,
      color: palette.textMuted,
      marginBottom: 8,
    },
    heroTitle: {
      fontSize: 26,
      fontWeight: '700',
      color: palette.text,
    },
    heroSubtitle: {
      marginTop: 6,
      color: palette.textMuted,
      fontSize: 14,
    },
    heroActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 24,
    },
    heroButton: {
      flex: 1,
      minWidth: '47%',
      backgroundColor: palette.highlight,
      borderRadius: 20,
      padding: 16,
      alignItems: 'center',
    },
    heroButtonLabel: {
      color: palette.textMuted,
      fontSize: 13,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    heroButtonValue: {
      marginTop: 6,
      fontSize: 28,
      fontWeight: '700',
      color: palette.text,
    },
    sectionCard: {
      backgroundColor: palette.elevated,
      borderRadius: 24,
      padding: 20,
      shadowColor: palette.shadow,
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: palette.text,
    },
    sectionSubtitle: {
      fontSize: 13,
      color: palette.textMuted,
    },
    emptyText: {
      color: palette.textMuted,
      fontSize: 14,
    },
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
    },
    listTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: palette.text,
    },
    listSubtitle: {
      fontSize: 13,
      color: palette.textMuted,
    },
    pill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: palette.background,
    },
    pillText: {
      fontSize: 12,
      color: palette.text,
      fontWeight: '600',
    },
    quickGrid: {
      flexDirection: 'row',
      gap: 12,
    },
    quickCard: {
      flex: 1,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 20,
      padding: 16,
      backgroundColor: palette.surface,
    },
    quickLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: palette.text,
    },
    quickHelper: {
      marginTop: 4,
      color: palette.textMuted,
      fontSize: 13,
    },
    primaryButton: {
      marginTop: 20,
      height: 52,
      borderRadius: 16,
      backgroundColor: palette.tint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 16,
    },
    secondaryButton: {
      marginTop: 8,
      height: 50,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    secondaryButtonText: {
      color: palette.text,
      fontWeight: '600',
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    errorText: {
      marginTop: 12,
      color: palette.danger,
      fontSize: 13,
    },
    successContainer: {
      marginTop: 12,
      padding: 12,
      borderRadius: 12,
      backgroundColor: '#10B98120',
      borderWidth: 1,
      borderColor: '#10B98140',
    },
    successText: {
      color: '#10B981',
      fontSize: 13,
      lineHeight: 18,
    },
    switchAuthButton: {
      marginTop: 16,
      alignItems: 'center',
      paddingVertical: 12,
    },
    switchAuthText: {
      color: palette.tint,
      fontSize: 14,
      fontWeight: '500',
    },
    authScreen: {
      flex: 1,
      padding: 24,
      backgroundColor: palette.background,
      justifyContent: 'center',
    },
    authHeader: {
      marginBottom: 24,
    },
    loginImage: {
      width: '100%',
      height: 200,
      marginBottom: 24,
    },
    brandBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: palette.tint,
      color: '#fff',
      fontWeight: '600',
      marginBottom: 12,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontSize: 11,
    },
    authTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: palette.text,
    },
    authSubtitle: {
      color: palette.textMuted,
      marginTop: 8,
      fontSize: 15,
      lineHeight: 22,
    },
    authCard: {
      backgroundColor: palette.elevated,
      borderRadius: 24,
      padding: 24,
      shadowColor: palette.shadow,
      shadowOpacity: 0.16,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 12 },
      elevation: 6,
    },
    authLabel: {
      fontSize: 13,
      color: palette.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 6,
      marginTop: 16,
    },
    authInput: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: palette.text,
      backgroundColor: palette.surface,
    },
    rememberMeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 16,
    },
    rememberMeLabel: {
      fontSize: 14,
      fontWeight: '500',
    },
    toggleRow: {
      alignItems: 'flex-end',
      marginBottom: 16,
    },
    // toggleRow is still used in login screen
  });
