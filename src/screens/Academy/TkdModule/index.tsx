import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';

import Icon from '@/components/atoms/Icon';
import type { IconName } from '@/components/atoms/Icon';
import GradientButton from '@/components/atoms/GradientButton';
import GradientIconBadge from '@/components/molecules/GradientIconBadge';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import TkdScaffold from '@/screens/Academy/tkd/TkdScaffold';
import { getTkdModule, TKD_SUBTESTS, subtestsInOrder } from '@/screens/Academy/tkd/data';
import { colors } from '@/theme/colors';
import { cardShadow } from '@/theme/shadows';
import { contentEnterTransition } from '@/utils/motion';

export type TkdModuleScreenProps = RootStackScreenProps<typeof ROUTES.academyTkdModule>;

function InfoCard(props: {
  icon: IconName;
  title: string;
  tone?: 'plain' | 'purple' | 'amber';
  children: ReactNode;
}) {
  const { icon, title, tone = 'plain', children } = props;
  const toneStyle =
    tone === 'purple'
      ? { backgroundColor: colors.academyInfoSurface, borderColor: colors.academyInfoBorder, accent: colors.academyInfoText }
      : tone === 'amber'
        ? { backgroundColor: colors.academyWarnSurface, borderColor: colors.academyWarnBorder, accent: colors.warningText }
        : { backgroundColor: colors.surface, borderColor: colors.borderSoft, accent: colors.primary };
  return (
    <View
      style={[
        styles.infoCard,
        { backgroundColor: toneStyle.backgroundColor, borderColor: toneStyle.borderColor },
      ]}>
      <View style={styles.infoHead}>
        <Icon name={icon} size={16} color={toneStyle.accent} />
        <Text style={[styles.infoHeadText, { color: toneStyle.accent }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function TkdModuleScreen(props: TkdModuleScreenProps) {
  const { navigation, route } = props;
  const module = getTkdModule(route.params.moduleId);

  if (!module) {
    return (
      <TkdScaffold title="TKD" onBack={() => navigation.goBack()}>
        <Text style={styles.body}>Modul tidak ditemukan.</Text>
      </TkdScaffold>
    );
  }

  const minutes = Math.round(module.durationSeconds / 60);
  const counts = subtestsInOrder(module).map(s => ({
    cfg: TKD_SUBTESTS[s],
    n: module.questions.filter(q => q.subtest === s).length,
  }));

  return (
    <TkdScaffold
      title={module.fullTitle}
      onBack={() => navigation.goBack()}
      footer={
        <GradientButton
          tone="akademik"
          icon="play"
          label="Mulai Tryout Sekarang"
          onPress={() =>
            navigation.navigate(ROUTES.academyTkdExam, { moduleId: module.id })
          }
        />
      }>
      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={contentEnterTransition}
        style={styles.stack}>
        <View style={styles.headBlock}>
          <GradientIconBadge
            icon="play"
            gradientStart={colors.gradientFamilyStart}
            gradientEnd={colors.gradientWeaponStart}
            size={58}
          />
          <Text style={styles.moduleTitle}>{module.fullTitle}</Text>
          <View style={styles.chip}>
            <Text style={styles.chipText}>KATEGORI · {module.category.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>DURASI</Text>
            <Text style={styles.statValue}>{minutes} mnt</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>SOAL</Text>
            <Text style={styles.statValue}>{module.questions.length}</Text>
          </View>
        </View>

        <Text style={styles.lead}>
          {module.fullTitle} — {module.questions.length} soal (
          {counts.map(c => `${c.cfg.subtest} ${c.n}`).join(', ')}).
        </Text>

        <InfoCard icon="file" title="Pengantar & Petunjuk Tes" tone="purple">
          <Text style={styles.infoBody}>
            Modul ini berisi {module.questions.length} soal dengan durasi {minutes} menit:
          </Text>
          <View style={styles.bullets}>
            {counts.map(c => (
              <Text key={c.cfg.subtest} style={styles.infoBody}>
                • {c.n} soal {c.cfg.subtest} ({c.cfg.description}) — ambang {c.cfg.threshold}
              </Text>
            ))}
          </View>
          <Text style={[styles.infoBody, styles.infoBodyGap]}>
            Kerjakan dengan tenang. Skor per subkategori dihitung sesuai standar SKD (benar = 5,
            TKP = nilai 1–5 per opsi).
          </Text>
        </InfoCard>

        <InfoCard icon="layers" title="Paket Tryout Berisi">
          <View style={styles.packRow}>
            <View style={styles.packIcon}>
              <Icon name="file" size={20} color={colors.primary} />
            </View>
            <View style={styles.packBody}>
              <Text style={styles.packTitle}>1 Bank soal Akademik</Text>
              <Text style={styles.packSub}>{module.fullTitle}</Text>
            </View>
            <Text style={styles.packMeta}>{module.questions.length} soal</Text>
          </View>
        </InfoCard>

        <InfoCard icon="shield-check" title="Aturan Integritas" tone="amber">
          <Text style={styles.infoBodyMuted}>
            • Berpindah tab/aplikasi lain selama tes tidak disarankan.{'\n'}• Timer berjalan terus —
            jawaban tersimpan otomatis tiap kali kamu memilih opsi.{'\n'}• Setelah dikumpulkan,
            jawaban tidak dapat diubah.
          </Text>
        </InfoCard>
      </MotiView>
    </TkdScaffold>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 14,
  },
  body: {
    fontSize: 14,
    color: colors.textMuted,
  },
  headBlock: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 4,
  },
  moduleTitle: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: colors.heading,
  },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.chipSurface,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.textMuted,
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    alignItems: 'center',
    ...cardShadow,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.placeholder,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.heading,
    marginTop: 3,
  },
  lead: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  infoCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  infoHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  infoHeadText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  infoBody: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textBody,
  },
  infoBodyMuted: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
  infoBodyGap: {
    marginTop: 6,
  },
  bullets: {
    marginTop: 6,
    gap: 2,
  },
  packRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  packIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.chipSurface,
  },
  packBody: {
    flex: 1,
    minWidth: 0,
  },
  packTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.heading,
  },
  packSub: {
    fontSize: 12,
    color: colors.textMuted,
  },
  packMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
});
