import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import { colors } from '@/theme/colors';

export interface DateTimeFieldProps {
  label: string;
  mode: 'date' | 'time';
  value: Date;
  onChange: (next: Date) => void;
  maximumDate?: Date;
  minimumDate?: Date;
  containerStyle?: StyleProp<ViewStyle>;
}

function formatValue(value: Date, mode: 'date' | 'time'): string {
  if (mode === 'time') {
    return value.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }
  return value.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

// Field tanggal/waktu dengan native date/time picker (@react-native-community/datetimepicker).
// Di Android picker tampil sebagai dialog; di iOS sebagai spinner inline yang muncul di bawah field.
export default function DateTimeField(props: DateTimeFieldProps) {
  const { label, mode, value, onChange, maximumDate, minimumDate, containerStyle } = props;
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  function handleChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setIsPickerVisible(false);
    if (event.type === 'set' && selected) onChange(selected);
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <PressableScale
        scaleTo={0.98}
        onPress={() => setIsPickerVisible(visible => !visible)}
        contentStyle={styles.field}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatValue(value, mode)}`}>
        <Text style={styles.value}>{formatValue(value, mode)}</Text>
        <Icon name={mode === 'time' ? 'clock' : 'calendar'} size={18} color={colors.textMuted} />
      </PressableScale>
      {isPickerVisible ? (
        <DateTimePicker
          value={value}
          mode={mode}
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  value: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
});
