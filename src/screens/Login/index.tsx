import { useEffect, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { logo } from '@/assets';
import GradientButton from '@/components/atoms/GradientButton';
import PressableScale from '@/components/atoms/PressableScale';
import AuthField from '@/components/molecules/AuthField';
import AuthToggle from '@/components/molecules/AuthToggle';
import AuthLayout from '@/components/templates/AuthLayout';
import { useDoubleBackToExit } from '@/hooks/useDoubleBackToExit';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { requestLoginOtpApi } from '@/services/api/auth.service';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearAuthError, login, loginWithOtp } from '@/store/slices/authSlice';
import { colors } from '@/theme/colors';
import { extractErrorMessage } from '@/utils/format';
import { getOtpResendCount, OTP_RESEND_DAILY_LIMIT, recordOtpResend } from '@/utils/otpResendLimiter';
import { appVersion } from '@/utils/version';

export type LoginScreenProps = RootStackScreenProps<typeof ROUTES.login>;

type LoginMode = 'password' | 'otp';
type OtpStep = 'request' | 'verify';

const OTP_RESEND_COOLDOWN_SECONDS = 60;

const MODE_OPTIONS: { value: LoginMode; label: string; icon: 'lock' | 'shield-check' }[] = [
  { value: 'password', label: 'Password', icon: 'lock' },
  { value: 'otp', label: 'Kode OTP', icon: 'shield-check' },
];

export default function LoginScreen(props: LoginScreenProps) {
  const { navigation } = props;
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(state => state.auth.isLoading);
  const error = useAppSelector(state => state.auth.error);
  useDoubleBackToExit();

  const [mode, setMode] = useState<LoginMode>('password');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  const [otpStep, setOtpStep] = useState<OtpStep>('request');
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpInfo, setOtpInfo] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const otpRef = useRef<ComponentRef<typeof TextInput>>(null);
  const scrollViewRef = useRef<ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(seconds => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Preload today's device-wide resend count so the "(N/3)" quota + disabled state are correct
  // immediately, even before the first "kirim ulang".
  useEffect(() => {
    getOtpResendCount().then(setResendCount);
  }, []);

  function switchMode(nextMode: LoginMode) {
    if (nextMode === mode) return;
    setMode(nextMode);
    dispatch(clearAuthError());
    setOtpError(null);
    // OTP progress (step / code / sent-info / cooldown) is intentionally kept when toggling tabs —
    // switching to Password and back must not throw away an already-requested code.
  }

  function handlePasswordSubmit() {
    if (!identifier || !password || isLoading) return;
    dispatch(clearAuthError());
    dispatch(login({ login: identifier, password }));
  }

  async function handleSendOtp(isResend: boolean) {
    if (!identifier || isSendingOtp) return;
    if (isResend && (resendCooldown > 0 || resendCount >= OTP_RESEND_DAILY_LIMIT)) return;
    setOtpError(null);
    setIsSendingOtp(true);
    try {
      const message = await requestLoginOtpApi({ login: identifier });
      setOtpInfo(message);
      setOtpStep('verify');
      setResendCooldown(OTP_RESEND_COOLDOWN_SECONDS);
      if (isResend) {
        setResendCount(await recordOtpResend());
      } else {
        setResendCount(await getOtpResendCount());
      }
      requestAnimationFrame(() => otpRef.current?.focus());
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 250);
    } catch (requestError) {
      setOtpError(extractErrorMessage(requestError, 'Gagal mengirim kode OTP.'));
    } finally {
      setIsSendingOtp(false);
    }
  }

  function handleChangeIdentifier() {
    setOtpStep('request');
    setOtpCode('');
    setOtpInfo(null);
    setOtpError(null);
    setResendCooldown(0);
    // Daily resend cap is device-wide, so it survives an account switch — re-read, don't zero it.
    getOtpResendCount().then(setResendCount);
  }

  const resendRemaining = Math.max(OTP_RESEND_DAILY_LIMIT - resendCount, 0);
  const resendLimitReached = resendRemaining <= 0;
  const resendDisabled = isSendingOtp || resendCooldown > 0 || resendLimitReached;
  const resendQuota = `(${resendRemaining}/${OTP_RESEND_DAILY_LIMIT})`;
  const resendLabel = resendLimitReached
    ? `Batas harian tercapai ${resendQuota}`
    : isSendingOtp
      ? 'Mengirim...'
      : resendCooldown > 0
        ? `Kirim ulang (${resendCooldown}s)`
        : `Kirim ulang kode ${resendQuota}`;

  function handleVerifyOtp() {
    if (!identifier || !otpCode || isLoading) return;
    setOtpError(null);
    dispatch(clearAuthError());
    dispatch(loginWithOtp({ login: identifier, otp: otpCode }));
  }

  const otpErrorMessage = otpError ?? (mode === 'otp' ? error : null);

  return (
    <AuthLayout
      ref={scrollViewRef}
      showMountains
      footer={<Text style={styles.version}>v{appVersion}</Text>}>
      <View style={styles.brand}>
        <Image source={logo.LogoIcon} style={styles.logoImage} resizeMode="contain" />
        <Text style={styles.title}>Selamat Datang!</Text>
        <Text style={styles.subtitle}>
          Masuk untuk melanjutkan ke <Text style={styles.subtitleAccent}>Smart Battalion</Text>
        </Text>
      </View>

      <AuthToggle options={MODE_OPTIONS} value={mode} onChange={switchMode} />

      {mode === 'password' ? (
        <View style={styles.form}>
          <AuthField
            label="Email, Username, atau NRP"
            leftIcon="mail"
            placeholder="Masukkan email, username, atau NRP"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => passwordRef.current?.focus()}
            value={identifier}
            onChangeText={setIdentifier}
          />
          <AuthField
            ref={passwordRef}
            label="Password"
            leftIcon="lock"
            placeholder="Masukkan password"
            secureTextEntry
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handlePasswordSubmit}
            value={password}
            onChangeText={setPassword}
          />

          <PressableScale
            style={styles.forgotLink}
            onPress={() => navigation.navigate(ROUTES.forgotPassword)}>
            <Text style={styles.link}>Lupa password?</Text>
          </PressableScale>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <GradientButton
            label="Masuk"
            onPress={handlePasswordSubmit}
            loading={isLoading}
            disabled={!identifier || !password}
            style={styles.submit}
          />
        </View>
      ) : (
        <View style={styles.form}>
          <AuthField
            label="Email, Username, atau NRP"
            leftIcon="mail"
            placeholder="Masukkan email, username, atau NRP"
            autoCapitalize="none"
            autoCorrect={false}
            editable={otpStep === 'request'}
            returnKeyType="done"
            onSubmitEditing={() => handleSendOtp(false)}
            value={identifier}
            onChangeText={setIdentifier}
          />

          {otpStep === 'verify' ? (
            <>
              {otpInfo ? <Text style={styles.info}>{otpInfo}</Text> : null}
              <AuthField
                ref={otpRef}
                label="Kode OTP"
                leftIcon="lock"
                placeholder="______"
                keyboardType="number-pad"
                maxLength={6}
                returnKeyType="done"
                inputStyle={styles.otpInput}
                onSubmitEditing={handleVerifyOtp}
                value={otpCode}
                onChangeText={setOtpCode}
              />

              <View style={styles.otpActions}>
                <PressableScale onPress={handleChangeIdentifier} disabled={isSendingOtp}>
                  <Text style={styles.link}>Ganti akun</Text>
                </PressableScale>
                <PressableScale onPress={() => handleSendOtp(true)} disabled={resendDisabled}>
                  <Text style={[styles.link, resendDisabled && styles.linkDisabled]}>
                    {resendLabel}
                  </Text>
                </PressableScale>
              </View>

              {otpErrorMessage ? <Text style={styles.error}>{otpErrorMessage}</Text> : null}

              <GradientButton
                label="Verifikasi & Masuk"
                onPress={handleVerifyOtp}
                loading={isLoading}
                disabled={!identifier || !otpCode}
                style={styles.submit}
              />
            </>
          ) : (
            <>
              {otpError ? <Text style={styles.error}>{otpError}</Text> : null}

              <GradientButton
                label="Kirim Kode OTP"
                onPress={() => handleSendOtp(false)}
                loading={isSendingOtp}
                disabled={!identifier}
                style={styles.submit}
              />
            </>
          )}
        </View>
      )}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  brand: {
    alignItems: 'center',
    marginBottom: 26,
  },
  logoImage: {
    width: 92,
    height: 92,
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: colors.heading,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  subtitleAccent: {
    color: colors.primary,
    fontWeight: '600',
  },
  form: {
    gap: 18,
    marginTop: 24,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: -6,
  },
  link: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  linkDisabled: {
    color: colors.placeholder,
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    marginTop: 2,
  },
  version: {
    fontSize: 12,
    color: colors.primaryForeground,
  },
});
