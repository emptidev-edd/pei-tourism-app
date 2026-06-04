import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Surface } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLOR } from '../../../styles';
import { useTransitStopArrivalsQuery } from '../../../src/services/query/transit/useTransitStopArrivalsQuery';
import { useTransitStopScheduleQuery } from '../../../src/services/query/transit/useTransitStopScheduleQuery';
import type { TransitArrival, TransitServedRoute } from '../../../src/types/api';

const formatClockTime = (departureAtIso: string) =>
  new Intl.DateTimeFormat('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(departureAtIso));

const formatCountdownLabel = (departureAtIso: string, now: number) => {
  const diffMs = new Date(departureAtIso).getTime() - now;
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

const getRouteNumber = (arrival: TransitArrival) =>
  arrival.routeShortName?.trim() ||
  arrival.routeId.split(':').pop()?.trim() ||
  arrival.routeId;

const getRouteTitle = (arrival: TransitArrival) =>
  arrival.routeLongName?.trim() ||
  arrival.headsign?.trim() ||
  'Transit line';

const openStopInMaps = async (lat: number | null, lon: number | null, label: string) => {
  if (lat == null || lon == null) {
    return;
  }

  const query = encodeURIComponent(label);
  const url = Platform.select({
    ios: `maps://maps.apple.com/?q=${query}&ll=${lat},${lon}`,
    default: `https://www.google.com/maps/search/?api=1&query=${query}@${lat},${lon}`,
  });

  if (url) {
    await Linking.openURL(url);
  }
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

export default function StopDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(() => Date.now());
  const { feedId, stopId } = useLocalSearchParams<{
    feedId?: string;
    stopId: string;
  }>();
  const stopQuery = useTransitStopArrivalsQuery(
    {
      feedId,
      stopId: stopId ?? '',
      limit: 14,
    },
    Boolean(stopId),
  );
  const [showFullSchedule, setShowFullSchedule] = useState(false);
  const scheduleQuery = useTransitStopScheduleQuery(
    { feedId, stopId: stopId ?? '' },
    showFullSchedule && Boolean(stopId),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  const stop = stopQuery.data?.stop ?? null;
  const arrivals = useMemo(() => stopQuery.data?.items ?? [], [stopQuery.data?.items]);
  const groupedRoutes = useMemo(() => {
    const map = new Map<string, TransitArrival[]>();

    for (const item of arrivals) {
      const key = item.routeId;
      const current = map.get(key) ?? [];
      current.push(item);
      map.set(key, current);
    }

    return Array.from(map.entries())
      .map(([routeId, items]) => {
        const upcomingItems = items.filter(
          (item) => new Date(item.departureAtIso).getTime() >= now - 60 * 1000,
        );

        if (upcomingItems.length === 0) {
          return null;
        }

        return {
          routeId,
          first: upcomingItems[0],
          items: upcomingItems,
        };
      })
      .filter(Boolean) as {
      routeId: string;
      first: TransitArrival;
      items: TransitArrival[];
    }[];
  }, [arrivals, now]);

  const mapRegion = stop?.lat != null && stop.lon != null
    ? {
        latitude: stop.lat,
        longitude: stop.lon,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : undefined;

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
            {mapRegion ? (
              <MapView
                style={styles.map}
                initialRegion={mapRegion}
                region={mapRegion}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
              >
                <Marker
                  coordinate={{
                    latitude: mapRegion.latitude,
                    longitude: mapRegion.longitude,
                  }}
                >
                  <View style={styles.markerWrap}>
                    <MaterialCommunityIcons
                      name='bus-stop'
                      size={18}
                      color={COLOR.whiteText}
                    />
                  </View>
                </Marker>
              </MapView>
            ) : (
              <View style={styles.mapFallback}>
                <MaterialCommunityIcons
                  name='bus-stop'
                  size={34}
                  color={COLOR.whiteText}
                />
              </View>
            )}

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
            <Text style={styles.title}>{stop?.name ?? stopId}</Text>
            <Text style={styles.subtitle}>
              {stop?.code ? `Stop ${stop.code}` : stopId}
            </Text>

            <View style={styles.actionRow}>
              <TouchableOpacity
                activeOpacity={0.84}
                onPress={() =>
                  openStopInMaps(
                    stop?.lat ?? null,
                    stop?.lon ?? null,
                    stop?.name ?? stopId ?? 'Transit stop',
                  )
                }
                style={styles.primaryAction}
              >
                <MaterialCommunityIcons
                  name='map-marker-right'
                  size={18}
                  color={COLOR.brandGreen}
                />
                <Text style={styles.primaryActionText}>Open in Maps</Text>
              </TouchableOpacity>
            </View>

            {(stopQuery.data?.servedRoutes?.length ?? 0) > 0 ? (
              <View style={styles.servedRoutesRow}>
                {stopQuery.data!.servedRoutes.map((r: TransitServedRoute) => (
                  <View key={r.routeId} style={styles.servedRouteBadge}>
                    <MaterialCommunityIcons name='bus' size={12} color={COLOR.brandGreen} />
                    <Text style={styles.servedRouteText}>
                      {r.routeShortName?.trim() || r.routeId.split(':').pop()?.trim() || r.routeId}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View>
              <Text style={styles.arrivalsTitle}>Next arrivals</Text>
              <Text style={styles.arrivalsSubtitle}>Upcoming arrivals of lines to this station</Text>
            </View>

            <View style={styles.arrivalsList}>
              {groupedRoutes.map(({ routeId, first, items }) => (
                <TouchableOpacity
                  key={routeId}
                  activeOpacity={0.84}
                  onPress={() =>
                    router.push({
                      pathname: '/transit/route/[routeId]',
                      params: {
                        feedId: first.feedId,
                        focusDepartureAtIso: first.departureAtIso,
                        routeId,
                        focusStopId: stopId,
                        tripId: first.tripId,
                      },
                    })
                  }
                  style={styles.arrivalCard}
                >
                  <View style={styles.arrivalMain}>
                    <View style={styles.arrivalRowHeader}>
                      <View style={styles.routeBadge}>
                        <View style={styles.routeBadgeInner}>
                          <MaterialCommunityIcons name='bus' size={13} color={COLOR.brandGreen} />
                          <Text style={styles.routeBadgeText}>{getRouteNumber(first)}</Text>
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

                  <View style={styles.arrivalAside}>
                    <View style={styles.countdownPill}>
                      <MaterialCommunityIcons
                        name='clock-outline'
                        size={14}
                        color={COLOR.brandGreen}
                      />
                      <Text style={styles.countdownPrimaryText}>
                        {formatCountdownLabel(first.departureAtIso, now)}
                      </Text>
                    </View>
                    <Text style={styles.countdownText}>
                      {items.slice(1, 3).map((item) => formatClockTime(item.departureAtIso)).join(', ') ||
                        formatClockTime(first.departureAtIso)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              {!stopQuery.isPending && groupedRoutes.length === 0 ? (
                <View style={styles.stateCard}>
                  <Text style={styles.stateTitle}>No arrivals right now</Text>
                  <Text style={styles.stateDescription}>
                    There are no scheduled upcoming trips for this stop right now.
                  </Text>
                </View>
              ) : null}
            </View>

            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => setShowFullSchedule((v) => !v)}
              style={styles.scheduleToggle}
            >
              <MaterialCommunityIcons
                name={showFullSchedule ? 'chevron-up' : 'clock-outline'}
                size={16}
                color={COLOR.brandGreen}
              />
              <Text style={styles.scheduleToggleText}>
                {showFullSchedule ? 'Hide full schedule' : "Today's full schedule"}
              </Text>
            </TouchableOpacity>

            {showFullSchedule ? (
              <View style={styles.fullScheduleSection}>
                {scheduleQuery.isPending ? (
                  <Text style={styles.scheduleLoadingText}>Loading...</Text>
                ) : (scheduleQuery.data?.items ?? []).length === 0 ? (
                  <Text style={styles.scheduleLoadingText}>No departures found for today.</Text>
                ) : (
                  <View style={styles.scheduleTimeGrid}>
                    {(scheduleQuery.data?.items ?? []).map((item, idx) => (
                      <View key={`${item.tripId}-${idx}`} style={styles.scheduleTimeChip}>
                        <Text style={styles.scheduleTimeChipText}>
                          {new Intl.DateTimeFormat('en-CA', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(item.departureAtIso))}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : null}
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
    height: 250,
    backgroundColor: '#0d1b23',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f1b24',
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
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLOR.brandGreen,
  },
  contentCard: {
    marginTop: -26,
    marginHorizontal: 16,
    borderRadius: 30,
    backgroundColor: '#ffffff',
    padding: 20,
    gap: 18,
    ...cardShadow,
  },
  title: {
    color: '#16202a',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  subtitle: {
    color: '#6b7e8d',
    fontSize: 15,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
  },
  primaryAction: {
    minHeight: 50,
    borderRadius: 999,
    paddingHorizontal: 16,
    backgroundColor: COLOR.lightGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionText: {
    color: COLOR.brandGreen,
    fontSize: 14,
    fontWeight: '800',
  },
  arrivalsTitle: {
    color: '#16202a',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  arrivalsSubtitle: {
    color: '#6b7e8d',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  arrivalsList: {
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
  arrivalMain: {
    flex: 1,
    gap: 6,
  },
  arrivalRowHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  arrivalAside: {
    alignItems: 'center',
    minWidth: 88,
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
  countdownPill: {
    minWidth: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#efefef',
    gap: 6,
  },
  countdownPrimaryText: {
    color: '#16202a',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  countdownText: {
    color: '#6b7e8d',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 4,
  },
  stateCard: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: '#f5f8fb',
    gap: 8,
  },
  stateTitle: {
    color: '#16202a',
    fontSize: 16,
    fontWeight: '800',
  },
  stateDescription: {
    color: '#667887',
    fontSize: 14,
    lineHeight: 20,
  },
  servedRoutesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  servedRouteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#efefef',
  },
  servedRouteText: {
    color: '#16202a',
    fontSize: 12,
    fontWeight: '700',
  },
  scheduleToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 121, 96, 0.10)',
  },
  scheduleToggleText: {
    color: COLOR.brandGreen,
    fontSize: 14,
    fontWeight: '700',
  },
  fullScheduleSection: {
    gap: 0,
  },
  fullScheduleTitle: {
    color: '#16202a',
    fontSize: 15,
    fontWeight: '800',
    paddingBottom: 10,
  },
  scheduleLoadingText: {
    color: '#6b7e8d',
    fontSize: 14,
    paddingVertical: 8,
  },
  routeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#efefef',
  },
  routeBoxText: {
    color: '#16202a',
    fontSize: 13,
    fontWeight: '800',
  },
  scheduleTimeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 4,
  },
  scheduleTimeChip: {
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#efefef',
  },
  scheduleTimeChipText: {
    color: '#16202a',
    fontSize: 14,
    fontWeight: '700',
  },
});
