import { useEffect, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { logo } from '@/assets';
import Button from '@/components/atoms/Button';
import PressableScale from '@/components/atoms/PressableScale';
import TextField from '@/components/atoms/TextField';
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

  function switchMode(nextMode: LoginMode) {
    if (nextMode === mode) return;
    setMode(nextMode);
    dispatch(clearAuthError());
    setOtpStep('request');
    setOtpCode('');
    setOtpError(null);
    setOtpInfo(null);
    setResendCooldown(0);
    setResendCount(0);
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
        setResendCount(await recordOtpResend(identifier));
      } else {
        setResendCount(await getOtpResendCount(identifier));
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
    setResendCount(0);
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
    <AuthLayout ref={scrollViewRef}>
      <View style={styles.logoBadge}>
        <Image source={logo.LogoIcon} style={styles.logoImage} resizeMode="contain" />
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Selamat Datang</Text>
        <Text style={styles.subtitle}>Masuk untuk melanjutkan ke Smart Battalion</Text>
      </View>

      <View style={styles.modeSwitch}>
        <PressableScale
          style={styles.modeTabWrapper}
          contentStyle={[styles.modeTab, mode === 'password' && styles.modeTabActive]}
          onPress={() => switchMode('password')}>
          <Text style={[styles.modeTabLabel, mode === 'password' && styles.modeTabLabelActive]}>
            Password
          </Text>
        </PressableScale>
        <PressableScale
          style={styles.modeTabWrapper}
          contentStyle={[styles.modeTab, mode === 'otp' && styles.modeTabActive]}
          onPress={() => switchMode('otp')}>
          <Text style={[styles.modeTabLabel, mode === 'otp' && styles.modeTabLabelActive]}>
            Kode OTP
          </Text>
        </PressableScale>
      </View>

      {mode === 'password' ? (
        <View style={styles.form}>
          <TextField
            label="Email, Username, atau NRP"
            placeholder="Masukkan email, username, atau NRP"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => passwordRef.current?.focus()}
            value={identifier}
            onChangeText={setIdentifier}
          />
          <TextField
            ref={passwordRef}
            label="Password"
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
            <Text style={styles.forgotLinkLabel}>Lupa password?</Text>
          </PressableScale>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label="Masuk"
            onPress={handlePasswordSubmit}
            loading={isLoading}
            disabled={!identifier || !password}
            style={styles.submit}
          />
        </View>
      ) : (
        <View style={styles.form}>
          <TextField
            label="Email, Username, atau NRP"
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
              <TextField
                ref={otpRef}
                label="Kode OTP"
                placeholder="Masukkan 6 digit kode OTP"
                keyboardType="number-pad"
                maxLength={6}
                returnKeyType="done"
                onSubmitEditing={handleVerifyOtp}
                value={otpCode}
                onChangeText={setOtpCode}
              />

              <View style={styles.otpActions}>
                <PressableScale onPress={handleChangeIdentifier} disabled={isSendingOtp}>
                  <Text style={styles.forgotLinkLabel}>Ganti akun</Text>
                </PressableScale>
                <PressableScale onPress={() => handleSendOtp(true)} disabled={resendDisabled}>
                  <Text
                    style={[
                      styles.forgotLinkLabel,
                      resendDisabled && styles.forgotLinkLabelDisabled,
                    ]}>
                    {resendLabel}
                  </Text>
                </PressableScale>
              </View>

              {otpErrorMessage ? <Text style={styles.error}>{otpErrorMessage}</Text> : null}

              <Button
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

              <Button
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

      <Text style={styles.version}>v{appVersion}</Text>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  logoBadge: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginBottom: 24,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  header: {
    marginBottom: 24,
    gap: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: colors.neutralSurface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  modeTabWrapper: {
    flex: 1,
  },
  modeTab: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: colors.surface,
  },
  modeTabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  modeTabLabelActive: {
    color: colors.primary,
  },
  form: {
    gap: 16,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: -8,
  },
  forgotLinkLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  forgotLinkLabelDisabled: {
    color: colors.textMuted,
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  version: {
    marginTop: 24,
    alignSelf: 'center',
    fontSize: 12,
    color: colors.textMuted,
  },
});
