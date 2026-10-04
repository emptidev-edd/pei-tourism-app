import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import { useDayPlanQuery } from '../../src/services/query/trip/useDayPlanQuery';
import { getPlaceTheme } from '../../src/utils/placeVisuals';
import type {
  DayPlanResponse,
  DayPlanSlot,
  TripInterest,
} from '../../src/types/api';

const CHARLOTTETOWN = { lat: 46.2382, lng: -63.1311 };
const SAVED_TRIPS_KEY = '@visitpei/saved-trips';

type InterestOption = {
  id: TripInterest;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
};

const INTERESTS: InterestOption[] = [
  { id: 'nature',  icon: 'tree-outline' },
  { id: 'food',    icon: 'silverware-fork-knife' },
  { id: 'history', icon: 'castle' },
  { id: 'culture', icon: 'bank-outline' },
  { id: 'outdoor', icon: 'hiking' },
];

const SLOT_TYPE_KEYS: Record<string, string> = {
  '09:00': 'plan.slots.morningActivity',
  '12:30': 'plan.slots.lunch',
  '14:30': 'plan.slots.afternoonExplore',
  '17:30': 'plan.slots.evening',
};

type SavedTrip = {
  id: string;
  savedAt: string;
  interests: TripInterest[];
  plan: DayPlanResponse;
};

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#1c2530',
    shadowOpacity: 0.09,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  default: { elevation: 4 },
});

const SLOT_ICONS: Record<string, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  '09:00': 'weather-sunset-up',
  '12:30': 'silverware-fork-knife',
  '14:30': 'compass-outline',
  '17:30': 'weather-sunset-down',
};

const PlanSlotCard = ({
  slot,
  slotTypeLabel,
  noMatchLabel,
  distanceLabelFor,
  locale,
  onPress,
}: {
  slot: DayPlanSlot;
  slotTypeLabel: string;
  noMatchLabel: string;
  distanceLabelFor: (km: string) => string;
  locale: Locale;
  onPress?: () => void;
}) => {
  const theme = slot.place ? getPlaceTheme(slot.place.category) : null;
  const slotIcon = SLOT_ICONS[slot.time] ?? 'clock-outline';

  if (!slot.place || !theme) {
    return (
      <Surface style={styles.slotCard} elevation={0}>
        <View style={styles.slotHeader}>
          <View style={styles.slotTimePill}>
            <MaterialCommunityIcons name={slotIcon} size={14} color={COLOR.mutedText} />
            <Text style={styles.slotTime}>{slot.time}</Text>
          </View>
          <Text style={styles.slotType}>{slotTypeLabel}</Text>
        </View>
        <View style={styles.slotEmptyBody}>
          <MaterialCommunityIcons name='magnify-close' size={28} color={COLOR.mutedText} />
          <Text style={styles.slotEmptyText}>{noMatchLabel}</Text>
        </View>
      </Surface>
    );
  }

  const place = slot.place;
  const distanceKm = place.meters !== null ? (place.meters / 1000).toFixed(1) : null;
  const displayName = pickLocalized(place.name, place.nameFr, locale);
  const displayDescription = pickLocalized(place.description, place.descriptionFr, locale);

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={`${slotTypeLabel}: ${displayName}`}
    >
      <Surface style={styles.slotCard} elevation={0}>
        <View style={styles.slotHeader}>
          <View style={styles.slotTimePill}>
            <MaterialCommunityIcons name={slotIcon} size={14} color={COLOR.brandGreen} />
            <Text style={[styles.slotTime, { color: COLOR.brandGreen }]}>{slot.time}</Text>
          </View>
          <Text style={styles.slotType}>{slotTypeLabel}</Text>
        </View>

        <View style={styles.slotMedia}>
          <Image
            source={{ uri: theme.imageUrl }}
            contentFit='cover'
            transition={150}
            style={styles.slotImage}
          />
          <View style={[styles.slotImageOverlay, { backgroundColor: `${theme.accentColor}33` }]} />
          <View style={[styles.slotCategoryBadge, { backgroundColor: 'rgba(255,255,255,0.85)' }]}>
            <MaterialCommunityIcons name={theme.icon} size={12} color={theme.accentColor} />
            <Text style={[styles.slotCategoryText, { color: theme.accentColor }]}>{theme.label}</Text>
          </View>
        </View>

        <View style={styles.slotBody}>
          <Text style={styles.slotPlaceName} numberOfLines={2}>{displayName}</Text>
          <View style={styles.slotMetaRow}>
            {place.community ? (
              <View style={styles.slotMetaItem}>
                <MaterialCommunityIcons name='map-marker-outline' size={13} color={COLOR.mutedText} />
                <Text style={styles.slotMetaText} numberOfLines={1}>{place.community}</Text>
              </View>
            ) : null}
            {distanceKm ? (
              <View style={styles.slotMetaItem}>
                <MaterialCommunityIcons name='navigation-variant-outline' size={13} color={COLOR.mutedText} />
                <Text style={styles.slotMetaText}>{distanceLabelFor(distanceKm)}</Text>
              </View>
            ) : null}
          </View>
          {displayDescription ? (
            <Text style={styles.slotDescription} numberOfLines={2}>{displayDescription}</Text>
          ) : null}
        </View>
      </Surface>
    </TouchableOpacity>
  );
};

const PlanSlotSkeleton = () => (
  <Surface style={styles.slotCard} elevation={0}>
    <View style={styles.slotHeader}>
      <View style={[styles.skeletonLine, { width: 70, height: 18 }]} />
      <View style={[styles.skeletonLine, { width: 110, height: 12 }]} />
    </View>
    <View style={[styles.slotMedia, { backgroundColor: COLOR.backgroundSoft }]} />
    <View style={styles.slotBody}>
      <View style={[styles.skeletonLine, { width: '82%', height: 16 }]} />
      <View style={[styles.skeletonLine, { width: '55%', height: 12, marginTop: 6 }]} />
    </View>
  </Surface>
);

export default function PlanTab() {
  const { t, locale } = useLocale();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [usingDeviceLocation, setUsingDeviceLocation] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<TripInterest[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [shuffleMode, setShuffleMode] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!mounted) return;
        if (status !== 'granted') {
          setCoords(CHARLOTTETOWN);
          return;
        }
        const pos = await Location.getLastKnownPositionAsync();
        const current = pos ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
        if (!mounted || !current) {
          setCoords(CHARLOTTETOWN);
          return;
        }
        setCoords({ lat: current.coords.latitude, lng: current.coords.longitude });
        setUsingDeviceLocation(true);
      } catch {
        if (mounted) setCoords(CHARLOTTETOWN);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const queryOpts = useMemo(() => {
    if (!hasGenerated || !coords) return null;
    return {
      lat: coords.lat,
      lng: coords.lng,
      radius: 50_000,
      interests: selectedInterests,
      shuffle: shuffleMode,
      shuffleSeed,
    };
  }, [hasGenerated, coords, selectedInterests, shuffleMode, shuffleSeed]);

  const dayPlanQuery = useDayPlanQuery(queryOpts);

  const toggleInterest = (id: TripInterest) => {
    setSelectedInterests((current) =>
      current.includes(id) ? current.filter((i) => i !== id) : [...current, id],
    );
  };

  const handleGenerate = () => {
    setHasGenerated(true);
    setShuffleMode(false);
    setShuffleSeed(Date.now());
  };

  const handleShuffle = () => {
    setShuffleMode(true);
    setShuffleSeed(Date.now());
  };

  const handleSave = useCallback(async () => {
    if (!dayPlanQuery.data) return;
    try {
      const raw = await AsyncStorage.getItem(SAVED_TRIPS_KEY);
      const list: SavedTrip[] = raw ? JSON.parse(raw) : [];
      const trip: SavedTrip = {
        id: `trip-${Date.now()}`,
        savedAt: new Date().toISOString(),
        interests: selectedInterests,
        plan: dayPlanQuery.data,
      };
      list.unshift(trip);
      await AsyncStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(list.slice(0, 20)));
      Alert.alert(t('plan.savedTitle'), t('plan.savedBody'));
    } catch {
      Alert.alert(t('plan.saveError'), t('plan.saveErrorBody'));
    }
  }, [dayPlanQuery.data, selectedInterests, t]);

  const locationLabel = usingDeviceLocation
    ? t('plan.yourLocation')
    : t('plan.defaultLocation');

  const interestSummary = selectedInterests.length === 0
    ? t('plan.anythingGoes')
    : selectedInterests
        .map((i) => t(`plan.interests.${i}`))
        .join(' · ');

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
              <MaterialCommunityIcons name='compass-outline' size={16} color='rgba(255,255,255,0.8)' />
              <Text style={styles.headerLocation}>{t('plan.kicker')}</Text>
            </View>
            <Text style={styles.headerTitle}>{t('plan.title')}</Text>
            <Text style={styles.headerSub}>
              {t('plan.subtitle', { location: locationLabel })}
            </Text>
          </View>

          <View style={styles.pickerWrap}>
            <Surface style={styles.pickerCard} elevation={0}>
              <Text style={styles.pickerTitle}>{t('plan.pickerTitle')}</Text>
              <Text style={styles.pickerSub}>{t('plan.pickerSubtitle')}</Text>

              <View style={styles.chipsRow}>
                {INTERESTS.map((opt) => {
                  const active = selectedInterests.includes(opt.id);
                  const label = t(`plan.interests.${opt.id}`);
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      activeOpacity={0.85}
                      onPress={() => toggleInterest(opt.id)}
                      accessibilityRole='button'
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={label}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <MaterialCommunityIcons
                        name={opt.icon}
                        size={16}
                        color={active ? COLOR.whiteText : COLOR.brandGreen}
                      />
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleGenerate}
                disabled={!coords}
                accessibilityRole='button'
                accessibilityLabel={hasGenerated ? t('plan.rebuild') : t('plan.build')}
                style={[styles.generateBtn, !coords && styles.generateBtnDisabled]}
              >
                <MaterialCommunityIcons name='auto-fix' size={18} color={COLOR.whiteText} />
                <Text style={styles.generateBtnText}>
                  {hasGenerated ? t('plan.rebuild') : t('plan.build')}
                </Text>
              </TouchableOpacity>
            </Surface>
          </View>

          {hasGenerated ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>{t('plan.yourDay')}</Text>
                  <Text style={styles.sectionSub}>{interestSummary}</Text>
                </View>
                {dayPlanQuery.data ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleShuffle}
                    accessibilityRole='button'
                    accessibilityLabel={t('plan.shuffle')}
                    style={styles.shuffleBtn}
                  >
                    <MaterialCommunityIcons name='shuffle-variant' size={16} color={COLOR.brandGreen} />
                    <Text style={styles.shuffleBtnText}>{t('plan.shuffle')}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {dayPlanQuery.isPending ? (
                <View style={styles.slotList}>
                  {[0, 1, 2, 3].map((i) => <PlanSlotSkeleton key={i} />)}
                </View>
              ) : null}

              {dayPlanQuery.isError ? (
                <Surface style={styles.errorCard} elevation={0}>
                  <MaterialCommunityIcons name='alert-circle-outline' size={22} color={COLOR.brandGreen} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.errorTitle}>{t('plan.errorTitle')}</Text>
                    <Text style={styles.errorBody}>
                      {dayPlanQuery.error instanceof Error ? dayPlanQuery.error.message : t('plan.errorBody')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => dayPlanQuery.refetch()}
                    style={styles.retryBtn}
                  >
                    <Text style={styles.retryBtnText}>{t('common.retry')}</Text>
                  </TouchableOpacity>
                </Surface>
              ) : null}

              {dayPlanQuery.data ? (
                <View style={styles.slotList}>
                  {dayPlanQuery.data.plan.map((slot) => {
                    const typeKey = SLOT_TYPE_KEYS[slot.time];
                    const slotTypeLabel = typeKey ? t(typeKey) : slot.type;
                    return (
                      <PlanSlotCard
                        key={slot.time}
                        slot={slot}
                        slotTypeLabel={slotTypeLabel}
                        noMatchLabel={t('plan.noMatch')}
                        distanceLabelFor={(km) => t('plan.kmAway', { km })}
                        locale={locale}
                        onPress={
                          slot.place
                            ? () => router.push({ pathname: '/places/[id]', params: { id: slot.place!.id } })
                            : undefined
                        }
                      />
                    );
                  })}

                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={handleSave}
                    accessibilityRole='button'
                    accessibilityLabel={t('plan.saveTrip')}
                    style={styles.saveBtn}
                  >
                    <MaterialCommunityIcons name='bookmark-outline' size={18} color={COLOR.brandGreen} />
                    <Text style={styles.saveBtnText}>{t('plan.saveTrip')}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.section}>
              <Surface style={styles.introCard} elevation={0}>
                <MaterialCommunityIcons name='map-marker-radius-outline' size={28} color={COLOR.brandGreen} />
                <Text style={styles.introTitle}>{t('plan.intro.title')}</Text>
                <Text style={styles.introBody}>{t('plan.intro.body')}</Text>
              </Surface>
            </View>
          )}
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
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  headerTitle: {
    color: COLOR.whiteText,
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  pickerWrap: {
    paddingHorizontal: 20,
    marginTop: -44,
  },
  pickerCard: {
    backgroundColor: COLOR.surface,
    borderRadius: 24,
    padding: 18,
    gap: 12,
    ...cardShadow,
  },
  pickerTitle: {
    color: COLOR.headingText,
    fontSize: 16,
    fontWeight: '800',
  },
  pickerSub: {
    color: COLOR.mutedText,
    fontSize: 13,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLOR.lightGreen,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: COLOR.brandGreen,
    borderColor: COLOR.brandGreen,
  },
  chipText: {
    color: COLOR.brandGreen,
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: COLOR.whiteText,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLOR.brandGreen,
    borderRadius: 999,
    paddingVertical: 14,
    marginTop: 6,
  },
  generateBtnDisabled: {
    opacity: 0.6,
  },
  generateBtnText: {
    color: COLOR.whiteText,
    fontSize: 15,
    fontWeight: '800',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 28,
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
  sectionSub: {
    color: COLOR.mutedText,
    fontSize: 12,
    marginTop: 2,
  },
  shuffleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLOR.lightGreen,
  },
  shuffleBtnText: {
    color: COLOR.brandGreen,
    fontSize: 13,
    fontWeight: '700',
  },
  slotList: {
    gap: 14,
  },
  slotCard: {
    backgroundColor: COLOR.surface,
    borderRadius: 22,
    overflow: 'hidden',
    ...cardShadow,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  slotTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLOR.lightGreen,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  slotTime: {
    color: COLOR.mainText,
    fontSize: 12,
    fontWeight: '800',
  },
  slotType: {
    color: COLOR.mutedText,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  slotMedia: {
    width: '100%',
    height: 140,
    position: 'relative',
    overflow: 'hidden',
  },
  slotImage: {
    ...StyleSheet.absoluteFillObject,
  },
  slotImageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  slotCategoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  slotCategoryText: {
    fontSize: 11,
    fontWeight: '800',
  },
  slotBody: {
    padding: 14,
    gap: 6,
  },
  slotPlaceName: {
    color: COLOR.headingText,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  slotMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  slotMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  slotMetaText: {
    color: COLOR.mutedText,
    fontSize: 12,
    fontWeight: '600',
  },
  slotDescription: {
    color: COLOR.mutedText,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  slotEmptyBody: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  slotEmptyText: {
    color: COLOR.mutedText,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: COLOR.lightGreen,
    marginTop: 6,
  },
  saveBtnText: {
    color: COLOR.brandGreen,
    fontSize: 14,
    fontWeight: '800',
  },
  introCard: {
    backgroundColor: COLOR.surface,
    borderRadius: 22,
    padding: 22,
    gap: 8,
    ...cardShadow,
  },
  introTitle: {
    color: COLOR.headingText,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  introBody: {
    color: COLOR.mutedText,
    fontSize: 13,
    lineHeight: 19,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: COLOR.surface,
    ...cardShadow,
  },
  errorTitle: {
    color: COLOR.headingText,
    fontSize: 14,
    fontWeight: '800',
  },
  errorBody: {
    color: COLOR.mutedText,
    fontSize: 12,
    marginTop: 2,
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLOR.lightGreen,
  },
  retryBtnText: {
    color: COLOR.brandGreen,
    fontSize: 12,
    fontWeight: '800',
  },
  skeletonLine: {
    borderRadius: 999,
    backgroundColor: COLOR.backgroundSoft,
  },
});
