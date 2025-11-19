import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { apiGet } from '../../apiClient';
import { useAuth } from '../../context/AuthContext';
import type { PersonDetail } from '../../types/api';

type PersonResponse = {
  person: PersonDetail;
};

const InfoRow = ({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) => {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
};

export default function PersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { token, user } = useAuth();

  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const personId = Array.isArray(id) ? id[0] : id;

  const loadPerson = useCallback(async () => {
    if (!token || !personId) return;
    try {
      setLoading(true);
      setError(null);
      const json = (await apiGet(`/api/people/${personId}`, token)) as PersonResponse;
      setPerson(json.person);
    } catch (err: any) {
      console.log('Person detail error:', err);
      setError(err?.message ?? 'Unable to load person details');
    } finally {
      setLoading(false);
    }
  }, [personId, token]);

  useEffect(() => {
    if (!token) {
      router.replace('/');
    } else if (!personId) {
      setError('Missing person id');
    }
  }, [token, personId, router]);

  useFocusEffect(
    useCallback(() => {
      if (!token || !personId) return;
      loadPerson();
    }, [token, personId, loadPerson]),
  );

  const title = person?.name ?? 'Person Detail';

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title,
          headerRight:
            person && user && person.owner_id === user.id && personId
              ? () => (
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: '/people/[id]/edit',
                        params: { id: String(personId) },
                      })
                    }
                  >
                    <Text style={styles.headerAction}>Edit</Text>
                  </TouchableOpacity>
                )
              : undefined,
        }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadPerson} />
        }
      >
        {loading && !person ? (
          <View style={styles.centered}>
            <ActivityIndicator />
            <Text style={styles.helperText}>Loading person…</Text>
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : !person ? (
          <Text style={styles.helperText}>Person not found.</Text>
        ) : (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {person.name?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.name}>{person.name}</Text>
            <Text style={styles.subtitle}>NRIC: {person.nric}</Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact</Text>
              <InfoRow label="Email" value={person.email} />
              <InfoRow label="Phone" value={person.phone} />
              <InfoRow label="Address" value={person.address} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personal</Text>
              <InfoRow label="Gender" value={person.gender} />
              <InfoRow label="Blood Type" value={person.blood_type} />
              <InfoRow label="Occupation" value={person.occupation} />
              <InfoRow label="Date of Birth" value={person.date_of_birth} />
              <InfoRow
                label="Age"
                value={
                  person.age_years !== null && person.age_years !== undefined
                    ? `${person.age_years} ${person.age_years === 1 ? 'year' : 'years'}${
                        person.age_months && person.age_months > 0
                          ? ` ${person.age_months} ${person.age_months === 1 ? 'month' : 'months'}`
                          : ''
                      }`
                    : undefined
                }
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Owner</Text>
              <InfoRow label="Owner" value={person.owner_name} />
            </View>
          </View>
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
    marginTop: 12,
    color: '#b91c1c',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  name: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: '#111827',
  },
  subtitle: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 6,
  },
  section: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#111827',
  },
  infoRow: {
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  infoValue: {
    fontSize: 16,
    color: '#1f2937',
    marginTop: 2,
  },
  headerAction: {
    color: '#2563eb',
    fontWeight: '600',
    marginRight: 8,
  },
});

