import { useRef } from 'react';
import type { ComponentRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors } from '@/theme/colors';

export interface TrendBarItem {
  key: string;
  label: string;
  value: number;
  valueLabel: string;
  sublabel?: string;
}

export interface TrendBarChartProps {
  items: TrendBarItem[];
  // Tinggi area batang (tanpa label). Default 112.
  barAreaHeight?: number;
  style?: StyleProp<ViewStyle>;
}

const COLUMN_WIDTH = 72;
const BAR_WIDTH = 40;

// Grafik batang vertikal sederhana (tanpa lib chart) untuk deret per periode. Batang TERAKHIR =
// periode terbaru, disorot `primary` + label tebal; sisanya `primarySurface`. Lebih dari muat layar
// → scroll horizontal (dibuka di ujung kanan, periode terbaru).
export default function TrendBarChart(props: TrendBarChartProps) {
  const { items, barAreaHeight = 112, style } = props;
  const max = Math.max(...items.map(item => item.value), 0);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={styles.content}
      ref={scrollRef}
      onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
      <View>
        <View style={[styles.barsRow, { height: barAreaHeight + 24 }]}>
          {items.map((item, index) => {
            const isLatest = index === items.length - 1;
            const height = max > 0 ? Math.max(6, (item.value / max) * barAreaHeight) : 6;
            return (
              <View key={item.key} style={styles.column}>
                <Text
                  style={[styles.valueLabel, isLatest && styles.valueLabelLatest]}
                  numberOfLines={1}
                  adjustsFontSizeToFit>
                  {item.valueLabel}
                </Text>
                <View style={[styles.bar, { height }, isLatest ? styles.barLatest : styles.barPast]} />
              </View>
            );
          })}
        </View>
        <View style={styles.labelsRow}>
          {items.map((item, index) => {
            const isLatest = index === items.length - 1;
            return (
              <View key={item.key} style={styles.labelCell}>
                <Text style={[styles.periodLabel, isLatest && styles.periodLabelLatest]} numberOfLines={1}>
                  {item.label}
                </Text>
                {item.sublabel ? (
                  <Text style={styles.sublabel} numberOfLines={1}>
                    {item.sublabel}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 2,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  column: {
    width: COLUMN_WIDTH,
    alignItems: 'center',
    gap: 6,
  },
  valueLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  valueLabelLatest: {
    fontWeight: '700',
    color: colors.primary,
  },
  bar: {
    width: BAR_WIDTH,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  barPast: {
    backgroundColor: colors.primarySurface,
  },
  barLatest: {
    backgroundColor: colors.primary,
  },
  labelsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 8,
  },
  labelCell: {
    width: COLUMN_WIDTH,
    alignItems: 'center',
    gap: 1,
  },
  periodLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  periodLabelLatest: {
    fontWeight: '700',
    color: colors.heading,
  },
  sublabel: {
    fontSize: 10,
    color: colors.placeholder,
  },
});
