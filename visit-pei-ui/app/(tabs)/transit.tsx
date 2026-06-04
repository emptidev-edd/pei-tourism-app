import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Location from 'expo-location';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Searchbar, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLOR } from '../../styles';
import { useNearbyTransitStopsQuery } from '../../src/services/query/transit/useNearbyTransitStopsQuery';
import { useTransitRoutesQuery } from '../../src/services/query/transit/useTransitRoutesQuery';
import { useTransitStopArrivalsQuery } from '../../src/services/query/transit/useTransitStopArrivalsQuery';
import type { TransitArrival, TransitRoute, TransitStop } from '../../src/types/api';

const DEFAULT_REGION = {
  latitude: 46.2382,
  longitude: -63.1311,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

const COLLAPSED_SHEET = 320;
const EXPANDED_SHEET = 560;
const DEFAULT_RADIUS = 1500;
const SHEET_MIDPOINT = (COLLAPSED_SHEET + EXPANDED_SHEET) / 2;

const clampSheetHeight = (value: number) =>
  Math.min(EXPANDED_SHEET, Math.max(COLLAPSED_SHEET, value));

const formatWalkTime = (meters?: number) => {
  if (meters == null) {
    return 'Near you';
  }

  const minutes = Math.max(1, Math.round(meters / 80));
  return `${minutes} min walk`;
};

const formatClockTime = (departureAtIso: string) =>
  new Intl.DateTimeFormat('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(departureAtIso));

const getUpcomingArrivals = (items: TransitArrival[], now: number) =>
  items.filter((item) => new Date(item.departureAtIso).getTime() >= now - 60 * 1000);

const formatArrivalTimes = (items: TransitArrival[]) =>
  items
    .slice(1, 3)
    .map((item) => {
      return formatClockTime(item.departureAtIso);
    })
    .join(', ');

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

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#020617',
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  default: {
    elevation: 10,
  },
});

const COACH_FEED = 'transitland:f-coachatlantic~pe~ca';

const formatServiceDays = (days: string[]): string => {
  const s = new Set(days);
  if (['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].every(d => s.has(d))) return 'Daily';
  if (['monday','tuesday','wednesday','thursday','friday'].every(d => s.has(d)) && !s.has('saturday') && !s.has('sunday')) return 'Mon–Fri';
  if (['monday','tuesday','wednesday','thursday','friday','saturday'].every(d => s.has(d)) && !s.has('sunday')) return 'Mon–Sat';
  if (s.has('saturday') && s.has('sunday') && !['monday','tuesday','wednesday','thursday','friday'].some(d => s.has(d))) return 'Weekends';
  const abbr: Record<string, string> = { monday:'Mon',tuesday:'Tue',wednesday:'Wed',thursday:'Thu',friday:'Fri',saturday:'Sat',sunday:'Sun' };
  return days.map(d => abbr[d] ?? d).join(', ') || 'See schedule';
};

export default function TransitTab() {
  const mapRef = useRef<MapView | null>(null);
  const sheetAnim = useRef(new Animated.Value(COLLAPSED_SHEET)).current;
  const sheetHeightRef = useRef(COLLAPSED_SHEET);
  const dragStartHeightRef = useRef(COLLAPSED_SHEET);
  const [searchText, setSearchText] = useState('');
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'nearby' | 'coach'>('nearby');
  const [locationStatus, setLocationStatus] = useState<
    'loading' | 'granted' | 'fallback'
  >('loading');
  const [userRegion, setUserRegion] = useState(DEFAULT_REGION);
  const [mapRegion, setMapRegion] = useState(DEFAULT_REGION);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let mounted = true;

    const loadLocation = async () => {
      try {
        const permission =
          await Location.requestForegroundPermissionsAsync();

        if (permission.status !== 'granted') {
          if (!mounted) return;
          setLocationStatus('fallback');
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!mounted) return;

        setUserRegion({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: 0.025,
          longitudeDelta: 0.025,
        });
        setMapRegion({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: 0.025,
          longitudeDelta: 0.025,
        });
        setLocationStatus('granted');
      } catch {
        if (!mounted) return;
        setLocationStatus('fallback');
      }
    };

    loadLocation();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const listenerId = sheetAnim.addListener(({ value }) => {
      sheetHeightRef.current = value;
    });

    return () => {
      sheetAnim.removeListener(listenerId);
    };
  }, [sheetAnim]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  const snapSheetTo = (expanded: boolean) => {
    setSheetExpanded(expanded);
    Animated.spring(sheetAnim, {
      toValue: expanded ? EXPANDED_SHEET : COLLAPSED_SHEET,
      friction: 9,
      tension: 90,
      useNativeDriver: false,
    }).start();
  };

  const sheetPanResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) =>
      Math.abs(gestureState.dy) > 6,
    onPanResponderGrant: () => {
      dragStartHeightRef.current = sheetHeightRef.current;
      sheetAnim.stopAnimation((value) => {
        dragStartHeightRef.current = value;
      });
    },
    onPanResponderMove: (_, gestureState) => {
      const nextHeight = clampSheetHeight(
        dragStartHeightRef.current - gestureState.dy,
      );
      sheetAnim.setValue(nextHeight);
    },
    onPanResponderRelease: (_, gestureState) => {
      const nextHeight = clampSheetHeight(
        dragStartHeightRef.current - gestureState.dy,
      );
      const shouldExpand =
        gestureState.vy < -0.15 || nextHeight >= SHEET_MIDPOINT;
      snapSheetTo(shouldExpand);
    },
    onPanResponderTerminate: () => {
      snapSheetTo(sheetHeightRef.current >= SHEET_MIDPOINT);
    },
  });

  const nearbyStopsQuery = useNearbyTransitStopsQuery(
    {
      lat: userRegion.latitude,
      lng: userRegion.longitude,
      radius: DEFAULT_RADIUS,
      limit: 18,
    },
    locationStatus !== 'loading',
  );

  const filteredStops = useMemo(() => {
    const nearbyStops = nearbyStopsQuery.data?.items ?? [];
    const normalized = searchText.trim().toLowerCase();

    if (!normalized) {
      return nearbyStops;
    }

    return nearbyStops.filter((stop) => {
      const name = stop.name?.toLowerCase() ?? '';
      const code = stop.code?.toLowerCase() ?? '';
      const stopId = stop.stopId.toLowerCase();
      return (
        name.includes(normalized) ||
        code.includes(normalized) ||
        stopId.includes(normalized)
      );
    });
  }, [nearbyStopsQuery.data?.items, searchText]);

  useEffect(() => {
    if (filteredStops.length === 0) {
      setSelectedStopId(null);
      return;
    }

    setSelectedStopId((current) => {
      if (current && filteredStops.some((stop) => stop.stopId === current)) {
        return current;
      }

      return filteredStops[0]?.stopId ?? null;
    });
  }, [filteredStops]);

  const selectedStop =
    filteredStops.find((stop) => stop.stopId === selectedStopId) ??
    filteredStops[0] ??
    null;

  const stopArrivalsQuery = useTransitStopArrivalsQuery(
    {
      feedId: selectedStop?.feedId,
      stopId: selectedStop?.stopId ?? '',
      limit: 8,
    },
    Boolean(selectedStop?.stopId),
  );

  const routesQuery = useTransitRoutesQuery({ feedId: COACH_FEED }, activeTab === 'coach');

  const arrivals = useMemo(() => stopArrivalsQuery.data?.items ?? [], [stopArrivalsQuery.data?.items]);
  const featuredArrivals = useMemo(() => {
    const map = new Map<string, TransitArrival[]>();

    arrivals.forEach((item) => {
      if (new Date(item.departureAtIso).getTime() < now - 60 * 1000) {
        return;
      }

      const current = map.get(item.routeId) ?? [];
      current.push(item);
      map.set(item.routeId, current);
    });

    return Array.from(map.values())
      .map((items) => items[0])
      .slice(0, 3);
  }, [arrivals, now]);

  const recenterMap = () => {
    setMapRegion(userRegion);
    mapRef.current?.animateToRegion(userRegion, 400);
  };

  const handleSelectStop = (stop: TransitStop) => {
    setSelectedStopId(stop.stopId);

    if (stop.lat != null && stop.lon != null) {
      const nextRegion = {
        latitude: stop.lat,
        longitude: stop.lon,
        latitudeDelta: 0.018,
        longitudeDelta: 0.018,
      };

      setMapRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 350);
    }
  };

  return (
    <>
      <StatusBar style='light' translucent />
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={DEFAULT_REGION}
            region={mapRegion}
            onRegionChangeComplete={setMapRegion}
            showsCompass={false}
            showsMyLocationButton={false}
            showsUserLocation={locationStatus === 'granted'}
            tintColor={COLOR.brandGreen}
          >
            {filteredStops.map((stop) => {
              if (stop.lat == null || stop.lon == null) {
                return null;
              }

              const selected = stop.stopId === selectedStop?.stopId;

              return (
                <Marker
                  key={stop.stopId}
                  coordinate={{
                    latitude: stop.lat,
                    longitude: stop.lon,
                  }}
                  onPress={() => handleSelectStop(stop)}
                >
                  <View
                    style={[
                      styles.markerWrap,
                      selected && styles.markerWrapSelected,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name='bus'
                      size={18}
                      color={COLOR.brandGreen}
                    />
                  </View>
                </Marker>
              );
            })}
          </MapView>

          <View style={styles.mapShade} />

          <View style={styles.topOverlay}>
            <Searchbar
              placeholder='Where do you want to go?'
              onChangeText={setSearchText}
              value={searchText}
              elevation={0}
              inputStyle={styles.searchInput}
              style={styles.searchbar}
              iconColor='rgba(255,255,255,0.75)'
              placeholderTextColor='rgba(255,255,255,0.58)'
            />
          </View>

          <View style={styles.floatingControls}>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={recenterMap}
              style={styles.recenterButton}
            >
              <MaterialCommunityIcons
                name='crosshairs-gps'
                size={24}
                color={COLOR.whiteText}
              />
            </TouchableOpacity>
          </View>

          <Animated.View style={[styles.sheetShell, { height: sheetAnim }]}>
            <Surface style={styles.sheet} elevation={0}>
              <View
                {...sheetPanResponder.panHandlers}
                style={styles.sheetHandleTouch}
              >
                <TouchableOpacity
                  activeOpacity={0.86}
                  onPress={() => snapSheetTo(!sheetExpanded)}
                  style={styles.sheetHandlePressable}
                >
                  <View style={styles.sheetHandle} />
                </TouchableOpacity>
              </View>

              <View style={styles.tabBar}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setActiveTab('nearby')}
                  style={[styles.tabItem, activeTab === 'nearby' && styles.tabItemActive]}
                >
                  <Text style={[styles.tabText, activeTab === 'nearby' && styles.tabTextActive]}>Nearby</Text>
                  <Text style={styles.tabCount}>{activeTab === 'nearby' ? `${filteredStops.length}` : ''}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setActiveTab('coach')}
                  style={[styles.tabItem, activeTab === 'coach' && styles.tabItemActive]}
                >
                  <Text style={[styles.tabText, activeTab === 'coach' && styles.tabTextActive]}>Coach Atlantic</Text>
                  <Text style={styles.tabCount}>{activeTab === 'coach' && routesQuery.data ? `${routesQuery.data.count}` : ''}</Text>
                </TouchableOpacity>
              </View>

              {locationStatus === 'fallback' ? (
                <View style={styles.noticeCard}>
                  <MaterialCommunityIcons
                    name='map-marker-alert-outline'
                    size={18}
                    color={COLOR.brandGreen}
                  />
                  <Text style={styles.noticeText}>
                    Using downtown Charlottetown as the default area until location
                    access is allowed.
                  </Text>
                </View>
              ) : null}

              {nearbyStopsQuery.isPending ? (
                <View style={styles.stateCard}>
                  <Text style={styles.stateTitle}>Finding nearby stops...</Text>
                  <Text style={styles.stateDescription}>
                    Loading the closest transit stops for your area.
                  </Text>
                </View>
              ) : null}

              {!nearbyStopsQuery.isPending && nearbyStopsQuery.isError ? (
                <View style={styles.stateCard}>
                  <Text style={styles.stateTitle}>Transit stops unavailable</Text>
                  <Text style={styles.stateDescription}>
                    {nearbyStopsQuery.error instanceof Error
                      ? nearbyStopsQuery.error.message
                      : 'We could not load nearby stops right now.'}
                  </Text>
                </View>
              ) : null}

              {!nearbyStopsQuery.isPending &&
              !nearbyStopsQuery.isError &&
              selectedStop ? (
                activeTab === 'nearby' ? (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.sheetContent}
                >
	                  <Surface style={styles.featuredStopCard} elevation={0}>
                    <View style={styles.featuredStopHeader}>
                      <View style={styles.featuredStopCopy}>
                        <Text style={styles.featuredStopTitle} numberOfLines={2}>
                          {selectedStop.name ?? selectedStop.stopId}
                        </Text>
                        <Text style={styles.featuredStopMeta}>
                          {selectedStop.code
                            ? `ID ${selectedStop.code}`
                            : selectedStop.stopId}
                          {' · '}
                          {formatWalkTime(selectedStop.meters)}
                        </Text>
                        {featuredArrivals.length > 0 && (
                          <Text style={styles.featuredStopRoutes} numberOfLines={1}>
                            {featuredArrivals.map(getRouteNumber).join(', ')}
                          </Text>
                        )}
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.84}
                        onPress={() =>
                          router.push({
                            pathname: '/transit/stop/[stopId]',
                            params: {
                              stopId: selectedStop.stopId,
                              feedId: selectedStop.feedId,
                            },
                          })
                        }
                        style={styles.stationButton}
	                      >
	                        <MaterialCommunityIcons
	                          name='bus-stop'
	                          size={18}
	                          color={COLOR.brandGreen}
	                        />
	                        <Text style={styles.stationButtonText}>Station</Text>
	                      </TouchableOpacity>
	                    </View>

	                    <View style={styles.arrivalsList}>
	                      {featuredArrivals.map((arrival) => (
                        <TouchableOpacity
                          key={`${arrival.routeId}-${arrival.tripId}-featured`}
                          activeOpacity={0.84}
                          onPress={() =>
                            router.push({
                              pathname: '/transit/route/[routeId]',
                              params: {
                                feedId: arrival.feedId,
                                focusDepartureAtIso: arrival.departureAtIso,
                                routeId: arrival.routeId,
                                focusStopId: selectedStop.stopId,
                                tripId: arrival.tripId,
                              },
                            })
                          }
	                          style={styles.arrivalCard}
	                        >
	                          <View style={styles.arrivalLeft}>
	                            <View style={styles.arrivalRowHeader}>
	                              <View style={styles.routeBox}>
	                                <MaterialCommunityIcons
	                                  name='bus'
	                                  size={15}
	                                  color={COLOR.brandGreen}
	                                />
	                                <View style={styles.routeBoxDivider} />
	                                <Text style={styles.routeBoxText}>
	                                  {getRouteNumber(arrival)}
	                                </Text>
	                              </View>
	                              <View style={styles.arrivalCopy}>
	                                <Text style={styles.arrivalHeadsign} numberOfLines={2}>
	                                  {getRouteTitle(arrival)}
	                                </Text>
	                                <Text style={styles.arrivalTimes}>
	                                  Scheduled time
	                                </Text>
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
	                                {formatArrivalCountdown(arrival.departureAtIso, now)}
	                              </Text>
	                            </View>
	                            <Text style={styles.countdownPillText}>
	                              {formatArrivalTimes(
	                                getUpcomingArrivals(
	                                  arrivals.filter((item) => item.routeId === arrival.routeId),
	                                  now,
	                                ),
	                              ) || formatClockTime(arrival.departureAtIso)}
	                            </Text>
	                          </View>
	                        </TouchableOpacity>
	                      ))}
	                    </View>

                    <TouchableOpacity
                      activeOpacity={0.84}
                      onPress={() =>
                        router.push({
                          pathname: '/transit/stop/[stopId]',
                          params: {
                            stopId: selectedStop.stopId,
                            feedId: selectedStop.feedId,
                          },
                        })
	                      }
	                      style={styles.viewAllButton}
	                    >
	                      <Text style={styles.viewAllText}>
	                        View all next arrivals
	                      </Text>
	                    </TouchableOpacity>
	                  </Surface>

                  <View style={styles.nearbyList}>
                    <Text style={styles.nearbyListTitle}>More nearby stops</Text>

                    {filteredStops.map((stop) => {
                      const selected = stop.stopId === selectedStop.stopId;

                      return (
                        <TouchableOpacity
                          key={stop.stopId}
                          activeOpacity={0.84}
                          onPress={() => handleSelectStop(stop)}
                          style={[
                            styles.stopRow,
                            selected && styles.stopRowSelected,
                          ]}
                        >
                          <View style={styles.stopIconWrap}>
                            <MaterialCommunityIcons
                              name='bus-stop'
                              size={18}
                              color={COLOR.brandGreen}
                            />
                          </View>

                          <View style={styles.stopCopy}>
                            <Text style={styles.stopName} numberOfLines={2}>
                              {stop.name ?? stop.stopId}
                            </Text>
                            <Text style={styles.stopMeta} numberOfLines={1}>
                              {stop.code ? `Stop ${stop.code}` : stop.stopId}
                            </Text>
                          </View>

                          <Text style={styles.stopDistance}>
                            {formatWalkTime(stop.meters)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
                ) : null
              ) : null}

              {activeTab === 'coach' ? (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
                  {routesQuery.isPending ? (
                    <View style={styles.stateCard}>
                      <Text style={styles.stateTitle}>Loading routes...</Text>
                      <Text style={styles.stateDescription}>Fetching Coach Atlantic PEI schedule.</Text>
                    </View>
                  ) : routesQuery.isError ? (
                    <View style={styles.stateCard}>
                      <Text style={styles.stateTitle}>Routes unavailable</Text>
                      <Text style={styles.stateDescription}>Could not load routes right now.</Text>
                    </View>
                  ) : (
                    <View style={styles.coachRouteList}>
                      {(routesQuery.data?.items ?? []).map((route: TransitRoute) => (
                        <TouchableOpacity
                          key={route.routeId}
                          activeOpacity={0.84}
                          onPress={() =>
                            router.push({
                              pathname: '/transit/route/[routeId]',
                              params: {
                                feedId: COACH_FEED,
                                routeId: route.routeId,
                                tripId: route.directions[0]?.tripId,
                                directionId: String(route.directions[0]?.directionId ?? 0),
                              },
                            })
                          }
                          style={styles.coachRouteRow}
                        >
                          <View style={styles.routeBox}>
                            <MaterialCommunityIcons name='bus' size={14} color={COLOR.brandGreen} />
                            <Text style={styles.routeBoxText}>
                              {route.shortName?.trim() || route.routeId.split(':').pop()?.trim() || route.routeId}
                            </Text>
                          </View>

                          <View style={styles.coachRouteCopy}>
                            <Text style={styles.coachRouteName} numberOfLines={2}>
                              {route.longName?.trim() || 'Transit route'}
                            </Text>
                          </View>

                          <View style={styles.serviceDaysBadge}>
                            <Text style={styles.serviceDaysText}>{formatServiceDays(route.serviceDays)}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </ScrollView>
              ) : null}
            </Surface>
          </Animated.View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#07131a',
  },
  container: {
    flex: 1,
    backgroundColor: '#07131a',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 18, 26, 0.18)',
  },
  topOverlay: {
    position: 'absolute',
    top: 18,
    left: 20,
    right: 20,
  },
  searchbar: {
    borderRadius: 20,
    backgroundColor: 'rgba(11, 23, 31, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchInput: {
    minHeight: 18,
    color: COLOR.whiteText,
  },
  floatingControls: {
    position: 'absolute',
    right: 20,
    top: 110,
  },
  recenterButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 23, 31, 0.92)',
    ...cardShadow,
  },
  markerWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 2,
    borderColor: COLOR.brandGreen,
  },
  markerWrapSelected: {
    backgroundColor: '#f3faf7',
    borderColor: COLOR.brandGreen,
  },
  sheetShell: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingBottom: 110,
    ...cardShadow,
  },
  sheetHandleTouch: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 14,
  },
  sheetHandlePressable: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  sheetHandle: {
    width: 56,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(17, 24, 39, 0.14)',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.07)',
    marginBottom: 14,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: COLOR.brandGreen,
  },
  tabText: {
    color: '#6b7e8d',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#16202a',
    fontWeight: '800',
  },
  tabCount: {
    color: COLOR.brandGreen,
    fontSize: 13,
    fontWeight: '700',
  },
  coachRouteList: {
    gap: 0,
  },
  coachRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 121, 96, 0.10)',
  },
  coachRouteCopy: {
    flex: 1,
  },
  coachRouteName: {
    color: '#16202a',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  serviceDaysBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#efefef',
  },
  serviceDaysText: {
    color: '#6b7e8d',
    fontSize: 11,
    fontWeight: '700',
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#f3faf7',
    marginBottom: 14,
  },
  noticeText: {
    flex: 1,
    color: '#506270',
    fontSize: 13,
    lineHeight: 18,
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
  sheetContent: {
    gap: 18,
  },
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
    color: '#6b7e8d',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
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
  arrivalAside: {
    alignItems: 'center',
    minWidth: 88,
  },
  countdownPill: {
    minWidth: 64,
    flexDirection: 'row',
    alignItems: 'center',
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
  countdownPillText: {
    color: '#6b7e8d',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 4,
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
  nearbyList: {
    gap: 0,
  },
  nearbyListTitle: {
    color: '#16202a',
    fontSize: 16,
    fontWeight: '800',
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 4,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 121, 96, 0.10)',
  },
  stopRowSelected: {
    backgroundColor: '#f3faf7',
  },
  stopIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#efefef',
  },
  stopCopy: {
    flex: 1,
    gap: 3,
  },
  stopName: {
    color: '#16202a',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  stopMeta: {
    color: '#6b7e8d',
    fontSize: 13,
    lineHeight: 18,
  },
  stopDistance: {
    color: '#6b7e8d',
    fontSize: 12,
    fontWeight: '600',
    alignSelf: 'center',
    minWidth: 52,
    textAlign: 'right',
  },
});
