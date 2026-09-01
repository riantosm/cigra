import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import Card from '@/components/molecules/Card';
import EmptyState from '@/components/molecules/EmptyState';
import MainLayout from '@/components/templates/MainLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { getEmergencyContactsApi } from '@/services/api/me.service';
import { colors } from '@/theme/colors';
import type { EmergencyContact } from '@/types';
import { extractErrorMessage } from '@/utils/format';
import { contentEnterTransition } from '@/utils/motion';

type Props = RootStackScreenProps<typeof ROUTES.emergencyContacts>;

// Urutan tampil kelompok kategori + label & ikon. Nilai kategori lain (fallback) masuk "Lainnya".
const CATEGORY_ORDER = ['command', 'medical', 'security', 'general'] as const;

const categoryMeta: Record<string, { label: string; icon: IconName; color: string }> = {
  command: { label: 'Komando & Piket', icon: 'shield-check', color: colors.primary },
  medical: { label: 'Kesehatan', icon: 'heartbeat', color: colors.danger },
  security: { label: 'Keamanan', icon: 'lock', color: colors.warning },
  general: { label: 'Umum', icon: 'info', color: colors.success },
};

function metaFor(category: string) {
  return categoryMeta[category] ?? { label: 'Lainnya', icon: 'phone' as IconName, color: colors.textMuted };
}

// Nomor siap `tel:` — sisakan digit dan tanda + di depan saja.
function telHref(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  return `tel:${cleaned}`;
}

function ContactRow({ contact, isLast }: { contact: EmergencyContact; isLast: boolean }) {
  const meta = metaFor(contact.category);
  return (
    <PressableScale
      scaleTo={0.98}
      onPress={() => Linking.openURL(telHref(contact.phone)).catch(() => {})}
      contentStyle={[styles.row, !isLast && styles.rowDivider]}>
      <View style={[styles.rowIcon, { backgroundColor: `${meta.color}1A` }]}>
        <Icon name={meta.icon} size={16} color={meta.color} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel} numberOfLines={1}>
          {contact.label}
        </Text>
        {contact.description ? (
          <Text style={styles.rowDesc} numberOfLines={1}>
            {contact.description}
          </Text>
        ) : null}
        <Text style={styles.rowPhone} numberOfLines={1}>
          {contact.phone}
        </Text>
      </View>
      <View style={styles.callChip}>
        <Icon name="phone" size={14} color={colors.primary} />
      </View>
    </PressableScale>
  );
}

export default function EmergencyContactsScreen(props: Props) {
  const { navigation } = props;

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setIsLoading(true);
    if (mode === 'refresh') setIsRefreshing(true);
    setErrorMessage(null);
    try {
      setContacts(await getEmergencyContactsApi());
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, 'Gagal memuat kontak darurat.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load('initial');
  }, [load]);

  const groups = useMemo(() => {
    const byCategory = new Map<string, EmergencyContact[]>();
    for (const contact of contacts) {
      const key = categoryMeta[contact.category] ? contact.category : 'other';
      const list = byCategory.get(key) ?? [];
      list.push(contact);
      byCategory.set(key, list);
    }
    const ordered: { key: string; label: string; items: EmergencyContact[] }[] = [];
    for (const key of CATEGORY_ORDER) {
      const items = byCategory.get(key);
      if (items?.length) ordered.push({ key, label: metaFor(key).label, items });
    }
    const other = byCategory.get('other');
    if (other?.length) ordered.push({ key: 'other', label: 'Lainnya', items: other });
    return ordered;
  }, [contacts]);

  return (
    <MainLayout
      title="Kontak Darurat"
      subtitle="Ketuk untuk menelepon"
      variant="canvas"
      onBack={() => navigation.goBack()}>
      {isLoading ? (
        <ActivityIndicator style={styles.centerState} color={colors.primary} />
      ) : errorMessage ? (
        <Text style={styles.centerState}>{errorMessage}</Text>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => load('refresh')}
              tintColor={colors.primary}
            />
          }>
          {groups.length === 0 ? (
            <EmptyState
              icon="phone"
              title="Belum ada kontak"
              message="Daftar kontak darurat belum tersedia untuk satuan Anda."
              style={styles.empty}
            />
          ) : (
            <MotiView
              from={{ opacity: 0, translateY: 12 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={contentEnterTransition}>
              {groups.map(group => (
                <View key={group.key} style={styles.group}>
                  <Text style={styles.groupTitle}>{group.label}</Text>
                  <Card style={styles.listCard}>
                    {group.items.map((contact, index) => (
                      <ContactRow
                        key={contact.id}
                        contact={contact}
                        isLast={index === group.items.length - 1}
                      />
                    ))}
                  </Card>
                </View>
              ))}
            </MotiView>
          )}
        </ScrollView>
      )}
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 96,
  },
  centerState: {
    marginTop: 32,
    paddingHorizontal: 24,
    textAlign: 'center',
    fontSize: 14,
    color: colors.textMuted,
  },
  empty: {
    marginTop: 64,
  },
  group: {
    marginBottom: 20,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.heading,
    marginBottom: 12,
  },
  listCard: {
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  rowIcon: {
    height: 36,
    width: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  rowDesc: {
    fontSize: 12,
    color: colors.textMuted,
  },
  rowPhone: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  callChip: {
    height: 34,
    width: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySurface,
  },
});
