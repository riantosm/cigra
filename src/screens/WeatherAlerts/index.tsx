import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MotiView } from 'moti';

import Badge from '@/components/atoms/Badge';
import GradientIconChip from '@/components/atoms/GradientIconChip';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import Card from '@/components/molecules/Card';
import EmptyState from '@/components/molecules/EmptyState';
import SearchFilterBar from '@/components/molecules/SearchFilterBar';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { useWeatherAlerts } from '@/hooks/useWeatherAlerts';
import { colors } from '@/theme/colors';
import type { WeatherAlert } from '@/types';
import { cleanValue } from '@/utils/format';
import { gradientForColor } from '@/utils/gradientColor';
import { contentEnterTransition } from '@/utils/motion';
import { alertSeverityMeta } from '@/utils/weather';

type Props = RootStackScreenProps<typeof ROUTES.weatherAlerts>;

function AlertCard({ alert }: { alert: WeatherAlert }) {
  const meta = alertSeverityMeta(alert.severity);
  return (
    <Card style={[styles.card, { borderColor: meta.border }]}>
      <View style={styles.cardHead}>
        <GradientIconChip
          icon="alert-triangle"
          colors={gradientForColor(meta.accent)}
          size={30}
          iconSize={16}
          radius={10}
        />
        <Badge label={meta.label} variant={meta.badgeVariant} />
        {alert.pub_date_formatted ? (
          <Text style={styles.date} numberOfLines={1}>
            {alert.pub_date_formatted}
          </Text>
        ) : null}
      </View>
      <Text style={styles.title}>{alert.title}</Text>
      {cleanValue(alert.description) ? (
        <Text style={styles.desc}>{alert.description}</Text>
      ) : null}
      {alert.link ? (
        <PressableScale
          scaleTo={0.97}
          onPress={() => Linking.openURL(alert.link).catch(() => {})}
          contentStyle={styles.linkRow}>
          <Icon name="info" size={14} color={colors.primary} />
          <Text style={styles.linkText}>Buka detail resmi BMKG (XML)</Text>
        </PressableScale>
      ) : null}
    </Card>
  );
}

export default function WeatherAlertsScreen(props: Props) {
  const { navigation } = props;
  const { feed, alerts, isLoading, isRefreshing, error, reload } = useWeatherAlerts();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return alerts;
    return alerts.filter(
      a =>
        a.title.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q),
    );
  }, [alerts, query]);

  return (
    <MainLayout
      title="Peringatan Dini Cuaca"
      subtitle={feed ? `${feed.total} peringatan aktif di Indonesia` : 'Cuaca ekstrem BMKG'}
      variant="canvas"
      onBack={() => navigation.goBack()}>
      {isLoading ? (
        <ActivityIndicator style={styles.centerState} color={colors.primary} />
      ) : error && !feed ? (
        <View style={styles.centerWrap}>
          <EmptyState icon="alert-triangle" title="Tidak dapat memuat" message={error} />
          <Text style={styles.retry} onPress={() => reload('refresh')}>
            Coba lagi
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => reload('refresh')}
              tintColor={colors.primary}
            />
          }>
          <SearchFilterBar
            value={query}
            onChangeText={setQuery}
            onClear={() => setQuery('')}
            placeholder="Cari provinsi / kabupaten…"
            style={styles.search}
          />
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={contentEnterTransition}>
            {filtered.length === 0 ? (
              <EmptyState
                icon="shield-check"
                title={alerts.length === 0 ? 'Kondisi aman' : 'Tidak ada yang cocok'}
                message={
                  alerts.length === 0
                    ? 'Tidak ada peringatan dini cuaca ekstrem yang aktif dari BMKG saat ini.'
                    : 'Tidak ada peringatan yang cocok dengan pencarian.'
                }
                style={styles.empty}
              />
            ) : (
              filtered.map(alert => <AlertCard key={alert.guid} alert={alert} />)
            )}
          </MotiView>

          <Text style={styles.attribution}>
            {cleanValue(feed?.attribution) ??
              'Data peringatan dini oleh BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)'}
          </Text>
        </ScrollView>
      )}
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 96,
  },
  centerState: {
    marginTop: 40,
  },
  centerWrap: {
    marginTop: 48,
    alignItems: 'center',
    gap: 12,
  },
  retry: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    padding: 8,
  },
  search: {
    marginBottom: 16,
  },
  empty: {
    marginTop: 40,
  },
  card: {
    marginBottom: 12,
    gap: 8,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  date: {
    flex: 1,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'right',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.heading,
    letterSpacing: -0.2,
  },
  desc: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textBody,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.primarySurface,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  attribution: {
    marginTop: 16,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
