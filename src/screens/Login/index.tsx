import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit() {
    dispatch(clearAuthError());
    dispatch(login({ username, password }));
  }

  return (
    <AuthLayout>
      <View style={styles.header}>
        <Text style={styles.title}>Selamat Datang</Text>
        <Text style={styles.subtitle}>Masuk untuk melanjutkan ke Smart Battalion</Text>
      </View>

      <View style={styles.form}>
        <TextField
          label="Username"
          placeholder="admin"
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={setUsername}
        />
        <TextField
          label="Password"
          placeholder="admin"
          secureTextEntry
          autoCapitalize="none"
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label="Masuk"
          onPress={handleSubmit}
          loading={isLoading}
          disabled={!username || !password}
          style={styles.submit}
        />
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
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
