import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useDeferredValue, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Searchbar, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLOR } from '../../styles';
import { useEventsQuery } from '../../src/services/query/events/useEventsQuery';
import type { TourismEvent } from '../../src/types/api';

type DateFilterId = 'all' | 'today' | 'week' | 'month';

const DATE_FILTERS: { id: DateFilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
];

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDateRange = (filter: DateFilterId) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (filter === 'today') {
    return {
      from: formatLocalDate(start),
      to: formatLocalDate(start),
    };
  }

  if (filter === 'week') {
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return {
      from: formatLocalDate(start),
      to: formatLocalDate(end),
    };
  }

  if (filter === 'month') {
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    return {
      from: formatLocalDate(start),
      to: formatLocalDate(end),
    };
  }

  return {
    from: formatLocalDate(start),
    to: undefined,
  };
};

const formatEventHeaderDate = (value: string) =>
  new Intl.DateTimeFormat('en-CA', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(new Date(value));

const formatEventTime = (event: TourismEvent) => {
  const start = new Date(event.startAt);
  const timeFormatter = new Intl.DateTimeFormat('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (event.allDay) {
    return 'All day';
  }

  if (event.endAt) {
    return `${timeFormatter.format(start)} - ${timeFormatter.format(new Date(event.endAt))}`;
  }

  return timeFormatter.format(start);
};

const formatEventDayBadge = (value: string) =>
  new Intl.DateTimeFormat('en-CA', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));

const getEventLocation = (event: TourismEvent) =>
  event.venueName?.trim() ||
  event.community?.trim() ||
  event.address?.trim() ||
  'Prince Edward Island';

const getEventSummary = (event: TourismEvent) => {
  if (event.description?.trim()) {
    return event.description.trim();
  }

  return `${event.title} is an upcoming PEI event happening at ${getEventLocation(event)}.`;
};

const groupEventsByDate = (items: TourismEvent[]) => {
  const sections: { date: string; items: TourismEvent[] }[] = [];

  for (const item of items) {
    const dateKey = item.startAt.slice(0, 10);
    const existing = sections.find((section) => section.date === dateKey);

    if (existing) {
      existing.items.push(item);
      continue;
    }

    sections.push({ date: dateKey, items: [item] });
  }

  return sections;
};

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

const EventStateCard = ({
  actionLabel,
  description,
  icon,
  onPress,
  title,
}: {
  actionLabel?: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress?: () => void;
  title: string;
}) => (
  <Surface style={styles.stateCard} elevation={0}>
    <View style={styles.stateIconWrap}>
      <MaterialCommunityIcons name={icon} size={24} color={COLOR.brandGreen} />
    </View>
    <Text style={styles.stateTitle}>{title}</Text>
    <Text style={styles.stateDescription}>{description}</Text>
    {actionLabel && onPress ? (
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={onPress}
        style={styles.retryButton}
      >
        <Text style={styles.retryButtonText}>{actionLabel}</Text>
      </TouchableOpacity>
    ) : null}
  </Surface>
);

const EventCard = ({ event }: { event: TourismEvent }) => (
  <TouchableOpacity
    activeOpacity={0.88}
    onPress={() =>
      router.push({
        pathname: '/events/[id]',
        params: { id: event.id },
      })
    }
  >
    <Surface style={styles.eventCard} elevation={0}>
      <View style={styles.eventImageWrap}>
        {event.imageUrl ? (
          <Image
            source={{ uri: event.imageUrl }}
            contentFit='cover'
            transition={150}
            style={styles.eventImage}
          />
        ) : (
          <View style={styles.eventImageFallback}>
            <MaterialCommunityIcons
              name='calendar-star'
              size={28}
              color={COLOR.brandGreen}
            />
          </View>
        )}

        <View style={styles.eventDateBadge}>
          <Text style={styles.eventDateBadgeText}>
            {formatEventDayBadge(event.startAt)}
          </Text>
        </View>
      </View>

      <View style={styles.eventBody}>
        <View style={styles.eventMetaRow}>
          <View style={styles.eventMetaPill}>
            <MaterialCommunityIcons
              name='clock-outline'
              size={14}
              color={COLOR.brandGreen}
            />
            <Text style={styles.eventMetaPillText}>{formatEventTime(event)}</Text>
          </View>
          {event.community?.trim() ? (
            <View style={styles.eventMetaPillMuted}>
              <Text style={styles.eventMetaPillMutedText}>
                {event.community.trim()}
              </Text>
            </View>
          ) : null}
        </View>

        <Text numberOfLines={2} style={styles.eventTitle}>
          {event.title}
        </Text>

        <View style={styles.locationRow}>
          <MaterialCommunityIcons
            name='map-marker-outline'
            size={16}
            color={COLOR.mutedText}
          />
          <Text numberOfLines={1} style={styles.locationText}>
            {getEventLocation(event)}
          </Text>
        </View>

        <Text numberOfLines={3} style={styles.eventSummary}>
          {getEventSummary(event)}
        </Text>

        <View style={styles.eventFooterRow}>
          <Text style={styles.eventLink}>View details</Text>
          <MaterialCommunityIcons
            name='chevron-right'
            size={18}
            color={COLOR.brandGreen}
          />
        </View>
      </View>
    </Surface>
  </TouchableOpacity>
);

export default function EventsTab() {
  const [searchText, setSearchText] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] =
    useState<DateFilterId>('week');

  const deferredSearchText = useDeferredValue(searchText.trim());
  const dateRange = getDateRange(selectedDateFilter);
  const eventsQuery = useEventsQuery({
    from: dateRange.from,
    to: dateRange.to,
    q: deferredSearchText.length > 0 ? deferredSearchText : undefined,
    limit: 40,
  });

  const items = eventsQuery.data?.items ?? [];
  const sections = groupEventsByDate(items);

  return (
    <>
      <StatusBar style='light' backgroundColor={COLOR.brandGreen} />
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.header}>
            <View style={styles.headerLocationRow}>
              <MaterialCommunityIcons
                name='calendar-star'
                size={16}
                color='rgba(255,255,255,0.82)'
              />
              <Text style={styles.headerLocation}>Prince Edward Island</Text>
            </View>

            <Text style={styles.headerGreeting}>Plan ahead</Text>
            <Text style={styles.headerTitle}>Upcoming Events</Text>
            <Text style={styles.headerSub}>
              Find concerts, markets, festivals, and local happenings across PEI.
            </Text>
          </View>

          <View style={styles.searchShell}>
            <Surface style={styles.searchCard} elevation={0}>
              <Searchbar
                placeholder='Search events or venues'
                onChangeText={setSearchText}
                value={searchText}
                elevation={0}
                inputStyle={styles.searchInput}
                style={styles.searchbar}
              />

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
              >
                {DATE_FILTERS.map((filter) => {
                  const selected = filter.id === selectedDateFilter;

                  return (
                    <TouchableOpacity
                      key={filter.id}
                      activeOpacity={0.82}
                      onPress={() => setSelectedDateFilter(filter.id)}
                      style={[
                        styles.filterChip,
                        selected && styles.filterChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          selected && styles.filterChipTextActive,
                        ]}
                      >
                        {filter.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </Surface>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLink}>{items.length} found</Text>
            </View>

            {eventsQuery.isPending ? (
              <View style={styles.loadingList}>
                {[0, 1, 2].map((index) => (
                  <Surface key={index} style={styles.skeletonCard} elevation={0}>
                    <View style={styles.skeletonImage} />
                    <View style={styles.skeletonBody}>
                      <View style={styles.skeletonLineShort} />
                      <View style={styles.skeletonLineTitle} />
                      <View style={styles.skeletonLineBody} />
                      <View style={styles.skeletonLineBody} />
                    </View>
                  </Surface>
                ))}
              </View>
            ) : null}

            {!eventsQuery.isPending && eventsQuery.isError ? (
              <EventStateCard
                title='Events unavailable'
                description={
                  eventsQuery.error instanceof Error
                    ? eventsQuery.error.message
                    : 'We could not load the live events feed right now.'
                }
                icon='calendar-alert'
                actionLabel='Retry'
                onPress={() => eventsQuery.refetch()}
              />
            ) : null}

            {!eventsQuery.isPending &&
            !eventsQuery.isError &&
            sections.length === 0 ? (
              <EventStateCard
                title='No events found'
                description='Try another search or switch the date filter to see more PEI events.'
                icon='calendar-blank-outline'
              />
            ) : null}

            {!eventsQuery.isPending &&
            !eventsQuery.isError &&
            sections.length > 0 ? (
              <View style={styles.sectionList}>
                {sections.map((section) => (
                  <View key={section.date} style={styles.daySection}>
                    <View style={styles.dayHeader}>
                      <Text style={styles.dayTitle}>
                        {formatEventHeaderDate(section.date)}
                      </Text>
                    </View>

                    <View style={styles.dayCardList}>
                      {section.items.map((event) => (
                        <EventCard key={event.id} event={event} />
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

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
    paddingBottom: 82,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    gap: 4,
  },
  headerLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  headerLocation: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
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
  searchShell: {
    paddingHorizontal: 20,
    marginTop: -52,
  },
  searchCard: {
    borderRadius: 24,
    backgroundColor: COLOR.surface,
    padding: 14,
    gap: 14,
    ...cardShadow,
  },
  searchbar: {
    backgroundColor: COLOR.surfaceMuted,
    borderRadius: 18,
  },
  searchInput: {
    minHeight: 18,
    color: COLOR.mainText,
  },
  filterRow: {
    gap: 10,
    paddingRight: 8,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLOR.surfaceMuted,
  },
  filterChipActive: {
    backgroundColor: COLOR.brandGreen,
  },
  filterChipText: {
    color: COLOR.mainText,
    fontSize: 13,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: COLOR.whiteText,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 26,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  sectionLink: {
    color: COLOR.brandGreen,
    fontSize: 14,
    fontWeight: '700',
  },
  loadingList: {
    gap: 14,
  },
  skeletonCard: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: COLOR.surface,
    ...cardShadow,
  },
  skeletonImage: {
    height: 168,
    backgroundColor: COLOR.backgroundSoft,
  },
  skeletonBody: {
    padding: 16,
    gap: 10,
  },
  skeletonLineShort: {
    width: 96,
    height: 14,
    borderRadius: 999,
    backgroundColor: COLOR.backgroundSoft,
  },
  skeletonLineTitle: {
    width: '72%',
    height: 22,
    borderRadius: 999,
    backgroundColor: COLOR.backgroundSoft,
  },
  skeletonLineBody: {
    width: '100%',
    height: 14,
    borderRadius: 999,
    backgroundColor: COLOR.backgroundSoft,
  },
  sectionList: {
    gap: 22,
  },
  daySection: {
    gap: 12,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayTitle: {
    color: COLOR.headingText,
    fontSize: 17,
    fontWeight: '800',
  },
  dayCardList: {
    gap: 14,
  },
  eventCard: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: COLOR.surface,
    ...cardShadow,
  },
  eventImageWrap: {
    position: 'relative',
    height: 188,
    backgroundColor: COLOR.lightGreen,
  },
  eventImage: {
    ...StyleSheet.absoluteFillObject,
  },
  eventImageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLOR.lightGreen,
  },
  eventDateBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  eventDateBadgeText: {
    color: COLOR.headingText,
    fontSize: 12,
    fontWeight: '800',
  },
  eventBody: {
    padding: 16,
    gap: 10,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  eventMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: COLOR.lightGreen,
  },
  eventMetaPillText: {
    color: COLOR.brandGreen,
    fontSize: 12,
    fontWeight: '800',
  },
  eventMetaPillMuted: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: COLOR.surfaceMuted,
  },
  eventMetaPillMutedText: {
    color: COLOR.mainText,
    fontSize: 12,
    fontWeight: '700',
  },
  eventTitle: {
    color: COLOR.headingText,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    flex: 1,
    color: COLOR.mutedText,
    fontSize: 14,
    lineHeight: 20,
  },
  eventSummary: {
    color: COLOR.mutedText,
    fontSize: 14,
    lineHeight: 21,
  },
  eventFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  eventLink: {
    color: COLOR.brandGreen,
    fontSize: 14,
    fontWeight: '800',
  },
  stateCard: {
    borderRadius: 20,
    backgroundColor: COLOR.surface,
    padding: 18,
    alignItems: 'flex-start',
    gap: 12,
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
  stateTitle: {
    color: COLOR.headingText,
    fontSize: 16,
    fontWeight: '800',
  },
  stateDescription: {
    color: COLOR.mutedText,
    fontSize: 14,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 4,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLOR.brandGreen,
  },
  retryButtonText: {
    color: COLOR.whiteText,
    fontSize: 13,
    fontWeight: '800',
  },
});
