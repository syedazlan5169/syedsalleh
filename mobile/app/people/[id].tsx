import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

import { Palette } from '@/constants/theme';
import { useThemePalette } from '@/context/ThemePreferenceContext';
import { getAvatarColors } from '@/utils/avatar';

import { apiGet } from '../../apiClient';
import { useAuth } from '../../context/AuthContext';
import type { PersonDetail } from '../../types/api';

type PersonResponse = {
  person: PersonDetail;
};

export default function PersonDetailScreen() {
  const palette = useThemePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

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

  const renderAvatar = (detail: PersonDetail) => {
    const avatarColors = getAvatarColors(detail.gender, palette);
    return (
      <View style={[styles.avatar, { backgroundColor: avatarColors.background }]}>
        <Text style={[styles.avatarText, { color: avatarColors.text }]}>
          {detail.name?.charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title,
          headerStyle: { backgroundColor: palette.surface },
          headerTitleStyle: { color: palette.text },
          headerShadowVisible: false,
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
          <RefreshControl refreshing={loading} onRefresh={loadPerson} tintColor={palette.tint} />
        }
      >
        {loading && !person ? (
          <View style={styles.centered}>
            <ActivityIndicator color={palette.tint} />
            <Text style={styles.helperText}>Loading person…</Text>
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : !person ? (
          <Text style={styles.helperText}>Person not found.</Text>
        ) : (
          <View style={styles.card}>
            {renderAvatar(person)}
            <Text style={styles.name}>{person.name}</Text>
            <Text style={styles.subtitle}>NRIC: {person.nric}</Text>

            <View style={styles.section}>
              <SectionTitle text="Contact" palette={palette} />
              <InfoRow palette={palette} label="Email" value={person.email} />
              <InfoRow palette={palette} label="Phone" value={person.phone} />
              <InfoRow palette={palette} label="Address" value={person.address} />
            </View>

            <View style={styles.section}>
              <SectionTitle text="Personal" palette={palette} />
              <InfoRow palette={palette} label="Gender" value={person.gender} />
              <InfoRow palette={palette} label="Blood Type" value={person.blood_type} />
              <InfoRow palette={palette} label="Occupation" value={person.occupation} />
              <InfoRow palette={palette} label="Date of Birth" value={person.date_of_birth} />
              <InfoRow
                palette={palette}
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
              <SectionTitle text="Owner" palette={palette} />
              <InfoRow palette={palette} label="Owner" value={person.owner_name} />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const SectionTitle = ({ text, palette }: { text: string; palette: Palette }) => (
  <Text style={[stylesFactory.sectionTitle, { color: palette.text }]}>{text}</Text>
);

const InfoRow = ({
  label,
  value,
  palette,
}: {
  label: string;
  value?: string | number | null;
  palette: Palette;
}) => {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={stylesFactory.infoRow}>
      <Text style={[stylesFactory.infoLabel, { color: palette.textMuted }]}>{label}</Text>
      <Text style={[stylesFactory.infoValue, { color: palette.text }]}>{value}</Text>
    </View>
  );
};

const createStyles = (palette: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background,
    },
    content: {
      padding: 20,
      paddingBottom: 60,
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
      marginTop: 12,
      color: palette.danger,
      textAlign: 'center',
    },
    card: {
      backgroundColor: palette.elevated,
      borderRadius: 28,
      padding: 24,
      shadowColor: palette.shadow,
      shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 22,
      elevation: 6,
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: palette.tint,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
    },
    avatarText: {
      color: '#fff',
      fontSize: 38,
      fontWeight: '700',
    },
    name: {
      marginTop: 20,
      fontSize: 28,
      fontWeight: '700',
      textAlign: 'center',
      color: palette.text,
    },
    subtitle: {
      textAlign: 'center',
      color: palette.textMuted,
      marginTop: 6,
    },
    section: {
      marginTop: 26,
      borderTopWidth: 1,
      borderTopColor: palette.border,
      paddingTop: 16,
    },
    headerAction: {
      color: palette.tint,
      fontWeight: '600',
      marginRight: 8,
      fontSize: 16,
    },
  });

const stylesFactory = StyleSheet.create({
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoRow: {
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  infoValue: {
    fontSize: 16,
    marginTop: 2,
  },
});

