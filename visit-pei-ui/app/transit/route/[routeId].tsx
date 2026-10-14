import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Location from 'expo-location';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView from 'react-native-maps';
import { Surface } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLOR } from '../../../styles';
import { TransitBackButton } from '../../../src/features/transit/components/back-button';
import { DepartureCard } from '../../../src/features/transit/components/departure-card';
import { RouteMapLayer } from '../../../src/features/transit/components/route-map-layer';
import {
  RouteTimelineItem,
  type ScheduledRouteStop,
} from '../../../src/features/transit/components/route-timeline-item';
import { haversineMeters, metersToWalkMinutes } from '../../../src/features/transit/geo';
import {
  departureKey,
  formatGtfsTime,
  formatRouteClockTime,
  getStopTimeSeconds,
  isSameLocalDay,
} from '../../../src/features/transit/route-schedule';
import { getRouteNumber } from '../../../src/features/transit/transit-format';
import { useNowTick } from '../../../src/features/transit/transit-time';
import { useTransitRouteDeparturesQuery } from '../../../src/services/query/transit/useTransitRouteDeparturesQuery';
import { useTransitRouteShapeQuery } from '../../../src/services/query/transit/useTransitRouteShapeQuery';
import { useTransitRouteStopsQuery } from '../../../src/services/query/transit/useTransitRouteStopsQuery';
import type { TransitRouteDeparture } from '../../../src/types/api';
import { nativeMapProps } from '../../../src/utils/mapView';

const PREVIEW_COUNT = 4;

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
  const mapRef = useRef<MapView | null>(null);
  const now = useNowTick();
  const [directionOverride, setDirectionOverride] = useState<number | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [userCoord, setUserCoord] = useState<{ lat: number; lon: number } | null>(
    null,
  );
  const { feedId, focusStopId, routeId, tripId } = useLocalSearchParams<{
    feedId?: string;
    focusDepartureAtIso?: string;
    focusStopId?: string;
    routeId: string;
    tripId?: string;
  }>();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(tripId ?? null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const routeQuery = useTransitRouteStopsQuery(
    {
      feedId,
      routeId: routeId ?? '',
      tripId: selectedTripId || undefined,
      directionId: selectedTripId
        ? undefined
        : (directionOverride ?? undefined),
    },
    Boolean(routeId),
  );

  const activeDirectionId =
    directionOverride ??
    (routeQuery.data ? (routeQuery.data.trip.directionId ?? 0) : null);

  const departuresQuery = useTransitRouteDeparturesQuery(
    {
      feedId,
      routeId: routeId ?? '',
      directionId: activeDirectionId ?? undefined,
      stopId: focusStopId,
      days: 7,
    },
    Boolean(routeId) && activeDirectionId != null,
  );

  const departures = useMemo(
    () => departuresQuery.data?.items ?? [],
    [departuresQuery.data?.items],
  );

  useEffect(() => {
    let mounted = true;

    const loadLocation = async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (permission.status !== 'granted') return;
        const last = await Location.getLastKnownPositionAsync();
        if (!mounted || !last) return;
        setUserCoord({
          lat: last.coords.latitude,
          lon: last.coords.longitude,
        });
      } catch {
        // Walk time is optional when location is unavailable.
      }
    };

    loadLocation();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!departuresQuery.isSuccess || departuresQuery.isFetching) return;
    if (activeDirectionId == null) return;
    if (departures.some((item) => item.directionId !== activeDirectionId)) return;
    if (selectedKey && departures.some((item) => departureKey(item) === selectedKey)) {
      return;
    }

    const fallback =
      departures.find((item) => item.tripId === selectedTripId) ?? departures[0];
    if (!fallback) return;
    setSelectedKey(departureKey(fallback));
    setSelectedTripId(fallback.tripId);
  }, [
    activeDirectionId,
    departures,
    departuresQuery.isFetching,
    departuresQuery.isSuccess,
    selectedKey,
    selectedTripId,
  ]);

  const route = routeQuery.data?.route ?? null;
  const items = useMemo(() => routeQuery.data?.items ?? [], [routeQuery.data?.items]);

  const shapeQuery = useTransitRouteShapeQuery(
    {
      feedId,
      routeId: routeId as string,
      directionId: activeDirectionId ?? undefined,
    },
    Boolean(routeId),
  );

  /**
   * Prefer the feed's real road geometry. The stop-to-stop line below is only
   * a fallback for routes with no shape — it cuts straight through buildings.
   */
  const coordinates = useMemo(() => {
    const shape =
      shapeQuery.data?.shapes.find(
        (candidate) => candidate.directionId === activeDirectionId,
      ) ?? shapeQuery.data?.shapes[0];

    if (shape?.coords.length) {
      return shape.coords.map(([latitude, longitude]) => ({
        latitude,
        longitude,
      }));
    }

    return items
      .filter((item) => item.stop?.lat != null && item.stop?.lon != null)
      .map((item) => ({
        latitude: item.stop?.lat as number,
        longitude: item.stop?.lon as number,
      }));
  }, [activeDirectionId, items, shapeQuery.data]);

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

  const fitRoute = useCallback(() => {
    if (!mapRef.current || coordinates.length === 0) return;

    if (coordinates.length === 1) {
      mapRef.current.animateToRegion(
        {
          ...coordinates[0],
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        250,
      );
      return;
    }

    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: { top: 36, right: 36, bottom: 36, left: 36 },
      animated: true,
    });
  }, [coordinates]);

  useEffect(() => {
    fitRoute();
  }, [fitRoute]);

  const selectedDeparture =
    departures.find((item) => departureKey(item) === selectedKey) ??
    departures.find((item) => item.tripId === selectedTripId) ??
    null;
  const noUpcomingDepartures =
    departuresQuery.isSuccess &&
    !departuresQuery.isFetching &&
    departures.length === 0;
  const timelineReady = noUpcomingDepartures
    ? Boolean(routeQuery.data)
    : Boolean(selectedTripId) &&
      routeQuery.data?.trip?.tripId === selectedTripId;

  const anchorStop =
    items.find((item) => item.stopId === selectedDeparture?.stopId) ??
    items.find((item) => item.stopId === focusStopId) ??
    items[0] ??
    null;
  const anchorSeconds = getStopTimeSeconds(anchorStop);
  const anchorIso = selectedDeparture?.departureAtIso ?? null;

  const scheduledStops: ScheduledRouteStop[] = useMemo(() => {
    if (!anchorIso || anchorSeconds == null) {
      return items.map((item) => ({
        ...item,
        scheduledAtIso: null,
      }));
    }

    const focusedAtMs = new Date(anchorIso).getTime();

    return items.map((item) => {
      const stopSeconds = getStopTimeSeconds(item);
      if (stopSeconds == null) {
        return {
          ...item,
          scheduledAtIso: null,
        };
      }

      const offsetMs = (stopSeconds - anchorSeconds) * 1000;
      return {
        ...item,
        scheduledAtIso: new Date(focusedAtMs + offsetMs).toISOString(),
      };
    });
  }, [anchorIso, anchorSeconds, items]);

  const activeStopIndex = useMemo(() => {
    let latestReachedIndex = -1;

    scheduledStops.forEach((item, index) => {
      if (item.scheduledAtIso && new Date(item.scheduledAtIso).getTime() <= now) {
        latestReachedIndex = index;
      }
    });

    return latestReachedIndex;
  }, [now, scheduledStops]);

  const previewDepartures = useMemo(() => {
    const head = departures.slice(0, PREVIEW_COUNT);
    if (
      selectedDeparture &&
      !head.some((item) => departureKey(item) === departureKey(selectedDeparture))
    ) {
      return [selectedDeparture, ...head.slice(0, PREVIEW_COUNT - 1)];
    }
    return head;
  }, [departures, selectedDeparture]);

  const departureGroups = useMemo(() => {
    const groups: {
      key: string;
      title: string;
      items: TransitRouteDeparture[];
    }[] = [];

    for (const item of departures) {
      const date = new Date(item.departureAtIso);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const title = isSameLocalDay(item.departureAtIso, now)
        ? 'Today'
        : date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          });
      const last = groups[groups.length - 1];
      if (last?.key === key) {
        last.items.push(item);
      } else {
        groups.push({ key, title, items: [item] });
      }
    }

    return groups;
  }, [departures, now]);

  const activeDirection = routeQuery.data?.availableDirections.find(
    (direction) => direction.directionId === activeDirectionId,
  );
  const isLoop =
    Boolean(activeDirection?.headsign && /loop/i.test(activeDirection.headsign)) ||
    Boolean(
      activeDirection?.firstStopName &&
        activeDirection.firstStopName === activeDirection.lastStopName,
    );
  const directionLabel = isLoop
    ? 'Loop'
    : activeDirection?.lastStopName
      ? `To ${activeDirection.lastStopName}`
      : activeDirection?.headsign;

  const focusStop = items.find((item) => item.stopId === focusStopId) ?? null;
  const walkMinutes = useMemo(() => {
    const target = focusStop?.stop;
    if (!userCoord || target?.lat == null || target?.lon == null) return null;
    const meters = haversineMeters(
      userCoord.lat,
      userCoord.lon,
      target.lat,
      target.lon,
    );
    return metersToWalkMinutes(meters);
  }, [focusStop?.stop, userCoord]);

  const selectDirection = (directionId: number) => {
    setDirectionOverride(directionId);
    setSelectedTripId(null);
    setSelectedKey(null);
  };

  const selectDeparture = (departure: TransitRouteDeparture) => {
    setSelectedKey(departureKey(departure));
    setSelectedTripId(departure.tripId);
    setMoreOpen(false);
  };

  return (
    <>
      <StatusBar style='light' />
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.heroWrap}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={initialRegion}
              onMapReady={fitRoute}
              {...nativeMapProps}
            >
              <RouteMapLayer
                coordinates={coordinates}
                items={items}
                focusStopId={focusStopId}
                routeColor={route?.color}
              />
            </MapView>

            <View pointerEvents='none' style={styles.heroOverlay} />

            <TransitBackButton onPress={() => router.back()} top={insets.top + 14} />
          </View>

          <Surface style={styles.contentCard} elevation={0}>
            <View style={styles.routeHeader}>
              <Text style={styles.routeNumber}>
                {getRouteNumber(routeId, route?.shortName)}
              </Text>
              {directionLabel ? (
                <View style={styles.directionLabel}>
                  <MaterialCommunityIcons
                    name={isLoop ? 'sync' : 'arrow-right'}
                    size={16}
                    color={COLOR.brandGreen}
                  />
                  <Text style={styles.directionLabelText} numberOfLines={2}>
                    {directionLabel}
                  </Text>
                </View>
              ) : null}
            </View>

            {(routeQuery.data?.availableDirections?.length ?? 0) > 1 ? (
              <View style={styles.directionToggle}>
                {routeQuery.data!.availableDirections.map((dir, index) => {
                  const dirs = routeQuery.data!.availableDirections;
                  const allSameHeadsign = dirs.every(
                    (item) => item.headsign === dirs[0].headsign,
                  );
                  const fallbackLabels = ['Outbound', 'Return'];
                  const distinctHeadsign = !allSameHeadsign && dir.headsign?.trim();
                  const label =
                    distinctHeadsign ||
                    (dir.lastStopName?.trim()
                      ? `To ${dir.lastStopName.trim()}`
                      : fallbackLabels[index] ?? `Direction ${index + 1}`);
                  const active = activeDirectionId === dir.directionId;
                  return (
                    <TouchableOpacity
                      key={dir.directionId}
                      activeOpacity={0.84}
                      onPress={() => selectDirection(dir.directionId)}
                      style={[
                        styles.directionOption,
                        active && styles.directionOptionActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.directionOptionText,
                          active && styles.directionOptionTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            <Text style={styles.title}>
              {route?.longName?.trim() || 'Transit route'}
            </Text>

            {departuresQuery.isPending ? (
              <Text style={styles.scheduleStatus}>Loading departures...</Text>
            ) : null}

            {departuresQuery.isError ? (
              <Text style={styles.scheduleStatus}>
                Departures are unavailable right now.
              </Text>
            ) : null}

            {!departuresQuery.isPending &&
            !departuresQuery.isError &&
            departures.length === 0 ? (
              <Text style={styles.scheduleStatus}>
                No upcoming departures in the next 7 days.
              </Text>
            ) : null}

            {previewDepartures.length > 0 ? (
              <ScrollView
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.departureRow}
              >
                {previewDepartures.map((departure) => (
                  <DepartureCard
                    key={departureKey(departure)}
                    departure={departure}
                    now={now}
                    selected={
                      selectedDeparture != null &&
                      departureKey(departure) === departureKey(selectedDeparture)
                    }
                    onPress={() => selectDeparture(departure)}
                  />
                ))}
                <TouchableOpacity
                  activeOpacity={0.84}
                  onPress={() => setMoreOpen(true)}
                  style={styles.moreCard}
                >
                  <MaterialCommunityIcons
                    name='clock-outline'
                    size={22}
                    color={COLOR.brandGreen}
                  />
                  <Text style={styles.moreTitle}>More</Text>
                  <Text style={styles.moreSubtitle}>departures</Text>
                </TouchableOpacity>
              </ScrollView>
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

            {routeQuery.isError ? (
              <Text style={styles.scheduleStatus}>
                Stops are unavailable right now.
              </Text>
            ) : !timelineReady ? (
              <Text style={styles.scheduleStatus}>Loading stops...</Text>
            ) : (
              <View style={styles.timelineList}>
                {scheduledStops.map((item, index) => {
                  const focused = item.stopId === focusStopId;
                  const absoluteTime =
                    formatRouteClockTime(item.scheduledAtIso) ??
                    formatGtfsTime(item.departureTime || item.arrivalTime);

                  return (
                    <RouteTimelineItem
                      key={`${item.stopId}-${item.stopSequence}`}
                      item={item}
                      index={index}
                      activeStopIndex={activeStopIndex}
                      isFirst={index === 0}
                      isLast={index === scheduledStops.length - 1}
                      focused={focused}
                      walkMinutes={walkMinutes}
                      absoluteTime={absoluteTime}
                    />
                  );
                })}
              </View>
            )}
          </Surface>
        </ScrollView>

        <Modal
          visible={moreOpen}
          animationType='slide'
          transparent
          onRequestClose={() => setMoreOpen(false)}
        >
          <View style={styles.sheetBackdrop}>
            <View style={[styles.moreSheet, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.moreSheetHeader}>
                <Text style={styles.moreSheetTitle}>All departures</Text>
                <TouchableOpacity
                  accessibilityRole='button'
                  onPress={() => setMoreOpen(false)}
                  style={styles.moreClose}
                >
                  <MaterialCommunityIcons name='close' size={20} color='#16202a' />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {departureGroups.map((group) => (
                  <View key={group.key} style={styles.moreGroup}>
                    <Text style={styles.moreGroupTitle}>{group.title}</Text>
                    {group.items.map((item) => {
                      const selected =
                        selectedDeparture != null &&
                        departureKey(item) === departureKey(selectedDeparture);
                      return (
                        <TouchableOpacity
                          key={departureKey(item)}
                          activeOpacity={0.84}
                          onPress={() => selectDeparture(item)}
                          style={[
                            styles.moreRow,
                            selected && styles.moreRowSelected,
                          ]}
                        >
                          <Text style={styles.moreRowTime}>
                            {formatRouteClockTime(item.departureAtIso)}
                          </Text>
                          <Text style={styles.moreRowMeta} numberOfLines={1}>
                            {item.headsign?.trim() || 'Scheduled'}
                          </Text>
                          {item.isLastOfDay ? (
                            <Text style={styles.moreLast}>Last</Text>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
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
    ...StyleSheet.absoluteFill,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7, 38, 48, 0.16)',
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
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  routeNumber: {
    color: '#16202a',
    fontSize: 42,
    fontWeight: '800',
    lineHeight: 46,
  },
  directionLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  directionLabelText: {
    flex: 1,
    color: '#16202a',
    fontSize: 16,
    fontWeight: '700',
  },
  title: {
    color: '#16202a',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  scheduleStatus: {
    color: '#667887',
    fontSize: 14,
    lineHeight: 20,
  },
  departureRow: {
    gap: 10,
    paddingRight: 4,
  },
  moreCard: {
    width: 112,
    minHeight: 96,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#efefef',
    justifyContent: 'center',
    gap: 2,
  },
  moreTitle: {
    color: '#16202a',
    fontSize: 16,
    fontWeight: '800',
  },
  moreSubtitle: {
    color: '#6b7e8d',
    fontSize: 13,
    fontWeight: '700',
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
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(7, 19, 26, 0.45)',
  },
  moreSheet: {
    maxHeight: '78%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  moreSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  moreSheetTitle: {
    color: '#16202a',
    fontSize: 20,
    fontWeight: '800',
  },
  moreClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#efefef',
  },
  moreGroup: {
    paddingBottom: 12,
  },
  moreGroupTitle: {
    color: '#16202a',
    fontSize: 15,
    fontWeight: '800',
    paddingVertical: 10,
  },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 121, 96, 0.10)',
  },
  moreRowSelected: {
    backgroundColor: '#f3faf7',
  },
  moreRowTime: {
    width: 64,
    color: '#16202a',
    fontSize: 16,
    fontWeight: '800',
  },
  moreRowMeta: {
    flex: 1,
    color: '#6b7e8d',
    fontSize: 14,
    fontWeight: '600',
  },
  moreLast: {
    color: COLOR.brandGreen,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});
