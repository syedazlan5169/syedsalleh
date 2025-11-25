import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";

import { Palette } from "@/constants/theme";
import { useThemePalette } from "@/context/ThemePreferenceContext";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost, apiDelete } from "@/apiClient";

type AdminStats = {
  overview: {
    total_users: number;
    total_admins: number;
    total_approved_users: number;
    pending_users: number;
    total_people: number;
    total_documents: number;
    public_documents: number;
    private_documents: number;
    users_this_month: number;
    people_this_month: number;
    documents_this_month: number;
  };
  top_users: Array<{
    id: number;
    name: string;
    email: string;
    people_count: number;
  }>;
  recent_users: Array<{
    id: number;
    name: string;
    email: string;
    is_admin: boolean;
    is_approved: boolean;
    created_at: string;
  }>;
};

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

export default function AdminTabScreen() {
  const palette = useThemePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { user, token } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const isAdmin = user?.is_admin === true;

  useEffect(() => {
    // Redirect non-admin users immediately
    if (!isAdmin) {
      router.replace("/(tabs)");
      return;
    }

    if (!token) {
      return;
    }
    loadData();
  }, [isAdmin, token, router]);

  const loadData = async () => {
    if (!token) return;

    try {
      const [statsData, usersData] = await Promise.all([
        apiGet("/api/admin/statistics", token) as Promise<AdminStats>,
        apiGet("/api/admin/users?status=pending", token) as Promise<{
          users: User[];
        }>,
      ]);

      setStats(statsData);
      setPendingUsers(usersData.users || []);
    } catch (err: any) {
      console.error("Error loading admin data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleApprove = async (userId: number) => {
    if (!token) return;
    setActionLoading(userId);
    try {
      await apiPost(`/api/admin/users/${userId}/approve`, token, {});
      await loadData();
    } catch (err: any) {
      console.error("Error approving user:", err);
      alert(err?.message || "Failed to approve user");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: number) => {
    if (!token) return;
    setActionLoading(userId);
    try {
      await apiPost(`/api/admin/users/${userId}/reject`, token, {});
      await loadData();
    } catch (err: any) {
      console.error("Error rejecting user:", err);
      alert(err?.message || "Failed to reject user");
    } finally {
      setActionLoading(null);
    }
  };

  // Don't render anything for non-admins (they should be redirected)
  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
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
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Statistics Cards */}
        {stats && (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View
                style={[styles.statIcon, { backgroundColor: palette.tint }]}
              >
                <IconSymbol name="person.2" size={24} color="#fff" />
              </View>
              <Text style={styles.statValue}>{stats.overview.total_users}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
              <Text style={styles.statSubtext}>
                {stats.overview.total_admins} admins,{" "}
                {stats.overview.pending_users} pending
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.statCard, styles.pendingCard]}
              onPress={() => router.push("/admin/users")}
            >
              <View style={[styles.statIcon, { backgroundColor: "#F97316" }]}>
                <IconSymbol name="checkmark.circle" size={24} color="#fff" />
              </View>
              <Text style={styles.statValue}>
                {stats.overview.pending_users}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
              <Text style={styles.statSubtext}>User approvals</Text>
            </TouchableOpacity>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: "#8B5CF6" }]}>
                <IconSymbol name="person.3" size={24} color="#fff" />
              </View>
              <Text style={styles.statValue}>
                {stats.overview.total_people}
              </Text>
              <Text style={styles.statLabel}>Total People</Text>
              <Text style={styles.statSubtext}>
                +{stats.overview.people_this_month} this month
              </Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: "#10B981" }]}>
                <IconSymbol name="doc.text" size={24} color="#fff" />
              </View>
              <Text style={styles.statValue}>
                {stats.overview.total_documents}
              </Text>
              <Text style={styles.statLabel}>Documents</Text>
              <Text style={styles.statSubtext}>
                {stats.overview.public_documents} public,{" "}
                {stats.overview.private_documents} private
              </Text>
            </View>
          </View>
        )}

        {/* Pending Users */}
        {pendingUsers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Approvals</Text>
              <Text style={styles.sectionCount}>({pendingUsers.length})</Text>
            </View>
            {pendingUsers.map((pendingUser) => (
              <View key={pendingUser.id} style={styles.userCard}>
                <View style={styles.userInfo}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                      {pendingUser.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>{pendingUser.name}</Text>
                    <Text style={styles.userEmail}>{pendingUser.email}</Text>
                    <Text style={styles.userMeta}>
                      Registered{" "}
                      {new Date(pendingUser.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.userActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleApprove(pendingUser.id)}
                    disabled={actionLoading === pendingUser.id}
                  >
                    {actionLoading === pendingUser.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.actionButtonText}>Approve</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleReject(pendingUser.id)}
                    disabled={actionLoading === pendingUser.id}
                  >
                    {actionLoading === pendingUser.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text
                        style={[
                          styles.actionButtonText,
                          styles.rejectButtonText,
                        ]}
                      >
                        Reject
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/admin/users")}
          >
            <IconSymbol name="person.2" size={24} color={palette.tint} />
            <Text style={styles.actionCardText}>Manage Users</Text>
            <IconSymbol
              name="chevron.right"
              size={20}
              color={palette.textMuted}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/admin/events")}
          >
            <IconSymbol name="calendar" size={24} color={palette.tint} />
            <Text style={styles.actionCardText}>Manage Events</Text>
            <IconSymbol
              name="chevron.right"
              size={20}
              color={palette.textMuted}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/admin/activity")}
          >
            <IconSymbol name="clock" size={24} color={palette.tint} />
            <Text style={styles.actionCardText}>Activity Log</Text>
            <IconSymbol
              name="chevron.right"
              size={20}
              color={palette.textMuted}
            />
          </TouchableOpacity>
        </View>
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
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 16,
      backgroundColor: palette.surface,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "700",
      color: palette.text,
    },
    content: {
      padding: 20,
      gap: 20,
    },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    errorText: {
      fontSize: 20,
      fontWeight: "600",
      color: palette.danger,
      marginBottom: 8,
    },
    errorSubtext: {
      fontSize: 16,
      color: palette.textMuted,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    statCard: {
      flex: 1,
      minWidth: "47%",
      backgroundColor: palette.elevated,
      borderRadius: 16,
      padding: 16,
      alignItems: "center",
    },
    pendingCard: {
      borderWidth: 2,
      borderColor: "#F97316",
    },
    statIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    statValue: {
      fontSize: 32,
      fontWeight: "700",
      color: palette.text,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: palette.text,
      marginBottom: 4,
    },
    statSubtext: {
      fontSize: 12,
      color: palette.textMuted,
      textAlign: "center",
    },
    section: {
      backgroundColor: palette.elevated,
      borderRadius: 16,
      padding: 16,
      gap: 12,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: palette.text,
    },
    sectionCount: {
      fontSize: 14,
      color: palette.textMuted,
    },
    userCard: {
      backgroundColor: palette.surface,
      borderRadius: 12,
      padding: 16,
      gap: 12,
    },
    userInfo: {
      flexDirection: "row",
      gap: 12,
    },
    userAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: palette.tint,
      alignItems: "center",
      justifyContent: "center",
    },
    userAvatarText: {
      color: "#fff",
      fontSize: 20,
      fontWeight: "700",
    },
    userDetails: {
      flex: 1,
    },
    userName: {
      fontSize: 16,
      fontWeight: "600",
      color: palette.text,
      marginBottom: 4,
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
    userActions: {
      flexDirection: "row",
      gap: 8,
    },
    actionButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 40,
    },
    approveButton: {
      backgroundColor: palette.tint,
    },
    rejectButton: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: palette.danger,
    },
    actionButtonText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "600",
    },
    rejectButtonText: {
      color: palette.danger,
    },
    actionCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: palette.surface,
      borderRadius: 12,
      padding: 16,
    },
    actionCardText: {
      flex: 1,
      fontSize: 16,
      fontWeight: "500",
      color: palette.text,
    },
  });
