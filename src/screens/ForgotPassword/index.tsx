import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import GradientButton from '@/components/atoms/GradientButton';
import Icon from '@/components/atoms/Icon';
import PressableScale from '@/components/atoms/PressableScale';
import AuthField from '@/components/molecules/AuthField';
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
        <Icon name="arrow-left" size={22} color={colors.heading} />
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
          <AuthField
            label="Email, Username, atau NRP"
            leftIcon="mail"
            placeholder="Masukkan email, username, atau NRP"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleRequestOtp}
            value={identifier}
            onChangeText={setIdentifier}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <GradientButton
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

          <AuthField
            label="Kode OTP"
            leftIcon="lock"
            placeholder="______"
            keyboardType="number-pad"
            maxLength={6}
            returnKeyType="next"
            inputStyle={styles.otpInput}
            value={otp}
            onChangeText={setOtp}
          />
          <AuthField
            label="Password Baru"
            leftIcon="lock"
            placeholder="Masukkan password baru"
            secureTextEntry
            autoCapitalize="none"
            returnKeyType="next"
            value={password}
            onChangeText={setPassword}
          />
          <AuthField
            label="Konfirmasi Password Baru"
            leftIcon="lock"
            placeholder="Ulangi password baru"
            secureTextEntry
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleResetPassword}
            value={passwordConfirmation}
            onChangeText={setPasswordConfirmation}
          />

          <PressableScale
            onPress={handleChangeIdentifier}
            disabled={isSubmitting}
            style={styles.resendLink}>
            <Text style={styles.link}>Ganti akun / kirim ulang kode</Text>
          </PressableScale>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <GradientButton
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
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  header: {
    marginBottom: 24,
    gap: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: colors.heading,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.textMuted,
  },
  form: {
    gap: 16,
  },
  resendLink: {
    alignSelf: 'flex-start',
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  otpInput: {
    fontSize: 18,
    letterSpacing: 8,
    color: colors.heading,
  },
  info: {
    fontSize: 13,
    color: colors.success,
  },
  error: {
    fontSize: 13,
    color: colors.danger,
  },
  submit: {
    marginTop: 4,
  },
});
