import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Palette } from '@/constants/theme';
import { useThemePalette } from '@/context/ThemePreferenceContext';

import { apiPost } from '../../apiClient';
import { PersonForm, PersonFormValues, defaultPersonFormValues } from '../../components/people/PersonForm';
import { useAuth } from '../../context/AuthContext';

export default function CreatePersonScreen() {
  const palette = useThemePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const insets = useSafeAreaInsets();
  const keyboardVerticalOffset = useMemo(
    () => (Platform.OS === 'ios' ? 80 : 0) + insets.bottom,
    [insets.bottom],
  );

  const { token } = useAuth();
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: PersonFormValues) => {
    if (!token) {
      router.replace('/');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      // Filter out empty phone numbers
      const phoneNumbers = values.phone.filter(p => p && p.trim() !== '');
      
      const payload = {
        ...values,
        date_of_birth: values.date_of_birth || null,
        gender: values.gender || null,
        blood_type: values.blood_type || null,
        occupation: values.occupation || null,
        address: values.address || null,
        phone: phoneNumbers.length > 0 ? phoneNumbers : null,
        email: values.email || null,
      };
      const json = (await apiPost('/api/people', token, payload)) as { person: { id: number } };
      router.replace({ pathname: '/people/[id]', params: { id: String(json.person.id) } });
    } catch (err: any) {
      console.log('Create person error:', err);
      setError(err?.message ?? 'Failed to create person');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Add Person',
          headerStyle: { backgroundColor: palette.surface },
          headerTitleStyle: { color: palette.text },
          headerShadowVisible: false,
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}
        >
          {error && <Text style={styles.errorText}>{error}</Text>}

          <PersonForm
            initialValues={defaultPersonFormValues}
            submitting={saving}
            submitLabel="Add Person"
            onSubmit={handleSubmit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (palette: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },
    flex: {
      flex: 1,
    },
    content: {
      padding: 20,
      gap: 16,
    },
    errorText: {
      color: palette.danger,
      textAlign: 'center',
    },
  });

