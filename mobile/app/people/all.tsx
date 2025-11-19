import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';

import { Palette } from '@/constants/theme';
import { useThemePalette } from '@/context/ThemePreferenceContext';
import { getAvatarColors } from '@/utils/avatar';
import { formatPersonName, getNameInitial } from '@/utils/text';

import { apiGet } from '../../apiClient';
import { useAuth } from '../../context/AuthContext';
import type { MyPerson } from '../../types/api';

type PeopleResponse = {
  people: MyPerson[];
};

export default function AllPeopleScreen() {
  const palette = useThemePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const { token } = useAuth();
  const router = useRouter();

  const [people, setPeople] = useState<MyPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPeople = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return people;
    return people.filter((person) =>
      person.name?.toLowerCase().includes(query),
    );
  }, [people, searchQuery]);

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
      <Stack.Screen
        options={{
          title: 'All People',
          headerStyle: { backgroundColor: palette.surface },
          headerTitleStyle: { color: palette.text },
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadPeople} />
        }
      >
        {loading && people.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator color={palette.tint} />
            <Text style={styles.helperText}>Loading people…</Text>
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : people.length === 0 ? (
          <Text style={styles.helperText}>No people found.</Text>
        ) : (
          <>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name"
              placeholderTextColor={palette.textMuted}
              style={styles.searchInput}
            />
            {filteredPeople.length === 0 ? (
              <Text style={styles.helperText}>No matches for that name.</Text>
            ) : (
              filteredPeople.map((p) => {
                const { background, text } = getAvatarColors(p.gender, palette);
                const displayName = formatPersonName(p.name);
                const ownerName = formatPersonName(p.owner_name);
                const initial = getNameInitial(p.name);
                return (
                  <TouchableOpacity
                    key={p.id}
                    activeOpacity={0.7}
                    onPress={() =>
                      router.push({ pathname: '/people/[id]', params: { id: String(p.id) } })
                    }
                  >
                    <View style={styles.personCard}>
                      <View style={[styles.avatar, { backgroundColor: background }]}>
                        <Text style={[styles.avatarText, { color: text }]}>
                          {initial}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.personName}>{displayName || p.name}</Text>
                        <Text style={styles.personMeta}>{p.nric}</Text>
                        {p.email && <Text style={styles.personMeta}>{p.email}</Text>}
                        {p.phone && <Text style={styles.personMeta}>{p.phone}</Text>}
                        {ownerName && (
                          <Text style={styles.personMeta}>
                            Created by {ownerName}
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
                );
              })
            )}
          </>
        )}
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
    content: {
      padding: 16,
      gap: 12,
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
    searchInput: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: palette.text,
      backgroundColor: palette.surface,
      marginBottom: 12,
    },
    errorText: {
      marginTop: 12,
      color: palette.danger,
      textAlign: 'center',
    },
    personCard: {
      flexDirection: 'row',
      gap: 12,
      padding: 18,
      borderRadius: 22,
      backgroundColor: palette.elevated,
      borderWidth: 1,
      borderColor: palette.border,
      shadowColor: palette.shadow,
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 12,
      elevation: 3,
      marginBottom: 8,
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: palette.accent,
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
      color: palette.text,
    },
    personMeta: {
      color: palette.textMuted,
      fontSize: 13,
      marginTop: 2,
    },
  });

