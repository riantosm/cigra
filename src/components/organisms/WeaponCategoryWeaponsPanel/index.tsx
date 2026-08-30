import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Badge from '@/components/atoms/Badge';
import type { BadgeVariant } from '@/components/atoms/Badge';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import TextField from '@/components/atoms/TextField';
import Card from '@/components/molecules/Card';
import { ROUTES } from '@/navigation/paths';
import type { RootStackParamList } from '@/navigation/types';
import { getWeaponCategoryDetailApi } from '@/services/api/catalog.service';
import { colors } from '@/theme/colors';
import type {
  PaginationMeta,
  WeaponCategoryWeaponEntry,
  WeaponCategoryWeaponHolder,
} from '@/types';
import {
  extractErrorMessage,
  formatDateShort,
  formatRelativeTime,
  joinFields,
  orDash,
  titleCase,
} from '@/utils/format';

export interface WeaponCategoryWeaponsPanelProps {
  categoryId: string;
  // Halaman pertama senjata + meta-nya, sudah ikut di response detail yang di-fetch CatalogDetail —
  // dipakai sebagai state awal supaya panel tidak perlu request ulang saat pertama render.
  initialWeapons: WeaponCategoryWeaponEntry[];
  initialMeta?: PaginationMeta;
}

const SEARCH_DEBOUNCE_MS = 1000;

function conditionVariant(status: string): BadgeVariant {
  return status === 'good' ? 'success' : 'neutral';
}

function inventoryVariant(status: string): BadgeVariant {
  return status === 'available' ? 'success' : 'primary';
}

function holderLabel(holder: WeaponCategoryWeaponHolder): string {
  if (holder.holder_type === 'personnel') {
    return joinFields(holder.rank, holder.full_name) || orDash(holder.service_number);
  }
  return orDash(holder.name);
}

function holderMeta(holder: WeaponCategoryWeaponHolder): string {
  const rel = formatRelativeTime(holder.assigned_at);
  if (holder.holder_type === 'personnel') {
    return joinFields(holder.service_number, holder.unit, rel ? `sejak ${rel}` : null);
  }
  return joinFields(titleCase(holder.type), rel ? `sejak ${rel}` : null);
}

function WeaponRow({ entry, onPress }: { entry: WeaponCategoryWeaponEntry; onPress?: () => void }) {
  const holder = entry.holder_info;

  const body = (
    <Card style={styles.card}>
      <View style={styles.cardBody}>
        <View style={styles.mainCol}>
          <Text style={styles.weaponNumber}>{entry.weapon_number}</Text>

          <View style={styles.metaRow}>
            <Icon name="id-card" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>
              {joinFields(
                `Seri ${orDash(entry.serial_number)}`,
                entry.butt_number ? `Popor ${entry.butt_number}` : null,
                titleCase(entry.ownership_type),
              )}
            </Text>
          </View>

          {entry.acquisition_date ? (
            <View style={styles.metaRow}>
              <Icon name="calendar" size={14} color={colors.textMuted} />
              <Text style={styles.metaText}>Pengadaan {formatDateShort(entry.acquisition_date)}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.badges}>
          <Badge
            label={orDash(titleCase(entry.condition_status))}
            variant={conditionVariant(entry.condition_status)}
          />
          <Badge
            label={orDash(titleCase(entry.inventory_status))}
            variant={inventoryVariant(entry.inventory_status)}
          />
        </View>
      </View>

      <View style={[styles.metaRow, styles.holderRow]}>
        <Icon
          name={holder?.holder_type === 'other' ? 'building' : 'profile'}
          size={14}
          color={holder ? colors.primary : colors.textMuted}
        />
        {holder ? (
          <View style={styles.holderText}>
            <Text style={styles.holderName}>{holderLabel(holder)}</Text>
            {holderMeta(holder) ? <Text style={styles.metaText}>{holderMeta(holder)}</Text> : null}
          </View>
        ) : (
          <Text style={styles.metaText}>Belum ada pemegang</Text>
        )}
        {onPress ? (
          <Icon name="chevron-right" size={16} color={colors.textMuted} />
        ) : null}
      </View>
    </Card>
  );

  if (!onPress) return body;

  return (
    <PressableScale scaleTo={0.98} onPress={onPress}>
      {body}
    </PressableScale>
  );
}

// Daftar senjata di dalam detail kategori: paginasi 50/halaman ("Muat lebih banyak") + pencarian
// server-side (`?search=` di GET /catalog/weapon-categories/{id}) atas nomor/seri senjata.
export default function WeaponCategoryWeaponsPanel(props: WeaponCategoryWeaponsPanelProps) {
  const { categoryId, initialWeapons, initialMeta } = props;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Baris senjata bisa ditekan kalau pemegangnya perorangan → buka detail personel-nya
  // (pakai NRP, konsisten dengan navigasi katalog personnel lain). Pemegang satuan/gudang atau
  // yang belum dipegang siapa pun → baris tidak bisa ditekan.
  const holderNavigation = useCallback(
    (entry: WeaponCategoryWeaponEntry) => {
      const holder = entry.holder_info;
      if (holder?.holder_type !== 'personnel' || !holder.service_number) return undefined;
      const serviceNumber = holder.service_number;
      return () =>
        navigation.push(ROUTES.catalogDetail, { resource: 'personnel', id: serviceNumber });
    },
    [navigation],
  );

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [weapons, setWeapons] = useState<WeaponCategoryWeaponEntry[]>(initialWeapons);
  const [meta, setMeta] = useState<PaginationMeta | undefined>(initialMeta);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const didSearchRef = useRef(false);

  const loadPage = useCallback(
    async (targetPage: number, mode: 'reload' | 'more') => {
      if (mode === 'reload') setIsLoading(true);
      else setIsLoadingMore(true);
      setErrorMessage(null);
      try {
        const result = await getWeaponCategoryDetailApi(categoryId, {
          search: search || undefined,
          page: targetPage,
        });
        setWeapons(previous =>
          mode === 'more' ? [...previous, ...result.weapons] : result.weapons,
        );
        setMeta(result.weapons_meta);
      } catch (error) {
        setErrorMessage(extractErrorMessage(error, 'Gagal memuat daftar senjata.'));
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [categoryId, search],
  );

  // Debounce input → `search`. Skip render pertama (data awal sudah ada dari props).
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === search) return;
    setIsLoading(true);
    const timer = setTimeout(() => setSearch(trimmed), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput, search]);

  useEffect(() => {
    if (!didSearchRef.current) {
      didSearchRef.current = true;
      return;
    }
    loadPage(1, 'reload');
  }, [search, loadPage]);

  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;
  const total = meta?.total ?? weapons.length;
  const hasMore = currentPage < lastPage;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="weapon" size={18} color={colors.primary} />
        <Text style={styles.title}>Daftar Senjata</Text>
        <Text style={styles.count}>{total}</Text>
      </View>

      <TextField
        value={searchInput}
        onChangeText={setSearchInput}
        onSubmitEditing={() => setSearch(searchInput.trim())}
        placeholder="Cari nomor atau seri senjata..."
        returnKeyType="search"
        leftIcon="search"
        onClear={() => {
          setSearchInput('');
          setSearch('');
        }}
        containerStyle={styles.searchField}
      />

      {isLoading ? (
        <ActivityIndicator style={styles.centerState} color={colors.primary} />
      ) : errorMessage ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <PressableScale onPress={() => loadPage(1, 'reload')} contentStyle={styles.retryButton}>
            <Icon name="refresh" size={15} color={colors.primary} />
            <Text style={styles.retryLabel}>Coba lagi</Text>
          </PressableScale>
        </View>
      ) : weapons.length === 0 ? (
        <Text style={styles.empty}>
          {search ? `Tidak ada senjata cocok "${search}".` : 'Belum ada senjata terdaftar.'}
        </Text>
      ) : (
        <View style={styles.list}>
          {weapons.map(entry => (
            <WeaponRow key={entry.id} entry={entry} onPress={holderNavigation(entry)} />
          ))}
          {hasMore ? (
            <PressableScale
              onPress={() => loadPage(currentPage + 1, 'more')}
              disabled={isLoadingMore}
              contentStyle={styles.loadMoreButton}
            >
              {isLoadingMore ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Icon name="chevron-down" size={16} color={colors.primary} />
                  <Text style={styles.loadMoreLabel}>Muat lebih banyak</Text>
                </>
              )}
            </PressableScale>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  count: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    backgroundColor: colors.neutralSurface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  searchField: {
    marginBottom: 12,
  },
  centerState: {
    marginTop: 24,
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.primarySurface,
  },
  retryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  empty: {
    fontSize: 13,
    color: colors.textMuted,
    paddingVertical: 8,
  },
  list: {
    gap: 12,
  },
  card: {
    gap: 8,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  mainCol: {
    flex: 1,
    gap: 6,
  },
  weaponNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  badges: {
    alignItems: 'flex-end',
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  holderRow: {
    alignItems: 'flex-start',
    marginTop: 2,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  holderText: {
    flex: 1,
    gap: 2,
  },
  holderName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  metaText: {
    flexShrink: 1,
    fontSize: 13,
    color: colors.textMuted,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primarySurface,
  },
  loadMoreLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
});
