import { Modal, StyleSheet, Text, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { MotiView } from 'moti';

import Button from '@/components/atoms/Button';
import type { ButtonVariant } from '@/components/atoms/Button';
import { colors } from '@/theme/colors';
import { contentEnterTransition } from '@/utils/motion';

export type StatusModalVariant = 'success' | 'error';

export interface StatusModalAction {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
}

export interface StatusModalProps {
  visible: boolean;
  variant: StatusModalVariant;
  title: string;
  message: string;
  primaryAction: StatusModalAction;
  secondaryAction?: StatusModalAction;
  onRequestClose: () => void;
}

const badgeVariantStyle: Record<StatusModalVariant, ViewStyle> = {
  success: { backgroundColor: colors.primary },
  error: { backgroundColor: colors.danger },
};

const glyphColorByVariant: Record<StatusModalVariant, string> = {
  success: colors.primaryForeground,
  error: colors.dangerForeground,
};

const glyphByVariant: Record<StatusModalVariant, string> = {
  success: '✓',
  error: '!',
};

export default function StatusModal(props: StatusModalProps) {
  const { visible, variant, title, message, primaryAction, secondaryAction, onRequestClose } = props;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.backdrop}>
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={contentEnterTransition}
          style={styles.card}>
          <View style={[styles.badge, badgeVariantStyle[variant]]}>
            <Text style={[styles.glyph, { color: glyphColorByVariant[variant] }]}>
              {glyphByVariant[variant]}
            </Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            {secondaryAction ? (
              <Button
                label={secondaryAction.label}
                variant={secondaryAction.variant ?? 'secondary'}
                onPress={secondaryAction.onPress}
                style={styles.actionButton}
              />
            ) : null}
            <Button
              label={primaryAction.label}
              variant={primaryAction.variant ?? (variant === 'error' ? 'danger' : 'primary')}
              onPress={primaryAction.onPress}
              style={styles.actionButton}
            />
          </View>
        </MotiView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    height: 64,
    width: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  glyph: {
    fontSize: 28,
    fontWeight: '700',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    width: '100%',
  },
  actionButton: {
    flex: 1,
  },
});
