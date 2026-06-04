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

const getRouteNumber = (routeValue: string, routeShortName?: string | null) =>
  routeShortName?.trim() || routeValue.split(':').pop()?.trim() || routeValue;

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

const formatGtfsTime = (gtfsTime?: string | null): string | null => {
  if (!gtfsTime) return null;
  const parts = gtfsTime.split(':');
  if (parts.length < 2) return null;
  const hour = parseInt(parts[0], 10) % 24;
  return `${String(hour).padStart(2, '0')}:${parts[1]}`;
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
    return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
  }

  return `${totalMinutes} min`;
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
  const [selectedDirectionId, setSelectedDirectionId] = useState<number>(0);
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
      tripId: tripId || undefined,
      directionId: tripId ? undefined : selectedDirectionId,
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
                color={COLOR.brandGreen}
              />
              <Text style={styles.routeBadgeText}>
                {getRouteNumber(routeId, route?.shortName)}
              </Text>
            </View>

            {(routeQuery.data?.availableDirections?.length ?? 0) > 1 ? (() => {
              const dirs = routeQuery.data!.availableDirections;
              const allSameHeadsign = dirs.every(d => d.headsign === dirs[0].headsign);
              const fallbackLabels = ['Outbound', 'Return'];
              return (
                <View style={styles.directionToggle}>
                  {dirs.map((dir, i) => {
                    const label = allSameHeadsign
                      ? (fallbackLabels[i] ?? `Direction ${i + 1}`)
                      : (dir.headsign ?? `Direction ${dir.directionId}`);
                    return (
                      <TouchableOpacity
                        key={dir.directionId}
                        activeOpacity={0.84}
                        onPress={() => setSelectedDirectionId(dir.directionId)}
                        style={[
                          styles.directionOption,
                          selectedDirectionId === dir.directionId && styles.directionOptionActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.directionOptionText,
                            selectedDirectionId === dir.directionId && styles.directionOptionTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })() : null}

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
                const isPast = index <= activeStopIndex;
                const absoluteTime =
                  formatAbsoluteTime(item.scheduledAtIso) ??
                  formatGtfsTime(item.departureTime || item.arrivalTime);
                const countdownLabel = formatCountdownLabel(item.scheduledAtIso, now);
                const isFirst = index === 0;
                const isLast = index === scheduledStops.length - 1;

                const lineColor = (above: boolean) => {
                  if (above) {
                    return isFirst ? 'transparent' : (index <= activeStopIndex ? COLOR.brandGreen : '#d1d5db');
                  }
                  return isLast ? 'transparent' : (index < activeStopIndex ? COLOR.brandGreen : '#d1d5db');
                };

                return (
                  <View
                    key={`${item.stopId}-${item.stopSequence}`}
                    style={styles.timelineItem}
                  >
                    <View style={styles.timelineLineCol}>
                      <View style={[styles.timelineLineSeg, { backgroundColor: lineColor(true) }]} />
                      <View
                        style={[
                          styles.timelineDot,
                          isPast ? styles.timelineDotPast : styles.timelineDotFuture,
                          focused && styles.timelineDotFocused,
                        ]}
                      />
                      <View style={[styles.timelineLineSeg, { backgroundColor: lineColor(false) }]} />
                    </View>

                    <View style={styles.timelineContent}>
                      <View style={styles.stopRow}>
                        <View style={styles.stopCopy}>
                          <Text
                            style={[
                              styles.stopName,
                              active && styles.stopNameActive,
                              focused && styles.stopNameFocused,
                            ]}
                          >
                            {item.stop?.name ?? item.stopId}
                          </Text>
                          <Text style={styles.stopMeta}>Scheduled time</Text>

                          {focused ? (
                            <Text style={styles.stopHint}>Your selected stop</Text>
                          ) : null}

                          {active && !focused ? (
                            <Text style={styles.stopHint}>Current scheduled stop</Text>
                          ) : null}
                        </View>

                        {absoluteTime ? (
                          <View style={styles.stopTimeAside}>
                            <View
                              style={[
                                styles.stopTimePill,
                                focused && styles.stopTimePillFocused,
                              ]}
                            >
                              <MaterialCommunityIcons
                                name='clock-outline'
                                size={13}
                                color={focused ? COLOR.whiteText : COLOR.brandGreen}
                              />
                              <Text
                                style={[
                                  styles.stopTimePrimaryText,
                                  focused && styles.stopTimePrimaryTextFocused,
                                ]}
                              >
                                {countdownLabel ?? absoluteTime}
                              </Text>
                            </View>
                          </View>
                        ) : null}
                      </View>
                    </View>
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
    gap: 6,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#efefef',
  },
  routeBadgeText: {
    color: '#16202a',
    fontSize: 13,
    fontWeight: '800',
  },
  title: {
    color: '#16202a',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
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
    color: COLOR.brandGreen,
    fontSize: 14,
    fontWeight: '700',
  },
  timelineList: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineLineCol: {
    width: 28,
    alignItems: 'center',
  },
  timelineLineSeg: {
    flex: 1,
    width: 2,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineDotPast: {
    backgroundColor: COLOR.brandGreen,
  },
  timelineDotFuture: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  timelineDotFocused: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLOR.brandGreen,
    borderWidth: 2,
    borderColor: COLOR.brandGreen,
  },
  timelineContent: {
    flex: 1,
  },
  stopRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingLeft: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 121, 96, 0.10)',
  },
  stopCopy: {
    flex: 1,
    gap: 3,
  },
  stopTimeAside: {
    alignItems: 'flex-end',
  },
  stopName: {
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
  },
  stopHint: {
    color: COLOR.brandGreen,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  stopTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#efefef',
  },
  stopTimePrimaryText: {
    color: '#16202a',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 16,
  },
  stopTimePrimaryTextFocused: {
    color: COLOR.whiteText,
  },
  stopTimePillFocused: {
    backgroundColor: COLOR.brandGreen,
  },
  directionToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  directionOption: {
    flex: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#efefef',
    alignItems: 'center',
  },
  directionOptionActive: {
    backgroundColor: COLOR.brandGreen,
  },
  directionOptionText: {
    color: '#6b7e8d',
    fontSize: 13,
    fontWeight: '700',
  },
  directionOptionTextActive: {
    color: COLOR.whiteText,
    fontWeight: '800',
  },
});
