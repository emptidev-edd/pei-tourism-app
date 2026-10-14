import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { COLOR } from '../../../../styles';
import type { TransitArrival } from '../../../types/api';
import { getArrivalRouteNumber, getRouteTitle } from '../transit-format';
import { formatClockTime, formatNextTimesLine } from '../transit-time';
import { ArrivalCountdownAside } from './arrival-countdown-aside';

/** One route's next-arrival row on the stop-detail screen. */
export function StopArrivalCard({
  first,
  items,
  now,
  onPress,
}: {
  first: TransitArrival;
  items: TransitArrival[];
  now: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.84} onPress={onPress} style={styles.arrivalCard}>
      <View style={styles.arrivalMain}>
        <View style={styles.arrivalRowHeader}>
          <View style={styles.routeBadge}>
            <View style={styles.routeBadgeInner}>
              <MaterialCommunityIcons name='bus' size={13} color={COLOR.brandGreen} />
              <Text style={styles.routeBadgeText}>{getArrivalRouteNumber(first)}</Text>
            </View>
            <View style={styles.routeBadgeStrip} />
          </View>

          <View style={styles.arrivalCopy}>
            <Text style={styles.arrivalTitle} numberOfLines={2}>
              {getRouteTitle(first)}
            </Text>
            <Text style={styles.arrivalSubtitle}>Scheduled time</Text>
          </View>
        </View>
      </View>

      <ArrivalCountdownAside
        departureAtIso={first.departureAtIso}
        now={now}
        secondaryLine={formatNextTimesLine(items, now) ?? formatClockTime(first.departureAtIso)}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  arrivalCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 121, 96, 0.10)',
  },
  arrivalMain: {
    flex: 1,
    gap: 6,
  },
  arrivalRowHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  routeBadge: {
    minWidth: 56,
    borderRadius: 4,
    overflow: 'hidden',
    alignItems: 'center',
    backgroundColor: '#efefef',
  },
  routeBadgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 6,
    paddingBottom: 4,
    paddingHorizontal: 8,
  },
  routeBadgeText: {
    color: '#16202a',
    fontSize: 13,
    fontWeight: '800',
  },
  routeBadgeStrip: {
    alignSelf: 'stretch',
    height: 4,
    backgroundColor: COLOR.brandGreen,
  },
  arrivalCopy: {
    flex: 1,
    gap: 5,
  },
  arrivalTitle: {
    color: '#16202a',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  arrivalSubtitle: {
    color: '#6b7e8d',
    fontSize: 13,
    lineHeight: 18,
  },
});
