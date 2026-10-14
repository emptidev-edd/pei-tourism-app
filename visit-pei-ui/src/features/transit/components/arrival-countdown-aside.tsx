import { StyleSheet, Text, View } from 'react-native';

import { CountdownPill } from './countdown-pill';

/**
 * Right-hand column of an arrival row: the countdown pill plus the secondary
 * "next times" / clock-time line beneath it. Shared by the nearby-stop
 * featured card and the stop-detail arrival list, whose aside columns were
 * pixel-identical before this refactor.
 */
export function ArrivalCountdownAside({
  departureAtIso,
  now,
  secondaryLine,
}: {
  departureAtIso: string;
  now: number;
  secondaryLine: string | null;
}) {
  return (
    <View style={styles.arrivalAside}>
      <CountdownPill departureAtIso={departureAtIso} now={now} />
      {secondaryLine ? (
        <Text style={styles.countdownPillText}>{secondaryLine}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  arrivalAside: {
    alignItems: 'center',
    minWidth: 88,
  },
  countdownPillText: {
    color: '#6b7e8d',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 4,
  },
});
