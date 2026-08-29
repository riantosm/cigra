import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Button from '@/components/atoms/Button';
import PressableScale from '@/components/atoms/PressableScale';
import TextField from '@/components/atoms/TextField';
import AuthLayout from '@/components/templates/AuthLayout';
import { useDoubleBackToExit } from '@/hooks/useDoubleBackToExit';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { changePasswordApi } from '@/services/api/auth.service';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout, logoutLocal, passwordChanged } from '@/store/slices/authSlice';
import { colors } from '@/theme/colors';
import { extractErrorMessage } from '@/utils/format';

export type ChangePasswordScreenProps = RootStackScreenProps<typeof ROUTES.changePassword>;

export default function ChangePasswordScreen(props: ChangePasswordScreenProps) {
  const { navigation } = props;
  const dispatch = useAppDispatch();
  const resetToken = useAppSelector(state => state.auth.resetToken);
  useDoubleBackToExit();

  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usesResetToken = Boolean(resetToken);

  async function handleSubmit() {
    if (!password || !passwordConfirmation || isSubmitting) return;
    if (!usesResetToken && !currentPassword) return;
    if (password.length < 8) {
      setError('Password baru minimal 8 karakter.');
      return;
    }
    if (password !== passwordConfirmation) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await changePasswordApi({
        current_password: usesResetToken ? undefined : currentPassword,
        reset_token: usesResetToken ? (resetToken ?? undefined) : undefined,
        password,
        password_confirmation: passwordConfirmation,
      });
      dispatch(passwordChanged());
      navigation.replace(ROUTES.main);
    } catch (submitError) {
      setError(extractErrorMessage(submitError, 'Gagal mengubah password.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLogout() {
    // Jalan pintu keluar buat user yang tidak punya current_password/reset_token yang valid —
    // sama seperti pola logout di Settings: keluar dari UI langsung, API + cleanup di background.
    dispatch(logoutLocal());
    dispatch(logout());
  }

  const canSubmit = usesResetToken
    ? Boolean(password && passwordConfirmation)
    : Boolean(currentPassword && password && passwordConfirmation);

  return (
    <AuthLayout>
      <View style={styles.header}>
        <Text style={styles.title}>Ganti Password</Text>
        <Text style={styles.subtitle}>
          Anda harus mengganti password sebelum dapat melanjutkan menggunakan aplikasi.
        </Text>
      </View>

      <View style={styles.form}>
        {usesResetToken ? null : (
          <TextField
            label="Password Saat Ini"
            placeholder="Masukkan password saat ini"
            secureTextEntry
            autoCapitalize="none"
            returnKeyType="next"
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />
        )}
        <TextField
          label="Password Baru"
          placeholder="Masukkan password baru"
          secureTextEntry
          autoCapitalize="none"
          returnKeyType="next"
          value={password}
          onChangeText={setPassword}
        />
        <TextField
          label="Konfirmasi Password Baru"
          placeholder="Ulangi password baru"
          secureTextEntry
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          value={passwordConfirmation}
          onChangeText={setPasswordConfirmation}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label="Simpan Password Baru"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={!canSubmit}
          style={styles.submit}
        />

        <PressableScale style={styles.logoutLink} onPress={handleLogout} disabled={isSubmitting}>
          <Text style={styles.logoutLinkLabel}>Logout</Text>
        </PressableScale>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
    gap: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
  },
  form: {
    gap: 16,
  },
  error: {
    fontSize: 14,
    color: colors.danger,
  },
  submit: {
    marginTop: 8,
  },
  logoutLink: {
    alignSelf: 'center',
    marginTop: 8,
  },
  logoutLinkLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
