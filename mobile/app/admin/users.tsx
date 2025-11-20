import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Palette } from '@/constants/theme';
import { useThemePalette } from '@/context/ThemePreferenceContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/context/AuthContext';
import { apiGet, apiPost, apiDelete } from '@/apiClient';

type User = {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
  is_approved: boolean;
  approved_at: string | null;
  people_count: number;
  documents_count: number;
  created_at: string;
};

export default function AdminUsersScreen() {
  const palette = useThemePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { user, token } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const isAdmin = user?.is_admin === true;

  useEffect(() => {
    if (!isAdmin || !token) {
      return;
    }
    loadUsers();
  }, [isAdmin, token, filter]);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, users]);

  const loadUsers = async () => {
    if (!token) return;

    try {
      const response = (await apiGet(
        `/api/admin/users?status=${filter}`,
        token,
      )) as { users: User[] };
      setUsers(response.users || []);
      filterUsers(response.users || []);
    } catch (err: any) {
      console.error('Error loading users:', err);
      Alert.alert('Error', err?.message || 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterUsers = (userList?: User[]) => {
    const list = userList || users;
    if (!searchQuery.trim()) {
      setFilteredUsers(list);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = list.filter(
      (u) =>
        u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query),
    );
    setFilteredUsers(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const handleApprove = async (userId: number) => {
    if (!token) return;
    setActionLoading(userId);
    try {
      await apiPost(`/api/admin/users/${userId}/approve`, token, {});
      await loadUsers();
      Alert.alert('Success', 'User approved successfully');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to approve user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: number) => {
    if (!token) return;

    Alert.alert(
      'Confirm Rejection',
      'Are you sure you want to reject this user? This will delete their account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(userId);
            try {
              await apiPost(`/api/admin/users/${userId}/reject`, token, {});
              await loadUsers();
              Alert.alert('Success', 'User rejected and deleted');
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to reject user');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  const handleMakeAdmin = async (userId: number) => {
    if (!token) return;
    setActionLoading(userId);
    try {
      await apiPost(`/api/admin/users/${userId}/make-admin`, token, {});
      await loadUsers();
      Alert.alert('Success', 'User promoted to admin');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to promote user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveAdmin = async (userId: number) => {
    if (!token) return;

    Alert.alert(
      'Confirm',
      'Are you sure you want to remove admin privileges from this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(userId);
            try {
              await apiPost(`/api/admin/users/${userId}/remove-admin`, token, {});
              await loadUsers();
              Alert.alert('Success', 'Admin privileges removed');
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to remove admin privileges');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Users</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Access Denied</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Users</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={palette.tint} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Users</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.filters}>
        <View style={styles.searchContainer}>
          <IconSymbol name="magnifyingglass" size={20} color={palette.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor={palette.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => setFilter('all')}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === 'all' && styles.filterButtonTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'approved' && styles.filterButtonActive]}
            onPress={() => setFilter('approved')}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === 'approved' && styles.filterButtonTextActive,
              ]}
            >
              Approved
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'pending' && styles.filterButtonActive]}
            onPress={() => setFilter('pending')}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === 'pending' && styles.filterButtonTextActive,
              ]}
            >
              Pending
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredUsers.length === 0 ? (
          <View style={styles.empty}>
            <IconSymbol name="person.2" size={48} color={palette.textMuted} />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        ) : (
          filteredUsers.map((userItem) => (
            <View key={userItem.id} style={styles.userCard}>
              <View style={styles.userInfo}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {userItem.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userDetails}>
                  <View style={styles.userNameRow}>
                    <Text style={styles.userName}>{userItem.name}</Text>
                    {userItem.is_admin && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>Admin</Text>
                      </View>
                    )}
                    {userItem.is_approved ? (
                      <View style={[styles.badge, styles.badgeSuccess]}>
                        <Text style={[styles.badgeText, styles.badgeTextSuccess]}>Approved</Text>
                      </View>
                    ) : (
                      <View style={[styles.badge, styles.badgeWarning]}>
                        <Text style={[styles.badgeText, styles.badgeTextWarning]}>Pending</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.userEmail}>{userItem.email}</Text>
                  <Text style={styles.userMeta}>
                    {userItem.people_count} people • {userItem.documents_count} documents
                  </Text>
                </View>
              </View>
              <View style={styles.userActions}>
                {!userItem.is_approved && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => handleApprove(userItem.id)}
                      disabled={actionLoading === userItem.id}
                    >
                      {actionLoading === userItem.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.actionButtonText}>Approve</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => handleReject(userItem.id)}
                      disabled={actionLoading === userItem.id}
                    >
                      {actionLoading === userItem.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={[styles.actionButtonText, styles.rejectButtonText]}>
                          Reject
                        </Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
                {userItem.is_approved && !userItem.is_admin && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.adminButton]}
                    onPress={() => handleMakeAdmin(userItem.id)}
                    disabled={actionLoading === userItem.id}
                  >
                    {actionLoading === userItem.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.actionButtonText}>Make Admin</Text>
                    )}
                  </TouchableOpacity>
                )}
                {userItem.is_admin && userItem.id !== user?.id && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.removeAdminButton]}
                    onPress={() => handleRemoveAdmin(userItem.id)}
                    disabled={actionLoading === userItem.id}
                  >
                    {actionLoading === userItem.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={[styles.actionButtonText, styles.removeAdminButtonText]}>
                        Remove Admin
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 16,
      backgroundColor: palette.surface,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: palette.text,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorText: {
      fontSize: 18,
      fontWeight: '600',
      color: palette.danger,
    },
    filters: {
      padding: 16,
      gap: 12,
      backgroundColor: palette.surface,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: palette.elevated,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: palette.text,
    },
    filterButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    filterButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: palette.elevated,
      alignItems: 'center',
    },
    filterButtonActive: {
      backgroundColor: palette.tint,
    },
    filterButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: palette.text,
    },
    filterButtonTextActive: {
      color: '#fff',
    },
    content: {
      padding: 16,
      gap: 12,
    },
    empty: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 16,
      color: palette.textMuted,
      marginTop: 12,
    },
    userCard: {
      backgroundColor: palette.elevated,
      borderRadius: 16,
      padding: 16,
      gap: 12,
    },
    userInfo: {
      flexDirection: 'row',
      gap: 12,
    },
    userAvatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: palette.tint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    userAvatarText: {
      color: '#fff',
      fontSize: 24,
      fontWeight: '700',
    },
    userDetails: {
      flex: 1,
    },
    userNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
      marginBottom: 4,
    },
    userName: {
      fontSize: 18,
      fontWeight: '600',
      color: palette.text,
    },
    userEmail: {
      fontSize: 14,
      color: palette.textMuted,
      marginBottom: 4,
    },
    userMeta: {
      fontSize: 12,
      color: palette.textMuted,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: palette.tint + '20',
    },
    badgeSuccess: {
      backgroundColor: '#10B98120',
    },
    badgeWarning: {
      backgroundColor: '#F9731620',
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: palette.tint,
      textTransform: 'uppercase',
    },
    badgeTextSuccess: {
      color: '#10B981',
    },
    badgeTextWarning: {
      color: '#F97316',
    },
    userActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 40,
    },
    approveButton: {
      backgroundColor: palette.tint,
    },
    rejectButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: palette.danger,
    },
    adminButton: {
      backgroundColor: '#8B5CF6',
    },
    removeAdminButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: palette.danger,
    },
    actionButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    rejectButtonText: {
      color: palette.danger,
    },
    removeAdminButtonText: {
      color: palette.danger,
    },
  });

