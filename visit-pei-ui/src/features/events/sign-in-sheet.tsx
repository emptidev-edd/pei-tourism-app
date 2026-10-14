import { Stack } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EVENT } from './theme';
import { tapHaptic, UiIcon } from './ui-icon';

export function SignInSheet() {
  const insets = useSafeAreaInsets();
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');

  return (
    <View style={[styles.screen, { paddingBottom: Math.max(insets.bottom, 20) }]}>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.72, 1],
          contentStyle: { backgroundColor: '#f2f2f7' },
        }}
      />
      <Text style={styles.title}>Login / Signup</Text>
      <Text style={styles.subtitle}>
        You&apos;ll be able to follow organizers, get recommendations and other nice things.
      </Text>

      <View style={styles.actions}>
        <Pressable
          onPress={() => {
            tapHaptic();
            setNote('Google sign-in connects in the next update.');
          }}
          style={styles.outlineButton}
        >
          <Text style={styles.googleMark}>G</Text>
          <Text style={styles.outlineLabel}>Continue with Google</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            tapHaptic();
            setNote('Apple sign-in connects in the next update.');
          }}
          style={styles.appleButton}
        >
          <UiIcon sf='apple.logo' android='apple' size={18} color={EVENT.onAccent} />
          <Text style={styles.appleLabel}>Sign in with Apple</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            tapHaptic();
            setEmailOpen(true);
            setNote('');
          }}
          style={styles.outlineButton}
        >
          <UiIcon sf='envelope' android='email-outline' size={18} color={EVENT.text} />
          <Text style={styles.outlineLabel}>Continue with email</Text>
        </Pressable>

        {emailOpen ? (
          <View style={styles.emailBlock}>
            <TextInput
              autoCapitalize='none'
              autoComplete='email'
              autoFocus
              keyboardType='email-address'
              onChangeText={setEmail}
              placeholder='Email address'
              placeholderTextColor={EVENT.muted}
              style={styles.input}
              value={email}
            />
            <Pressable
              onPress={() => {
                tapHaptic();
                setNote(
                  email.trim()
                    ? 'We will use this address once sign-in is connected.'
                    : 'Add an email address to continue.',
                );
              }}
              style={styles.emailContinue}
            >
              <Text style={styles.emailContinueLabel}>Continue</Text>
            </Pressable>
          </View>
        ) : null}

        {note ? (
          <Text selectable style={styles.note}>
            {note}
          </Text>
        ) : null}
      </View>

      <Text style={styles.legal}>
        By proceeding, you agree to TickitUp&apos;s{' '}
        <Text style={styles.legalLink}>Terms and Conditions</Text> and{' '}
        <Text style={styles.legalLink}>Privacy Policy</Text>.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: EVENT.bg,
    paddingHorizontal: 22,
    paddingTop: 28,
    gap: 14,
  },
  title: {
    color: EVENT.text,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: EVENT.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  outlineButton: {
    height: 52,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: EVENT.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  outlineLabel: {
    color: EVENT.text,
    fontSize: 16,
    fontWeight: '700',
  },
  googleMark: {
    color: '#4285F4',
    fontSize: 18,
    fontWeight: '800',
  },
  appleButton: {
    height: 52,
    borderRadius: 999,
    backgroundColor: '#111111',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  appleLabel: {
    color: EVENT.onAccent,
    fontSize: 16,
    fontWeight: '700',
  },
  emailBlock: {
    gap: 10,
  },
  input: {
    height: 52,
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    color: EVENT.text,
    backgroundColor: EVENT.elevated,
    fontSize: 16,
  },
  emailContinue: {
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EVENT.accent,
  },
  emailContinueLabel: {
    color: EVENT.onAccent,
    fontSize: 16,
    fontWeight: '800',
  },
  note: {
    color: EVENT.faint,
    fontSize: 13,
    lineHeight: 18,
  },
  legal: {
    marginTop: 'auto',
    color: EVENT.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  legalLink: {
    color: EVENT.accent,
    fontWeight: '700',
  },
});
