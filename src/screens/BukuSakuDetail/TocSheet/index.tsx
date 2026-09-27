import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';

import PressableScale from '@/components/atoms/PressableScale';
import BottomSheet from '@/components/organisms/BottomSheet';
import { colors } from '@/theme/colors';
import type { HandbookArticleRef } from '@/types';
import { HANDBOOK_PAGE_META, handbookPageKind } from '@/utils/handbook';

export interface TocSheetProps {
  visible: boolean;
  chapterTitle: string;
  pages: HandbookArticleRef[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onRequestClose: () => void;
}

const LIST_MAX_HEIGHT = Dimensions.get('window').height * 0.6;

// Sheet "Daftar Materi" — daftar isi bab yang sedang dibaca; ketuk baris untuk lompat halaman.
export default function TocSheet(props: TocSheetProps) {
  const { visible, chapterTitle, pages, currentIndex, onSelect, onRequestClose } = props;

  return (
    <BottomSheet visible={visible} onRequestClose={onRequestClose}>
      <Text style={styles.title}>Daftar Materi</Text>
      <Text style={styles.subtitle}>
        {chapterTitle} · {pages.length} halaman
      </Text>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {pages.map((page, index) => {
          const isCurrent = index === currentIndex;
          return (
            <PressableScale
              key={page.id}
              scaleTo={0.98}
              contentStyle={[styles.row, isCurrent && styles.rowCurrent]}
              onPress={() => onSelect(index)}
              accessibilityRole="button"
              accessibilityState={{ selected: isCurrent }}
              accessibilityLabel={`Halaman ${index + 1}, ${page.title}`}>
              <View style={[styles.number, isCurrent && styles.numberCurrent]}>
                <Text style={[styles.numberText, isCurrent && styles.numberTextCurrent]}>
                  {index + 1}
                </Text>
              </View>
              <View style={styles.rowBody}>
                <Text style={[styles.rowTitle, isCurrent && styles.rowTitleCurrent]} numberOfLines={1}>
                  {page.title}
                </Text>
                <Text style={styles.rowMeta}>{HANDBOOK_PAGE_META[handbookPageKind(page)]}</Text>
              </View>
              {isCurrent ? <Text style={styles.currentLabel}>Dibaca</Text> : null}
            </PressableScale>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.heading,
  },
  subtitle: {
    marginTop: 2,
    marginBottom: 14,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  list: {
    maxHeight: LIST_MAX_HEIGHT,
  },
  listContent: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowCurrent: {
    borderColor: colors.notifUnreadBorder,
    backgroundColor: colors.notifUnreadSurface,
  },
  number: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.chipSurface,
  },
  numberCurrent: {
    backgroundColor: colors.primary,
  },
  numberText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  numberTextCurrent: {
    color: colors.primaryForeground,
  },
  rowBody: {
    flex: 1,
    gap: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.heading,
  },
  rowTitleCurrent: {
    fontWeight: '700',
  },
  rowMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  currentLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
});
