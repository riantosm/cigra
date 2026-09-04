import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { MotiView } from 'moti';

import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import StatusModal from '@/components/organisms/StatusModal';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import AcademyHero from '@/screens/Academy/shared/AcademyHero';
import TkdScaffold from '@/screens/Academy/tkd/TkdScaffold';
import { TKD_MODULES } from '@/screens/Academy/tkd/data';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';
import { contentEnterTransition } from '@/utils/motion';

export type TkdListScreenProps = RootStackScreenProps<typeof ROUTES.academyTkdList>;

const available = TKD_MODULES.filter(m => !m.locked).length;

export default function TkdListScreen(props: TkdListScreenProps) {
  const { navigation } = props;
  const [lockedName, setLockedName] = useState<string | null>(null);

  return (
    <TkdScaffold title="Tes Kompetensi Dasar (TKD)" onBack={() => navigation.goBack()}>
      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={contentEnterTransition}
        style={styles.stack}>
        <AcademyHero
          icon="bank"
          kicker={`${available} MODUL TERSEDIA`}
          title="Tes Kompetensi Dasar (TKD)"
          subtitle="Setiap modul berisi latihan soal TWK, TIU, dan TKP."
        />

        {TKD_MODULES.map((mod, i) => {
          const soalCount = mod.questions.length;
          const minutes = Math.round(mod.durationSeconds / 60);
          return (
            <PressableScale
              key={mod.id}
              scaleTo={0.98}
              contentStyle={styles.card}
              onPress={() =>
                mod.locked
                  ? setLockedName(mod.title)
                  : navigation.navigate(ROUTES.academyTkdModule, { moduleId: mod.id })
              }>
              <View style={styles.numBadge}>
                <Svg style={StyleSheet.absoluteFill}>
                  <Defs>
                    <LinearGradient id="tkdModNum" x1="0" y1="0" x2="1" y2="1">
                      <Stop offset="0" stopColor={colors.academyAkademikStart} />
                      <Stop offset="1" stopColor={colors.academyAkademikEnd} />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" rx={14} fill="url(#tkdModNum)" />
                </Svg>
                <Text style={styles.numText}>{i + 1}</Text>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{mod.title}</Text>
                <Text style={styles.cardSub}>{mod.fullTitle}</Text>
                {mod.locked ? (
                  <View style={styles.metaRow}>
                    <Icon name="lock" size={13} color={colors.placeholder} />
                    <Text style={styles.metaLocked}>Belum tersedia</Text>
                  </View>
                ) : (
                  <View style={styles.metaRow}>
                    <Icon name="clock" size={13} color={colors.academyAkademikEnd} />
                    <Text style={[styles.meta, { color: colors.academyAkademikEnd }]}>
                      {minutes} menit
                    </Text>
                    <Icon name="file" size={13} color={colors.primary} />
                    <Text style={[styles.meta, { color: colors.primary }]}>{soalCount} soal</Text>
                  </View>
                )}
              </View>

              <Icon
                name="arrow-right"
                size={20}
                color={mod.locked ? colors.placeholder : colors.academyAkademikEnd}
              />
            </PressableScale>
          );
        })}
      </MotiView>

      <StatusModal
        visible={lockedName !== null}
        variant="success"
        icon="clock"
        title="Segera Hadir"
        message={`${lockedName ?? 'Modul ini'} sedang kami siapkan dan akan tersedia dalam waktu dekat.`}
        primaryAction={{ label: 'Mengerti', onPress: () => setLockedName(null) }}
        onRequestClose={() => setLockedName(null)}
      />
    </TkdScaffold>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...cardShadow,
  },
  numBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  numText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryForeground,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.heading,
  },
  cardSub: {
    fontSize: 12,
    color: colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  meta: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 8,
  },
  metaLocked: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.placeholder,
  },
});
