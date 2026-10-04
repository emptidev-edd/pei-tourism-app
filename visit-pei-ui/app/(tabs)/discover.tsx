import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Linking,
  Platform,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLOR } from '../../styles';
import { pickLocalized, useLocale } from '../../src/i18n';
import { usePlacesQuery } from '../../src/services/query/places/usePlacesQuery';
import { getPlaceTheme } from '../../src/utils/placeVisuals';
import type { Place } from '../../src/types/api';

type ViewMode = 'list' | 'map';

const PEI_REGION = {
  latitude: 46.4,
  longitude: -63.4,
  latitudeDelta: 1.2,
  longitudeDelta: 2.4,
};

type FilterTab = 'ALL' | 'TRAIL' | 'BEACH' | 'PARK' | 'ATTRACTION';

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'TRAIL', label: 'Trails' },
  { id: 'BEACH', label: 'Beaches' },
  { id: 'PARK', label: 'Parks' },
  { id: 'ATTRACTION', label: 'Attractions' },
];

const ALL_LIMIT = 15;

const openDirections = async (
  name: string,
  lat: number | null,
  lng: number | null,
) => {
  if (lat == null || lng == null) return;
  const query = encodeURIComponent(name);
  const url = Platform.select({
    ios: `maps://maps.apple.com/?q=${query}&ll=${lat},${lng}`,
    default: `https://www.google.com/maps/search/?api=1&query=${query}@${lat},${lng}`,
  });
  if (url) await Linking.openURL(url);
};

const PlaceRow = ({
  index,
  onDirections,
  place,
}: {
  index: number;
  onDirections: () => void;
  place: Place;
}) => {
  const theme = getPlaceTheme(place.category);
  const hasCoords = place.lat != null && place.lng != null;

  return (
    <Animated.View
      entering={FadeIn.delay(Math.min(index, 15) * 40).duration(280)}
    >
      <View style={styles.row}>
        <View style={[styles.iconCircle, { backgroundColor: theme.softColor }]}>
          <Text style={[styles.iconLetter, { color: theme.accentColor }]}>
            {place.name.trim().charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.rowContent}>
          <Text style={styles.rowName} numberOfLines={1}>
            {place.name}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={hasCoords ? 0.78 : 1}
          onPress={hasCoords ? onDirections : undefined}
          style={[styles.dirBtn, !hasCoords && styles.dirBtnDisabled]}
        >
          <MaterialCommunityIcons
            name='navigation-variant'
            size={12}
            color={hasCoords ? COLOR.whiteText : COLOR.lightGray}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />
    </Animated.View>
  );
};

const RowSkeleton = () => (
  <View>
    <View style={styles.row}>
      <View style={[styles.iconCircle, styles.skeletonCircle]} />
      <View style={styles.rowContent}>
        <View style={[styles.skeletonLine, { width: '55%' }]} />
      </View>
      <View style={[styles.dirBtn, styles.skeletonCircle]} />

    </View>
    <View style={styles.divider} />
  </View>
);

export default function DiscoverTab() {
  const { category } = useLocalSearchParams<{ category?: string }>();
  const { locale } = useLocale();
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    if (category && FILTER_TABS.some((t) => t.id === category)) {
      setActiveTab(category as FilterTab);
    }
  }, [category]);

  useFocusEffect(
    useCallback(() => {
      RNStatusBar.setBarStyle('dark-content', true);
      return () => {
        RNStatusBar.setBarStyle('light-content', true);
      };
    }, [])
  );

  const placesQuery = usePlacesQuery(
    activeTab !== 'ALL' ? { category: activeTab } : {},
  );

  const displayPlaces = useMemo(() => {
    const data = placesQuery.data ?? [];
    return activeTab === 'ALL' ? data.slice(0, ALL_LIMIT) : data;
  }, [activeTab, placesQuery.data]);

  const mapPlaces = useMemo(
    () => (placesQuery.data ?? []).filter((p) => p.lat != null && p.lng != null),
    [placesQuery.data],
  );

  const selectedPlace = useMemo(
    () => mapPlaces.find((p) => p.id === selectedPlaceId) ?? null,
    [mapPlaces, selectedPlaceId],
  );

  const handleSelectPin = useCallback(
    (place: Place) => {
      setSelectedPlaceId(place.id);
      if (place.lat != null && place.lng != null) {
        mapRef.current?.animateToRegion(
          {
            latitude: place.lat,
            longitude: place.lng,
            latitudeDelta: 0.15,
            longitudeDelta: 0.15,
          },
          350,
        );
      }
    },
    [],
  );

  useEffect(() => {
    setSelectedPlaceId(null);
  }, [activeTab, viewMode]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header — Image 2 style */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Discover PEI</Text>
            <Text style={styles.headerSub}>
              Explore trails, beaches, parks & more
            </Text>
          </View>
          <View style={styles.headerRightStack}>
            <View style={styles.viewToggle}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setViewMode('list')}
                accessibilityRole='button'
                accessibilityState={{ selected: viewMode === 'list' }}
                accessibilityLabel='List view'
                style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
              >
                <MaterialCommunityIcons
                  name='format-list-bulleted'
                  size={16}
                  color={viewMode === 'list' ? COLOR.whiteText : COLOR.mutedText}
                />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setViewMode('map')}
                accessibilityRole='button'
                accessibilityState={{ selected: viewMode === 'map' }}
                accessibilityLabel='Map view'
                style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
              >
                <MaterialCommunityIcons
                  name='map-outline'
                  size={16}
                  color={viewMode === 'map' ? COLOR.whiteText : COLOR.mutedText}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.headerBadge}>
              <MaterialCommunityIcons
                name='map-marker'
                size={13}
                color={COLOR.brandGreen}
              />
              <Text style={styles.headerBadgeText}>Prince Edward Island</Text>
            </View>
          </View>
        </View>

        {/* Filter tabs — Image 3 style */}
        <View style={styles.tabBar}>
          {FILTER_TABS.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <TouchableOpacity
                key={tab.id}
                activeOpacity={0.7}
                onPress={() => setActiveTab(tab.id)}
                style={styles.tab}
              >
                <Text
                  style={[styles.tabLabel, active && styles.tabLabelActive]}
                >
                  {tab.label}
                </Text>
                {active && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.tabDivider} />

        {viewMode === 'map' ? (
          <View style={styles.mapWrap}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={PEI_REGION}
              showsCompass={false}
              showsUserLocation={false}
              tintColor={COLOR.brandGreen}
              onPress={() => setSelectedPlaceId(null)}
            >
              {mapPlaces.map((place) => {
                if (place.lat == null || place.lng == null) return null;
                const theme = getPlaceTheme(place.category);
                const selected = place.id === selectedPlaceId;
                return (
                  <Marker
                    key={place.id}
                    coordinate={{ latitude: place.lat, longitude: place.lng }}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      handleSelectPin(place);
                    }}
                  >
                    <View
                      style={[
                        styles.pinWrap,
                        { backgroundColor: theme.accentColor },
                        selected && styles.pinWrapSelected,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={theme.icon}
                        size={selected ? 18 : 14}
                        color={COLOR.whiteText}
                      />
                    </View>
                  </Marker>
                );
              })}
            </MapView>

            {placesQuery.isPending ? (
              <View style={styles.mapLoading}>
                <Text style={styles.mapLoadingText}>Loading places…</Text>
              </View>
            ) : null}

            {!placesQuery.isPending && mapPlaces.length === 0 ? (
              <View style={styles.mapLoading}>
                <MaterialCommunityIcons name='map-marker-off-outline' size={20} color={COLOR.mutedText} />
                <Text style={styles.mapLoadingText}>No places to plot for this filter</Text>
              </View>
            ) : null}

            {selectedPlace ? (
              <SelectedPlaceCard
                place={selectedPlace}
                locale={locale}
                onClose={() => setSelectedPlaceId(null)}
                onOpen={() =>
                  router.push({ pathname: '/places/[id]', params: { id: selectedPlace.id } })
                }
              />
            ) : null}
          </View>
        ) : (
        <>
        {/* Column headers */}
        <View style={styles.colHeaders}>
          <Text style={styles.colHeader}>Name</Text>
          <Text style={[styles.colHeader, { marginLeft: 'auto' as any, marginRight: 4 }]}>
            Location
          </Text>
        </View>

        {/* List */}
        {placesQuery.isPending ? (
          <Animated.FlatList
            data={[0, 1, 2, 3, 4, 5, 6]}
            keyExtractor={(i) => String(i)}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={() => <RowSkeleton />}
          />
        ) : placesQuery.isError ? (
          <View style={styles.stateCenter}>
            <MaterialCommunityIcons
              name='alert-circle-outline'
              size={40}
              color={COLOR.mutedText}
            />
            <Text style={styles.stateTitle}>Could not load places</Text>
            <TouchableOpacity
              onPress={() => placesQuery.refetch()}
              style={styles.retryBtn}
              activeOpacity={0.85}
            >
              <Text style={styles.retryLabel}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Animated.FlatList
            data={displayPlaces}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            onRefresh={() => placesQuery.refetch()}
            refreshing={placesQuery.isFetching && !placesQuery.isPending}
            ListHeaderComponent={
              displayPlaces.length > 0 ? (
                <Text style={styles.resultCount}>
                  {activeTab === 'ALL'
                    ? `Showing top ${displayPlaces.length} places`
                    : `${displayPlaces.length} ${FILTER_TABS.find((t) => t.id === activeTab)?.label.toLowerCase() ?? 'places'} found`}
                </Text>
              ) : null
            }
            renderItem={({ item, index }: { item: Place; index: number }) => (
              <PlaceRow
                place={item}
                index={index}
                onDirections={() =>
                  openDirections(item.name, item.lat, item.lng)
                }
              />
            )}
            ListEmptyComponent={
              <View style={styles.stateCenter}>
                <MaterialCommunityIcons
                  name='compass-off-outline'
                  size={40}
                  color={COLOR.lightGray}
                />
                <Text style={styles.stateTitle}>No places found</Text>
                <Text style={styles.stateSub}>
                  Try a different category
                </Text>
              </View>
            }
          />
        )}
        </>
        )}
      </SafeAreaView>
    </>
  );
}

const SelectedPlaceCard = ({
  place,
  locale,
  onClose,
  onOpen,
}: {
  place: Place;
  locale: 'en' | 'fr';
  onClose: () => void;
  onOpen: () => void;
}) => {
  const theme = getPlaceTheme(place.category);
  const displayName = pickLocalized(place.name, place.nameFr, locale);
  const displayDescription = pickLocalized(place.description, place.descriptionFr, locale);
  const location = place.community?.trim() || place.region?.trim() || 'Prince Edward Island';

  return (
    <View style={styles.selectedCard} accessibilityRole='summary'>
      <TouchableOpacity
        onPress={onOpen}
        activeOpacity={0.9}
        accessibilityRole='button'
        accessibilityLabel={`Open ${displayName}`}
        style={styles.selectedCardInner}
      >
        <View style={[styles.selectedThumb, { backgroundColor: theme.softColor }]}>
          {place.imageUrl ? (
            <Image
              source={{ uri: place.imageUrl }}
              contentFit='cover'
              transition={150}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <MaterialCommunityIcons name={theme.icon} size={26} color={theme.accentColor} />
          )}
        </View>
        <View style={styles.selectedCopy}>
          <View style={styles.selectedCategoryPill}>
            <MaterialCommunityIcons name={theme.icon} size={11} color={theme.accentColor} />
            <Text style={[styles.selectedCategoryText, { color: theme.accentColor }]}>
              {theme.label}
            </Text>
          </View>
          <Text style={styles.selectedName} numberOfLines={1}>{displayName}</Text>
          <View style={styles.selectedLocationRow}>
            <MaterialCommunityIcons name='map-marker-outline' size={12} color={COLOR.mutedText} />
            <Text style={styles.selectedLocation} numberOfLines={1}>{location}</Text>
          </View>
          {displayDescription ? (
            <Text style={styles.selectedDesc} numberOfLines={2}>{displayDescription}</Text>
          ) : null}
        </View>
        <MaterialCommunityIcons name='chevron-right' size={20} color={COLOR.mutedText} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onClose}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel='Close'
        style={styles.selectedClose}
        hitSlop={8}
      >
        <MaterialCommunityIcons name='close' size={14} color={COLOR.mutedText} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLOR.surface,
  },

  /* Header */
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: COLOR.headingText,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 14,
    color: COLOR.mutedText,
    fontWeight: '400',
    lineHeight: 20,
  },
  headerRightStack: {
    alignItems: 'flex-end',
    gap: 8,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLOR.lightGreen,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLOR.brandGreen,
  },
  viewToggle: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 999,
    backgroundColor: COLOR.backgroundSoft,
    gap: 2,
  },
  toggleBtn: {
    width: 32,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  toggleBtnActive: {
    backgroundColor: COLOR.brandGreen,
  },

  /* Map */
  mapWrap: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  pinWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLOR.whiteText,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
      default: { elevation: 3 },
    }),
  },
  pinWrapSelected: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  mapLoading: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLOR.surface,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      default: { elevation: 3 },
    }),
  },
  mapLoadingText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLOR.mutedText,
  },
  selectedCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 110,
    backgroundColor: COLOR.surface,
    borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#1c2530',
        shadowOpacity: 0.15,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      },
      default: { elevation: 8 },
    }),
  },
  selectedCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  selectedThumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCopy: {
    flex: 1,
    gap: 2,
  },
  selectedCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: COLOR.surfaceMuted,
    marginBottom: 2,
  },
  selectedCategoryText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  selectedName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLOR.headingText,
  },
  selectedLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  selectedLocation: {
    flex: 1,
    fontSize: 11,
    color: COLOR.mutedText,
    fontWeight: '500',
  },
  selectedDesc: {
    marginTop: 4,
    fontSize: 11,
    color: COLOR.mutedText,
    lineHeight: 14,
  },
  selectedClose: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLOR.surfaceMuted,
  },

  /* Tab bar */
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 10,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLOR.mutedText,
  },
  tabLabelActive: {
    fontWeight: '700',
    color: COLOR.headingText,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '15%',
    right: '15%',
    height: 2.5,
    borderRadius: 999,
    backgroundColor: COLOR.headingText,
  },
  tabDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
    marginBottom: 2,
  },

  /* Column headers */
  colHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  colHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: COLOR.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  /* List */
  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  resultCount: {
    fontSize: 12,
    color: COLOR.mutedText,
    fontWeight: '500',
    marginBottom: 4,
    paddingBottom: 6,
  },

  /* Row */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowContent: {
    flex: 1,
    gap: 4,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLOR.mainText,
  },
  dirBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLOR.brandGreen,
    flexShrink: 0,
  },
  dirBtnDisabled: {
    backgroundColor: COLOR.backgroundSoft,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
  },

  iconLetter: {
    fontSize: 17,
    fontWeight: '800',
    includeFontPadding: false,
  },

  /* Skeleton */
  skeletonCircle: {
    backgroundColor: COLOR.backgroundSoft,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: COLOR.backgroundSoft,
  },

  /* States */
  stateCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingBottom: 60,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.mainText,
  },
  stateSub: {
    fontSize: 13,
    color: COLOR.mutedText,
  },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: COLOR.brandGreen,
  },
  retryLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLOR.whiteText,
  },
});
