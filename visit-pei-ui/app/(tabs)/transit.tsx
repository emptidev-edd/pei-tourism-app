import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Location from 'expo-location';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView from 'react-native-maps';
import { Searchbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLOR } from '../../styles';
import { CoachRouteRow } from '../../src/features/transit/components/coach-route-row';
import { FeaturedStopCard } from '../../src/features/transit/components/featured-stop-card';
import { LocationNotice } from '../../src/features/transit/components/location-notice';
import { StopMarkersLayer } from '../../src/features/transit/components/stop-markers-layer';
import { StopRow } from '../../src/features/transit/components/stop-row';
import { TransitStateCard } from '../../src/features/transit/components/state-card';
import { TransitBottomSheet } from '../../src/features/transit/components/transit-bottom-sheet';
import { TransitTabBar, type TransitTabId } from '../../src/features/transit/components/transit-tab-bar';
import { COACH_FEED, DEFAULT_RADIUS, DEFAULT_REGION } from '../../src/features/transit/constants';
import {
  favoriteToTransitStop,
  toFavoriteStop,
  useFavoriteStops,
  type FavoriteStop,
} from '../../src/features/transit/favorite-stops';
import { formatWalkTime } from '../../src/features/transit/transit-format';
import { useNowTick } from '../../src/features/transit/transit-time';
import { useNearbyTransitStopsQuery } from '../../src/services/query/transit/useNearbyTransitStopsQuery';
import { useTransitRoutesQuery } from '../../src/services/query/transit/useTransitRoutesQuery';
import { useTransitStopArrivalsQuery } from '../../src/services/query/transit/useTransitStopArrivalsQuery';
import { nativeMapProps } from '../../src/utils/mapView';
import type { TransitArrival, TransitRoute, TransitStop } from '../../src/types/api';

export default function TransitTab() {
  const mapRef = useRef<MapView | null>(null);
  const hasCenteredRef = useRef(false);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState<TransitTabId>('nearby');
  const { favorites, isFavorite, toggleFavorite } = useFavoriteStops();
  const [locationStatus, setLocationStatus] = useState<
    'loading' | 'granted' | 'fallback'
  >('loading');
  const [userRegion, setUserRegion] = useState(DEFAULT_REGION);
  const [mapRegion, setMapRegion] = useState(DEFAULT_REGION);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const now = useNowTick();

  useEffect(() => {
    let mounted = true;
    let subscription: Location.LocationSubscription | null = null;

    const applyPosition = (position: Location.LocationObject) => {
      if (!mounted) return;
      const nextRegion = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      };
      setUserRegion(nextRegion);
      setLocationStatus('granted');
      if (!hasCenteredRef.current) {
        hasCenteredRef.current = true;
        setMapRegion(nextRegion);
        mapRef.current?.animateToRegion(nextRegion, 500);
      }
    };

    const startLocation = async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();

        if (permission.status !== 'granted') {
          if (!mounted) return;
          setLocationStatus('fallback');
          return;
        }

        // Quick start: use last known position for immediate stop results
        const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
        if (mounted && last) {
          applyPosition(last);
        }

        if (!mounted) return;

        // Continuous watch: keeps updating as GPS accuracy improves or user moves
        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 30 },
          applyPosition,
        );

        // The effect may have cleaned up while this await was in flight —
        // without this check the subscription above would never be removed.
        if (!mounted) {
          sub.remove();
          return;
        }

        subscription = sub;
      } catch {
        if (!mounted) return;
        setLocationStatus('fallback');
      }
    };

    startLocation();

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, []);

  const nearbyStopsQuery = useNearbyTransitStopsQuery({
    lat: userRegion.latitude,
    lng: userRegion.longitude,
    radius: DEFAULT_RADIUS,
    limit: 18,
  });

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

  // Falls back to the first stop whenever the explicit selection is no
  // longer in the current list (e.g. search/filtering dropped it) — derived
  // during render rather than re-synced via an effect, so there's no extra
  // render with a stale selection in between.
  const effectiveStopId =
    selectedStopId &&
    (filteredStops.some((stop) => stop.stopId === selectedStopId) ||
      favorites.some((favorite) => favorite.stopId === selectedStopId))
      ? selectedStopId
      : (filteredStops[0]?.stopId ?? null);

  const selectedFavorite =
    favorites.find((favorite) => favorite.stopId === effectiveStopId) ?? null;

  const selectedStop =
    filteredStops.find((stop) => stop.stopId === effectiveStopId) ??
    (selectedFavorite ? favoriteToTransitStop(selectedFavorite) : null) ??
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

  const handleSelectFavorite = (favorite: FavoriteStop) => {
    setActiveTab('nearby');
    handleSelectStop(favoriteToTransitStop(favorite));
  };

  const goToStopDetails = (stop: TransitStop) =>
    router.push({
      pathname: '/transit/stop/[stopId]',
      params: { stopId: stop.stopId, feedId: stop.feedId },
    });

  const goToRouteDetails = (arrival: TransitArrival, stop: TransitStop) =>
    router.push({
      pathname: '/transit/route/[routeId]',
      params: {
        feedId: arrival.feedId,
        focusDepartureAtIso: arrival.departureAtIso,
        routeId: arrival.routeId,
        focusStopId: stop.stopId,
        tripId: arrival.tripId,
      },
    });

  return (
    <>
      <StatusBar style='light' />
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
            {...nativeMapProps}
          >
            <StopMarkersLayer
              stops={filteredStops}
              selectedStopId={selectedStop?.stopId}
              onSelectStop={handleSelectStop}
            />
          </MapView>

          <View pointerEvents='none' style={styles.mapShade} />

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

          <TransitBottomSheet>
            <TransitTabBar
              activeTab={activeTab}
              onChangeTab={setActiveTab}
              nearbyCount={filteredStops.length}
              favoritesCount={favorites.length}
              routesCount={routesQuery.data?.count ?? null}
            />

            {locationStatus === 'fallback' ? <LocationNotice /> : null}

            {activeTab === 'nearby' && nearbyStopsQuery.isPending ? (
              <TransitStateCard
                title='Finding nearby stops...'
                description='Loading the closest transit stops for your area.'
              />
            ) : null}

            {activeTab === 'nearby' && !nearbyStopsQuery.isPending && nearbyStopsQuery.isError ? (
              <TransitStateCard
                title='Transit stops unavailable'
                description={
                  nearbyStopsQuery.error instanceof Error
                    ? nearbyStopsQuery.error.message
                    : 'We could not load nearby stops right now.'
                }
              />
            ) : null}

            {!nearbyStopsQuery.isPending &&
            !nearbyStopsQuery.isError &&
            selectedStop &&
            activeTab === 'nearby' ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sheetContent}
              >
                <FeaturedStopCard
                  stop={selectedStop}
                  featuredArrivals={featuredArrivals}
                  arrivals={arrivals}
                  now={now}
                  favorite={isFavorite(selectedStop.stopId)}
                  onToggleFavorite={() => toggleFavorite(toFavoriteStop(selectedStop))}
                  onPressStation={() => goToStopDetails(selectedStop)}
                  onPressArrival={(arrival) => goToRouteDetails(arrival, selectedStop)}
                  onViewAll={() => goToStopDetails(selectedStop)}
                />

                <View style={styles.nearbyList}>
                  <Text style={styles.nearbyListTitle}>More nearby stops</Text>

                  {filteredStops.map((stop) => (
                    <StopRow
                      key={stop.stopId}
                      name={stop.name ?? stop.stopId}
                      meta={stop.code ? `Stop ${stop.code}` : stop.stopId}
                      selected={stop.stopId === selectedStop.stopId}
                      onPress={() => handleSelectStop(stop)}
                      right={
                        <Text style={styles.stopDistance}>
                          {formatWalkTime(stop.meters)}
                        </Text>
                      }
                    />
                  ))}
                </View>
              </ScrollView>
            ) : null}

            {activeTab === 'favorites' ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sheetContent}
              >
                {favorites.length === 0 ? (
                  <TransitStateCard
                    title='No favorite stops yet'
                    description='Tap the star on a stop to save it here for quick access.'
                  />
                ) : (
                  <View style={styles.nearbyList}>
                    {favorites.map((favorite) => (
                      <StopRow
                        key={favorite.stopId}
                        name={favorite.name ?? favorite.stopId}
                        meta={favorite.code ? `Stop ${favorite.code}` : favorite.stopId}
                        onPress={() => handleSelectFavorite(favorite)}
                        right={
                          <TouchableOpacity
                            activeOpacity={0.8}
                            hitSlop={8}
                            onPress={() => toggleFavorite(favorite)}
                          >
                            <MaterialCommunityIcons name='star' size={20} color={COLOR.brandGreen} />
                          </TouchableOpacity>
                        }
                      />
                    ))}
                  </View>
                )}
              </ScrollView>
            ) : null}

            {activeTab === 'coach' ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
                {routesQuery.isPending ? (
                  <TransitStateCard title='Loading routes...' description='Fetching routes.' />
                ) : routesQuery.isError ? (
                  <TransitStateCard
                    title='Routes unavailable'
                    description='Could not load routes right now.'
                  />
                ) : (
                  <View style={styles.coachRouteList}>
                    {(routesQuery.data?.items ?? []).map((route: TransitRoute) => (
                      <CoachRouteRow
                        key={route.routeId}
                        route={route}
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
                      />
                    ))}
                  </View>
                )}
              </ScrollView>
            ) : null}
          </TransitBottomSheet>
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
    ...StyleSheet.absoluteFill,
  },
  mapShade: {
    ...StyleSheet.absoluteFill,
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
    shadowColor: '#020617',
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  sheetContent: {
    gap: 18,
  },
  nearbyList: {
    gap: 0,
  },
  nearbyListTitle: {
    color: '#16202a',
    fontSize: 16,
    fontWeight: '800',
  },
  stopDistance: {
    color: '#6b7e8d',
    fontSize: 12,
    fontWeight: '600',
    alignSelf: 'center',
    minWidth: 52,
    textAlign: 'right',
  },
  coachRouteList: {
    gap: 0,
  },
});
