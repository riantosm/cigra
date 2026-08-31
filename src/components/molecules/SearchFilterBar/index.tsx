import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import TextField from '@/components/atoms/TextField';
import { colors } from '@/theme/colors';
import { smallButtonShadow } from '@/theme/shadows';

export interface SearchFilterBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  onClear?: () => void;
  onSubmitEditing?: () => void;
  /** Omit to hide the filter button entirely. */
  onFilterPress?: () => void;
  /** Number of active filters — shows a badge on the filter button when > 0. */
  activeFilterCount?: number;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Baris "search + tombol filter" canvas (DESIGN_SYSTEM.md §5.9) — dipakai CatalogList &
// PersonnelTracking. Field putih tanpa border + shadow lembut; tombol filter kotak putih
// (bukan latar biru).
export default function SearchFilterBar(props: SearchFilterBarProps) {
  const {
    value,
    onChangeText,
    placeholder,
    onClear,
    onSubmitEditing,
    onFilterPress,
    activeFilterCount = 0,
    autoFocus,
    style,
  } = props;

  return (
    <View style={[styles.row, style]}>
      <TextField
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        placeholder={placeholder}
        returnKeyType="search"
        leftIcon="search"
        autoFocus={autoFocus}
        onClear={onClear}
        containerStyle={styles.field}
        style={styles.input}
      />
      {onFilterPress ? (
        <PressableScale
          onPress={onFilterPress}
          contentStyle={styles.filterButton}
          accessibilityRole="button"
          accessibilityLabel="Filter">
          <Icon name="filter" size={20} color={colors.primary} />
          {activeFilterCount > 0 ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeLabel}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  field: {
    flex: 1,
  },
  input: {
    height: 56,
    borderRadius: 16,
    borderColor: 'transparent',
    paddingVertical: 0,
    fontSize: 15,
    ...smallButtonShadow,
  },
  filterButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...smallButtonShadow,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  filterBadgeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
});
