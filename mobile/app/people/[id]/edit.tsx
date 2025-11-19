import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

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
  return {
    name: person.name ?? '',
    nric: person.nric ?? '',
    date_of_birth: person.date_of_birth ?? '',
    gender: person.gender ?? '',
    blood_type: person.blood_type ?? '',
    occupation: person.occupation ?? '',
    address: person.address ?? '',
    phone: person.phone ?? '',
    email: person.email ?? '',
  };
}

export default function EditPersonScreen() {
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
      const payload = {
        ...values,
        date_of_birth: values.date_of_birth || null,
        gender: values.gender || null,
        blood_type: values.blood_type || null,
        occupation: values.occupation || null,
        address: values.address || null,
        phone: values.phone || null,
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
      <Stack.Screen options={{ title: 'Edit Person' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {loading && !initialValues ? (
          <View style={styles.centered}>
            <ActivityIndicator />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  centered: {
    alignItems: 'center',
    marginTop: 24,
  },
  helperText: {
    marginTop: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  errorText: {
    color: '#b91c1c',
    textAlign: 'center',
  },
});

