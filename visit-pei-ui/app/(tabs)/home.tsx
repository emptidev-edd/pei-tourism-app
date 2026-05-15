import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import type { ComponentProps } from 'react';
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLOR } from '../../styles';
import { useFeaturedPlacesQuery } from '../../src/services/query/home/useFeaturedPlacesQuery';
import { useUpcomingEventsQuery } from '../../src/services/query/home/useUpcomingEventsQuery';
import type { Place, PlaceCategory, TourismEvent } from '../../src/types/api';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type CategoryTile = {
  icon: IconName;
  id: string;
  label: string;
};

type VisualTheme = {
  accentColor: string;
  backgroundColor: string;
  icon: IconName;
  imageUrl: string;
  label: string;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_CARD_WIDTH = (SCREEN_WIDTH - 40 - 12) / 2;
const MOOD_CARD_WIDTH = SCREEN_WIDTH - 40;
const MOOD_ITEM_WIDTH = Math.floor(MOOD_CARD_WIDTH / 3);
const MOOD_LABEL_WIDTH = MOOD_ITEM_WIDTH - 20;

const categories: CategoryTile[] = [
  { id: 'beaches', label: 'Beaches', icon: 'wave' },
  { id: 'food', label: 'Food & Drink', icon: 'silverware-fork-knife' },
  { id: 'trails', label: 'Coastal Trails', icon: 'map-marker-path' },
  { id: 'events', label: 'Events', icon: 'calendar-star' },
  { id: 'stays', label: 'Stays', icon: 'bed-queen-outline' },
  { id: 'family', label: 'Family Fun', icon: 'ferris-wheel' },
];

const PLACE_VISUALS: Record<PlaceCategory, VisualTheme> = {
  VISITOR_CENTRE: {
    label: 'Visitor Info',
    icon: 'information-outline',
    backgroundColor: '#daf4ee',
    accentColor: '#0f8a73',
    imageUrl:
      'https://images.unsplash.com/photo-1517760444937-f6397edcbbcd?auto=format&fit=crop&w=1200&q=80',
  },
  ATTRACTION: {
    label: 'Attraction',
    icon: 'compass-outline',
    backgroundColor: '#e8f0ff',
    accentColor: '#3267b8',
    imageUrl:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  },
  BEACH: {
    label: 'Beach',
    icon: 'wave',
    backgroundColor: '#dff3ff',
    accentColor: '#1982b8',
    imageUrl:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  },
  PARK: {
    label: 'Park',
    icon: 'tree-outline',
    backgroundColor: '#e3f5d6',
    accentColor: '#4c8f2f',
    imageUrl:
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80',
  },
  TRAIL: {
    label: 'Trail',
    icon: 'map-marker-path',
    backgroundColor: '#e6f2ef',
    accentColor: '#007960',
    imageUrl:
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80',
  },
  LIGHTHOUSE: {
    label: 'Lighthouse',
    icon: 'lighthouse',
    backgroundColor: '#fff3cf',
    accentColor: '#d98500',
    imageUrl:
      'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80',
  },
  MUSEUM: {
    label: 'Museum',
    icon: 'bank-outline',
    backgroundColor: '#efe8ff',
    accentColor: '#6f47c8',
    imageUrl:
      'https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=1200&q=80',
  },
  HISTORIC: {
    label: 'Historic',
    icon: 'castle',
    backgroundColor: '#f7e9dc',
    accentColor: '#9d5b2a',
    imageUrl:
      'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1200&q=80',
  },
  FOOD_DRINK: {
    label: 'Food & Drink',
    icon: 'silverware-fork-knife',
    backgroundColor: '#ffe7d9',
    accentColor: '#c75d1d',
    imageUrl:
      'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80',
  },
  TRANSPORT: {
    label: 'Transport',
    icon: 'bus',
    backgroundColor: '#e8eef8',
    accentColor: '#486a9f',
    imageUrl:
      'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=1200&q=80',
  },
  OTHER: {
    label: 'Explore',
    icon: 'map-search-outline',
    backgroundColor: '#edf1f6',
    accentColor: '#5f738c',
    imageUrl:
      'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80',
  },
};

const getPlaceTheme = (category: PlaceCategory) =>
  PLACE_VISUALS[category] ?? PLACE_VISUALS.OTHER;

const getPlaceSubtitle = (place: Place) => {
  if (place.community?.trim()) return place.community.trim();
  if (place.description?.trim()) return place.description.trim();
  return 'Featured on PEI';
};

const formatEventMeta = (event: TourismEvent) => {
  const date = new Date(event.startAt);
  const dateText = new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }).format(date);

  if (event.allDay) return `${dateText} · All day`;

  const timeText = new Intl.DateTimeFormat('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);

  return `${dateText} · ${timeText}`;
};

const getEventLocation = (event: TourismEvent) =>
  event.venueName?.trim() || event.community?.trim() || 'Prince Edward Island';

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return 'Unable to load this section right now.';
};

const HomeSectionStateCard = ({
  actionLabel,
  description,
  icon,
  onPress,
  title,
}: {
  actionLabel?: string;
  description: string;
  icon: IconName;
  onPress?: () => void;
  title: string;
}) => (
  <Surface style={styles.stateCard} elevation={0}>
    <View style={styles.stateIconWrap}>
      <MaterialCommunityIcons name={icon} size={24} color={COLOR.brandGreen} />
    </View>
    <View style={styles.stateCopy}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateDescription}>{description}</Text>
    </View>
    {actionLabel && onPress ? (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.retryButton}>
        <Text style={styles.retryLabel}>{actionLabel}</Text>
      </TouchableOpacity>
    ) : null}
  </Surface>
);

const DiscoverCard = ({ place }: { place: Place }) => {
  const theme = getPlaceTheme(place.category);

  return (
    <Surface style={styles.gridCard} elevation={0}>
      <View style={[styles.gridMedia, { backgroundColor: theme.backgroundColor }]}>
        <Image
          source={{ uri: place.imageUrl ?? theme.imageUrl }}
          contentFit='cover'
          transition={150}
          style={styles.gridImage}
        />
        <View
          style={[
            styles.gridImageOverlay,
            { backgroundColor: `${theme.accentColor}40` },
          ]}
        />
        <View style={styles.gridFallbackBadge}>
          <Text style={[styles.gridFallbackBadgeText, { color: theme.accentColor }]}>
            {theme.label}
          </Text>
        </View>
        <View style={styles.gridIconPill}>
          <MaterialCommunityIcons name={theme.icon} size={28} color={COLOR.whiteText} />
        </View>
        <View
          style={[
            styles.gridFallbackOrb,
            { backgroundColor: `${theme.accentColor}22` },
          ]}
        />
      </View>
      <View style={styles.gridBody}>
        <Text style={styles.gridTitle} numberOfLines={1}>
          {place.name}
        </Text>
        <Text style={styles.gridDescription} numberOfLines={2}>
          {getPlaceSubtitle(place)}
        </Text>
      </View>
    </Surface>
  );
};

const DiscoverCardSkeleton = ({ index }: { index: number }) => (
  <Surface key={`discover-skeleton-${index}`} style={styles.gridCard} elevation={0}>
    <View style={styles.gridSkeletonImage} />
    <View style={styles.gridBody}>
      <View style={[styles.skeletonLine, styles.skeletonLineTitle]} />
      <View style={[styles.skeletonLine, styles.skeletonLineBody]} />
    </View>
  </Surface>
);

const EventCard = ({ event }: { event: TourismEvent }) => {
  const hasImage = Boolean(event.imageUrl);

  return (
    <Surface style={styles.planCard} elevation={0}>
      <View style={styles.planAccent} />

      {hasImage ? (
        <Image
          source={{ uri: event.imageUrl ?? undefined }}
          contentFit='cover'
          transition={150}
          style={styles.eventImage}
        />
      ) : (
        <View style={styles.planIconWrap}>
          <MaterialCommunityIcons
            name='calendar-star'
            size={24}
            color={COLOR.brandGreen}
          />
        </View>
      )}

      <View style={styles.planCopy}>
        <Text style={styles.planTitle} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={styles.planSubtitle} numberOfLines={1}>
          {formatEventMeta(event)}
        </Text>
        <Text style={styles.planCaption} numberOfLines={1}>
          {getEventLocation(event)}
        </Text>
      </View>

      <MaterialCommunityIcons
        name='chevron-right'
        size={22}
        color={COLOR.mutedText}
      />
    </Surface>
  );
};

const EventCardSkeleton = ({ index }: { index: number }) => (
  <Surface key={`event-skeleton-${index}`} style={styles.planCard} elevation={0}>
    <View style={styles.planAccent} />
    <View style={styles.planIconWrap}>
      <MaterialCommunityIcons name='calendar-blank-outline' size={24} color={COLOR.lightGray} />
    </View>
    <View style={styles.planCopy}>
      <View style={[styles.skeletonLine, styles.skeletonLineEventTitle]} />
      <View style={[styles.skeletonLine, styles.skeletonLineBody]} />
      <View style={[styles.skeletonLine, styles.skeletonLineCaption]} />
    </View>
  </Surface>
);

export default function HomeTab() {
  const topRow = categories.slice(0, 3);
  const bottomRow = categories.slice(3, 6);

  const featuredPlacesQuery = useFeaturedPlacesQuery();
  const upcomingEventsQuery = useUpcomingEventsQuery();

  const featuredPlaces = featuredPlacesQuery.data?.items ?? [];
  const upcomingEvents = upcomingEventsQuery.data?.items ?? [];

  return (
    <>
      <StatusBar style='light' backgroundColor={COLOR.brandGreen} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.header}>
            <View style={styles.headerLocationRow}>
              <MaterialCommunityIcons
                name='map-marker-outline'
                size={16}
                color='rgba(255,255,255,0.8)'
              />
              <Text style={styles.headerLocation}>Prince Edward Island</Text>
            </View>

            <Text style={styles.headerGreeting}>Hello,</Text>
            <Text style={styles.headerTitle}>Explorer</Text>
            <Text style={styles.headerSub}>
              Discover the beauty of Canada&apos;s Garden Province
            </Text>
          </View>

          <View style={styles.moodWrapper}>
            <Surface style={styles.moodCard} elevation={0}>
              <View style={styles.moodRow}>
                {topRow.map((cat, index) => (
                  <TouchableOpacity
                    key={cat.id}
                    activeOpacity={0.7}
                    style={[
                      styles.moodItem,
                      index < topRow.length - 1 && styles.moodBorderRight,
                    ]}
                  >
                    <View style={styles.moodCell}>
                      <MaterialCommunityIcons
                        name={cat.icon}
                        size={28}
                        color={COLOR.brandGreen}
                      />
                      <Text style={styles.moodLabel} numberOfLines={2}>
                        {cat.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.moodDividerH} />

              <View style={styles.moodRow}>
                {bottomRow.map((cat, index) => (
                  <TouchableOpacity
                    key={cat.id}
                    activeOpacity={0.7}
                    style={[
                      styles.moodItem,
                      index < bottomRow.length - 1 && styles.moodBorderRight,
                    ]}
                  >
                    <View style={styles.moodCell}>
                      <MaterialCommunityIcons
                        name={cat.icon}
                        size={28}
                        color={COLOR.brandGreen}
                      />
                      <Text style={styles.moodLabel} numberOfLines={2}>
                        {cat.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </Surface>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Discover PEI</Text>
              <Text style={styles.sectionLink}>Featured</Text>
            </View>

            {featuredPlacesQuery.isPending ? (
              <View style={styles.grid}>
                {[0, 1, 2, 3].map((index) => (
                  <DiscoverCardSkeleton key={index} index={index} />
                ))}
              </View>
            ) : null}

            {!featuredPlacesQuery.isPending && featuredPlacesQuery.isError ? (
              <HomeSectionStateCard
                title='Featured places unavailable'
                description={getErrorMessage(featuredPlacesQuery.error)}
                icon='map-search-outline'
                actionLabel='Retry'
                onPress={() => featuredPlacesQuery.refetch()}
              />
            ) : null}

            {!featuredPlacesQuery.isPending &&
            !featuredPlacesQuery.isError &&
            featuredPlaces.length === 0 ? (
              <HomeSectionStateCard
                title='No featured places yet'
                description='When the backend has featured places, they will appear here automatically.'
                icon='compass-outline'
              />
            ) : null}

            {!featuredPlacesQuery.isPending &&
            !featuredPlacesQuery.isError &&
            featuredPlaces.length > 0 ? (
              <View style={styles.grid}>
                {featuredPlaces.map((place) => (
                  <DiscoverCard key={place.id} place={place} />
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Events</Text>
              <Text style={styles.sectionLink}>Live</Text>
            </View>

            {upcomingEventsQuery.isPending ? (
              <View style={styles.planList}>
                {[0, 1, 2].map((index) => (
                  <EventCardSkeleton key={index} index={index} />
                ))}
              </View>
            ) : null}

            {!upcomingEventsQuery.isPending && upcomingEventsQuery.isError ? (
              <HomeSectionStateCard
                title='Events unavailable'
                description={getErrorMessage(upcomingEventsQuery.error)}
                icon='calendar-alert'
                actionLabel='Retry'
                onPress={() => upcomingEventsQuery.refetch()}
              />
            ) : null}

            {!upcomingEventsQuery.isPending &&
            !upcomingEventsQuery.isError &&
            upcomingEvents.length === 0 ? (
              <HomeSectionStateCard
                title='No upcoming events found'
                description='The live events feed is connected. New events will show here as soon as they are available.'
                icon='calendar-blank-outline'
              />
            ) : null}

            {!upcomingEventsQuery.isPending &&
            !upcomingEventsQuery.isError &&
            upcomingEvents.length > 0 ? (
              <View style={styles.planList}>
                {upcomingEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </View>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#1c2530',
    shadowOpacity: 0.09,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  default: {
    elevation: 4,
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLOR.brandGreen,
  },
  scroll: {
    backgroundColor: COLOR.background,
  },
  contentContainer: {
    paddingBottom: 132,
  },
  header: {
    backgroundColor: COLOR.brandGreen,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 68,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    gap: 4,
  },
  headerLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  headerLocation: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  headerGreeting: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 18,
    fontWeight: '600',
  },
  headerTitle: {
    color: COLOR.whiteText,
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  moodWrapper: {
    paddingHorizontal: 20,
    marginTop: -44,
  },
  moodCard: {
    backgroundColor: COLOR.surface,
    borderRadius: 24,
    overflow: 'hidden',
    ...cardShadow,
  },
  moodRow: {
    flexDirection: 'row',
  },
  moodItem: {
    width: MOOD_ITEM_WIDTH,
  },
  moodCell: {
    width: MOOD_ITEM_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  moodBorderRight: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: COLOR.borderSoft,
  },
  moodDividerH: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLOR.borderSoft,
  },
  moodLabel: {
    width: MOOD_LABEL_WIDTH,
    color: COLOR.mainText,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 32,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: COLOR.headingText,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionLink: {
    color: COLOR.brandGreen,
    fontSize: 14,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    width: GRID_CARD_WIDTH,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLOR.surface,
    ...cardShadow,
  },
  gridMedia: {
    width: '100%',
    height: 120,
    padding: 12,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  gridImage: {
    ...StyleSheet.absoluteFillObject,
  },
  gridImageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridFallbackBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.72)',
    zIndex: 1,
  },
  gridFallbackBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  gridIconPill: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.22)',
    zIndex: 1,
  },
  gridFallbackOrb: {
    position: 'absolute',
    right: -22,
    bottom: -28,
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  gridSkeletonImage: {
    width: '100%',
    height: 120,
    backgroundColor: COLOR.backgroundSoft,
  },
  gridBody: {
    padding: 12,
    gap: 4,
  },
  gridTitle: {
    color: COLOR.headingText,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  gridDescription: {
    color: COLOR.mutedText,
    fontSize: 12,
    lineHeight: 16,
  },
  planList: {
    gap: 12,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOR.surface,
    borderRadius: 20,
    overflow: 'hidden',
    paddingRight: 16,
    paddingVertical: 16,
    gap: 14,
    ...cardShadow,
  },
  planAccent: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: COLOR.brandGreen,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  planIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLOR.lightGreen,
  },
  eventImage: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLOR.backgroundSoft,
  },
  planCopy: {
    flex: 1,
    gap: 4,
  },
  planTitle: {
    color: COLOR.headingText,
    fontSize: 15,
    fontWeight: '800',
  },
  planSubtitle: {
    color: COLOR.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  planCaption: {
    color: COLOR.brandGreen,
    fontSize: 12,
    fontWeight: '700',
  },
  stateCard: {
    borderRadius: 20,
    backgroundColor: COLOR.surface,
    padding: 18,
    gap: 14,
    ...cardShadow,
  },
  stateIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLOR.lightGreen,
  },
  stateCopy: {
    gap: 6,
  },
  stateTitle: {
    color: COLOR.headingText,
    fontSize: 15,
    fontWeight: '800',
  },
  stateDescription: {
    color: COLOR.mutedText,
    fontSize: 13,
    lineHeight: 19,
  },
  retryButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: COLOR.lightGreen,
  },
  retryLabel: {
    color: COLOR.brandGreen,
    fontSize: 13,
    fontWeight: '800',
  },
  skeletonLine: {
    borderRadius: 999,
    backgroundColor: COLOR.backgroundSoft,
  },
  skeletonLineTitle: {
    width: '78%',
    height: 14,
  },
  skeletonLineBody: {
    width: '58%',
    height: 12,
  },
  skeletonLineEventTitle: {
    width: '72%',
    height: 14,
  },
  skeletonLineCaption: {
    width: '44%',
    height: 12,
  },
});
