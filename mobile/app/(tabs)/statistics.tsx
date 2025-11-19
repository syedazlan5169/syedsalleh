import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Palette } from '@/constants/theme';
import { useThemePalette } from '@/context/ThemePreferenceContext';

import { apiGet } from '../../apiClient';
import { useAuth } from '../../context/AuthContext';

type StatisticsData = {
  overview: {
    total_people: number;
    total_users: number;
    total_documents: number;
    people_this_month: number;
    users_this_month: number;
    documents_this_month: number;
  };
  gender_distribution: Record<string, number>;
  document_types: Record<string, number>;
  document_visibility: {
    public: number;
    private: number;
  };
  top_users: Array<{
    id: number;
    name: string;
    people_count: number;
  }>;
  age_groups: Record<string, number>;
  additional_metrics: {
    average_documents_per_person: number;
    people_with_documents: number;
    people_without_documents: number;
  };
};

export default function StatisticsTabScreen() {
  const palette = useThemePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const { token } = useAuth();
  const router = useRouter();

  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatistics = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const json = (await apiGet('/api/statistics', token)) as StatisticsData;
      setStatistics(json);
    } catch (err: any) {
      console.log('Statistics error:', err);
      setError(err?.message ?? 'Unable to load statistics');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      router.replace('/');
    }
  }, [token, router]);

  useEffect(() => {
    if (token) {
      loadStatistics();
    }
  }, [token, loadStatistics]);

  const StatCard = ({
    title,
    value,
    subtitle,
    iconColor,
  }: {
    title: string;
    value: number;
    subtitle?: string;
    iconColor: string;
  }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: iconColor }]}>
        <Text style={styles.statIconText}>📊</Text>
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statLabel}>{title}</Text>
        <Text style={styles.statValue}>{value.toLocaleString()}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const DistributionCard = ({
    title,
    data,
    getColor,
  }: {
    title: string;
    data: Record<string, number>;
    getColor?: (key: string) => string;
  }) => {
    const total = Object.values(data).reduce((sum, count) => sum + count, 0);
    if (total === 0) {
      return (
        <View style={styles.distributionCard}>
          <Text style={styles.distributionTitle}>{title}</Text>
          <Text style={styles.emptyText}>No data available</Text>
        </View>
      );
    }

    return (
      <View style={styles.distributionCard}>
        <Text style={styles.distributionTitle}>{title}</Text>
        <View style={styles.distributionList}>
          {Object.entries(data).map(([key, count]) => {
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
            const color = getColor ? getColor(key) : palette.tint;
            return (
              <View key={key} style={styles.distributionItem}>
                <View style={styles.distributionHeader}>
                  <Text style={styles.distributionLabel}>{key}</Text>
                  <Text style={styles.distributionCount}>
                    {count} ({percentage}%)
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${percentage}%`, backgroundColor: color },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Statistics</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadStatistics} tintColor={palette.tint} />
        }
      >
        {loading && !statistics ? (
          <View style={styles.centered}>
            <ActivityIndicator color={palette.tint} />
            <Text style={styles.loadingText}>Loading statistics…</Text>
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : statistics ? (
          <>
            {/* Overview Cards */}
            <View style={styles.overviewGrid}>
              <StatCard
                title="Total People"
                value={statistics.overview.total_people}
                subtitle={`${statistics.overview.people_this_month} added this month`}
                iconColor="#3B82F6"
              />
              <StatCard
                title="Total Users"
                value={statistics.overview.total_users}
                subtitle={`${statistics.overview.users_this_month} registered this month`}
                iconColor="#8B5CF6"
              />
              <StatCard
                title="Total Documents"
                value={statistics.overview.total_documents}
                subtitle={`${statistics.overview.documents_this_month} uploaded this month`}
                iconColor="#10B981"
              />
            </View>

            {/* Gender Distribution */}
            <DistributionCard
              title="Gender Distribution"
              data={statistics.gender_distribution}
              getColor={(key) => (key === 'Male' ? '#3B82F6' : '#EC4899')}
            />

            {/* Document Types */}
            <DistributionCard
              title="Document Types"
              data={statistics.document_types}
              getColor={(key) => {
                if (key === 'PDFs') return '#EF4444';
                if (key === 'Images') return '#8B5CF6';
                return '#6B7280';
              }}
            />

            {/* Document Visibility */}
            <DistributionCard
              title="Document Visibility"
              data={{
                Public: statistics.document_visibility.public,
                Private: statistics.document_visibility.private,
              }}
              getColor={(key) => (key === 'Public' ? '#10B981' : '#6B7280')}
            />

            {/* Top Contributors */}
            <View style={styles.distributionCard}>
              <Text style={styles.distributionTitle}>Top Contributors</Text>
              {statistics.top_users.length > 0 ? (
                <View style={styles.topUsersList}>
                  {statistics.top_users.map((user, index) => (
                    <View key={user.id} style={styles.topUserItem}>
                      <View style={[styles.rankBadge, { backgroundColor: palette.tint }]}>
                        <Text style={styles.rankText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.topUserName} numberOfLines={1}>
                        {user.name}
                      </Text>
                      <View style={styles.peopleBadge}>
                        <Text style={styles.peopleBadgeText}>
                          {user.people_count} people
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>No data available</Text>
              )}
            </View>

            {/* Age Distribution */}
            <DistributionCard
              title="Age Distribution"
              data={statistics.age_groups}
              getColor={() => '#6366F1'}
            />

            {/* Additional Metrics */}
            <View style={styles.distributionCard}>
              <Text style={styles.distributionTitle}>Additional Metrics</Text>
              <View style={styles.metricsList}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Average Documents per Person</Text>
                  <Text style={styles.metricValue}>
                    {statistics.additional_metrics.average_documents_per_person}
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>People with Documents</Text>
                  <Text style={styles.metricValue}>
                    {statistics.additional_metrics.people_with_documents}
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>People without Documents</Text>
                  <Text style={styles.metricValue}>
                    {statistics.additional_metrics.people_without_documents}
                  </Text>
                </View>
              </View>
            </View>
          </>
        ) : null}
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
      fontWeight: '700',
      color: palette.text,
    },
    content: {
      padding: 16,
      gap: 16,
    },
    centered: {
      alignItems: 'center',
      marginTop: 48,
      gap: 12,
    },
    loadingText: {
      color: palette.textMuted,
      fontSize: 14,
    },
    errorText: {
      color: palette.danger,
      textAlign: 'center',
      marginTop: 24,
      fontSize: 14,
    },
    overviewGrid: {
      gap: 12,
    },
    statCard: {
      flexDirection: 'row',
      backgroundColor: palette.elevated,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: palette.border,
      shadowColor: palette.shadow,
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 8,
      elevation: 3,
      gap: 16,
    },
    statIcon: {
      width: 56,
      height: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statIconText: {
      fontSize: 28,
    },
    statContent: {
      flex: 1,
      gap: 4,
    },
    statLabel: {
      fontSize: 13,
      color: palette.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statValue: {
      fontSize: 28,
      fontWeight: '700',
      color: palette.text,
    },
    statSubtitle: {
      fontSize: 12,
      color: palette.textMuted,
      marginTop: 4,
    },
    distributionCard: {
      backgroundColor: palette.elevated,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: palette.border,
      shadowColor: palette.shadow,
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 8,
      elevation: 3,
    },
    distributionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: palette.text,
      marginBottom: 16,
    },
    distributionList: {
      gap: 16,
    },
    distributionItem: {
      gap: 8,
    },
    distributionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    distributionLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.text,
    },
    distributionCount: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.text,
    },
    progressBar: {
      height: 8,
      backgroundColor: palette.border,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
    },
    emptyText: {
      fontSize: 14,
      color: palette.textMuted,
      textAlign: 'center',
      paddingVertical: 16,
    },
    topUsersList: {
      gap: 12,
    },
    topUserItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    rankBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rankText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 14,
    },
    topUserName: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: palette.text,
    },
    peopleBadge: {
      backgroundColor: palette.surface,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.border,
    },
    peopleBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.text,
    },
    metricsList: {
      gap: 16,
    },
    metricItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    metricLabel: {
      fontSize: 14,
      color: palette.textMuted,
    },
    metricValue: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.text,
    },
  });

