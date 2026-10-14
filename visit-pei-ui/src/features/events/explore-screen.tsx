import { router, type Href, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEventsQuery } from '../../services/query/events/useEventsQuery';
import { useEventCategoriesQuery } from '../../services/query/events/useEventCategoriesQuery';
import type { EventCategory, TickitUpEvent } from '../../types/api';
import { categoryIcon, sortCategories } from './category-icons';
import { ActiveEventCard } from './components/active-event-card';
import { EventsDock, type EventsPane } from './components/events-dock';
import { FeaturedEventCard } from './components/featured-event-card';
import { OrganizerCard, type OrganizerCardModel } from './components/organizer-card';
import { EventImage } from './event-image';
import {
  endOfLocalDay,
  eventMatchesWhen,
  featuredRailDateRange,
  isEventEnded,
  organiserHandle,
  pickActiveEvents,
  pickFeaturedEvents,
  pickTrendingEvents,
  startOfLocalDay,
  useNowTick,
  type WhenFilter,
} from './event-timing';
import { LikedEventsProvider, useLikedEvents } from './liked-events';
import { EVENT } from './theme';
import { tapHaptic, UiIcon } from './ui-icon';

const WHEN_TILES: {
  id: WhenFilter;
  label: string;
  sf: string;
  android: 'access-point' | 'calendar-today' | 'weather-sunny' | 'sofa-single-outline';
}[] = [
  { id: 'happening', label: 'Happening', sf: 'antenna.radiowaves.left.and.right', android: 'access-point' },
  { id: 'today', label: 'Today', sf: 'calendar', android: 'calendar-today' },
  { id: 'tomorrow', label: 'Tomorrow', sf: 'sun.max', android: 'weather-sunny' },
  { id: 'weekend', label: 'Weekend', sf: 'sofa', android: 'sofa-single-outline' },
];

/** Page size for both explore feeds; the server now applies category + search. */
const EVENTS_PAGE_SIZE = 60;

const SEARCH_DEBOUNCE_MS = 250;

const WHEN_TITLES: Record<WhenFilter, string> = {
  happening: 'Happening',
  today: 'Today',
  tomorrow: 'Tomorrow',
  weekend: 'Weekend',
};

function activeCategories(value: unknown): EventCategory[] {
  const list = Array.isArray(value)
    ? value
    : value &&
        typeof value === 'object' &&
        Array.isArray((value as { data?: unknown }).data)
      ? (value as { data: EventCategory[] }).data
      : [];
  return sortCategories(
    list.filter((category) => category?.isActive !== false && category?.slug),
  );
}

function uniqueEvents(events: TickitUpEvent[]) {
  const seen = new Set<string>();
  return events.filter((event) => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
}

function collectOrganizers(events: TickitUpEvent[]): OrganizerCardModel[] {
  const map = new Map<string, OrganizerCardModel>();
  for (const event of events) {
    const id = event.organiser?.id || event.organiserId;
    const name = event.organiser?.organisationName?.trim();
    if (!id || !name || map.has(id)) continue;
    map.set(id, {
      id,
      name,
      logoUrl: event.organiser?.organisationLogoUrl ?? null,
      bannerUrl: event.bannerImageUrl ?? null,
    });
  }
  return [...map.values()];
}

export function EventsExploreScreen() {
  return (
    <LikedEventsProvider>
      <EventsExploreBody />
    </LikedEventsProvider>
  );
}

function EventsExploreBody() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const now = useNowTick();
  const liked = useLikedEvents();
  const [pane, setPane] = useState<EventsPane>('explore');
  const [when, setWhen] = useState<WhenFilter | ''>('');
  const [categorySlug, setCategorySlug] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [organiserId, setOrganiserId] = useState<string | null>(null);
  const [todayExpanded, setTodayExpanded] = useState(false);
  const [otherExpanded, setOtherExpanded] = useState(false);
  const [organisersExpanded, setOrganisersExpanded] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  const compact = useSharedValue(0);
  const compactTarget = useSharedValue(0);
  const offsetY = useSharedValue(0);

  const featuredRange = featuredRailDateRange(new Date(now));
  const activeFrom = startOfLocalDay(new Date(now)).toISOString();

  const featuredQuery = useEventsQuery({
    categorySlug: categorySlug || undefined,
    dateFrom: featuredRange.dateFrom,
    dateTo: featuredRange.dateTo,
    limit: EVENTS_PAGE_SIZE,
    page: 1,
    search: debouncedQuery || undefined,
  });
  const activeQuery = useEventsQuery({
    categorySlug: categorySlug || undefined,
    dateFrom: activeFrom,
    limit: EVENTS_PAGE_SIZE,
    page: 1,
    search: debouncedQuery || undefined,
  });
  const categoriesQuery = useEventCategoriesQuery();

  const pending = featuredQuery.isPending || activeQuery.isPending;
  const failed = featuredQuery.isError && activeQuery.isError;
  const partiallyFailed = featuredQuery.isError || activeQuery.isError;
  const cardWidth = Math.round(width - 32);
  const needle = debouncedQuery.toLowerCase();

  // Category and search are server-side now, but the date-window sectioning below
  // stays client-side: the API's `dateFrom`/`dateTo` constrain `startDate` only, so
  // a server-side "today" window would silently drop multi-day events already in
  // progress (started yesterday, still running now).
  const model = useMemo(() => {
    const featuredSource = pickFeaturedEvents(featuredQuery.data?.data ?? [], now);
    const activeSource = pickActiveEvents(activeQuery.data?.data ?? [], now);
    // Only merge the filtered lists: spreading the raw response here would
    // re-admit the ended events pickActiveEvents just removed.
    const pool = uniqueEvents([...featuredSource, ...activeSource]);
    const featuredIds = new Set(featuredSource.map((event) => event.id));
    const todayStart = startOfLocalDay(new Date(now));
    const todayEnd = endOfLocalDay(todayStart);

    // Belt-and-braces: neither source should contain an ended event now that
    // featured excludes them too, but the schedule sections re-check rather
    // than trust their inputs.
    const live = pool.filter((event) => !isEventEnded(event.endDate, now));
    const today = live.filter((event) => {
      const start = new Date(event.startDate);
      // Featured deliberately overlaps Today: the reference design shows the
      // same event as a big card and again as a row in the day's schedule.
      return start >= todayStart && start <= todayEnd;
    });
    const other = live.filter((event) => {
      const start = new Date(event.startDate);
      return start > todayEnd && !featuredIds.has(event.id);
    });
    const filtered = when
      ? live.filter((event) => eventMatchesWhen(event, when, now))
      : [];
    const trending = pickTrendingEvents(pool, now);
    const organizers = collectOrganizers(pool).filter((org) =>
      needle ? org.name.toLowerCase().includes(needle) || organiserHandle(org.name).includes(needle) : true,
    );
    const organiserEvents = organiserId
      ? pool.filter((event) => (event.organiser?.id || event.organiserId) === organiserId)
      : [];
    const organiserName =
      organizers.find((org) => org.id === organiserId)?.name ??
      organiserEvents[0]?.organiser?.organisationName ??
      'Organizer';

    return {
      featured: featuredSource,
      today,
      other,
      filtered,
      trending,
      organizers,
      organiserEvents,
      organiserName,
      likedEvents: pool.filter((event) => liked.ids.has(event.id)),
    };
  }, [
    activeQuery.data?.data,
    featuredQuery.data?.data,
    liked.ids,
    needle,
    now,
    organiserId,
    when,
  ]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y;
      const dy = y - offsetY.value;
      offsetY.value = y;
      let next = compactTarget.value;
      if (y < 12) next = 0;
      else if (dy > 10) next = 1;
      else if (dy < -10) next = 0;
      if (next !== compactTarget.value) {
        compactTarget.value = next;
        compact.value = withTiming(next, { duration: 240 });
      }
    },
  });

  const expandDock = () => {
    compactTarget.value = 0;
    compact.value = withTiming(0, { duration: 220 });
  };

  const openSignIn = () => {
    tapHaptic();
    router.push('/events/sign-in' as Href);
  };

  const selectPane = (next: EventsPane) => {
    expandDock();
    setPane(next);
    if (next !== 'explore') setSearchOpen(false);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style='dark' />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.locationChip}>
        <View style={styles.locationFlag}>
          <Text style={styles.locationFlagText}>PE</Text>
        </View>
          <Text style={styles.locationLabel}>PEI</Text>
          <UiIcon sf='chevron.down' android='chevron-down' size={14} color={EVENT.faint} />
        </View>
        <View style={styles.topActions}>
          <Pressable
            accessibilityLabel='Sign in'
            onPress={openSignIn}
            style={styles.plusButton}
          >
            <UiIcon sf='plus' android='plus' size={20} color={EVENT.onAccent} />
          </Pressable>
          <View style={styles.iconButton}>
            <UiIcon
              sf='arrow.triangle.2.circlepath'
              android='history'
              size={18}
              color={EVENT.text}
            />
          </View>
          <View style={styles.iconButton}>
            <UiIcon sf='bell' android='bell-outline' size={18} color={EVENT.text} />
          </View>
        </View>
      </View>

      {searchOpen && pane === 'explore' ? (
        <View style={styles.searchBar}>
          <UiIcon sf='magnifyingglass' android='magnify' size={16} color={EVENT.muted} />
          <TextInput
            autoFocus
            onChangeText={setQuery}
            placeholder='Search events, organizers'
            placeholderTextColor={EVENT.muted}
            style={styles.searchInput}
            value={query}
          />
          {query ? (
            <Pressable
              accessibilityLabel='Clear search'
              onPress={() => setQuery('')}
              hitSlop={8}
            >
              <UiIcon sf='xmark' android='close' size={16} color={EVENT.muted} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {pane === 'explore' ? (
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps='handled'
          refreshControl={
            <RefreshControl
              refreshing={featuredQuery.isRefetching || activeQuery.isRefetching}
              onRefresh={() => {
                void featuredQuery.refetch();
                void activeQuery.refetch();
              }}
              tintColor={EVENT.accent}
            />
          }
          contentContainerStyle={{
            paddingBottom: insets.bottom + 120,
            gap: 22,
          }}
        >
          {organiserId ? (
            <OrganizerEvents
              name={model.organiserName}
              events={model.organiserEvents}
              now={now}
              cardWidth={Math.round(width * 0.7)}
              onBack={() => setOrganiserId(null)}
            />
          ) : (
            <>
              <AccountPrompt onLogin={openSignIn} />
              <WhenRail
                when={when}
                categories={activeCategories(categoriesQuery.data)}
                categorySlug={categorySlug}
                onAsk={() => {
                  tapHaptic();
                  router.push('/events/ask' as Href);
                }}
                onWhen={(id) => {
                  tapHaptic();
                  setWhen((current) => (current === id ? '' : id));
                }}
                onCategory={(slug) => {
                  tapHaptic();
                  setCategorySlug((current) => (current === slug ? '' : slug));
                }}
              />

              {pending ? <ExploreSkeleton cardWidth={cardWidth} /> : null}
              {failed ? (
                <EmptyCopy
                  title='Events unavailable'
                  body='We could not load the live events feed right now.'
                  action='Retry'
                  onAction={() => {
                    void featuredQuery.refetch();
                    void activeQuery.refetch();
                  }}
                />
              ) : null}

              {!pending && !failed && !when && model.trending.length > 0 ? (
                <Animated.View entering={FadeInDown.duration(280)} style={styles.block}>
                  <SectionHeading inset icon='flame.fill' android='fire' title='Trending' />
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.trendRow}
                  >
                    {model.trending.map((event, index) => (
                      <Pressable
                        key={event.id}
                        onPress={() =>
                          router.push({
                            pathname: '/events/[id]',
                            params: { id: event.slug },
                          })
                        }
                        accessibilityLabel={event.title}
                        style={[styles.trendItem, index === 0 && styles.trendImageFirst]}
                      >
                        <EventImage
                          event={event}
                          contentFit='cover'
                          style={styles.trendImage}
                        />
                      </Pressable>
                    ))}
                  </ScrollView>
                </Animated.View>
              ) : null}

              {!pending && !failed && !when && model.featured.length > 0 ? (
                <Animated.View entering={FadeInDown.duration(320)} style={styles.blockPadded}>
                  <SectionHeading icon='sparkles' android='auto-fix' title='Featured' />
                  <View style={styles.list}>
                    {model.featured.map((event) => (
                      <FeaturedEventCard
                        key={event.id}
                        event={event}
                        now={now}
                        width={cardWidth}
                      />
                    ))}
                  </View>
                </Animated.View>
              ) : null}

              {!pending && !failed && when ? (
                <View style={styles.blockPadded}>
                  <SectionHeading title={WHEN_TITLES[when]} />
                  {model.filtered.length === 0 ? (
                    <EmptyCopy
                      title='Nothing in this window'
                      body='Try another time, or clear the filter to see everything on now.'
                    />
                  ) : (
                    <View style={styles.list}>
                      {model.filtered.map((event) => (
                        <ActiveEventCard
                          key={event.id}
                          event={event}
                          now={now}
                          schedule={when === 'today' ? 'today' : 'later'}
                        />
                      ))}
                    </View>
                  )}
                </View>
              ) : null}

              {!pending && !failed && !when && model.today.length > 0 ? (
                <View style={styles.blockPadded}>
                  <SectionHeading
                    title='Today'
                    more={model.today.length > 4 && !todayExpanded ? 'More' : undefined}
                    onMore={() => setTodayExpanded(true)}
                  />
                  <View style={styles.list}>
                    {(todayExpanded ? model.today : model.today.slice(0, 4)).map((event) => (
                      <ActiveEventCard
                        key={event.id}
                        event={event}
                        now={now}
                        schedule='today'
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              {!pending && !failed && !when && model.other.length > 0 ? (
                <View style={styles.otherCard}>
                  <SectionHeading
                    title='Other'
                    more={model.other.length > 5 && !otherExpanded ? 'More' : undefined}
                    onMore={() => setOtherExpanded(true)}
                  />
                  <View style={styles.list}>
                    {(otherExpanded ? model.other : model.other.slice(0, 5)).map((event) => (
                      <ActiveEventCard key={event.id} event={event} now={now} />
                    ))}
                  </View>
                </View>
              ) : null}

              {!pending && !failed && !when && model.organizers.length > 0 ? (
                <View style={styles.blockPadded}>
                  <SectionHeading
                    title='Organizers'
                    more={
                      model.organizers.length > 3 && !organisersExpanded
                        ? `${model.organizers.length - 3} More`
                        : undefined
                    }
                    onMore={() => setOrganisersExpanded(true)}
                  />
                  <View style={styles.list}>
                    {(organisersExpanded ? model.organizers : model.organizers.slice(0, 3)).map(
                      (organizer) => (
                        <OrganizerCard
                          key={organizer.id}
                          organizer={organizer}
                          onPress={() => {
                            tapHaptic();
                            setOrganiserId(organizer.id);
                          }}
                        />
                      ),
                    )}
                  </View>
                </View>
              ) : null}

              {!pending &&
              !partiallyFailed &&
              !when &&
              model.featured.length === 0 &&
              model.today.length === 0 &&
              model.other.length === 0 ? (
                <EmptyCopy
                  title={needle ? 'No matches' : 'No events yet'}
                  body={
                    needle
                      ? 'Try a different name or place.'
                      : 'Published TickitUp events will show up here.'
                  }
                />
              ) : null}
            </>
          )}
        </Animated.ScrollView>
      ) : null}

      {pane === 'tickets' ? (
        <PaneShell bottom={insets.bottom}>
          <EmptyCopy
            title='Tickets'
            body='Tickets you buy will live here after sign-in is connected.'
            action='Login'
            onAction={openSignIn}
          />
        </PaneShell>
      ) : null}

      {pane === 'liked' ? (
        <View style={styles.paneFill}>
          {model.likedEvents.length === 0 ? (
            <View style={styles.pane}>
              <EmptyCopy
                title='Liked'
                body='Tap the heart on an event to keep it here.'
              />
            </View>
          ) : (
            <ScrollView
              style={styles.paneFill}
              contentContainerStyle={[
                styles.list,
                { padding: 20, paddingBottom: insets.bottom + 120 },
              ]}
            >
              {model.likedEvents.map((event) => (
                <ActiveEventCard key={event.id} event={event} now={now} />
              ))}
            </ScrollView>
          )}
        </View>
      ) : null}

      {pane === 'settings' ? (
        <PaneShell bottom={insets.bottom}>
          <View style={styles.settings}>
            <Text style={styles.settingsTitle}>Settings</Text>
            <Pressable onPress={openSignIn} style={styles.settingsRow}>
              <Text style={styles.settingsRowLabel}>Sign in or create an account</Text>
              <UiIcon sf='chevron.right' android='chevron-right' size={16} color={EVENT.muted} />
            </Pressable>
            <Pressable
              onPress={() => router.navigate('/(tabs)/home' as Href)}
              style={styles.settingsRow}
            >
              <Text style={styles.settingsRowLabel}>Back to Visit PEI</Text>
              <UiIcon sf='chevron.right' android='chevron-right' size={16} color={EVENT.muted} />
            </Pressable>
          </View>
        </PaneShell>
      ) : null}

      <EventsDock
        compact={compact}
        pane={pane}
        searchOpen={searchOpen}
        bottomInset={insets.bottom}
        onPane={selectPane}
        onSearch={() => {
          expandDock();
          setPane('explore');
          setSearchOpen((open) => {
            // Closing the bar must drop the term too, or the feed stays
            // filtered with no visible sign of it.
            if (open) setQuery('');
            return !open;
          });
        }}
      />
    </View>
  );
}

function AccountPrompt({ onLogin }: { onLogin: () => void }) {
  return (
    <View style={styles.accountCard}>
      <View style={styles.accountIcon}>
        <UiIcon sf='info.circle' android='information-outline' size={18} color={EVENT.accent} />
      </View>
      <View style={styles.accountCopy}>
        <Text style={styles.accountTitle}>Have an account?</Text>
        <Text style={styles.accountBody}>
          Sign in or create an account for a better experience.
        </Text>
      </View>
      <Pressable onPress={onLogin} style={styles.loginButton}>
        <Text style={styles.loginLabel}>Login</Text>
      </Pressable>
    </View>
  );
}

function WhenRail({
  when,
  categories,
  categorySlug,
  onAsk,
  onWhen,
  onCategory,
}: {
  when: WhenFilter | '';
  categories: EventCategory[];
  categorySlug: string;
  onAsk: () => void;
  onWhen: (id: WhenFilter) => void;
  onCategory: (slug: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.whenRow}
    >
      <Pressable onPress={onAsk} style={styles.askTile}>
        <View style={styles.askMark}>
          <UiIcon sf='sparkles' android='auto-fix' size={22} color={EVENT.onAccent} />
        </View>
        <Text style={styles.whenLabel}>Ask AI</Text>
      </Pressable>
      {WHEN_TILES.map((tile) => {
        const selected = when === tile.id;
        return (
          <Pressable
            key={tile.id}
            onPress={() => onWhen(tile.id)}
            style={[styles.whenTile, selected && styles.whenTileOn]}
          >
            <UiIcon
              sf={tile.sf}
              android={tile.android}
              size={26}
              color={selected ? EVENT.accent : EVENT.text}
            />
            <Text style={[styles.whenLabel, selected && styles.whenLabelOn]}>
              {tile.label}
            </Text>
          </Pressable>
        );
      })}
      {categories.map((category) => {
        const selected = categorySlug === category.slug;
        const icon = categoryIcon(category.slug);
        return (
          <Pressable
            key={category.id}
            onPress={() => onCategory(category.slug)}
            style={[styles.whenTile, selected && styles.whenTileOn]}
          >
            <UiIcon
              sf={icon.sf}
              android={icon.android}
              size={26}
              color={selected ? EVENT.accent : EVENT.text}
            />
            <Text style={[styles.whenLabel, selected && styles.whenLabelOn]} numberOfLines={2}>
              {category.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function SectionHeading({
  title,
  icon,
  android,
  more,
  onMore,
  inset = false,
}: {
  title: string;
  icon?: string;
  android?: 'fire' | 'auto-fix';
  more?: string;
  onMore?: () => void;
  inset?: boolean;
}) {
  return (
    <View style={[styles.sectionHeading, inset && styles.sectionHeadingInset]}>
      <View style={styles.sectionTitleRow}>
        {icon && android ? (
          <UiIcon sf={icon} android={android} size={16} color={EVENT.accent} />
        ) : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {more && onMore ? (
        <Pressable onPress={onMore} hitSlop={8} style={styles.moreButton}>
          <Text style={styles.moreLabel}>{more}</Text>
          <UiIcon sf='chevron.right' android='chevron-right' size={14} color={EVENT.muted} />
        </Pressable>
      ) : (
        <View />
      )}
    </View>
  );
}

function OrganizerEvents({
  name,
  events,
  now,
  cardWidth,
  onBack,
}: {
  name: string;
  events: TickitUpEvent[];
  now: number;
  cardWidth: number;
  onBack: () => void;
}) {
  return (
    <View style={styles.blockPadded}>
      <Pressable onPress={onBack} style={styles.backRow}>
        <UiIcon sf='chevron.left' android='chevron-left' size={16} color={EVENT.accent} />
        <Text style={styles.backLabel}>All organizers</Text>
      </Pressable>
      <Text selectable style={styles.sectionTitle}>
        Events by {name}
      </Text>
      {events.length === 0 ? (
        <EmptyCopy title='No events' body='This organizer has nothing published in the current list.' />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.organiserRail}
        >
          {events.map((event) => (
            <FeaturedEventCard key={event.id} event={event} now={now} width={cardWidth} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function PaneShell({
  children,
  bottom,
}: {
  children: ReactNode;
  bottom: number;
}) {
  return <View style={[styles.pane, { paddingBottom: bottom + 96 }]}>{children}</View>;
}

function EmptyCopy({
  title,
  body,
  action,
  onAction,
}: {
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} style={styles.emptyAction}>
          <Text style={styles.emptyActionLabel}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ExploreSkeleton({ cardWidth }: { cardWidth: number }) {
  return (
    <View style={styles.blockPadded}>
      <View style={[styles.skeletonCard, { width: cardWidth, height: cardWidth * 1.2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: EVENT.bg,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 6,
    paddingRight: 12,
    height: 44,
    borderRadius: 999,
    backgroundColor: EVENT.elevated,
    borderWidth: 1,
    borderColor: EVENT.border,
  },
  locationFlag: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EVENT.accent,
  },
  locationFlagText: {
    color: EVENT.onAccent,
    fontSize: 11,
    fontWeight: '800',
  },
  locationLabel: {
    color: EVENT.text,
    fontSize: 15,
    fontWeight: '700',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 44,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: EVENT.elevated,
    borderWidth: 1,
    borderColor: EVENT.border,
  },
  plusButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EVENT.accent,
  },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 8,
    height: 46,
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: EVENT.elevated,
  },
  searchInput: {
    flex: 1,
    color: EVENT.text,
    fontSize: 16,
    paddingVertical: 0,
  },
  accountCard: {
    marginHorizontal: 16,
    marginTop: 6,
    padding: 14,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: EVENT.elevated,
    borderWidth: 1,
    borderColor: EVENT.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(217,141,16,0.14)',
  },
  accountCopy: {
    flex: 1,
    gap: 2,
  },
  accountTitle: {
    color: EVENT.text,
    fontSize: 15,
    fontWeight: '800',
  },
  accountBody: {
    color: EVENT.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  loginButton: {
    flexShrink: 0,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: EVENT.accentSoft,
  },
  loginLabel: {
    color: EVENT.accent,
    fontSize: 13,
    fontWeight: '800',
  },
  whenRow: {
    paddingHorizontal: 16,
    gap: 10,
  },
  askTile: {
    width: 84,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  askMark: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EVENT.accent,
  },
  whenTile: {
    width: 84,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderCurve: 'continuous',
  },
  whenTileOn: {
    backgroundColor: EVENT.accentSoft,
  },
  whenLabel: {
    color: EVENT.muted,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  whenLabelOn: {
    color: EVENT.accent,
  },
  block: {
    gap: 12,
  },
  blockPadded: {
    paddingHorizontal: 16,
    gap: 12,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeadingInset: {
    paddingHorizontal: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: EVENT.text,
    fontSize: 20,
    fontWeight: '700',
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  moreLabel: {
    color: EVENT.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  trendRow: {
    paddingHorizontal: 16,
    gap: 12,
  },
  trendItem: {
    width: 74,
    height: 74,
    borderRadius: 37,
    overflow: 'hidden',
    backgroundColor: EVENT.elevated,
  },
  trendImage: {
    width: 74,
    height: 74,
    // Android clips unreliably against a rounded parent, so round it directly.
    borderRadius: 37,
  },
  trendImageFirst: {
    borderWidth: 2,
    borderColor: EVENT.accent,
  },
  organiserRail: {
    gap: 12,
  },
  list: {
    gap: 12,
  },
  otherCard: {
    marginHorizontal: 16,
    padding: 14,
    gap: 12,
    borderRadius: 28,
    borderCurve: 'continuous',
    backgroundColor: EVENT.surface,
    borderWidth: 1,
    borderColor: EVENT.border,
    boxShadow: EVENT.shadow,
  },
  pane: {
    flex: 1,
    justifyContent: 'center',
  },
  paneFill: {
    flex: 1,
  },
  empty: {
    marginHorizontal: 20,
    paddingVertical: 28,
    alignItems: 'flex-start',
    gap: 8,
  },
  emptyTitle: {
    color: EVENT.text,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyBody: {
    color: EVENT.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyAction: {
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: EVENT.accent,
  },
  emptyActionLabel: {
    color: EVENT.onAccent,
    fontSize: 14,
    fontWeight: '800',
  },
  skeletonCard: {
    borderRadius: 24,
    backgroundColor: EVENT.elevated,
  },
  settings: {
    paddingHorizontal: 20,
    gap: 12,
  },
  settingsTitle: {
    color: EVENT.text,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  settingsRow: {
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: EVENT.elevated,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsRowLabel: {
    color: EVENT.text,
    fontSize: 16,
    fontWeight: '600',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backLabel: {
    color: EVENT.accent,
    fontSize: 14,
    fontWeight: '700',
  },
});
