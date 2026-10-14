import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Surface } from 'react-native-paper';

import { COLOR } from '../../../../styles';
import type { TransitArrival, TransitStop } from '../../../types/api';
import {
  formatClockTime,
  formatNextTimesLine,
  getUpcomingArrivals,
} from '../transit-time';
import { formatWalkTime, getArrivalRouteNumber, getRouteTitle } from '../transit-format';
import { ArrivalCountdownAside } from './arrival-countdown-aside';

function FeaturedArrivalRow({
  arrival,
  arrivals,
  now,
  onPress,
}: {
  arrival: TransitArrival;
  arrivals: TransitArrival[];
  now: number;
  onPress: () => void;
}) {
  const secondaryLine =
    formatNextTimesLine(
      getUpcomingArrivals(
        arrivals.filter((item) => item.routeId === arrival.routeId),
        now,
      ),
      now,
    ) ?? formatClockTime(arrival.departureAtIso);

  return (
    <TouchableOpacity activeOpacity={0.84} onPress={onPress} style={styles.arrivalCard}>
      <View style={styles.arrivalLeft}>
        <View style={styles.arrivalRowHeader}>
          <View style={styles.routeBox}>
            <MaterialCommunityIcons name='bus' size={15} color={COLOR.brandGreen} />
            <View style={styles.routeBoxDivider} />
            <Text style={styles.routeBoxText}>{getArrivalRouteNumber(arrival)}</Text>
          </View>
          <View style={styles.arrivalCopy}>
            <Text style={styles.arrivalHeadsign} numberOfLines={2}>
              {getRouteTitle(arrival)}
            </Text>
            <Text style={styles.arrivalTimes}>Scheduled time</Text>
          </View>
        </View>
      </View>

      <ArrivalCountdownAside
        departureAtIso={arrival.departureAtIso}
        now={now}
        secondaryLine={secondaryLine}
      />
    </TouchableOpacity>
  );
}

export function FeaturedStopCard({
  stop,
  featuredArrivals,
  arrivals,
  now,
  favorite,
  onToggleFavorite,
  onPressStation,
  onPressArrival,
  onViewAll,
}: {
  stop: TransitStop;
  featuredArrivals: TransitArrival[];
  arrivals: TransitArrival[];
  now: number;
  favorite: boolean;
  onToggleFavorite: () => void;
  onPressStation: () => void;
  onPressArrival: (arrival: TransitArrival) => void;
  onViewAll: () => void;
}) {
  return (
    <Surface style={styles.featuredStopCard} elevation={0}>
      <View style={styles.featuredStopHeader}>
        <View style={styles.featuredStopCopy}>
          <Text style={styles.featuredStopTitle} numberOfLines={2}>
            {stop.name ?? stop.stopId}
          </Text>
          <Text style={styles.featuredStopMeta}>
            {stop.code ? `ID ${stop.code}` : stop.stopId}
            {' · '}
            {formatWalkTime(stop.meters)}
          </Text>
          {featuredArrivals.length > 0 && (
            <Text style={styles.featuredStopRoutes} numberOfLines={1}>
              {featuredArrivals.map(getArrivalRouteNumber).join(', ')}
            </Text>
          )}
        </View>

        <View style={styles.featuredStopActions}>
          <TouchableOpacity activeOpacity={0.84} onPress={onToggleFavorite} style={styles.favButton}>
            <MaterialCommunityIcons
              name={favorite ? 'star' : 'star-outline'}
              size={18}
              color={COLOR.brandGreen}
            />
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.84} onPress={onPressStation} style={styles.stationButton}>
            <MaterialCommunityIcons name='bus-stop' size={18} color={COLOR.brandGreen} />
            <Text style={styles.stationButtonText}>Station</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.arrivalsList}>
        {featuredArrivals.map((arrival) => (
          <FeaturedArrivalRow
            key={`${arrival.routeId}-${arrival.tripId}-featured`}
            arrival={arrival}
            arrivals={arrivals}
            now={now}
            onPress={() => onPressArrival(arrival)}
          />
        ))}
      </View>

      <TouchableOpacity activeOpacity={0.84} onPress={onViewAll} style={styles.viewAllButton}>
        <Text style={styles.viewAllText}>View all next arrivals</Text>
      </TouchableOpacity>
    </Surface>
  );
}

const styles = StyleSheet.create({
  featuredStopCard: {
    borderRadius: 24,
    paddingTop: 6,
    backgroundColor: '#ffffff',
  },
  featuredStopHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
  },
  featuredStopCopy: {
    flex: 1,
    gap: 6,
  },
  featuredStopTitle: {
    color: '#16202a',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  featuredStopMeta: {
    color: '#6b7e8d',
    fontSize: 13,
    lineHeight: 18,
  },
  featuredStopRoutes: {
    color: '#16202a',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  featuredStopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  favButton: {
    width: 34,
    height: 32,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#efefef',
  },
  stationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#efefef',
  },
  stationButtonText: {
    color: '#16202a',
    fontSize: 13,
    fontWeight: '800',
  },
  arrivalsList: {
    marginTop: 16,
    gap: 0,
  },
  arrivalCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 121, 96, 0.10)',
  },
  arrivalLeft: {
    flex: 1,
    gap: 6,
  },
  arrivalRowHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  routeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#efefef',
  },
  routeBoxDivider: {
    width: 0,
  },
  routeBoxText: {
    color: '#16202a',
    fontSize: 13,
    fontWeight: '800',
  },
  arrivalCopy: {
    flex: 1,
    gap: 5,
  },
  arrivalHeadsign: {
    color: '#16202a',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  arrivalTimes: {
    color: '#6b7e8d',
    fontSize: 13,
    lineHeight: 18,
  },
  viewAllButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 121, 96, 0.10)',
  },
  viewAllText: {
    color: COLOR.brandGreen,
    fontSize: 16,
    fontWeight: '800',
  },
});
