import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ErrorText, Field, T } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { space, useColors } from '@/lib/theme';

type Mode = 'sign-in' | 'sign-up';

export default function SignIn() {
  const c = useColors();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isSignUp = mode === 'sign-up';
  const canSubmit = email.trim().length > 3 && password.length >= 6;

  async function submit() {
    setBusy(true);
    setError(null);
    setNotice(null);
    const creds = { email: email.trim(), password };
    const { data, error } = isSignUp
      ? await supabase.auth.signUp(creds)
      : await supabase.auth.signInWithPassword(creds);
    setBusy(false);
    if (error) {
      setError(error.message);
    } else if (isSignUp && !data.session) {
      // Email confirmation is on for this project
      setNotice('Check your email to confirm your account, then sign in.');
      setMode('sign-in');
    }
    // On success the auth guard in the root layout switches to the app
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={{ gap: space.xs }}>
            <T variant="title">PatrolEye</T>
            <T muted>{isSignUp ? 'Create an account to set up your camera.' : 'Sign in to see your cameras and alerts.'}</T>
          </View>

          <View style={{ gap: space.lg }}>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="you@example.com"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              textContentType={isSignUp ? 'newPassword' : 'password'}
              placeholder={isSignUp ? 'At least 6 characters' : undefined}
              onSubmitEditing={() => canSubmit && submit()}
            />
            {error ? <ErrorText>{error}</ErrorText> : null}
            {notice ? <T muted>{notice}</T> : null}
            <Button
              title={isSignUp ? 'Create account' : 'Sign in'}
              onPress={submit}
              loading={busy}
              disabled={!canSubmit}
            />
          </View>

          <Pressable
            onPress={() => {
              setMode(isSignUp ? 'sign-in' : 'sign-up');
              setError(null);
            }}
            style={{ alignSelf: 'center', padding: space.sm }}>
            <T color={c.accent}>{isSignUp ? 'Already have an account? Sign in' : 'New here? Create an account'}</T>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: space.xl, gap: space.xxl, maxWidth: 480, width: '100%', alignSelf: 'center' },
});
