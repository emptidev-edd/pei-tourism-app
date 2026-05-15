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

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_CARD_WIDTH  = (SCREEN_WIDTH - 40 - 12) / 2;   // 20px padding × 2, 12px gap
const MOOD_CARD_WIDTH  = SCREEN_WIDTH - 40;               // card is full width minus 20px each side
const MOOD_ITEM_WIDTH  = Math.floor(MOOD_CARD_WIDTH / 3); // each of 3 equal columns
const MOOD_LABEL_WIDTH = MOOD_ITEM_WIDTH - 20;            // leave 10px breathing room each side

// ── Data ─────────────────────────────────────────────────────────────────────

const categories = [
  { id: 'beaches',  label: 'Beaches',        icon: 'wave'                  as IconName },
  { id: 'food',     label: 'Food & Drink',    icon: 'silverware-fork-knife' as IconName },
  { id: 'trails',   label: 'Coastal Trails',  icon: 'map-marker-path'       as IconName },
  { id: 'events',   label: 'Events',          icon: 'calendar-star'         as IconName },
  { id: 'stays',    label: 'Stays',           icon: 'bed-queen-outline'     as IconName },
  { id: 'family',   label: 'Family Fun',      icon: 'ferris-wheel'          as IconName },
];

const discoverCards = [
  {
    id: 'cavendish',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    title: 'Cavendish Coast',
    description: 'Beaches & boardwalks',
  },
  {
    id: 'seafood',
    image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80',
    title: 'Seafood Near You',
    description: 'Lobster rolls & oysters',
  },
  {
    id: 'lighthouses',
    image: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=800&q=80',
    title: 'Lighthouse Route',
    description: 'Scenic island loop',
  },
  {
    id: 'charlottetown',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
    title: 'Charlottetown',
    description: 'Food, culture & history',
  },
];

const quickPlans = [
  {
    id: 'today',
    title: 'Today on PEI',
    subtitle: 'Weather-friendly ideas for the next few hours',
    icon: 'weather-partly-cloudy' as IconName,
  },
  {
    id: 'nearby',
    title: 'Nearby Favourites',
    subtitle: 'Beaches, food, and viewpoints around you',
    icon: 'compass-outline' as IconName,
  },
  {
    id: 'upcoming',
    title: 'Upcoming Events',
    subtitle: 'Festivals, concerts, and local happenings',
    icon: 'calendar-star' as IconName,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function HomeTab() {
  const topRow    = categories.slice(0, 3);
  const bottomRow = categories.slice(3, 6);

  return (
    <>
      <StatusBar style='light' backgroundColor={COLOR.brandGreen} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={styles.contentContainer}
        >
          {/* ── Green header ─────────────────────────────────────── */}
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
              Discover the beauty of Canada's Garden Province
            </Text>
          </View>

          {/* ── Explore by mood ──────────────────────────────────── */}
          <View style={styles.moodWrapper}>
            <Surface style={styles.moodCard} elevation={0}>
              {/* Top row */}
              <View style={styles.moodRow}>
                {topRow.map((cat, i) => (
                  <TouchableOpacity
                    key={cat.id}
                    activeOpacity={0.7}
                    style={[
                      styles.moodItem,
                      i < topRow.length - 1 && styles.moodBorderRight,
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

              {/* Bottom row */}
              <View style={styles.moodRow}>
                {bottomRow.map((cat, i) => (
                  <TouchableOpacity
                    key={cat.id}
                    activeOpacity={0.7}
                    style={[
                      styles.moodItem,
                      i < bottomRow.length - 1 && styles.moodBorderRight,
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

          {/* ── Discover PEI ─────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Discover PEI</Text>
              <Text style={styles.sectionLink}>See all</Text>
            </View>

            <View style={styles.grid}>
              {discoverCards.map((card) => (
                <Surface key={card.id} style={styles.gridCard} elevation={0}>
                  <Image
                    source={{ uri: card.image }}
                    contentFit='cover'
                    transition={150}
                    style={styles.gridImage}
                  />
                  <View style={styles.gridBody}>
                    <Text style={styles.gridTitle} numberOfLines={1}>
                      {card.title}
                    </Text>
                    <Text style={styles.gridDescription} numberOfLines={1}>
                      {card.description}
                    </Text>
                  </View>
                </Surface>
              ))}
            </View>
          </View>

          {/* ── Quick Plans ──────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Plans</Text>

            <View style={styles.planList}>
              {quickPlans.map((plan) => (
                <Surface key={plan.id} style={styles.planCard} elevation={0}>
                  <View style={styles.planAccent} />

                  <View style={styles.planIconWrap}>
                    <MaterialCommunityIcons
                      name={plan.icon}
                      size={24}
                      color={COLOR.brandGreen}
                    />
                  </View>

                  <View style={styles.planCopy}>
                    <Text style={styles.planTitle}>{plan.title}</Text>
                    <Text style={styles.planSubtitle}>{plan.subtitle}</Text>
                  </View>

                  <MaterialCommunityIcons
                    name='chevron-right'
                    size={22}
                    color={COLOR.mutedText}
                  />
                </Surface>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// ── Shared shadow (cross-platform) ────────────────────────────────────────────

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

// ── Styles ────────────────────────────────────────────────────────────────────

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

  // Header
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

  // Mood card
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

  // Section
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

  // Discover grid
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
  gridImage: {
    width: '100%',
    height: 120,
  },
  gridBody: {
    padding: 12,
    gap: 3,
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

  // Quick Plans
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
  planCopy: {
    flex: 1,
    gap: 3,
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
});
