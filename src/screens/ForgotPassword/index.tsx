import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import TextField from '@/components/atoms/TextField';
import StatusModal from '@/components/organisms/StatusModal';
import AuthLayout from '@/components/templates/AuthLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { forgotPasswordApi, resetPasswordApi } from '@/services/api/auth.service';
import { colors } from '@/theme/colors';
import { extractErrorMessage } from '@/utils/format';

export type ForgotPasswordScreenProps = RootStackScreenProps<typeof ROUTES.forgotPassword>;

type Step = 'request' | 'reset';

export default function ForgotPasswordScreen(props: ForgotPasswordScreenProps) {
  const { navigation } = props;

  const [step, setStep] = useState<Step>('request');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleRequestOtp() {
    if (!identifier || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const message = await forgotPasswordApi({ login: identifier });
      setInfoMessage(message);
      setStep('reset');
    } catch (requestError) {
      setError(extractErrorMessage(requestError, 'Gagal mengirim kode OTP.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleChangeIdentifier() {
    setStep('request');
    setOtp('');
    setPassword('');
    setPasswordConfirmation('');
    setInfoMessage(null);
    setError(null);
  }

  async function handleResetPassword() {
    if (!identifier || !otp || !password || !passwordConfirmation || isSubmitting) return;
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
      const message = await resetPasswordApi({
        login: identifier,
        otp,
        password,
        password_confirmation: passwordConfirmation,
      });
      setSuccessMessage(message);
    } catch (resetError) {
      setError(extractErrorMessage(resetError, 'Gagal mereset password.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <PressableScale
        onPress={() => navigation.goBack()}
        hitSlop={12}
        contentStyle={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Kembali">
        <Icon name="arrow-left" size={22} color={colors.text} />
      </PressableScale>

      <View style={styles.header}>
        <Text style={styles.title}>Lupa Password</Text>
        <Text style={styles.subtitle}>
          {step === 'request'
            ? 'Masukkan email, username, atau NRP untuk menerima kode OTP reset password.'
            : 'Masukkan kode OTP yang dikirim ke email Anda dan buat password baru.'}
        </Text>
      </View>

      {step === 'request' ? (
        <View style={styles.form}>
          <TextField
            label="Email, Username, atau NRP"
            placeholder="Masukkan email, username, atau NRP"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleRequestOtp}
            value={identifier}
            onChangeText={setIdentifier}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label="Kirim Kode OTP"
            onPress={handleRequestOtp}
            loading={isSubmitting}
            disabled={!identifier}
            style={styles.submit}
          />
        </View>
      ) : (
        <View style={styles.form}>
          {infoMessage ? <Text style={styles.info}>{infoMessage}</Text> : null}

          <TextField
            label="Kode OTP"
            placeholder="Masukkan 6 digit kode OTP"
            keyboardType="number-pad"
            maxLength={6}
            returnKeyType="next"
            value={otp}
            onChangeText={setOtp}
          />
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
            onSubmitEditing={handleResetPassword}
            value={passwordConfirmation}
            onChangeText={setPasswordConfirmation}
          />

          <PressableScale onPress={handleChangeIdentifier} disabled={isSubmitting} style={styles.resendLink}>
            <Text style={styles.resendLinkLabel}>Ganti akun / kirim ulang kode</Text>
          </PressableScale>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label="Reset Password"
            onPress={handleResetPassword}
            loading={isSubmitting}
            disabled={!otp || !password || !passwordConfirmation}
            style={styles.submit}
          />
        </View>
      )}

      <StatusModal
        visible={successMessage !== null}
        variant="success"
        title="Password Berhasil Direset"
        message={successMessage ?? ''}
        primaryAction={{ label: 'Masuk', onPress: () => navigation.navigate(ROUTES.login) }}
        onRequestClose={() => {}}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -12,
    marginBottom: 12,
  },
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
  resendLink: {
    alignSelf: 'flex-start',
  },
  resendLinkLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  info: {
    fontSize: 13,
    color: colors.success,
  },
  error: {
    fontSize: 14,
    color: colors.danger,
  },
  submit: {
    marginTop: 8,
  },
});
