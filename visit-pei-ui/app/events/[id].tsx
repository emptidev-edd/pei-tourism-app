import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ActivityIndicator, Surface } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLOR } from '../../styles';
import { useEventQuery } from '../../src/services/query/events/useEventQuery';
import type { TourismEvent } from '../../src/types/api';

const formatEventDate = (event: TourismEvent) => {
  const start = new Date(event.startAt);
  const dateText = new Intl.DateTimeFormat('en-CA', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(start);

  if (event.allDay) {
    return `${dateText} · All day`;
  }

  const timeFormatter = new Intl.DateTimeFormat('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (event.endAt) {
    return `${dateText} · ${timeFormatter.format(start)} - ${timeFormatter.format(new Date(event.endAt))}`;
  }

  return `${dateText} · ${timeFormatter.format(start)}`;
};

const getLocationLabel = (event: TourismEvent) =>
  event.venueName?.trim() ||
  event.community?.trim() ||
  event.address?.trim() ||
  'Prince Edward Island';

const getEventSummary = (event: TourismEvent) => {
  if (event.description?.trim()) {
    return event.description.trim();
  }

  return `${event.title} is an upcoming event happening in ${getLocationLabel(event)}.`;
};

const openDirections = async (event: TourismEvent) => {
  if (event.lat == null || event.lng == null) {
    return;
  }

  const query = encodeURIComponent(
    event.venueName?.trim() || event.title || 'Prince Edward Island',
  );
  const url = Platform.select({
    ios: `maps://maps.apple.com/?q=${query}&ll=${event.lat},${event.lng}`,
    default: `https://www.google.com/maps/search/?api=1&query=${query}@${event.lat},${event.lng}`,
  });

  if (url) {
    await Linking.openURL(url);
  }
};

const openWebsite = async (website: string | null) => {
  if (!website) {
    return;
  }

  await Linking.openURL(website);
};

const openPhone = async (phone: string | null) => {
  if (!phone) {
    return;
  }

  await Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);
};

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#1c2530',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  default: {
    elevation: 6,
  },
});

const DetailAction = ({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
}) => (
  <TouchableOpacity
    activeOpacity={0.84}
    onPress={onPress}
    style={styles.actionChip}
  >
    <MaterialCommunityIcons name={icon} size={16} color={COLOR.brandGreen} />
    <Text style={styles.actionChipText}>{label}</Text>
  </TouchableOpacity>
);

export default function EventDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventQuery = useEventQuery(id ?? '');

  const event = eventQuery.data?.event;

  return (
    <>
      <StatusBar style='light' translucent />
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {eventQuery.isPending ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator
              animating
              color={COLOR.brandGreen}
              size='large'
            />
            <Text style={styles.stateTitle}>Loading event details...</Text>
          </View>
        ) : null}

        {eventQuery.isError ? (
          <View style={styles.stateContainer}>
            <MaterialCommunityIcons
              name='alert-circle-outline'
              size={48}
              color={COLOR.mainText}
            />
            <Text style={styles.stateTitle}>Unable to load event</Text>
            <Text style={styles.stateDescription}>
              {eventQuery.error instanceof Error
                ? eventQuery.error.message
                : 'We could not fetch this event right now.'}
            </Text>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => eventQuery.refetch()}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!eventQuery.isPending && !eventQuery.isError && !event ? (
          <View style={styles.stateContainer}>
            <MaterialCommunityIcons
              name='calendar-remove-outline'
              size={48}
              color={COLOR.mainText}
            />
            <Text style={styles.stateTitle}>Event not found</Text>
            <Text style={styles.stateDescription}>
              This event could not be loaded. Please go back and try another one.
            </Text>
          </View>
        ) : null}

        {event ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
            contentContainerStyle={styles.contentContainer}
          >
            <View style={styles.heroWrap}>
              {event.imageUrl ? (
                <Image
                  source={{ uri: event.imageUrl }}
                  contentFit='cover'
                  transition={150}
                  style={styles.heroImage}
                />
              ) : (
                <View style={styles.heroFallback}>
                  <MaterialCommunityIcons
                    name='calendar-star'
                    size={40}
                    color={COLOR.brandGreen}
                  />
                </View>
              )}

              <View style={styles.heroOverlay} />

              <TouchableOpacity
                accessibilityRole='button'
                activeOpacity={0.82}
                onPress={() => router.back()}
                style={[styles.backButton, { top: insets.top + 16 }]}
              >
                <MaterialCommunityIcons
                  name='arrow-left'
                  size={22}
                  color={COLOR.whiteText}
                />
              </TouchableOpacity>
            </View>

            <Surface style={styles.detailsCard} elevation={0}>
              <View style={styles.datePill}>
                <MaterialCommunityIcons
                  name='calendar-clock'
                  size={16}
                  color={COLOR.whiteText}
                />
                <Text style={styles.datePillText}>{formatEventDate(event)}</Text>
              </View>

              <Text style={styles.title}>{event.title}</Text>

              <View style={styles.locationRow}>
                <MaterialCommunityIcons
                  name='map-marker-outline'
                  size={18}
                  color={COLOR.mutedText}
                />
                <Text style={styles.locationText}>{getLocationLabel(event)}</Text>
              </View>

              <Text style={styles.description}>{getEventSummary(event)}</Text>

              <View style={styles.infoList}>
                {event.address?.trim() ? (
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons
                      name='map-marker-radius-outline'
                      size={16}
                      color={COLOR.brandGreen}
                    />
                    <Text style={styles.infoText}>{event.address.trim()}</Text>
                  </View>
                ) : null}

                {event.contactPhone?.trim() ? (
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons
                      name='phone-outline'
                      size={16}
                      color={COLOR.brandGreen}
                    />
                    <Text style={styles.infoText}>{event.contactPhone.trim()}</Text>
                  </View>
                ) : null}
              </View>

              {event.contactPhone || event.website ? (
                <View style={styles.actionRow}>
                  {event.contactPhone ? (
                    <DetailAction
                      icon='phone-outline'
                      label='Call'
                      onPress={() => openPhone(event.contactPhone)}
                    />
                  ) : null}

                  {event.website ? (
                    <DetailAction
                      icon='web'
                      label='Website'
                      onPress={() => openWebsite(event.website)}
                    />
                  ) : null}
                </View>
              ) : null}

              {event.lat != null && event.lng != null ? (
                <TouchableOpacity
                  activeOpacity={0.86}
                  onPress={() => openDirections(event)}
                  style={styles.directionButton}
                >
                  <MaterialCommunityIcons
                    name='map-marker-right'
                    size={18}
                    color={COLOR.whiteText}
                  />
                  <Text style={styles.directionButtonText}>Direction</Text>
                </TouchableOpacity>
              ) : null}
            </Surface>
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLOR.background,
  },
  scroll: {
    flex: 1,
    backgroundColor: COLOR.background,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  heroWrap: {
    position: 'relative',
    height: 360,
    backgroundColor: COLOR.lightGreen,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLOR.lightGreen,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 19, 24, 0.18)',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  detailsCard: {
    marginHorizontal: 16,
    marginTop: -34,
    borderRadius: 32,
    backgroundColor: COLOR.surface,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 16,
    ...cardShadow,
  },
  datePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLOR.brandGreen,
  },
  datePillText: {
    color: COLOR.whiteText,
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    color: COLOR.headingText,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    flex: 1,
    color: COLOR.mutedText,
    fontSize: 15,
    lineHeight: 21,
  },
  description: {
    color: COLOR.mutedText,
    fontSize: 15,
    lineHeight: 24,
  },
  infoList: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    flex: 1,
    color: COLOR.mainText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#eef7f4',
  },
  actionChipText: {
    color: COLOR.brandGreen,
    fontSize: 13,
    fontWeight: '800',
  },
  directionButton: {
    minHeight: 56,
    borderRadius: 999,
    backgroundColor: COLOR.brandGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  directionButtonText: {
    color: COLOR.whiteText,
    fontSize: 17,
    fontWeight: '800',
  },
  stateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  stateTitle: {
    color: COLOR.mainText,
    fontSize: 18,
    fontWeight: '800',
  },
  stateDescription: {
    color: COLOR.mutedText,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: COLOR.brandGreen,
  },
  retryButtonText: {
    color: COLOR.whiteText,
    fontSize: 14,
    fontWeight: '800',
  },
});
