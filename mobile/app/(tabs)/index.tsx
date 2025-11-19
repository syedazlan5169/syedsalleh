import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { apiGet } from '../../apiClient';
import { useAuth } from '../../context/AuthContext';
import type { DashboardData } from '../../types/api';

export default function HomeScreen() {
  const router = useRouter();

  // --- Login state ---
  const [email, setEmail] = useState('syedazlan5169@gmail.com'); // prefill for dev
  const [password, setPassword] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const { token, user, login, logout } = useAuth();

  // --- Dashboard state ---
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loadingDash, setLoadingDash] = useState(false);
  const [dashError, setDashError] = useState<string | null>(null);

  // --- Login handler ---
  const handleLogin = async () => {
    setLoginError(null);

    if (!email || !password) {
      setLoginError('Please fill in both email and password.');
      return;
    }

    setLoadingLogin(true);

    try {
      await login(email, password);
      setPassword('');
      setDashboard(null);
      setDashError(null);
    } catch (err: any) {
      console.log('Login error:', err);
      setLoginError(err?.message ?? 'Login failed');
    } finally {
      setLoadingLogin(false);
    }
  };

  // --- Logout handler ---
  const handleLogout = () => {
    logout();
    setPassword('');
    setLoginError(null);
    setDashboard(null);
    setDashError(null);
  };

  // --- Load dashboard whenever we have a token ---
  useEffect(() => {
    if (!token) {
      setDashboard(null);
      setDashError(null);
      return;
    }

    let cancelled = false;

    const loadDashboard = async () => {
      try {
        setLoadingDash(true);
        setDashError(null);
        const json = (await apiGet('/api/dashboard', token)) as DashboardData;
        if (!cancelled) {
          setDashboard(json);
        }
      } catch (err: any) {
        console.log('Dashboard error:', err);
        if (!cancelled) {
          setDashError(err?.message ?? 'Failed to load dashboard');
        }
      } finally {
        if (!cancelled) {
          setLoadingDash(false);
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // --- Render: not logged in -> show login form ---
  if (!token || !user) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Family App Login</Text>
          <Text style={styles.subtitle}>
            Sign in with your existing web account.
          </Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {loginError && <Text style={styles.errorText}>{loginError}</Text>}

          <TouchableOpacity
            style={[styles.button, loadingLogin && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loadingLogin}
          >
            {loadingLogin ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.helperText}>
            Use the same email and password you use for the web dashboard.
          </Text>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // --- Render: logged in -> show dashboard / my people / all people ---
  if (loadingDash && !dashboard && !dashError) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10, color: '#666' }}>Loading dashboard…</Text>
      </View>
    );
  }

  if (dashError && !dashboard) {
    return (
      <View style={styles.container}>
        <Text style={{ fontSize: 16, fontWeight: '500', color: '#b91c1c' }}>
          {dashError}
        </Text>

        <TouchableOpacity
          onPress={handleLogout}
          style={[styles.logoutButton, { marginTop: 20 }]}
        >
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // At this point we have dashboard data
  return (
    <View style={styles.container}>
      <View style={styles.dashboardHeader}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>
          Welcome back, {dashboard?.user.name ?? user.name}.
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.cardsGrid}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/people/my')}
        >
          <Text style={styles.cardTitle}>My People</Text>
          <Text style={styles.cardText}>
            {dashboard?.stats.my_people_count ?? 0}
          </Text>
          <Text style={{ marginTop: 4, color: '#6b7280', fontSize: 12 }}>
            Tap to view your people
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/people/all')}
        >
          <Text style={styles.cardTitle}>All People</Text>
          <Text style={styles.cardText}>
            {dashboard?.stats.all_people_count ?? 0}
          </Text>
          <Text style={{ marginTop: 4, color: '#6b7280', fontSize: 12 }}>
            Tap to view everyone
          </Text>
        </TouchableOpacity>
      </View>

      {/* Upcoming Birthdays */}
      <View style={[styles.card, { marginTop: 20 }]}>
        <Text style={styles.cardTitle}>Upcoming Birthdays</Text>

        {dashboard?.upcoming_birthdays.length === 0 ? (
          <Text style={{ marginTop: 10, color: '#666' }}>
            No birthdays in the next 30 days.
          </Text>
        ) : (
          dashboard?.upcoming_birthdays.map((p) => (
            <View
              key={p.id}
              style={{
                marginTop: 12,
                paddingVertical: 6,
                borderBottomWidth: 1,
                borderColor: '#eee',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: '#ec4899',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                    {p.name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ fontWeight: '600', fontSize: 16 }}
                  >
                    {p.name}
                  </Text>
                  <Text style={{ color: '#666', fontSize: 13 }}>
                    {p.days_until === 0
                      ? 'Today!'
                      : p.days_until === 1
                      ? 'Tomorrow'
                      : `in ${p.days_until} days`}
                  </Text>
                  <Text style={{ color: '#9ca3af', fontSize: 12 }}>
                    Next birthday: {p.next_birthday_date}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
  },
  button: {
    marginTop: 20,
    height: 46,
    borderRadius: 999,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  helperText: {
    marginTop: 12,
    fontSize: 12,
    color: '#9ca3af',
  },
  errorText: {
    marginTop: 8,
    color: '#b91c1c',
    fontSize: 13,
  },
  dashboardHeader: {
    width: '100%',
    maxWidth: 500,
    marginBottom: 16,
  },
  cardsGrid: {
    width: '100%',
    maxWidth: 500,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: '#111827',
  },
  cardText: {
    fontSize: 16,
    color: '#4b5563',
  },
  logoutButton: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  logoutText: {
    color: '#374151',
    fontSize: 14,
  },
});
