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
import { Stack, useRouter } from 'expo-router';

import { apiGet } from '../../apiClient';
import { useAuth } from '../../context/AuthContext';
import type { MyPerson } from '../../types/api';

type PeopleResponse = {
  people: MyPerson[];
};

export default function AllPeopleScreen() {
  const { token } = useAuth();
  const router = useRouter();

  const [people, setPeople] = useState<MyPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPeople = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const json = (await apiGet('/api/people', token)) as PeopleResponse;
      setPeople(json.people ?? []);
    } catch (err: any) {
      console.log('All people error:', err);
      setError(err?.message ?? 'Unable to load people');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      router.replace('/');
    }
  }, [token, router]);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      loadPeople();
    }, [token, loadPeople]),
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'All People' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadPeople} />
        }
      >
        {loading && people.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator />
            <Text style={styles.helperText}>Loading people…</Text>
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : people.length === 0 ? (
          <Text style={styles.helperText}>No people found.</Text>
        ) : (
          people.map((p) => (
            <TouchableOpacity
              key={p.id}
              activeOpacity={0.7}
              onPress={() =>
                router.push({ pathname: '/people/[id]', params: { id: String(p.id) } })
              }
            >
              <View style={styles.personCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {p.name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.personName}>{p.name}</Text>
                  <Text style={styles.personMeta}>{p.nric}</Text>
                  {p.email && <Text style={styles.personMeta}>{p.email}</Text>}
                  {p.phone && <Text style={styles.personMeta}>{p.phone}</Text>}
                  {p.owner_name && (
                    <Text style={styles.personMeta}>
                      Created by {p.owner_name}
                    </Text>
                  )}
                  {p.age_years !== null && (
                    <Text style={styles.personMeta}>
                      Age: {p.age_years}{' '}
                      {p.age_years === 1 ? 'year' : 'years'}
                      {p.age_months && p.age_months > 0
                        ? ` and ${p.age_months} ${
                            p.age_months === 1 ? 'month' : 'months'
                          }`
                        : ''}
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
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
  personCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  personName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  personMeta: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 2,
  },
});

