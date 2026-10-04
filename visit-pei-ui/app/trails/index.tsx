import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLOR } from '../../styles';
import { usePlacesQuery } from '../../src/services/query/places/usePlacesQuery';
import {
  formatTagLabel,
  getPlaceTheme,
  NOISY_TAGS,
} from '../../src/utils/placeVisuals';
import type { Place } from '../../src/types/api';

const TRAIL_THEME = getPlaceTheme('TRAIL');

const getTrailTags = (place: Place) =>
  place.tags
    .filter((t) => !NOISY_TAGS.has(t.trim().toLowerCase()) && t.trim().length > 0)
    .slice(0, 3);

const TrailCard = ({
  onPress,
  place,
}: {
  onPress: () => void;
  place: Place;
}) => {
  const location =
    place.community?.trim() || place.region?.trim() || 'Prince Edward Island';
  const tags = getTrailTags(place);

  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress}>
      <Surface
        style={
          [
            styles.trailCard,
            { boxShadow: '0 4px 14px rgba(28, 37, 48, 0.09)' },
          ] as any
        }
        elevation={0}
      >
        <View style={styles.heroWrap}>
          <Image
            source={{ uri: place.imageUrl ?? TRAIL_THEME.imageUrl }}
            contentFit='cover'
            transition={200}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.heroOverlay} />
          <View style={styles.heroBadge}>
            <MaterialCommunityIcons
              name='map-marker-path'
              size={12}
              color={TRAIL_THEME.accentColor}
            />
            <Text style={[styles.heroBadgeText, { color: TRAIL_THEME.accentColor }]}>
              Trail
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.trailName} numberOfLines={2}>
            {place.name}
          </Text>

          <View style={styles.locationRow}>
            <MaterialCommunityIcons
              name='map-marker-outline'
              size={14}
              color={COLOR.mutedText}
            />
            <Text style={styles.locationText} numberOfLines={1}>
              {location}
            </Text>
          </View>

          {tags.length > 0 && (
            <View style={styles.tagsRow}>
              {tags.map((tag) => (
                <View key={tag} style={styles.tagPill}>
                  <Text style={styles.tagText}>{formatTagLabel(tag)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Surface>
    </TouchableOpacity>
  );
};

const TrailCardSkeleton = () => (
  <View style={[styles.trailCard, styles.skeletonCard]}>
    <View style={styles.skeletonHero} />
    <View style={styles.cardBody}>
      <View style={[styles.skeletonLine, { width: '70%' }]} />
      <View style={[styles.skeletonLine, { width: '45%', marginTop: 8 }]} />
    </View>
  </View>
);

export default function TrailsScreen() {
  const [searchText, setSearchText] = useState('');

  const trailsQuery = usePlacesQuery({ category: 'TRAIL' });
  const allTrails = trailsQuery.data ?? [];

  const filteredTrails = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return allTrails;
    return allTrails.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q) ?? false) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [allTrails, searchText]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Trails in PEI',
          headerBackTitle: 'Back',
          headerSearchBarOptions: {
            placeholder: 'Search trails...',
            autoCapitalize: 'none',
            onChangeText: (e) => setSearchText(e.nativeEvent.text),
            hideWhenScrolling: false,
          },
        }}
      />

      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {trailsQuery.isPending ? (
          <Animated.FlatList
            data={[0, 1, 2, 3, 4]}
            keyExtractor={(i) => String(i)}
            contentInsetAdjustmentBehavior='automatic'
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={() => <TrailCardSkeleton />}
          />
        ) : trailsQuery.isError ? (
          <View style={styles.errorState}>
            <MaterialCommunityIcons
              name='alert-circle-outline'
              size={44}
              color={COLOR.mutedText}
            />
            <Text style={styles.errorTitle}>Could not load trails</Text>
            <Text style={styles.errorSubtitle}>
              {trailsQuery.error instanceof Error
                ? trailsQuery.error.message
                : 'Something went wrong. Please try again.'}
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => trailsQuery.refetch()}
              style={styles.retryButton}
            >
              <Text style={styles.retryLabel}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Animated.FlatList
            data={filteredTrails}
            keyExtractor={(item) => item.id}
            contentInsetAdjustmentBehavior='automatic'
            itemLayoutAnimation={LinearTransition}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            onRefresh={() => trailsQuery.refetch()}
            refreshing={trailsQuery.isFetching && !trailsQuery.isPending}
            ListHeaderComponent={
              allTrails.length > 0 ? (
                <Text style={styles.resultCount}>
                  {filteredTrails.length}{' '}
                  {filteredTrails.length === 1 ? 'trail' : 'trails'} in PEI
                </Text>
              ) : null
            }
            renderItem={({ item, index }) => (
              <Animated.View
                entering={FadeIn.delay(Math.min(index, 15) * 50).duration(300)}
              >
                <TrailCard
                  place={item}
                  onPress={() =>
                    router.push({
                      pathname: '/places/[id]',
                      params: { id: item.id },
                    })
                  }
                />
              </Animated.View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name='map-marker-path'
                  size={44}
                  color={COLOR.lightGray}
                />
                <Text style={styles.emptyTitle}>
                  {searchText ? 'No trails match your search' : 'No trails yet'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {searchText
                    ? `Try a different search term`
                    : 'Trail data will appear here once loaded'}
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLOR.background,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 14,
  },
  resultCount: {
    fontSize: 13,
    fontWeight: '600',
    color: COLOR.mutedText,
    marginBottom: 4,
  },
  trailCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLOR.surface,
  },
  heroWrap: {
    height: 180,
    width: '100%',
    backgroundColor: TRAIL_THEME.softColor,
    position: 'relative',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 16, 21, 0.18)',
  },
  heroBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.90)',
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  cardBody: {
    padding: 14,
    gap: 6,
  },
  trailName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLOR.mainText,
    lineHeight: 22,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    color: COLOR.mutedText,
    fontWeight: '500',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: COLOR.lightGreen,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLOR.brandGreen,
  },
  skeletonCard: {
    backgroundColor: COLOR.surface,
  },
  skeletonHero: {
    height: 180,
    backgroundColor: COLOR.backgroundSoft,
  },
  skeletonLine: {
    height: 13,
    borderRadius: 6,
    backgroundColor: COLOR.backgroundSoft,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLOR.mainText,
  },
  errorSubtitle: {
    fontSize: 14,
    color: COLOR.mutedText,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: COLOR.brandGreen,
  },
  retryLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: COLOR.whiteText,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLOR.mainText,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLOR.mutedText,
    textAlign: 'center',
  },
});
