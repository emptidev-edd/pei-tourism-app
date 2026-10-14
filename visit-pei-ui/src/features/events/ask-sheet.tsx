import { Stack } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EVENT } from './theme';
import { UiIcon } from './ui-icon';

export function AskSheet() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.92],
          contentStyle: { backgroundColor: '#f2f2f7' },
        }}
      />
      <View style={styles.header}>
        <View style={styles.mark}>
          <UiIcon sf='sparkles' android='auto-fix' size={18} color={EVENT.onAccent} />
        </View>
        <Text style={styles.title}>Ask AI</Text>
      </View>
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Ask about events on PEI</Text>
        <Text style={styles.emptyBody}>
          The chat opens here. Recommendations, times, and tickets come in the next pass.
        </Text>
      </View>
      <View style={styles.composer}>
        <TextInput
          editable={false}
          placeholder='Message'
          placeholderTextColor={EVENT.muted}
          style={styles.input}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: EVENT.bg,
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EVENT.accent,
  },
  title: {
    color: EVENT.text,
    fontSize: 22,
    fontWeight: '800',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  emptyTitle: {
    color: EVENT.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyBody: {
    color: EVENT.muted,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  composer: {
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: EVENT.elevated,
    borderWidth: 1,
    borderColor: EVENT.border,
    paddingHorizontal: 16,
  },
  input: {
    height: 52,
    color: EVENT.text,
    fontSize: 16,
  },
});
