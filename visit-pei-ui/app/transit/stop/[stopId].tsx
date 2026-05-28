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
import type { TransitArrival, TransitServedRoute } from '../../../src/types/api';

const formatArrivalCountdown = (departureAtIso: string, now: number) => {
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
    return minutes === 0
      ? `${hours} hr left`
      : `${hours} hr ${minutes} min left`;
  }

  return `${totalMinutes} min left`;
};

const formatClockTime = (departureAtIso: string) =>
  new Intl.DateTimeFormat('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(departureAtIso));

const getRouteNumber = (arrival: TransitArrival) =>
  arrival.routeShortName?.trim() ||
  arrival.routeId.split(':').pop()?.trim() ||
  arrival.routeId;

const getRouteTitle = (arrival: TransitArrival) =>
  arrival.routeLongName?.trim() ||
  arrival.headsign?.trim() ||
  'Transit line';

const getServedRouteNumber = (route: TransitServedRoute) =>
  route.routeShortName?.trim() ||
  route.routeId.split(':').pop()?.trim() ||
  route.routeId;

const getServedRouteTitle = (route: TransitServedRoute) =>
  route.routeLongName?.trim() ||
  route.headsign?.trim() ||
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
  const { feedId, stopId } = useLocalSearchParams<{
    feedId?: string;
    stopId: string;
  }>();
  const [now, setNow] = useState(() => Date.now());
  const stopQuery = useTransitStopArrivalsQuery(
    {
      feedId,
      stopId: stopId ?? '',
      limit: 14,
    },
    Boolean(stopId),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  const stop = stopQuery.data?.stop ?? null;
  const arrivals = useMemo(() => stopQuery.data?.items ?? [], [stopQuery.data?.items]);
  const servedRoutes = useMemo(
    () => stopQuery.data?.servedRoutes ?? [],
    [stopQuery.data?.servedRoutes],
  );
  const groupedRoutes = useMemo(() => {
    const map = new Map<string, TransitArrival[]>();

    for (const item of arrivals) {
      const key = item.routeId;
      const current = map.get(key) ?? [];
      current.push(item);
      map.set(key, current);
    }

    return Array.from(map.entries()).map(([routeId, items]) => ({
      routeId,
      first: items[0],
      items,
    }));
  }, [arrivals]);

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
                  color={COLOR.whiteText}
                />
                <Text style={styles.primaryActionText}>Open in Maps</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Next arrivals</Text>
              <Text style={styles.sectionMeta}>{arrivals.length} trips</Text>
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
                    <View style={styles.routeBadge}>
                      <MaterialCommunityIcons
                        name='bus'
                        size={14}
                        color={COLOR.brandGreen}
                      />
                      <Text style={styles.routeBadgeText}>
                        {getRouteNumber(first)}
                      </Text>
                    </View>

                    <Text style={styles.arrivalTitle} numberOfLines={2}>
                      {getRouteTitle(first)}
                    </Text>

                    <Text style={styles.arrivalSubtitle}>
                      Upcoming: {items.slice(0, 3).map((item) => formatClockTime(item.departureAtIso)).join(', ')}
                    </Text>
                  </View>

                  <View style={styles.countdownPill}>
                    <Text style={styles.countdownPrimaryText}>
                      {formatClockTime(first.departureAtIso)}
                    </Text>
                    <View style={styles.countdownSecondaryRow}>
                      <MaterialCommunityIcons
                        name='clock-outline'
                        size={12}
                        color='#1e67c6'
                      />
                      <Text style={styles.countdownText}>
                        {formatArrivalCountdown(first.departureAtIso, now)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}

              {!stopQuery.isPending && groupedRoutes.length === 0 ? (
                <View style={styles.stateCard}>
                  <Text style={styles.stateTitle}>No arrivals right now</Text>
                  <Text style={styles.stateDescription}>
                    There are no scheduled upcoming trips for this stop right now. The lines below still serve this stop.
                  </Text>
                </View>
              ) : null}
            </View>

            {servedRoutes.length > 0 ? (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Lines serving this stop</Text>
                  <Text style={styles.sectionMeta}>{servedRoutes.length} lines</Text>
                </View>

                <View style={styles.arrivalsList}>
                  {servedRoutes.map((route) => (
                    <TouchableOpacity
                      key={route.routeId}
                      activeOpacity={0.84}
                      onPress={() =>
                        router.push({
                          pathname: '/transit/route/[routeId]',
                          params: {
                            feedId,
                            routeId: route.routeId,
                            focusStopId: stopId,
                            tripId: route.tripId ?? undefined,
                          },
                        })
                      }
                      style={styles.arrivalCard}
                    >
                      <View style={styles.arrivalMain}>
                        <View style={styles.routeBadge}>
                          <Text style={styles.routeBadgeText}>
                            {getServedRouteNumber(route)}
                          </Text>
                        </View>

                        <Text style={styles.arrivalTitle} numberOfLines={2}>
                          {getServedRouteTitle(route)}
                        </Text>

                        <Text style={styles.arrivalSubtitle}>
                          Tap to view the full line and stop sequence.
                        </Text>
                      </View>

                      <MaterialCommunityIcons
                        name='chevron-right'
                        size={22}
                        color={COLOR.brandGreen}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </>
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
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
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
    backgroundColor: '#2f8fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionText: {
    color: COLOR.whiteText,
    fontSize: 14,
    fontWeight: '800',
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
  arrivalsList: {
    gap: 12,
  },
  arrivalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 20,
    padding: 14,
    backgroundColor: '#f8fbfd',
    borderWidth: 1,
    borderColor: 'rgba(0, 121, 96, 0.08)',
  },
  arrivalMain: {
    flex: 1,
    gap: 8,
  },
  routeBadge: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: COLOR.brandGreen,
  },
  routeBadgeText: {
    color: COLOR.whiteText,
    fontSize: 13,
    fontWeight: '800',
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
    minWidth: 74,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#eaf4ff',
  },
  countdownPrimaryText: {
    color: '#16355b',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  countdownSecondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  countdownText: {
    color: '#1e67c6',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
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
});
