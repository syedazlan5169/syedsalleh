import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Palette } from '@/constants/theme';
import { useThemePalette } from '@/context/ThemePreferenceContext';

import { apiGet, apiPut } from '../../../apiClient';
import {
  PersonForm,
  PersonFormValues,
  defaultPersonFormValues,
} from '../../../components/people/PersonForm';
import { useAuth } from '../../../context/AuthContext';
import type { PersonDetail } from '../../../types/api';

type PersonResponse = {
  person: PersonDetail;
};

function mapPersonToFormValues(person: PersonDetail): PersonFormValues {
  // Convert phone array to form format (pad to 4 slots)
  let phoneArray: string[] = ['', '', '', ''];
  if (person.phone && Array.isArray(person.phone)) {
    phoneArray = [...person.phone];
    // Pad to 4 slots
    while (phoneArray.length < 4) {
      phoneArray.push('');
    }
  } else if (person.phone && typeof person.phone === 'string') {
    // Legacy: single phone string
    phoneArray[0] = person.phone;
  }
  
  return {
    name: person.name ?? '',
    nric: person.nric ?? '',
    date_of_birth: person.date_of_birth ?? '',
    gender: person.gender ?? '',
    blood_type: person.blood_type ?? '',
    occupation: person.occupation ?? '',
    address: person.address ?? '',
    phone: phoneArray.slice(0, 4), // Ensure max 4
    email: person.email ?? '',
  };
}

export default function EditPersonScreen() {
  const palette = useThemePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const insets = useSafeAreaInsets();
  const keyboardVerticalOffset = useMemo(
    () => (Platform.OS === 'ios' ? 80 : 0) + insets.bottom,
    [insets.bottom],
  );

  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { token } = useAuth();

  const [initialValues, setInitialValues] = useState<PersonFormValues | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const personId = Array.isArray(id) ? id[0] : id;

  const loadPerson = useCallback(async () => {
    if (!token || !personId) return;
    try {
      setLoading(true);
      setError(null);
      const json = (await apiGet(`/api/people/${personId}`, token)) as PersonResponse;
      setInitialValues(mapPersonToFormValues(json.person));
    } catch (err: any) {
      console.log('Load person for edit error:', err);
      setError(err?.message ?? 'Failed to load person');
    } finally {
      setLoading(false);
    }
  }, [personId, token]);

  useEffect(() => {
    if (!token) {
      router.replace('/');
      return;
    }
    if (!personId) {
      setError('Missing person id');
      return;
    }
    loadPerson();
  }, [token, personId, loadPerson, router]);

  const handleSubmit = async (values: PersonFormValues) => {
    if (!token || !personId) return;
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
      await apiPut(`/api/people/${personId}`, token, payload);
      router.replace({ pathname: '/people/[id]', params: { id: String(personId) } });
    } catch (err: any) {
      console.log('Update person error:', err);
      setError(err?.message ?? 'Failed to update person');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Edit Person',
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
          {loading && !initialValues ? (
            <View style={styles.centered}>
              <ActivityIndicator color={palette.tint} />
              <Text style={styles.helperText}>Loading person…</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : !initialValues ? (
            <Text style={styles.helperText}>Person not found.</Text>
          ) : (
            <PersonForm
              initialValues={initialValues ?? defaultPersonFormValues}
              submitting={saving}
              submitLabel="Save Changes"
              onSubmit={handleSubmit}
            />
          )}
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
      color: palette.danger,
      textAlign: 'center',
    },
  });

