import { StyleSheet, Text, View } from 'react-native';

import BottomSheet from '@/components/organisms/BottomSheet';
import QuickActionButton from '@/screens/Home/QuickActionButton';
import type { QuickActionButtonProps } from '@/screens/Home/QuickActionButton';
import { colors } from '@/theme/colors';

export interface QuickActionSheetProps {
  visible: boolean;
  actions: QuickActionButtonProps[];
  onRequestClose: () => void;
}

const COLUMNS = 4;

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

export default function QuickActionSheet(props: QuickActionSheetProps) {
  const { visible, actions, onRequestClose } = props;
  const rows = chunk(actions, COLUMNS);

  return (
    <BottomSheet visible={visible} onRequestClose={onRequestClose}>
      <Text style={styles.title}>Semua Quick Action</Text>
      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map(action => (
              <QuickActionButton
                key={action.label}
                icon={action.icon}
                label={action.label}
                color={action.color}
                onPress={action.onPress}
                style={styles.cell}
              />
            ))}
            {row.length < COLUMNS
              ? Array.from({ length: COLUMNS - row.length }).map((_, spacerIndex) => (
                  <View key={`spacer-${spacerIndex}`} style={styles.cell} />
                ))
              : null}
          </View>
        ))}
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
  grid: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  cell: {
    flex: 1,
  },
});
