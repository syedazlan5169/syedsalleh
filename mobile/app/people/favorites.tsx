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

import { apiGet, apiPost } from '../../apiClient';
import { useAuth } from '../../context/AuthContext';
import type { MyPerson } from '../../types/api';
import { IconSymbol } from '../../components/ui/icon-symbol';

type PeopleResponse = {
  people: MyPerson[];
};

export default function FavoritesScreen() {
  const palette = useThemePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const { token } = useAuth();
  const router = useRouter();

  const [people, setPeople] = useState<MyPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter to only show favorites and apply search
  const filteredPeople = useMemo(() => {
    const favorites = people.filter((p) => p.is_favorite === true);
    const query = searchQuery.trim().toLowerCase();
    if (!query) return favorites;
    return favorites.filter((person) =>
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
      console.log('Favorites error:', err);
      setError(err?.message ?? 'Unable to load favorites');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleToggleFavorite = useCallback(async (personId: number, currentFavorite: boolean) => {
    if (!token) return;
    try {
      const response = (await apiPost(`/api/people/${personId}/favorite`, token, {})) as {
        message: string;
        is_favorite: boolean;
      };
      
      // Update the person in the list
      setPeople((prev) =>
        prev.map((p) => (p.id === personId ? { ...p, is_favorite: response.is_favorite } : p))
      );
    } catch (err: any) {
      console.log('Toggle favorite error:', err);
      // Optionally show error message
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
          title: 'Favorites',
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
            <Text style={styles.helperText}>Loading favorites…</Text>
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : filteredPeople.length === 0 ? (
          <View style={styles.centered}>
            <IconSymbol name="star" size={48} color={palette.textMuted} />
            <Text style={styles.helperText}>
              {searchQuery ? 'No favorites match your search.' : 'No favorites yet. Mark people as favorites to see them here.'}
            </Text>
          </View>
        ) : (
          <>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search favorites by name"
              placeholderTextColor={palette.textMuted}
              style={styles.searchInput}
            />
            {filteredPeople.map((p) => {
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
                        <View style={styles.nameRow}>
                          <Text style={styles.personName}>{displayName || p.name}</Text>
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(p.id, p.is_favorite ?? false);
                            }}
                            style={styles.favoriteButton}
                          >
                            <IconSymbol
                              name={p.is_favorite ? 'star.fill' : 'star'}
                              size={22}
                              color={p.is_favorite ? '#FFD700' : palette.textMuted}
                            />
                          </TouchableOpacity>
                        </View>
                        {p.age_years !== null && (
                          <Text style={styles.personMeta}>
                            {p.age_years} {p.age_years === 1 ? 'year' : 'years'}
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
            })}
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
      marginTop: 48,
      gap: 12,
    },
    helperText: {
      marginTop: 12,
      color: palette.textMuted,
      textAlign: 'center',
      fontSize: 14,
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
      minHeight: 86,
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
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    personName: {
      fontSize: 18,
      fontWeight: '600',
      color: palette.text,
      flex: 1,
    },
    favoriteButton: {
      padding: 4,
    },
    personMeta: {
      color: palette.textMuted,
      fontSize: 13,
      marginTop: 2,
    },
  });

