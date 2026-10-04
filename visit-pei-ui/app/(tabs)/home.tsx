import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, type ComponentProps } from 'react';
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
import { pickLocalized, useLocale, type Locale } from '../../src/i18n';
import { useFeaturedPlacesQuery } from '../../src/services/query/home/useFeaturedPlacesQuery';
import { useUpcomingEventsQuery } from '../../src/services/query/home/useUpcomingEventsQuery';
import { useWeatherQuery } from '../../src/services/query/weather/useWeatherQuery';
import type { Place, TickitUpEvent } from '../../src/types/api';
import {
  getEventImageUrl,
  getEventLocation,
} from '../../src/utils/eventDisplay';
import { getPlaceTheme } from '../../src/utils/placeVisuals';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_CARD_WIDTH = (SCREEN_WIDTH - 40 - 12) / 2;
const MOOD_CARD_WIDTH = SCREEN_WIDTH - 40;
const MOOD_ITEM_WIDTH = Math.floor(MOOD_CARD_WIDTH / 3);
const MOOD_LABEL_WIDTH = MOOD_ITEM_WIDTH - 20;

type MoodCategoryId = 'beaches' | 'food' | 'trails' | 'events' | 'stays' | 'family';

const categories: Array<{ id: MoodCategoryId; icon: IconName }> = [
  { id: 'beaches', icon: 'wave' },
  { id: 'food',    icon: 'silverware-fork-knife' },
  { id: 'trails',  icon: 'map-marker-path' },
  { id: 'events',  icon: 'calendar-star' },
  { id: 'stays',   icon: 'bed-queen-outline' },
  { id: 'family',  icon: 'ferris-wheel' },
];

const getPlaceSubtitle = (place: Place) => {
  if (place.community?.trim()) return place.community.trim();
  if (place.description?.trim()) return place.description.trim();
  return 'Featured on PEI';
};

type WeatherDisplay = {
  icon: IconName;
  tempC: number;
  labelKey: string;
};

// Seasonal fallback shown while the forecast loads or if the API is unreachable.
const getFallbackWeather = (now: Date): WeatherDisplay => {
  const month = now.getMonth();
  if (month >= 5 && month <= 8) return { icon: 'weather-sunny', tempC: 22, labelKey: 'summer' };
  if (month >= 9 && month <= 10) return { icon: 'weather-partly-cloudy', tempC: 14, labelKey: 'fall' };
  if (month >= 11 || month <= 1) return { icon: 'weather-snowy', tempC: -4, labelKey: 'winter' };
  return { icon: 'weather-windy', tempC: 9, labelKey: 'spring' };
};

// WMO weather codes (Open-Meteo) → icon + i18n condition key.
const describeWeatherCode = (code: number, isDay: boolean): { icon: IconName; conditionKey: string } => {
  if (code === 0) return { icon: isDay ? 'weather-sunny' : 'weather-night', conditionKey: 'clear' };
  if (code <= 2) return { icon: isDay ? 'weather-partly-cloudy' : 'weather-night-partly-cloudy', conditionKey: 'partlyCloudy' };
  if (code === 3) return { icon: 'weather-cloudy', conditionKey: 'cloudy' };
  if (code === 45 || code === 48) return { icon: 'weather-fog', conditionKey: 'fog' };
  if (code >= 51 && code <= 57) return { icon: 'weather-rainy', conditionKey: 'drizzle' };
  if (code >= 61 && code <= 67) return { icon: 'weather-pouring', conditionKey: 'rain' };
  if (code >= 71 && code <= 77) return { icon: 'weather-snowy', conditionKey: 'snow' };
  if (code >= 80 && code <= 82) return { icon: 'weather-rainy', conditionKey: 'showers' };
  if (code >= 85 && code <= 86) return { icon: 'weather-snowy-heavy', conditionKey: 'snowShowers' };
  if (code >= 95) return { icon: 'weather-lightning-rainy', conditionKey: 'thunderstorm' };
  return { icon: 'weather-partly-cloudy', conditionKey: 'cloudy' };
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const daysBetween = (a: Date, b: Date) => {
  const aStart = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bStart = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((bStart - aStart) / 86_400_000);
};

const formatEventMeta = (event: TickitUpEvent) => {
  const date = new Date(event.startDate);
  const dateText = new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }).format(date);

  const timeText = new Intl.DateTimeFormat('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);

  return `${dateText} · ${timeText}`;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return 'Unable to load this section right now.';
};

const WeatherChip = ({
  weather,
  inLabel,
  vibeLabel,
}: {
  weather: Pick<WeatherDisplay, 'icon' | 'tempC'>;
  inLabel: string;
  vibeLabel: string;
}) => (
  <View
    style={styles.weatherChip}
    accessibilityRole='summary'
    accessibilityLabel={`${weather.tempC}°C, ${vibeLabel}, ${inLabel}`}
  >
    <MaterialCommunityIcons name={weather.icon} size={16} color={COLOR.whiteText} />
    <Text style={styles.weatherTemp}>{weather.tempC}°C</Text>
    <Text style={styles.weatherDivider}>·</Text>
    <Text style={styles.weatherVibe} numberOfLines={1}>{vibeLabel}</Text>
    <Text style={styles.weatherDivider}>·</Text>
    <Text style={styles.weatherIn} numberOfLines={1}>{inLabel}</Text>
  </View>
);

const TodayHero = ({
  event,
  locale,
  badgeLabel,
  ctaLabel,
  title,
  subtitle,
  onPress,
}: {
  event: TickitUpEvent;
  locale: Locale;
  badgeLabel: string;
  ctaLabel: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) => {
  const displayTitle = event.title;
  const venue = getEventLocation(event);
  const start = new Date(event.startDate);
  const time = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-CA' : 'en-CA', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(start);

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={`${title}: ${displayTitle}`}
    >
      <Surface style={styles.todayCard} elevation={0}>
        {getEventImageUrl(event) ? (
          <Image
            source={{ uri: getEventImageUrl(event) ?? undefined }}
            contentFit='cover'
            transition={180}
            style={styles.todayImage}
          />
        ) : (
          <View style={[styles.todayImage, styles.todayImageFallback]}>
            <MaterialCommunityIcons name='calendar-star' size={40} color={COLOR.brandGreen} />
          </View>
        )}
        <View style={styles.todayOverlay} />

        <View style={styles.todayTopRow}>
          <View style={styles.todayBadge}>
            <View style={styles.todayPulseDot} />
            <Text style={styles.todayBadgeText}>{badgeLabel}</Text>
          </View>
          <View style={styles.todayKickerPill}>
            <Text style={styles.todayKickerText}>{title}</Text>
          </View>
        </View>

        <View style={styles.todayCopy}>
          <Text style={styles.todaySubtitle}>{subtitle}</Text>
          <Text style={styles.todayEventTitle} numberOfLines={2}>{displayTitle}</Text>
          <View style={styles.todayMetaRow}>
            <MaterialCommunityIcons name='map-marker-outline' size={13} color='rgba(255,255,255,0.92)' />
            <Text style={styles.todayMetaText} numberOfLines={1}>{venue}</Text>
            {time ? (
              <>
                <View style={styles.todayMetaDot} />
                <MaterialCommunityIcons name='clock-outline' size={13} color='rgba(255,255,255,0.92)' />
                <Text style={styles.todayMetaText}>{time}</Text>
              </>
            ) : null}
          </View>
          <View style={styles.todayCta}>
            <Text style={styles.todayCtaText}>{ctaLabel}</Text>
            <MaterialCommunityIcons name='arrow-right' size={14} color={COLOR.brandGreen} />
          </View>
        </View>
      </Surface>
    </TouchableOpacity>
  );
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
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={styles.retryButton}
      >
        <Text style={styles.retryLabel}>{actionLabel}</Text>
      </TouchableOpacity>
    ) : null}
  </Surface>
);

const DiscoverCard = ({
  onPress,
  place,
  locale,
}: {
  onPress: () => void;
  place: Place;
  locale: Locale;
}) => {
  const theme = getPlaceTheme(place.category);
  const displayName = pickLocalized(place.name, place.nameFr, locale);
  const localizedDescription = pickLocalized(place.description, place.descriptionFr, locale);
  const subtitle = place.community?.trim() || localizedDescription || getPlaceSubtitle(place);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={styles.gridCardPressable}
    >
      <Surface style={styles.gridCard} elevation={0}>
        <View
          style={[styles.gridMedia, { backgroundColor: theme.softColor }]}
        >
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
            <Text
              style={[
                styles.gridFallbackBadgeText,
                { color: theme.accentColor },
              ]}
            >
              {theme.label}
            </Text>
          </View>
          <View style={styles.gridIconPill}>
            <MaterialCommunityIcons
              name={theme.icon}
              size={28}
              color={COLOR.whiteText}
            />
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
            {displayName}
          </Text>
          <Text style={styles.gridDescription} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
      </Surface>
    </TouchableOpacity>
  );
};

const DiscoverCardSkeleton = ({ index }: { index: number }) => (
  <Surface
    key={`discover-skeleton-${index}`}
    style={styles.gridCard}
    elevation={0}
  >
    <View style={styles.gridSkeletonImage} />
    <View style={styles.gridBody}>
      <View style={[styles.skeletonLine, styles.skeletonLineTitle]} />
      <View style={[styles.skeletonLine, styles.skeletonLineBody]} />
    </View>
  </Surface>
);

const EventCard = ({
  event,
  onPress,
  locale,
}: {
  event: TickitUpEvent;
  onPress: () => void;
  locale: Locale;
}) => {
  const hasImage = Boolean(getEventImageUrl(event));
  const displayTitle = event.title;

  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress}>
      <Surface style={styles.planCard} elevation={0}>
        <View style={styles.planAccent} />

        {hasImage ? (
          <Image
            source={{ uri: getEventImageUrl(event) ?? undefined }}
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
            {displayTitle}
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
    </TouchableOpacity>
  );
};

const EventCardSkeleton = ({ index }: { index: number }) => (
  <Surface
    key={`event-skeleton-${index}`}
    style={styles.planCard}
    elevation={0}
  >
    <View style={styles.planAccent} />
    <View style={styles.planIconWrap}>
      <MaterialCommunityIcons
        name='calendar-blank-outline'
        size={24}
        color={COLOR.lightGray}
      />
    </View>
    <View style={styles.planCopy}>
      <View style={[styles.skeletonLine, styles.skeletonLineEventTitle]} />
      <View style={[styles.skeletonLine, styles.skeletonLineBody]} />
      <View style={[styles.skeletonLine, styles.skeletonLineCaption]} />
    </View>
  </Surface>
);

const handleMoodPress = (id: string) => {
  if (id === 'trails') return router.push({ pathname: '/(tabs)/discover', params: { category: 'TRAIL' } });
  if (id === 'events') return router.push('/(tabs)/events');
  if (id === 'beaches') return router.push({ pathname: '/(tabs)/discover', params: { category: 'BEACH' } });
  if (id === 'food') return router.push('/food');
  if (id === 'stays') return router.push('/stays');
  if (id === 'family') return router.push('/family');
};

export default function HomeTab() {
  const { t, locale } = useLocale();
  const topRow = categories.slice(0, 3);
  const bottomRow = categories.slice(3, 6);

  const featuredPlacesQuery = useFeaturedPlacesQuery();
  const upcomingEventsQuery = useUpcomingEventsQuery();

  const featuredPlaces = featuredPlacesQuery.data?.items ?? [];
  const upcomingEvents = upcomingEventsQuery.data?.data ?? [];

  const now = useMemo(() => new Date(), []);
  const weatherQuery = useWeatherQuery();
  const weather = useMemo<WeatherDisplay>(() => {
    const current = weatherQuery.data?.current;
    if (current) {
      const { icon, conditionKey } = describeWeatherCode(current.weatherCode, current.isDay);
      return { icon, tempC: current.tempC, labelKey: `conditions.${conditionKey}` };
    }
    return getFallbackWeather(now);
  }, [weatherQuery.data, now]);

  const heroEvent = upcomingEvents[0] ?? null;
  const heroBadgeKey: 'happeningToday' | 'happeningTomorrow' | 'thisWeek' | null = useMemo(() => {
    if (!heroEvent) return null;
    const start = new Date(heroEvent.startDate);
    if (isSameDay(start, now)) return 'happeningToday';
    const days = daysBetween(now, start);
    if (days === 1) return 'happeningTomorrow';
    if (days >= 2 && days <= 7) return 'thisWeek';
    return null;
  }, [heroEvent, now]);

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
            <View style={styles.headerTopRow}>
              <View style={styles.headerLocationRow}>
                <MaterialCommunityIcons
                  name='map-marker-outline'
                  size={16}
                  color='rgba(255,255,255,0.8)'
                />
                <Text style={styles.headerLocation}>{t('home.location')}</Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  onPress={() => router.push('/visitor-centres' as never)}
                  accessibilityRole='button'
                  accessibilityLabel={t('visitorCentres.openLabel')}
                  activeOpacity={0.7}
                  style={styles.settingsBtn}
                >
                  <MaterialCommunityIcons
                    name='information-outline'
                    size={22}
                    color='rgba(255,255,255,0.92)'
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/settings' as never)}
                  accessibilityRole='button'
                  accessibilityLabel={t('common.settings')}
                  activeOpacity={0.7}
                  style={styles.settingsBtn}
                >
                  <MaterialCommunityIcons
                    name='cog-outline'
                    size={22}
                    color='rgba(255,255,255,0.92)'
                  />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.headerGreeting}>{t('home.greeting')}</Text>
            <Text style={styles.headerTitle}>{t('home.title')}</Text>
            <Text style={styles.headerSub}>{t('home.subtitle')}</Text>

            <WeatherChip
              weather={weather}
              inLabel={t('home.weather.in')}
              vibeLabel={t(`home.weather.${weather.labelKey}`)}
            />
          </View>

          <View style={styles.moodWrapper}>
            <Surface style={styles.moodCard} elevation={0}>
              <View style={styles.moodRow}>
                {topRow.map((cat, index) => (
                  <TouchableOpacity
                    key={cat.id}
                    activeOpacity={0.7}
                    onPress={() => handleMoodPress(cat.id)}
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
                        {t(`home.moods.${cat.id}`)}
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
                    onPress={() => handleMoodPress(cat.id)}
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
                        {t(`home.moods.${cat.id}`)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </Surface>
          </View>

          {heroEvent && heroBadgeKey ? (
            <View style={styles.todaySection}>
              <TodayHero
                event={heroEvent}
                locale={locale}
                badgeLabel={t(`home.today.${heroBadgeKey}`)}
                title={t('home.today.title')}
                subtitle={t('home.today.subtitle')}
                ctaLabel={t('home.today.viewEvent')}
                onPress={() =>
                  router.push({
                    pathname: '/events/[id]',
                    params: { id: heroEvent.slug },
                  })
                }
              />
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('home.discoverTitle')}</Text>
              <Text style={styles.sectionLink}>{t('home.discoverLink')}</Text>
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
                title={t('home.states.featuredUnavailable')}
                description={getErrorMessage(featuredPlacesQuery.error)}
                icon='map-search-outline'
                actionLabel={t('common.retry')}
                onPress={() => featuredPlacesQuery.refetch()}
              />
            ) : null}

            {!featuredPlacesQuery.isPending &&
            !featuredPlacesQuery.isError &&
            featuredPlaces.length === 0 ? (
              <HomeSectionStateCard
                title={t('home.states.noFeatured')}
                description={t('home.states.noFeaturedBody')}
                icon='compass-outline'
              />
            ) : null}

            {!featuredPlacesQuery.isPending &&
            !featuredPlacesQuery.isError &&
            featuredPlaces.length > 0 ? (
              <View style={styles.grid}>
                {featuredPlaces.map((place) => (
                  <DiscoverCard
                    key={place.id}
                    place={place}
                    locale={locale}
                    onPress={() =>
                      router.push({
                        pathname: '/places/[id]',
                        params: { id: place.id },
                      })
                    }
                  />
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('home.eventsTitle')}</Text>
              <Text style={styles.sectionLink}>{t('home.eventsLink')}</Text>
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
                title={t('home.states.eventsUnavailable')}
                description={getErrorMessage(upcomingEventsQuery.error)}
                icon='calendar-alert'
                actionLabel={t('common.retry')}
                onPress={() => upcomingEventsQuery.refetch()}
              />
            ) : null}

            {!upcomingEventsQuery.isPending &&
            !upcomingEventsQuery.isError &&
            upcomingEvents.length === 0 ? (
              <HomeSectionStateCard
                title={t('home.states.noEvents')}
                description={t('home.states.noEventsBody')}
                icon='calendar-blank-outline'
              />
            ) : null}

            {!upcomingEventsQuery.isPending &&
            !upcomingEventsQuery.isError &&
            upcomingEvents.length > 0 ? (
              <View style={styles.planList}>
                {upcomingEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    locale={locale}
                    onPress={() =>
                      router.push({
                        pathname: '/events/[id]',
                        params: { id: event.slug },
                      })
                    }
                  />
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
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
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
  weatherChip: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  weatherTemp: {
    color: COLOR.whiteText,
    fontSize: 13,
    fontWeight: '800',
  },
  weatherDivider: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '700',
  },
  weatherVibe: {
    color: COLOR.whiteText,
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 130,
  },
  weatherIn: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 120,
  },
  todaySection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  todayCard: {
    width: '100%',
    minHeight: 220,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: COLOR.brandGreen,
    justifyContent: 'space-between',
    padding: 16,
  },
  todayImage: {
    ...StyleSheet.absoluteFillObject,
  },
  todayImageFallback: {
    backgroundColor: COLOR.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 36, 28, 0.55)',
  },
  todayTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  todayPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff6b6b',
  },
  todayBadgeText: {
    color: COLOR.whiteText,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  todayKickerPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  todayKickerText: {
    color: COLOR.whiteText,
    fontSize: 11,
    fontWeight: '700',
  },
  todayCopy: {
    gap: 4,
  },
  todaySubtitle: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  todayEventTitle: {
    color: COLOR.whiteText,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  todayMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  todayMetaText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 120,
  },
  todayMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 4,
  },
  todayCta: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLOR.whiteText,
  },
  todayCtaText: {
    color: COLOR.brandGreen,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
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
  gridCardPressable: {
    width: GRID_CARD_WIDTH,
  },
  gridCard: {
    width: '100%',
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
