import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import MapView, { Marker } from '../../src/components/map';
import { COLOR } from '../../styles';
import { pickLocalized, useLocale } from '../../src/i18n';
import { usePlacesQuery } from '../../src/services/query/places/usePlacesQuery';
import { excludeRedundantUmbrellaPlaces, getPlaceTheme } from '../../src/utils/placeVisuals';
import { nativeMapProps } from '../../src/utils/mapView';
import { CategoryLandingCard } from '../../src/features/discover/category-landing-card';
import { DiscoverDrawer } from '../../src/features/discover/discover-drawer';
import { FILTER_TABS, type FilterTab } from '../../src/features/discover/constants';
import type { Place } from '../../src/types/api';

type ViewMode = 'list' | 'map';

const PEI_REGION = {
  latitude: 46.4,
  longitude: -63.4,
  latitudeDelta: 1.2,
  longitudeDelta: 2.4,
};

export default function DiscoverTab() {
  const { category } = useLocalSearchParams<{ category?: string }>();
  const { locale } = useLocale();
  const [openDrawerFor, setOpenDrawerFor] = useState<FilterTab | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    if (category && FILTER_TABS.some((t) => t.id === category)) {
      setOpenDrawerFor(category as FilterTab);
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

  // Unfiltered dataset — feeds both the landing cards' counts and the map's
  // pins, so switching view modes never triggers an extra network round-trip.
  const allPlacesQuery = usePlacesQuery({});

  const drawerQuery = usePlacesQuery(
    openDrawerFor ? { category: openDrawerFor } : {},
  );

  const allPlaces = useMemo(
    () => excludeRedundantUmbrellaPlaces(allPlacesQuery.data ?? []),
    [allPlacesQuery.data],
  );

  const drawerPlaces = useMemo(
    () => excludeRedundantUmbrellaPlaces(drawerQuery.data ?? []),
    [drawerQuery.data],
  );

  const counts = useMemo(() => {
    if (!allPlacesQuery.data) return undefined;
    const byCategory: Partial<Record<FilterTab, number>> = {};
    for (const place of allPlaces) {
      const key = place.category as FilterTab;
      if (FILTER_TABS.some((t) => t.id === key)) {
        byCategory[key] = (byCategory[key] ?? 0) + 1;
      }
    }
    return byCategory;
  }, [allPlaces, allPlacesQuery.data]);

  const mapPlaces = useMemo(
    () => allPlaces.filter((p) => p.lat != null && p.lng != null),
    [allPlaces],
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
  }, [viewMode]);

  const openPlaceDetail = (place: Place) =>
    router.push({ pathname: '/places/[id]', params: { id: place.id } });

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
                onPress={() => {
                  setViewMode('map');
                  setOpenDrawerFor(null);
                }}
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
              {...nativeMapProps}
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

            {allPlacesQuery.isPending ? (
              <View style={styles.mapLoading}>
                <Text style={styles.mapLoadingText}>Loading places…</Text>
              </View>
            ) : null}

            {!allPlacesQuery.isPending && mapPlaces.length === 0 ? (
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
                onOpen={() => openPlaceDetail(selectedPlace)}
              />
            ) : null}
          </View>
        ) : (
          <ScrollView
            style={styles.cardsScroll}
            contentContainerStyle={styles.cardsContent}
            showsVerticalScrollIndicator={false}
          >
            {FILTER_TABS.map((tab) => (
              <CategoryLandingCard
                key={tab.id}
                category={tab.id}
                count={counts?.[tab.id]}
                onPress={() => setOpenDrawerFor(tab.id)}
              />
            ))}
          </ScrollView>
        )}
      </SafeAreaView>

      <DiscoverDrawer
        category={openDrawerFor}
        places={drawerPlaces}
        isLoading={drawerQuery.isPending}
        isError={drawerQuery.isError}
        onRetry={() => drawerQuery.refetch()}
        onClose={() => setOpenDrawerFor(null)}
        onSelectPlace={openPlaceDetail}
      />
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

  /* Cards */
  cardsScroll: {
    flex: 1,
  },
  cardsContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },

  /* Map */
  mapWrap: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFill,
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
});
