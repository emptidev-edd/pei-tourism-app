import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, View } from 'react-native';

import { COLOR } from '../../../../styles';
import { getCountdownParts } from '../transit-time';

/** Moovit-style countdown pill: big value + small unit ("10" + "min"). */
export function CountdownPill({
  departureAtIso,
  now,
}: {
  departureAtIso: string;
  now: number;
}) {
  const { unit, value } = getCountdownParts(departureAtIso, now);

  return (
    <View style={styles.countdownPill}>
      <MaterialCommunityIcons
        name='clock-outline'
        size={14}
        color={COLOR.brandGreen}
      />
      <View style={styles.countdownValueRow}>
        <Text style={styles.countdownValueText}>{value}</Text>
        {unit ? <Text style={styles.countdownUnitText}>{unit}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  countdownPill: {
    minWidth: 78,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#efefef',
    gap: 6,
  },
  countdownValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  countdownValueText: {
    color: '#16202a',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
  },
  countdownUnitText: {
    color: '#6b7e8d',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
    paddingBottom: 2,
  },
});
