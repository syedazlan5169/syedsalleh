import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { Palette } from '@/constants/theme';
import { useThemePalette } from '@/context/ThemePreferenceContext';
import { IconSymbol } from '@/components/ui/icon-symbol';

import { apiDelete, apiGet, apiPost } from '../../../apiClient';
import { useAuth } from '../../../context/AuthContext';
import type { PersonShare, UserListItem } from '../../../types/api';

type UsersResponse = {
  users: UserListItem[];
};

type SharesResponse = {
  shares: PersonShare[];
};

export default function SharePersonScreen() {
  const palette = useThemePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { token } = useAuth();

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [shares, setShares] = useState<PersonShare[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingShares, setLoadingShares] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sharingUserId, setSharingUserId] = useState<number | null>(null);
  const [unsharingId, setUnsharingId] = useState<number | null>(null);

  const personId = Array.isArray(id) ? id[0] : id;

  const loadUsers = useCallback(async () => {
    if (!token || !personId) return;
    try {
      setLoading(true);
      setError(null);
      const json = (await apiGet(`/api/users?search=${encodeURIComponent(searchQuery)}`, token)) as UsersResponse;
      setUsers(json.users ?? []);
    } catch (err: any) {
      console.log('Load users error:', err);
      setError(err?.message ?? 'Unable to load users');
    } finally {
      setLoading(false);
    }
  }, [token, searchQuery]);

  const loadShares = useCallback(async () => {
    if (!token || !personId) return;
    try {
      setLoadingShares(true);
      const json = (await apiGet(`/api/people/${personId}/shares`, token)) as SharesResponse;
      setShares(json.shares ?? []);
    } catch (err: any) {
      console.log('Load shares error:', err);
    } finally {
      setLoadingShares(false);
    }
  }, [token, personId]);

  useEffect(() => {
    if (!token) {
      router.replace('/');
    }
  }, [token, router]);

  useEffect(() => {
    if (token && personId) {
      loadUsers();
      loadShares();
    }
  }, [token, personId, loadUsers, loadShares]);

  const handleShare = useCallback(async (userId: number) => {
    if (!token || !personId) return;
    try {
      setSharingUserId(userId);
      setError(null);
      await apiPost(`/api/people/${personId}/share`, token, { user_id: userId });
      await loadShares();
      await loadUsers(); // Refresh to update list
    } catch (err: any) {
      console.log('Share error:', err);
      setError(err?.message ?? 'Unable to share person');
    } finally {
      setSharingUserId(null);
    }
  }, [token, personId, loadShares, loadUsers]);

  const handleUnshare = useCallback(async (shareId: number) => {
    if (!token || !personId) return;
    try {
      setUnsharingId(shareId);
      setError(null);
      await apiDelete(`/api/people/${personId}/share/${shareId}`, token);
      await loadShares();
      await loadUsers(); // Refresh to update list
    } catch (err: any) {
      console.log('Unshare error:', err);
      setError(err?.message ?? 'Unable to remove share');
    } finally {
      setUnsharingId(null);
    }
  }, [token, personId, loadShares, loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return users;
    return users.filter((u) =>
      u.name?.toLowerCase().includes(query) || u.email?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  // Get user IDs that are already shared
  const sharedUserIds = useMemo(() => shares.map((s) => s.shared_with_user_id), [shares]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Share Person',
          headerStyle: { backgroundColor: palette.surface },
          headerTitleStyle: { color: palette.text },
          headerShadowVisible: false,
        }}
      />
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Shared With</Text>
        {loadingShares ? (
          <View style={styles.centered}>
            <ActivityIndicator color={palette.tint} />
          </View>
        ) : shares.length === 0 ? (
          <Text style={styles.helperText}>No one has access to this person yet.</Text>
        ) : (
          <View style={styles.sharesList}>
            {shares.map((share) => (
              <View key={share.id} style={styles.shareItem}>
                <View style={styles.shareInfo}>
                  <Text style={styles.shareName}>{share.shared_with_user_name}</Text>
                  <Text style={styles.shareEmail}>{share.shared_with_user_email}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleUnshare(share.id)}
                  disabled={unsharingId === share.id}
                  style={styles.unshareButton}
                >
                  {unsharingId === share.id ? (
                    <ActivityIndicator size="small" color={palette.danger} />
                  ) : (
                    <IconSymbol name="trash" size={20} color={palette.danger} />
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Share With User</Text>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search users by name or email"
          placeholderTextColor={palette.textMuted}
          style={styles.searchInput}
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={palette.tint} />
          </View>
        ) : filteredUsers.length === 0 ? (
          <Text style={styles.helperText}>No users found.</Text>
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => {
              const isShared = sharedUserIds.includes(item.id);
              const isSharing = sharingUserId === item.id;

              return (
                <TouchableOpacity
                  style={[styles.userItem, isShared && styles.userItemShared]}
                  onPress={() => !isShared && handleShare(item.id)}
                  disabled={isShared || isSharing}
                >
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.name}</Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                  </View>
                  {isSharing ? (
                    <ActivityIndicator size="small" color={palette.tint} />
                  ) : isShared ? (
                    <Text style={[styles.sharedBadge, { color: palette.tint }]}>Shared</Text>
                  ) : (
                    <IconSymbol name="plus.circle" size={24} color={palette.tint} />
                  )}
                </TouchableOpacity>
              );
            }}
            style={styles.usersList}
          />
        )}
      </View>
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
    },
    centered: {
      alignItems: 'center',
      paddingVertical: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: palette.text,
      marginBottom: 12,
    },
    helperText: {
      color: palette.textMuted,
      fontSize: 14,
      textAlign: 'center',
      marginTop: 12,
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
      color: palette.danger,
      fontSize: 13,
      marginBottom: 12,
    },
    sharesList: {
      gap: 8,
      marginBottom: 8,
    },
    shareItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderRadius: 14,
      backgroundColor: palette.elevated,
      borderWidth: 1,
      borderColor: palette.border,
    },
    shareInfo: {
      flex: 1,
    },
    shareName: {
      fontSize: 16,
      fontWeight: '600',
      color: palette.text,
    },
    shareEmail: {
      fontSize: 13,
      color: palette.textMuted,
      marginTop: 2,
    },
    unshareButton: {
      padding: 8,
    },
    usersList: {
      maxHeight: 400,
    },
    userItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderRadius: 14,
      backgroundColor: palette.elevated,
      borderWidth: 1,
      borderColor: palette.border,
      marginBottom: 8,
    },
    userItemShared: {
      opacity: 0.6,
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      fontSize: 16,
      fontWeight: '600',
      color: palette.text,
    },
    userEmail: {
      fontSize: 13,
      color: palette.textMuted,
      marginTop: 2,
    },
    sharedBadge: {
      fontSize: 12,
      fontWeight: '600',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: 'transparent',
    },
  });

