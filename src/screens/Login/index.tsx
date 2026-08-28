import { useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { Image, StyleSheet, Text, TextInput, View } from 'react-native';

import { logo } from '@/assets';
import Button from '@/components/atoms/Button';
import TextField from '@/components/atoms/TextField';
import AuthLayout from '@/components/templates/AuthLayout';
import { ROUTES } from '@/navigation/paths';
import type { RootStackScreenProps } from '@/navigation/types';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearAuthError, login } from '@/store/slices/authSlice';
import { colors } from '@/theme/colors';

export type LoginScreenProps = RootStackScreenProps<typeof ROUTES.login>;

export default function LoginScreen(_props: LoginScreenProps) {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(state => state.auth.isLoading);
  const error = useAppSelector(state => state.auth.error);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  function handleSubmit() {
    if (!identifier || !password || isLoading) return;
    dispatch(clearAuthError());
    dispatch(login({ login: identifier, password }));
  }

  return (
    <AuthLayout>
      <View style={styles.logoBadge}>
        <Image source={logo.LogoIcon} style={styles.logoImage} resizeMode="contain" />
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Selamat Datang</Text>
        <Text style={styles.subtitle}>Masuk untuk melanjutkan ke Smart Battalion</Text>
      </View>

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
          onSubmitEditing={handleSubmit}
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label="Masuk"
          onPress={handleSubmit}
          loading={isLoading}
          disabled={!identifier || !password}
          style={styles.submit}
        />
      </View>
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
    marginBottom: 40,
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
});
