import React, { useState } from 'react';
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
import { API_BASE_URL } from '../../apiConfig';

type User = {
  id: number;
  name: string;
  email: string;
};

type LoginState = {
  token: string | null;
  user: User | null;
};

export default function HomeScreen() {
  const [email, setEmail] = useState('syedazlan5169@gmail.com'); // prefill for dev
  const [password, setPassword] = useState('');
  const [loginState, setLoginState] = useState<LoginState>({
    token: null,
    user: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);

    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        // Try to parse error message from backend
        let message = `HTTP ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson?.message) {
            message = errJson.message;
          }
        } catch {
          // ignore JSON parse error, keep default message
        }

        throw new Error(message);
      }

      const json = (await response.json()) as {
        token: string;
        user: User;
      };

      setLoginState({
        token: json.token,
        user: json.user,
      });

      setPassword(''); // clear password after success
    } catch (err: any) {
      console.log('Login error:', err);
      setError(err?.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setLoginState({
      token: null,
      user: null,
    });
    setPassword('');
    setError(null);
  };

  // If not logged in -> show login UI
  if (!loginState.token || !loginState.user) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Syed Salleh Family</Text>

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

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
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

  // If logged in -> show simple dashboard
  return (
    <View style={styles.container}>
      <View style={styles.dashboardHeader}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>
          Welcome back, {loginState.user.name}.
        </Text>
      </View>

      <View style={styles.cardsGrid}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>My People</Text>
          <Text style={styles.cardText}>Manage your family members.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>All People</Text>
          <Text style={styles.cardText}>Browse all people in the system.</Text>
        </View>

        <View style={[styles.card, styles.cardOutlined]}>
          <Text style={styles.cardTitle}>Add Person</Text>
          <Text style={styles.cardText}>Add a new family member.</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5', // light neutral
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    maxWidth: 400,
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
    textAlign: 'center',
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
    fontSize: 14,
    color: '#6b7280',
  },
  cardOutlined: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#93c5fd',
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
