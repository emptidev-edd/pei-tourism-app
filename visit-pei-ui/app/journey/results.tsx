import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Location from 'expo-location';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Surface } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLOR } from '../../styles';
import { TransitBackButton } from '../../src/features/transit/components/back-button';
import { TransitStateCard } from '../../src/features/transit/components/state-card';
import { DEFAULT_REGION } from '../../src/features/transit/constants';
import { nativeMapProps } from '../../src/utils/mapView';
import {
  degradedEstimateFromError,
  useJourneyPlanQuery,
} from '../../src/services/query/journey/useJourneyPlanQuery';
import type { JourneyItinerary, JourneyLeg } from '../../src/types/api';

/**
 * "Get there" results screen. From defaults to the device's current
 * location (same permission/fallback pattern as the Plan tab's day-plan
 * builder); To comes in via route params — either a precise `toRef`
 * (`stop:<GtfsStop.id>`, e.g. a ferry terminal, where the backend needs the
 * ref rather than a raw coordinate to route correctly) or a plain
 * `toLat`/`toLon` pair with a `toLabel` for display.
 *
 * Renders with react-native-maps (the current renderer) — migrating to
 * MapLibre is its own separate piece of work, not bundled with this screen
 * so a map-rendering regression and a journey-feature regression are never
 * ambiguous with each other.
 */

const MODE_META: Record<string, { icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string }> = {
  WALK: { icon: 'walk', color: '#667887' },
  BUS: { icon: 'bus', color: COLOR.brandGreen },
  COACH: { icon: 'bus', color: COLOR.brandGreen },
  FERRY: { icon: 'ferry', color: '#2c7be5' },
  BICYCLE: { icon: 'bike', color: '#e67e22' },
  CAR: { icon: 'car', color: '#495867' },
};

const modeMeta = (mode: string) => MODE_META[mode] ?? { icon: 'map-marker-path' as const, color: '#667887' };

const formatDuration = (sec: number) => {
  const totalMin = Math.max(1, Math.round(sec / 60));
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

const legLabel = (leg: JourneyLeg) => {
  if (leg.mode === 'WALK') return `Walk ${formatDuration(leg.durationSec)}`;
  const name = leg.route?.shortName || leg.route?.longName;
  return name ? `${modeMeta(leg.mode).icon === 'ferry' ? 'Ferry' : 'Route'} ${name}` : leg.mode;
};

export default function JourneyResultsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    toLat?: string;
    toLon?: string;
    toLabel?: string;
    toRef?: string;
  }>();

  const mapRef = useRef<MapView>(null);
  const [fromCoords, setFromCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') throw new Error('denied');
        const pos =
          (await Location.getLastKnownPositionAsync()) ??
          (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
        if (!cancelled && pos) {
          setFromCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        }
      } catch {
        if (!cancelled) {
          setFromCoords({ lat: DEFAULT_REGION.latitude, lon: DEFAULT_REGION.longitude });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toRef = params.toRef ?? null;
  const toLat = params.toLat ? Number(params.toLat) : null;
  const toLon = params.toLon ? Number(params.toLon) : null;
  const toLabel = params.toLabel ?? 'Destination';
  const to = toRef ?? (toLat != null && toLon != null ? `${toLat},${toLon}` : null);

  const query = useJourneyPlanQuery(
    fromCoords && to
      ? {
          from: `${fromCoords.lat},${fromCoords.lon}`,
          to,
          modes: ['WALK', 'TRANSIT', 'FERRY'],
        }
      : null,
  );

  const itineraries = query.data?.itineraries ?? [];
  const active: JourneyItinerary | null = itineraries[selectedIndex] ?? null;

  const mapCoordinates = useMemo(() => {
    if (!active) return [];
    return active.legs.flatMap((leg) =>
      leg.geometry.map(([latitude, longitude]) => ({ latitude, longitude })),
    );
  }, [active]);

  useEffect(() => {
    if (!mapRef.current || mapCoordinates.length < 2) return;
    mapRef.current.fitToCoordinates(mapCoordinates, {
      edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
      animated: true,
    });
  }, [mapCoordinates]);

  const degraded = query.data?.degradedEstimate ?? degradedEstimateFromError(query.error);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.heroWrap}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={DEFAULT_REGION}
          {...nativeMapProps}
        >
          {fromCoords ? (
            <Marker
              coordinate={{ latitude: fromCoords.lat, longitude: fromCoords.lon }}
              title='Your location'
              pinColor={COLOR.brandGreen}
            />
          ) : null}
          {toLat != null && toLon != null ? (
            <Marker coordinate={{ latitude: toLat, longitude: toLon }} title={toLabel} />
          ) : null}
          {active?.legs.map((leg, i) => {
            const coords = leg.geometry.map(([latitude, longitude]) => ({ latitude, longitude }));
            if (coords.length < 2) return null;
            const meta = modeMeta(leg.mode);
            return (
              <Polyline
                key={i}
                coordinates={coords}
                strokeColor={leg.route?.color ?? meta.color}
                strokeWidth={leg.mode === 'WALK' ? 3 : 5}
                lineDashPattern={leg.mode === 'WALK' ? [8, 6] : undefined}
              />
            );
          })}
        </MapView>
        <View pointerEvents='none' style={styles.heroOverlay} />
        <TransitBackButton onPress={() => router.back()} top={insets.top + 14} />
      </View>

      <Surface style={styles.contentCard} elevation={0}>
        <Text style={styles.title}>Get there</Text>
        <Text style={styles.subtitle}>To {toLabel}</Text>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {query.isPending ? (
            <TransitStateCard title='Finding your route…' description='This takes a moment on the first request.' />
          ) : null}

          {!query.isPending && itineraries.length === 0 ? (
            <TransitStateCard
              title={query.isError ? 'Journey planner unavailable' : 'No transit route found'}
              description={
                degraded
                  ? `About ${formatDuration(degraded.driveEstimateSec)} drive, or ${formatDuration(degraded.walkEstimateSec)} on foot — straight-line estimate, not a routed path.`
                  : 'Try a different time, or open in your regular maps app instead.'
              }
            />
          ) : null}

          {itineraries.map((itin, idx) => (
            <TouchableOpacity
              key={itin.id}
              activeOpacity={0.88}
              onPress={() => setSelectedIndex(idx)}
              style={[styles.itineraryCard, idx === selectedIndex && styles.itineraryCardActive]}
            >
              <View style={styles.itineraryHeaderRow}>
                <Text style={styles.itineraryDuration}>{formatDuration(itin.durationSec)}</Text>
                {itin.transfers > 0 ? (
                  <Text style={styles.itineraryMeta}>{itin.transfers} transfer{itin.transfers > 1 ? 's' : ''}</Text>
                ) : null}
              </View>

              <View style={styles.legRow}>
                {itin.legs.map((leg, i) => {
                  const meta = modeMeta(leg.mode);
                  return (
                    <View key={i} style={styles.legChip}>
                      <MaterialCommunityIcons name={meta.icon} size={14} color={leg.route?.color ?? meta.color} />
                      {idx === selectedIndex ? (
                        <Text style={styles.legChipText}>{legLabel(leg)}</Text>
                      ) : null}
                      {i < itin.legs.length - 1 ? (
                        <MaterialCommunityIcons name='chevron-right' size={14} color='#9aa7b1' />
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Surface>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLOR.background },
  heroWrap: { height: 240, backgroundColor: '#0d1b1e' },
  map: { flex: 1 },
  heroOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 70,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  contentCard: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: COLOR.surface,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: { fontSize: 20, fontWeight: '800', color: COLOR.mainText },
  subtitle: { fontSize: 14, color: '#667887', marginTop: 2, marginBottom: 14 },
  scrollContent: { gap: 12, paddingBottom: 40 },
  itineraryCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e4e9ec',
    backgroundColor: '#fbfcfd',
    padding: 14,
    gap: 8,
  },
  itineraryCardActive: {
    borderColor: COLOR.brandGreen,
    backgroundColor: '#f1f8f3',
  },
  itineraryHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itineraryDuration: { fontSize: 16, fontWeight: '800', color: COLOR.mainText },
  itineraryMeta: { fontSize: 12, color: '#667887' },
  legRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  legChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legChipText: { fontSize: 12, color: '#344050', fontWeight: '600' },
});
