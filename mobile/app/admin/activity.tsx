import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Palette } from '@/constants/theme';
import { useThemePalette } from '@/context/ThemePreferenceContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/context/AuthContext';
import { apiGet } from '@/apiClient';

type ActivityLog = {
  id: number;
  user_id: number | null;
  user_name: string;
  action: string;
  description: string;
  subject_type: string | null;
  subject_id: number | null;
  properties: Record<string, any> | null;
  ip_address: string | null;
  occurred_at: string;
  created_at: string;
};

type ActivityLogsResponse = {
  logs: ActivityLog[];
  total: number;
  per_page: number;
  page: number;
  has_more: boolean;
};

export default function AdminActivityScreen() {
  const palette = useThemePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { user, token } = useAuth();
  const router = useRouter();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const isAdmin = user?.is_admin === true;

  useEffect(() => {
    if (!isAdmin || !token) {
      router.replace('/(tabs)');
      return;
    }
    loadLogs(true);
  }, [isAdmin, token, router]);

  const loadLogs = async (reset = false) => {
    if (!token) return;

    const currentPage = reset ? 1 : page;

    try {
      const response = (await apiGet(
        `/api/admin/activity-logs?page=${currentPage}&per_page=50`,
        token,
      )) as ActivityLogsResponse;

      if (reset) {
        setLogs(response.logs);
        setPage(1);
      } else {
        setLogs((prev) => [...prev, ...response.logs]);
      }

      setHasMore(response.has_more);
      if (!reset) {
        setPage((prev) => prev + 1);
      }
    } catch (err: any) {
      console.error('Error loading activity logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLogs(true);
  };

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    loadLogs(false);
  };

  const formatAction = (action: string) => {
    return action
      .split('.')
      .pop()
      ?.replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase()) || action;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isAdmin) {
    return null;
  }

  if (loading && logs.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Activity Log</Text>
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
        <Text style={styles.headerTitle}>Activity Log</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 20;
          if (
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - paddingToBottom
          ) {
            loadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {logs.length === 0 ? (
          <View style={styles.empty}>
            <IconSymbol name="clock" size={48} color={palette.textMuted} />
            <Text style={styles.emptyText}>No activity yet</Text>
            <Text style={styles.emptySubtext}>
              Once users start interacting with the application, their actions will appear here.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.infoBar}>
              <Text style={styles.infoText}>
                Showing {logs.length} {logs.length === 1 ? 'activity' : 'activities'}
              </Text>
            </View>

            {logs.map((log) => (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <View style={styles.logHeaderLeft}>
                    <View style={styles.actionBadge}>
                      <Text style={styles.actionBadgeText}>{formatAction(log.action)}</Text>
                    </View>
                    <Text style={styles.logTime}>{formatDate(log.occurred_at)}</Text>
                  </View>
                  <View style={styles.logHeaderRight}>
                    <Text style={styles.logUserLabel}>User</Text>
                    <Text style={styles.logUserName}>{log.user_name}</Text>
                    {log.ip_address && (
                      <Text style={styles.logIp}>{log.ip_address}</Text>
                    )}
                  </View>
                </View>

                <Text style={styles.logDescription}>{log.description}</Text>

                {(log.subject_type || log.properties) && (
                  <View style={styles.logMeta}>
                    {log.subject_type && log.subject_id && (
                      <View style={styles.metaTag}>
                        <IconSymbol name="doc.text" size={14} color={palette.textMuted} />
                        <Text style={styles.metaTagText}>
                          {log.subject_type.split('\\').pop()} #{log.subject_id}
                        </Text>
                      </View>
                    )}
                    {log.properties && Object.keys(log.properties).length > 0 && (
                      <View style={styles.metaTag}>
                        <IconSymbol name="info.circle" size={14} color={palette.textMuted} />
                        <Text style={styles.metaTagText}>Details</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}

            {loadingMore && (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color={palette.tint} />
              </View>
            )}

            {!hasMore && logs.length > 0 && (
              <View style={styles.endContainer}>
                <Text style={styles.endText}>No more activities</Text>
              </View>
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
    content: {
      padding: 16,
      gap: 12,
    },
    infoBar: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: palette.elevated,
      borderRadius: 12,
      marginBottom: 8,
    },
    infoText: {
      fontSize: 14,
      color: palette.textMuted,
    },
    empty: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: palette.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: palette.textMuted,
      textAlign: 'center',
      paddingHorizontal: 40,
    },
    logCard: {
      backgroundColor: palette.elevated,
      borderRadius: 16,
      padding: 16,
      gap: 12,
    },
    logHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    logHeaderLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    logHeaderRight: {
      alignItems: 'flex-end',
    },
    actionBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: palette.tint + '20',
    },
    actionBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: palette.tint,
      textTransform: 'uppercase',
    },
    logTime: {
      fontSize: 12,
      color: palette.textMuted,
    },
    logUserLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: palette.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    logUserName: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.text,
      marginBottom: 2,
    },
    logIp: {
      fontSize: 11,
      color: palette.textMuted,
    },
    logDescription: {
      fontSize: 15,
      color: palette.text,
      lineHeight: 22,
    },
    logMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    metaTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: palette.surface,
    },
    metaTagText: {
      fontSize: 12,
      color: palette.textMuted,
    },
    loadMoreContainer: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    endContainer: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    endText: {
      fontSize: 14,
      color: palette.textMuted,
    },
  });

