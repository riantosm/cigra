import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Button from '@/components/atoms/Button';
import PressableScale from '@/components/atoms/PressableScale';
import BottomSheet from '@/components/organisms/BottomSheet';
import { colors } from '@/theme/colors';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterField {
  key: string;
  label: string;
  options: FilterOption[];
}

export interface FilterSheetProps {
  visible: boolean;
  fields: FilterField[];
  value: Record<string, string>;
  onApply: (value: Record<string, string>) => void;
  onRequestClose: () => void;
}

// Bottom sheet filter generik: satu grup chip pilih-satu per `field`, tombol Reset + Terapkan.
// Dipakai CatalogList (filter status/gender/gol. darah) dan daftar Lokasi Personel (filter status).
export default function FilterSheet(props: FilterSheetProps) {
  const { visible, fields, value, onApply, onRequestClose } = props;
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  function toggleOption(fieldKey: string, optionValue: string) {
    setDraft(previous => {
      if (previous[fieldKey] === optionValue) {
        return Object.fromEntries(Object.entries(previous).filter(([key]) => key !== fieldKey));
      }
      return { ...previous, [fieldKey]: optionValue };
    });
  }

  function handleReset() {
    setDraft({});
  }

  function handleApply() {
    onApply(draft);
    onRequestClose();
  }

  return (
    <BottomSheet visible={visible} onRequestClose={onRequestClose}>
      <Text style={styles.title}>Filter</Text>

      {fields.map(field => (
        <View key={field.key} style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{field.label}</Text>
          <View style={styles.chipRow}>
            {field.options.map(option => {
              const isActive = draft[field.key] === option.value;
              return (
                <PressableScale
                  key={option.value}
                  onPress={() => toggleOption(field.key, option.value)}
                  contentStyle={[styles.chip, isActive && styles.chipActive]}>
                  <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>{option.label}</Text>
                </PressableScale>
              );
            })}
          </View>
        </View>
      ))}

      <View style={styles.actions}>
        <Button label="Reset" variant="secondary" onPress={handleReset} style={styles.actionButton} />
        <Button label="Terapkan" onPress={handleApply} style={styles.actionButton} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 20,
    gap: 10,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primarySurface,
    borderColor: colors.primary,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chipLabelActive: {
    color: colors.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
  },
});
