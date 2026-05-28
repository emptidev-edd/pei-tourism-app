import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Surface } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLOR } from '../../../styles';
import { useTransitRouteStopsQuery } from '../../../src/services/query/transit/useTransitRouteStopsQuery';
import type { TransitRouteStop } from '../../../src/types/api';

const parseGtfsTimeToSeconds = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const parts = value.split(':').map(Number);
  if (parts.length < 2 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  const [hour, minute, second = 0] = parts;
  return hour * 3600 + minute * 60 + second;
};

const getStopTimeSeconds = (item: TransitRouteStop) =>
  parseGtfsTimeToSeconds(item.departureTime || item.arrivalTime);

const formatAbsoluteTime = (value?: string | null) => {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
};

const formatCountdownLabel = (value?: string | null, now = Date.now()) => {
  if (!value) {
    return null;
  }

  const diffMs = new Date(value).getTime() - now;
  if (diffMs <= 60 * 1000 && diffMs >= -60 * 1000) {
    return 'Now';
  }

  if (diffMs < -60 * 1000) {
    return 'Passed';
  }

  const totalMinutes = Math.ceil(diffMs / 60000);
  if (totalMinutes >= 120) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes === 0
      ? `${hours} hr left`
      : `${hours} hr ${minutes} min left`;
  }

  return `${totalMinutes} min left`;
};

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#020617',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  default: {
    elevation: 8,
  },
});

export default function RouteDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(() => Date.now());
  const { feedId, focusDepartureAtIso, focusStopId, routeId, tripId } = useLocalSearchParams<{
    feedId?: string;
    focusDepartureAtIso?: string;
    focusStopId?: string;
    routeId: string;
    tripId?: string;
  }>();
  const routeQuery = useTransitRouteStopsQuery(
    {
      feedId,
      routeId: routeId ?? '',
      tripId,
    },
    Boolean(routeId),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  const route = routeQuery.data?.route ?? null;
  const items = useMemo(() => routeQuery.data?.items ?? [], [routeQuery.data?.items]);
  const coordinates = items
    .filter((item) => item.stop?.lat != null && item.stop?.lon != null)
    .map((item) => ({
      latitude: item.stop?.lat as number,
      longitude: item.stop?.lon as number,
    }));

  const initialRegion = coordinates[0]
    ? {
        latitude: coordinates[0].latitude,
        longitude: coordinates[0].longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      }
    : {
        latitude: 46.2382,
        longitude: -63.1311,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };

  const focusStop = useMemo(
    () => items.find((item) => item.stopId === focusStopId) ?? null,
    [focusStopId, items],
  );

  const focusStopSeconds = focusStop ? getStopTimeSeconds(focusStop) : null;

  const scheduledStops = useMemo(() => {
    if (!focusDepartureAtIso || focusStopSeconds == null) {
      return items.map((item) => ({
        ...item,
        scheduledAtIso: null as string | null,
      }));
    }

    const focusedAtMs = new Date(focusDepartureAtIso).getTime();

    return items.map((item) => {
      const stopSeconds = getStopTimeSeconds(item);
      if (stopSeconds == null) {
        return {
          ...item,
          scheduledAtIso: null as string | null,
        };
      }

      const offsetMs = (stopSeconds - focusStopSeconds) * 1000;
      return {
        ...item,
        scheduledAtIso: new Date(focusedAtMs + offsetMs).toISOString(),
      };
    });
  }, [focusDepartureAtIso, focusStopSeconds, items]);

  const activeStopIndex = useMemo(() => {
    let latestReachedIndex = -1;

    scheduledStops.forEach((item, index) => {
      if (item.scheduledAtIso && new Date(item.scheduledAtIso).getTime() <= now) {
        latestReachedIndex = index;
      }
    });

    return latestReachedIndex;
  }, [now, scheduledStops]);

  return (
    <>
      <StatusBar style='light' translucent />
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.heroWrap}>
            <MapView
              style={styles.map}
              initialRegion={initialRegion}
              region={initialRegion}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
            >
              {coordinates.length > 1 ? (
                <Polyline
                  coordinates={coordinates}
                  strokeColor='#ff6666'
                  strokeWidth={5}
                />
              ) : null}

              {items.map((item) => {
                if (item.stop?.lat == null || item.stop?.lon == null) {
                  return null;
                }

                const focused = item.stopId === focusStopId;

                return (
                  <Marker
                    key={`${item.stopId}-${item.stopSequence}`}
                    coordinate={{
                      latitude: item.stop.lat,
                      longitude: item.stop.lon,
                    }}
                  >
                    <View
                      style={[
                        styles.markerWrap,
                        focused && styles.markerWrapFocused,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name='bus'
                        size={16}
                        color={COLOR.whiteText}
                      />
                    </View>
                  </Marker>
                );
              })}
            </MapView>

            <View style={styles.heroOverlay} />

            <TouchableOpacity
              accessibilityRole='button'
              activeOpacity={0.84}
              onPress={() => router.back()}
              style={[styles.backButton, { top: insets.top + 14 }]}
            >
              <MaterialCommunityIcons
                name='arrow-left'
                size={22}
                color={COLOR.whiteText}
              />
            </TouchableOpacity>
          </View>

          <Surface style={styles.contentCard} elevation={0}>
            <View style={styles.routeBadge}>
              <MaterialCommunityIcons
                name='bus'
                size={16}
                color={COLOR.whiteText}
              />
              <Text style={styles.routeBadgeText}>
                {route?.shortName?.trim() || routeId}
              </Text>
            </View>

            <Text style={styles.title}>
              {route?.longName?.trim() || 'Transit route'}
            </Text>

            {focusStop?.stop?.name ? (
              <View style={styles.liveInfoCard}>
                <Text style={styles.liveInfoTitle}>
                  Tracking toward {focusStop.stop.name}
                </Text>
                <Text style={styles.liveInfoText}>
                  This is schedule-based stop tracking for the selected trip. It updates every 30 seconds.
                </Text>
              </View>
            ) : null}

            {route?.desc?.trim() ? (
              <Text style={styles.description}>{route.desc.trim()}</Text>
            ) : null}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Stops on this line</Text>
              <Text style={styles.sectionMeta}>
                {scheduledStops.length} stops
              </Text>
            </View>

            <View style={styles.timelineList}>
              {scheduledStops.map((item, index) => {
                const focused = item.stopId === focusStopId;
                const active = index === activeStopIndex;
                const isLast = index === items.length - 1;
                const countdownLabel = formatCountdownLabel(item.scheduledAtIso, now);
                const absoluteTime = formatAbsoluteTime(item.scheduledAtIso);

                return (
                  <View key={`${item.stopId}-${item.stopSequence}`} style={styles.timelineRow}>
                    <View style={styles.timelineRail}>
                      <View
                        style={[
                          styles.timelineDot,
                          active && styles.timelineDotActive,
                          focused && styles.timelineDotFocused,
                        ]}
                      />
                      {!isLast ? <View style={styles.timelineLine} /> : null}
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.84}
                      onPress={() =>
                        router.push({
                          pathname: '/transit/stop/[stopId]',
                          params: {
                            feedId,
                            stopId: item.stopId,
                          },
                        })
                      }
                      style={[
                        styles.timelineCard,
                        active && styles.timelineCardActive,
                        focused && styles.timelineCardFocused,
                      ]}
                    >
                      <View style={styles.timelineCardHeader}>
                        <Text
                          style={[
                            styles.stopName,
                            active && styles.stopNameActive,
                            focused && styles.stopNameFocused,
                          ]}
                        >
                          {item.stop?.name ?? item.stopId}
                        </Text>

                        {countdownLabel ? (
                          <View
                            style={[
                              styles.stopTimePill,
                              active && styles.stopTimePillActive,
                              focused && styles.stopTimePillFocused,
                            ]}
                          >
                            {absoluteTime ? (
                              <Text
                                style={[
                                  styles.stopTimePrimaryText,
                                  active && styles.stopTimePrimaryTextActive,
                                  focused && styles.stopTimePrimaryTextFocused,
                                ]}
                              >
                                {absoluteTime}
                              </Text>
                            ) : null}
                            <View style={styles.stopTimeSecondaryRow}>
                              <MaterialCommunityIcons
                                name='clock-outline'
                                size={11}
                                color={
                                  active || focused
                                    ? COLOR.whiteText
                                    : '#1e67c6'
                                }
                              />
                              <Text
                                style={[
                                  styles.stopTimePillText,
                                  active && styles.stopTimePillTextActive,
                                  focused && styles.stopTimePillTextFocused,
                                ]}
                              >
                                {countdownLabel}
                              </Text>
                            </View>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.stopMeta}>
                        {item.departureTime || item.arrivalTime || 'Scheduled stop'}
                      </Text>

                      {focused ? (
                        <Text style={styles.stopHint}>Your selected stop</Text>
                      ) : null}

                      {active && !focused ? (
                        <Text style={styles.stopHint}>Current scheduled stop</Text>
                      ) : null}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </Surface>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eef4f7',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#eef4f7',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  heroWrap: {
    position: 'relative',
    height: 280,
    backgroundColor: '#0d1b23',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 38, 48, 0.16)',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  markerWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9dc1b8',
  },
  markerWrapFocused: {
    backgroundColor: COLOR.brandGreen,
  },
  contentCard: {
    marginTop: -24,
    marginHorizontal: 16,
    borderRadius: 30,
    backgroundColor: '#ffffff',
    padding: 20,
    gap: 18,
    ...cardShadow,
  },
  routeBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLOR.brandGreen,
  },
  routeBadgeText: {
    color: COLOR.whiteText,
    fontSize: 13,
    fontWeight: '800',
  },
  title: {
    color: '#16202a',
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
  },
  liveInfoCard: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#f3faf7',
    gap: 6,
  },
  liveInfoTitle: {
    color: '#16202a',
    fontSize: 16,
    fontWeight: '800',
  },
  liveInfoText: {
    color: '#506270',
    fontSize: 13,
    lineHeight: 19,
  },
  description: {
    color: '#667887',
    fontSize: 15,
    lineHeight: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#16202a',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionMeta: {
    color: '#4aa7ff',
    fontSize: 14,
    fontWeight: '700',
  },
  timelineList: {
    gap: 0,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
  },
  timelineRail: {
    width: 22,
    alignItems: 'center',
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 12,
    backgroundColor: '#d9e6ec',
    borderWidth: 2,
    borderColor: '#8cb29e',
  },
  timelineDotFocused: {
    backgroundColor: COLOR.brandGreen,
    borderColor: '#7ec6b4',
  },
  timelineDotActive: {
    backgroundColor: '#2f8fff',
    borderColor: '#8cc0ff',
  },
  timelineLine: {
    flex: 1,
    width: 3,
    marginTop: 4,
    marginBottom: -4,
    backgroundColor: '#b9d8d0',
  },
  timelineCard: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: 'transparent',
    marginBottom: 10,
  },
  timelineCardFocused: {
    backgroundColor: '#f3faf7',
    borderWidth: 1,
    borderColor: 'rgba(0, 121, 96, 0.16)',
  },
  timelineCardActive: {
    backgroundColor: '#eef6ff',
  },
  timelineCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  stopName: {
    flex: 1,
    color: '#4a5f6d',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  stopNameActive: {
    color: '#16355b',
  },
  stopNameFocused: {
    color: '#16202a',
  },
  stopMeta: {
    color: '#6b7e8d',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  stopHint: {
    color: COLOR.brandGreen,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  stopTimePill: {
    minWidth: 72,
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#eef2f5',
  },
  stopTimePrimaryText: {
    color: '#374b58',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 16,
  },
  stopTimePrimaryTextActive: {
    color: COLOR.whiteText,
  },
  stopTimePrimaryTextFocused: {
    color: COLOR.whiteText,
  },
  stopTimeSecondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  stopTimePillActive: {
    backgroundColor: '#2f8fff',
  },
  stopTimePillFocused: {
    backgroundColor: COLOR.brandGreen,
  },
  stopTimePillText: {
    color: '#1e67c6',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  stopTimePillTextActive: {
    color: COLOR.whiteText,
  },
  stopTimePillTextFocused: {
    color: COLOR.whiteText,
  },
});
