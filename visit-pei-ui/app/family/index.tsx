import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLOR } from '../../styles';
import { usePlacesQuery } from '../../src/services/query/places/usePlacesQuery';
import { getPlaceTheme } from '../../src/utils/placeVisuals';
import type { Place } from '../../src/types/api';

const FAMILY_THEME = getPlaceTheme('FAMILY_FUN');
const ALL_LIMIT = 20;

type TypeTab = 'ALL' | 'ATTRACTION' | 'OUTDOOR' | 'INDOOR';

const TYPE_TABS: { id: TypeTab; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'ATTRACTION', label: 'Attractions' },
  { id: 'OUTDOOR', label: 'Outdoor' },
  { id: 'INDOOR', label: 'Indoor' },
];

const openDirections = async (name: string, lat: number | null, lng: number | null) => {
  if (lat == null || lng == null) return;
  const query = encodeURIComponent(name);
  const url = Platform.select({
    ios: `maps://maps.apple.com/?q=${query}&ll=${lat},${lng}`,
    default: `https://www.google.com/maps/search/?api=1&query=${query}@${lat},${lng}`,
  });
  if (url) await Linking.openURL(url);
};

const PlaceRow = ({ index, place }: { index: number; place: Place }) => {
  const location = place.community?.trim() || place.region?.trim() || 'Prince Edward Island';
  const hasCoords = place.lat != null && place.lng != null;

  return (
    <Animated.View entering={FadeIn.delay(Math.min(index, 15) * 40).duration(280)}>
      <View style={styles.row}>
        <View style={[styles.iconCircle, { backgroundColor: FAMILY_THEME.softColor }]}>
          <Text style={[styles.iconLetter, { color: FAMILY_THEME.accentColor }]}>
            {place.name.trim().charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.rowContent}>
          <Text style={styles.rowName} numberOfLines={1}>{place.name}</Text>
          <View style={styles.rowLocationRow}>
            <MaterialCommunityIcons name='map-marker-outline' size={12} color={COLOR.mutedText} />
            <Text style={styles.rowLocation} numberOfLines={1}>{location}</Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={hasCoords ? 0.78 : 1}
          onPress={hasCoords ? () => openDirections(place.name, place.lat, place.lng) : undefined}
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
        <View style={[styles.skeletonLine, { width: '35%', marginTop: 6 }]} />
      </View>
      <View style={[styles.dirBtn, styles.skeletonCircle]} />
    </View>
    <View style={styles.divider} />
  </View>
);

export default function FamilyScreen() {
  const [typeTab, setTypeTab] = useState<TypeTab>('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [searchText, setSearchText] = useState('');

  const familyQuery = usePlacesQuery({ category: 'FAMILY_FUN' });
  const allPlaces = familyQuery.data ?? [];

  const locations = useMemo(() => {
    const counts = new Map<string, number>();
    allPlaces.forEach((p) => {
      const c = p.community?.trim();
      if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  }, [allPlaces]);

  const displayPlaces = useMemo(() => {
    let data = allPlaces;

    if (typeTab === 'ATTRACTION') {
      data = data.filter((p) => p.tags.some((t) => t === 'attraction' || t === 'theme-park' || t === 'zoo' || t === 'aquarium' || t === 'marine'));
    } else if (typeTab === 'OUTDOOR') {
      data = data.filter((p) => p.tags.some((t) => t === 'outdoor' || t === 'mini-golf'));
    } else if (typeTab === 'INDOOR') {
      data = data.filter((p) => p.tags.some((t) => t === 'indoor' || t === 'cinema' || t === 'bowling' || t === 'arcade'));
    }

    if (locationFilter !== 'ALL') {
      data = data.filter((p) => p.community?.trim() === locationFilter);
    }

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      data = data.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description?.toLowerCase().includes(q) ?? false),
      );
    }

    if (typeTab === 'ALL' && locationFilter === 'ALL' && !searchText.trim()) {
      return data.slice(0, ALL_LIMIT);
    }

    return data;
  }, [allPlaces, typeTab, locationFilter, searchText]);

  const resultLabel = useMemo(() => {
    if (typeTab === 'ALL' && locationFilter === 'ALL' && !searchText.trim()) {
      return `Showing top ${displayPlaces.length} places`;
    }
    return `${displayPlaces.length} ${displayPlaces.length === 1 ? 'place' : 'places'} found`;
  }, [displayPlaces.length, typeTab, locationFilter, searchText]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style='dark' />

      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityRole='button'
            activeOpacity={0.8}
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <MaterialCommunityIcons name='arrow-left' size={22} color={COLOR.mainText} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Family Fun</Text>
            <Text style={styles.headerSub}>Activities & attractions in PEI</Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        {/* Search bar */}
        <View style={styles.searchRow}>
          <MaterialCommunityIcons name='magnify' size={18} color={COLOR.mutedText} />
          <TextInput
            style={styles.searchInput}
            placeholder='Search attractions, activities...'
            placeholderTextColor={COLOR.mutedText}
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize='none'
            returnKeyType='search'
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} activeOpacity={0.7}>
              <MaterialCommunityIcons name='close-circle' size={18} color={COLOR.mutedText} />
            </TouchableOpacity>
          )}
        </View>

        {/* Type tabs */}
        <View style={styles.tabBar}>
          {TYPE_TABS.map((tab) => {
            const active = tab.id === typeTab;
            return (
              <TouchableOpacity
                key={tab.id}
                activeOpacity={0.7}
                onPress={() => setTypeTab(tab.id)}
                style={styles.tab}
              >
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
                {active && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.tabDivider} />

        {/* Location chips */}
        {locations.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.locationChips}
          >
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setLocationFilter('ALL')}
              style={[styles.chip, locationFilter === 'ALL' && styles.chipActive]}
            >
              <Text style={[styles.chipText, locationFilter === 'ALL' && styles.chipTextActive]}>
                All areas
              </Text>
            </TouchableOpacity>
            {locations.map((loc) => (
              <TouchableOpacity
                key={loc}
                activeOpacity={0.75}
                onPress={() => setLocationFilter(loc === locationFilter ? 'ALL' : loc)}
                style={[styles.chip, locationFilter === loc && styles.chipActive]}
              >
                <Text style={[styles.chipText, locationFilter === loc && styles.chipTextActive]}>
                  {loc}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>

      {/* List */}
      <View style={styles.listContainer}>
        {familyQuery.isPending ? (
          <Animated.FlatList
            data={[0, 1, 2, 3, 4, 5, 6]}
            keyExtractor={(i) => String(i)}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={() => <RowSkeleton />}
          />
        ) : familyQuery.isError ? (
          <View style={styles.stateCenter}>
            <MaterialCommunityIcons name='alert-circle-outline' size={40} color={COLOR.mutedText} />
            <Text style={styles.stateTitle}>Could not load places</Text>
            <TouchableOpacity
              onPress={() => familyQuery.refetch()}
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
            onRefresh={() => familyQuery.refetch()}
            refreshing={familyQuery.isFetching && !familyQuery.isPending}
            ListHeaderComponent={
              displayPlaces.length > 0 ? (
                <Text style={styles.resultCount}>{resultLabel}</Text>
              ) : null
            }
            renderItem={({ item, index }: { item: Place; index: number }) => (
              <PlaceRow place={item} index={index} />
            )}
            ListEmptyComponent={
              <View style={styles.stateCenter}>
                <MaterialCommunityIcons
                  name='ferris-wheel'
                  size={40}
                  color={COLOR.lightGray}
                />
                <Text style={styles.stateTitle}>
                  {searchText ? 'No results match your search' : 'No places found'}
                </Text>
                <Text style={styles.stateSub}>
                  {searchText ? 'Try a different term' : 'Try a different filter'}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: COLOR.surface,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLOR.backgroundSoft,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLOR.mainText,
  },
  headerSub: {
    fontSize: 12,
    color: COLOR.mutedText,
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLOR.backgroundSoft,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLOR.mainText,
    padding: 0,
  },

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
  },

  locationChips: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLOR.backgroundSoft,
  },
  chipActive: {
    backgroundColor: COLOR.brandGreen,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLOR.mutedText,
  },
  chipTextActive: {
    color: COLOR.whiteText,
  },

  listContainer: {
    flex: 1,
    backgroundColor: COLOR.surface,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  resultCount: {
    fontSize: 12,
    color: COLOR.mutedText,
    fontWeight: '500',
    paddingTop: 10,
    paddingBottom: 6,
  },

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
  iconLetter: {
    fontSize: 18,
    fontWeight: '800',
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
  rowLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  rowLocation: {
    flex: 1,
    fontSize: 12,
    color: COLOR.mutedText,
    fontWeight: '400',
  },
  dirBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLOR.brandGreen,
  },
  dirBtnDisabled: {
    backgroundColor: COLOR.backgroundSoft,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
  },

  skeletonCircle: {
    backgroundColor: COLOR.backgroundSoft,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: COLOR.backgroundSoft,
  },

  stateCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
    gap: 10,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLOR.mainText,
    textAlign: 'center',
  },
  stateSub: {
    fontSize: 14,
    color: COLOR.mutedText,
    textAlign: 'center',
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
    fontWeight: '800',
    color: COLOR.whiteText,
  },
});
