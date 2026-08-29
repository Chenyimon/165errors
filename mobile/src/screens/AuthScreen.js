import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';

import { colors, radius } from '../theme';
import { useProfile } from '../lib/ProfileContext';
import Button from '../components/Button';

export default function AuthScreen() {
  const { login, signup, continueAsGuest } = useProfile();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!username.trim() || !password) {
      setError('Enter a username and password.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login(username.trim(), password);
      else await signup(username.trim(), password);
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <Text style={styles.wordmark}>
          SORT<Text style={styles.slash}>/</Text>ED
        </Text>
        <Text style={styles.sub}>Log in to add friends and appear on the leaderboard.</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="Username"
          autoCapitalize="none"
          maxLength={24}
          style={styles.input}
          placeholderTextColor={colors.inkDim}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          maxLength={64}
          style={styles.input}
          placeholderTextColor={colors.inkDim}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title={mode === 'login' ? 'Log in' : 'Sign up'}
          variant="primary"
          onPress={submit}
          disabled={busy}
          style={{ width: '100%' }}
        />
        <Text
          style={styles.switch}
          onPress={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError('');
          }}
        >
          {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Log in'}
        </Text>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>
        <Button title="Continue as guest" onPress={continueAsGuest} style={{ width: '100%' }} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 340 },
  wordmark: { fontWeight: '800', fontSize: 22, color: colors.forest, textAlign: 'center', marginBottom: 6 },
  slash: { color: colors.terracotta },
  sub: { fontSize: 13, color: colors.inkDim, textAlign: 'center', marginBottom: 18, lineHeight: 19 },
  input: {
    width: '100%',
    padding: 12,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    color: colors.ink,
    fontSize: 14,
    marginBottom: 12,
  },
  error: { color: colors.terracotta, fontSize: 12.5, marginBottom: 12, textAlign: 'center' },
  switch: { textAlign: 'center', color: colors.forest, fontWeight: '700', fontSize: 12.5, marginTop: 14 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, marginBottom: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.inkDim,
  },
});
