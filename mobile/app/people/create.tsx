import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { apiPost } from '../../apiClient';
import { PersonForm, PersonFormValues, defaultPersonFormValues } from '../../components/people/PersonForm';
import { useAuth } from '../../context/AuthContext';

export default function CreatePersonScreen() {
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
      <Stack.Screen options={{ title: 'Add Person' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {error && <Text style={styles.errorText}>{error}</Text>}

        <PersonForm
          initialValues={defaultPersonFormValues}
          submitting={saving}
          submitLabel="Add Person"
          onSubmit={handleSubmit}
        />
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
  errorText: {
    color: '#b91c1c',
    textAlign: 'center',
  },
});

