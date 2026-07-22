import { useState } from 'react';
import { Text, TextInput, View, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';
import { PrimaryButton } from '@/components/ui';

export default function SignInScreen() {
  const session = useAuthStore((s) => s.session);
  const requestOtp = useAuthStore((s) => s.requestOtp);
  const verifyOtp = useAuthStore((s) => s.verifyOtp);

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    if (!email.trim()) return;
    setBusy(true);
    setError('');
    const { error } = await requestOtp(email.trim());
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    setStep('code');
  };

  const submitCode = async () => {
    if (!code.trim()) return;
    setBusy(true);
    setError('');
    const { error } = await verifyOtp(email.trim(), code.trim());
    setBusy(false);
    if (error) setError(error);
  };

  if (session) return <Redirect href="/home" />;

  return (
    <View style={styles.fill}>
      <View style={styles.card}>
        <Text style={styles.title}>Small Farm USA</Text>
        <Text style={styles.subtitle}>
          {step === 'email' ? 'Sign in with your family email' : `Enter the code we sent to ${email.trim()}`}
        </Text>

        {step === 'email' ? (
          <>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.faint}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <PrimaryButton label={busy ? 'Sending…' : 'Send code'} onPress={sendCode} disabled={busy} style={{ marginTop: 12 }} />
          </>
        ) : (
          <>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              placeholderTextColor={colors.faint}
              keyboardType="number-pad"
              maxLength={6}
              style={[styles.input, styles.codeInput]}
            />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <PrimaryButton label={busy ? 'Verifying…' : 'Verify & sign in'} onPress={submitCode} disabled={busy} style={{ marginTop: 12 }} />
            <Text
              style={styles.backLink}
              onPress={() => {
                setStep('email');
                setCode('');
                setError('');
              }}>
              ‹ Use a different email
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', padding: 22 },
  card: { width: '100%', maxWidth: 360 },
  title: { fontFamily: fonts.displayExtraBold, fontSize: 24, color: colors.ink, textAlign: 'center' },
  subtitle: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 6, marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.input,
    padding: 14,
    fontSize: 15,
    backgroundColor: '#fff',
    color: colors.ink,
  },
  codeInput: { textAlign: 'center', fontSize: 22, letterSpacing: 8, fontFamily: fonts.displayBold },
  error: { color: colors.danger, fontSize: 12.5, marginTop: 8, textAlign: 'center' },
  backLink: { textAlign: 'center', fontSize: 13, color: colors.primary, fontWeight: '600', marginTop: 16 },
});
