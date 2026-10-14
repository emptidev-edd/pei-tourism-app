import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { COLOR } from '../../../../styles';
import type { TransitRouteDeparture } from '../../../types/api';
import { formatRouteClockTime, isSameLocalDay } from '../route-schedule';
import { getCountdownParts } from '../transit-time';

const SOON_MS = 90 * 60 * 1000;

export function DepartureCard({
  departure,
  now,
  selected,
  onPress,
}: {
  departure: TransitRouteDeparture;
  now: number;
  selected: boolean;
  onPress: () => void;
}) {
  const when = new Date(departure.departureAtIso).getTime();
  const today = isSameLocalDay(departure.departureAtIso, now);
  const soon = today && when - now <= SOON_MS && when >= now - 60 * 1000;
  const dayLabel = today
    ? 'Today'
    : new Date(departure.departureAtIso).toLocaleDateString('en-US', {
        weekday: 'long',
      });
  const clock = formatRouteClockTime(departure.departureAtIso);
  const countdown = getCountdownParts(departure.departureAtIso, now);
  const statusLabel = today && departure.isLastOfDay ? 'Last' : 'Scheduled';
  const textColor = selected ? COLOR.whiteText : '#16202a';
  const mutedColor = selected ? 'rgba(255,255,255,0.82)' : '#6b7e8d';

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      style={[styles.departureCard, selected && styles.departureCardSelected]}
    >
      {soon ? (
        <>
          <Text style={[styles.departureValue, { color: textColor }]}>
            {countdown.value}
          </Text>
          <Text style={[styles.departureUnit, { color: mutedColor }]}>
            {countdown.unit === 'min' ? 'minutes' : countdown.unit ?? ''}
          </Text>
          {today && departure.isLastOfDay ? (
            <Text style={[styles.departureStatus, { color: mutedColor }]}>Last</Text>
          ) : null}
        </>
      ) : (
        <>
          <Text style={[styles.departureDay, { color: mutedColor }]}>{dayLabel}</Text>
          <Text style={[styles.departureClock, { color: textColor }]}>{clock}</Text>
          <Text style={[styles.departureStatus, { color: mutedColor }]}>{statusLabel}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  departureCard: {
    width: 112,
    minHeight: 96,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f3faf7',
    justifyContent: 'center',
    gap: 2,
  },
  departureCardSelected: {
    backgroundColor: COLOR.brandGreen,
  },
  departureDay: {
    fontSize: 13,
    fontWeight: '700',
  },
  departureClock: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  departureValue: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
  departureUnit: {
    fontSize: 13,
    fontWeight: '700',
  },
  departureStatus: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
