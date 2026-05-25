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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { COLOR } from '../../styles';
import { usePlaceQuery } from '../../src/services/query/places/usePlaceQuery';
import type { Place, PlaceCategory } from '../../src/types/api';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

type VisualTheme = {
  accentColor: string;
  icon: IconName;
  label: string;
  softColor: string;
};

const PLACE_VISUALS: Record<PlaceCategory, VisualTheme> = {
  VISITOR_CENTRE: {
    label: 'Visitor Info',
    icon: 'information-outline',
    accentColor: '#0f8a73',
    softColor: '#daf4ee',
  },
  ATTRACTION: {
    label: 'Attraction',
    icon: 'compass-outline',
    accentColor: '#3267b8',
    softColor: '#e8f0ff',
  },
  BEACH: {
    label: 'Beach',
    icon: 'wave',
    accentColor: '#1982b8',
    softColor: '#dff3ff',
  },
  PARK: {
    label: 'Park',
    icon: 'tree-outline',
    accentColor: '#4c8f2f',
    softColor: '#e3f5d6',
  },
  TRAIL: {
    label: 'Trail',
    icon: 'map-marker-path',
    accentColor: '#007960',
    softColor: '#e6f2ef',
  },
  LIGHTHOUSE: {
    label: 'Lighthouse',
    icon: 'lighthouse',
    accentColor: '#d98500',
    softColor: '#fff3cf',
  },
  MUSEUM: {
    label: 'Museum',
    icon: 'bank-outline',
    accentColor: '#6f47c8',
    softColor: '#efe8ff',
  },
  HISTORIC: {
    label: 'Historic',
    icon: 'castle',
    accentColor: '#9d5b2a',
    softColor: '#f7e9dc',
  },
  FOOD_DRINK: {
    label: 'Food & Drink',
    icon: 'silverware-fork-knife',
    accentColor: '#c75d1d',
    softColor: '#ffe7d9',
  },
  TRANSPORT: {
    label: 'Transport',
    icon: 'bus',
    accentColor: '#486a9f',
    softColor: '#e8eef8',
  },
  OTHER: {
    label: 'Explore',
    icon: 'map-search-outline',
    accentColor: '#5f738c',
    softColor: '#edf1f6',
  },
};

const NOISY_TAGS = new Set([
  'open-data',
  'open data',
  'pei',
  'prince edward island',
]);

const getPlaceTheme = (category: PlaceCategory) =>
  PLACE_VISUALS[category] ?? PLACE_VISUALS.OTHER;

const formatTagLabel = (value: string) =>
  value
    .trim()
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

const getPrimaryTag = (place: Place, fallback: string) => {
  const usefulTag = place.tags.find((tag) => {
    const normalized = tag.trim().toLowerCase();
    return normalized.length > 0 && !NOISY_TAGS.has(normalized);
  });

  if (usefulTag) {
    return formatTagLabel(usefulTag);
  }

  return fallback;
};

const getPlaceSummary = (place: Place, tagLabel: string, addressLabel: string) => {
  if (place.description?.trim()) {
    return place.description.trim();
  }

  const regionLabel = place.region?.trim();
  const communityLabel = place.community?.trim();
  const locationLabel = communityLabel || regionLabel || addressLabel;
  const lowerTag = tagLabel.toLowerCase();

  return `${place.name} is a ${lowerTag} destination in ${locationLabel}. Use directions to plan your stop and explore more of Prince Edward Island with confidence.`;
};

const openDirections = async (
  name: string,
  lat: number | null,
  lng: number | null,
) => {
  if (lat == null || lng == null) {
    return;
  }

  const query = encodeURIComponent(name);
  const url = Platform.select({
    ios: `maps://maps.apple.com/?q=${query}&ll=${lat},${lng}`,
    default: `https://www.google.com/maps/search/?api=1&query=${query}@${lat},${lng}`,
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

  const cleanPhone = phone.replace(/\s+/g, '');
  await Linking.openURL(`tel:${cleanPhone}`);
};

const DetailChip = ({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) => (
  <TouchableOpacity
    activeOpacity={0.82}
    onPress={onPress}
    style={styles.detailChip}
  >
    <MaterialCommunityIcons name={icon} size={16} color={COLOR.brandGreen} />
    <Text style={styles.detailChipText}>{label}</Text>
  </TouchableOpacity>
);

const DetailInfoRow = ({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIconWrap}>
      <MaterialCommunityIcons name={icon} size={16} color={COLOR.brandGreen} />
    </View>
    <View style={styles.infoCopy}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const PlaceDetailsScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const placeQuery = usePlaceQuery(id ?? '');

  const place = placeQuery.data;
  const theme = place ? getPlaceTheme(place.category) : null;
  const addressLabel =
    place?.address?.trim() ||
    place?.community?.trim() ||
    'Prince Edward Island';
  const primaryTag = place && theme ? getPrimaryTag(place, theme.label) : null;
  const summaryText =
    place && primaryTag ? getPlaceSummary(place, primaryTag, addressLabel) : null;

  return (
    <>
      <StatusBar style='dark' translucent />
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {placeQuery.isPending ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator
              animating
              color={COLOR.brandGreen}
              size='large'
            />
            <Text style={styles.stateTitle}>Loading place details...</Text>
          </View>
        ) : null}

        {placeQuery.isError ? (
          <View style={styles.stateContainer}>
            <MaterialCommunityIcons
              name='alert-circle-outline'
              size={48}
              color={COLOR.mainText}
            />
            <Text style={styles.stateTitle}>Unable to load place details</Text>
            <Text style={styles.stateDescription}>
              {placeQuery.error instanceof Error
                ? placeQuery.error.message
                : 'We could not fetch this place right now.'}
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => placeQuery.refetch()}
              style={styles.retryButton}
            >
              <Text style={styles.retryLabel}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!placeQuery.isPending && !placeQuery.isError && !place ? (
          <View style={styles.stateContainer}>
            <MaterialCommunityIcons
              name='map-search-outline'
              size={48}
              color={COLOR.mainText}
            />
            <Text style={styles.stateTitle}>Place not found</Text>
            <Text style={styles.stateDescription}>
              This place could not be loaded. Please go back and try again.
            </Text>
          </View>
        ) : null}

        {place && theme ? (
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.heroWrap}>
              {place.imageUrl ? (
                <Image
                  source={{ uri: place.imageUrl }}
                  contentFit='cover'
                  transition={150}
                  style={styles.heroImage}
                />
              ) : (
                <View
                  style={[
                    styles.heroPlaceholder,
                    { backgroundColor: theme.softColor },
                  ]}
                >
                  <View
                    style={[
                      styles.heroPlaceholderBadge,
                      { backgroundColor: `${theme.accentColor}1f` },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={theme.icon}
                      size={44}
                      color={theme.accentColor}
                    />
                  </View>
                  <Text style={styles.heroPlaceholderText}>{theme.label}</Text>
                </View>
              )}

              <View style={styles.heroOverlay} />

              <TouchableOpacity
                accessibilityRole='button'
                activeOpacity={0.82}
                onPress={() => router.back()}
                style={[styles.overlayButton, { top: insets.top + 16, left: 20 }]}
              >
                <MaterialCommunityIcons
                  name='arrow-left'
                  size={22}
                  color={COLOR.whiteText}
                />
              </TouchableOpacity>

              <View style={styles.imagePager}>
                <View style={styles.imagePagerDotSoft} />
                <View style={styles.imagePagerDotActive} />
                <View style={styles.imagePagerDotSoft} />
              </View>
            </View>

            <Surface style={styles.detailsCard} elevation={0}>
              <View style={styles.sheetHandle} />

              <View style={styles.headerRow}>
                <View style={styles.titleBlock}>
                  <Text style={styles.title}>{place.name}</Text>

                  <View style={styles.addressRow}>
                    <MaterialCommunityIcons
                      name='map-marker-outline'
                      size={18}
                      color={COLOR.mutedText}
                    />
                    <Text style={styles.address}>{addressLabel}</Text>
                  </View>
                </View>

                {place.lat != null && place.lng != null ? (
                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={() =>
                      openDirections(place.name, place.lat, place.lng)
                    }
                    style={styles.inlineMapButton}
                  >
                    <MaterialCommunityIcons
                      name='map-marker-radius-outline'
                      size={18}
                      color='#13b5d1'
                    />
                    <Text style={styles.inlineMapText}>Map Direction</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {primaryTag ? (
                <View style={styles.tagRow}>
                  <View style={styles.tagPill}>
                    <Text style={styles.tagPillText}>{primaryTag}</Text>
                  </View>
                </View>
              ) : null}

              {summaryText ? (
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionHeading}>Description</Text>
                  <Text style={styles.description}>{summaryText}</Text>
                </View>
              ) : null}

              <View style={styles.infoSection}>
                <Text style={styles.sectionHeading}>Quick Info</Text>

                <DetailInfoRow
                  icon='map-marker-outline'
                  label='Address'
                  value={addressLabel}
                />

                {place.region?.trim() &&
                place.region.trim() !== addressLabel &&
                place.region.trim() !== place.community?.trim() ? (
                  <DetailInfoRow
                    icon='compass-outline'
                    label='Region'
                    value={place.region.trim()}
                  />
                ) : null}
              </View>

              {place.phone || place.website ? (
                <View style={styles.actionRow}>
                  {place.phone ? (
                    <DetailChip
                      icon='phone-outline'
                      label='Call'
                      onPress={() => openPhone(place.phone)}
                    />
                  ) : null}

                  {place.website ? (
                    <DetailChip
                      icon='web'
                      label='Website'
                      onPress={() => openWebsite(place.website)}
                    />
                  ) : null}
                </View>
              ) : null}

              {place.lat != null && place.lng != null ? (
                <TouchableOpacity
                  activeOpacity={0.86}
                  onPress={() =>
                    openDirections(place.name, place.lat, place.lng)
                  }
                  style={styles.bottomActionButton}
                >
                  <MaterialCommunityIcons
                    name='map-marker-right'
                    size={18}
                    color={COLOR.whiteText}
                  />
                  <Text style={styles.bottomActionText}>Direction</Text>
                </TouchableOpacity>
              ) : null}
            </Surface>
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </>
  );
};

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#1c2530',
    shadowOpacity: 0.11,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  default: {
    elevation: 6,
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#dfe1ea',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#dfe1ea',
  },
  scrollContent: {
    paddingBottom: 36,
  },
  stateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
    backgroundColor: COLOR.background,
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
  retryLabel: {
    color: COLOR.whiteText,
    fontSize: 14,
    fontWeight: '800',
  },
  heroWrap: {
    position: 'relative',
    height: 470,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: COLOR.lightGreen,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  heroPlaceholderBadge: {
    width: 84,
    height: 84,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholderText: {
    color: COLOR.headingText,
    fontSize: 18,
    fontWeight: '700',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 16, 21, 0.10)',
  },
  overlayButton: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.28)',
    zIndex: 2,
  },
  imagePager: {
    position: 'absolute',
    bottom: 56,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imagePagerDotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLOR.whiteText,
  },
  imagePagerDotSoft: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  detailsCard: {
    marginTop: -34,
    marginHorizontal: 16,
    borderRadius: 34,
    backgroundColor: COLOR.surface,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 28,
    ...cardShadow,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#e8e8ee',
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  titleBlock: {
    flex: 1,
    gap: 8,
  },
  title: {
    color: '#111827',
    fontSize: 27,
    fontWeight: '800',
    lineHeight: 32,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  address: {
    flex: 1,
    color: COLOR.mutedText,
    fontSize: 15,
    lineHeight: 21,
  },
  inlineMapButton: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 8,
  },
  inlineMapText: {
    color: '#13b5d1',
    fontSize: 14,
    fontWeight: '700',
  },
  tagRow: {
    marginTop: 18,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagPill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: COLOR.brandGreen,
  },
  tagPillText: {
    color: COLOR.whiteText,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  sectionBlock: {
    marginTop: 18,
    gap: 10,
  },
  sectionHeading: {
    color: '#101828',
    fontSize: 17,
    fontWeight: '800',
  },
  description: {
    color: '#8b909a',
    fontSize: 15,
    lineHeight: 24,
  },
  infoSection: {
    marginTop: 22,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  infoIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef7f4',
  },
  infoCopy: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    color: COLOR.mutedText,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  infoValue: {
    color: '#344053',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 22,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#eef7f4',
  },
  detailChipText: {
    color: COLOR.brandGreen,
    fontSize: 13,
    fontWeight: '800',
  },
  bottomActionButton: {
    marginTop: 24,
    minHeight: 56,
    borderRadius: 999,
    backgroundColor: COLOR.brandGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  bottomActionText: {
    color: COLOR.whiteText,
    fontSize: 17,
    fontWeight: '800',
  },
});

export default PlaceDetailsScreen;
