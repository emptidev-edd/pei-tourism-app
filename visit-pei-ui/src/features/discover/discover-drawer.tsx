import { useMemo, useState } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLOR } from '../../../styles';
import type { Place } from '../../types/api';
import { groupPlacesBySubcategory, type PlaceSubcategoryId } from '../../utils/placeSubcategories';
import { FILTER_TABS, type FilterTab } from './constants';
import { PlaceRowCard } from './place-row-card';
import { SubcategoryTabBar } from './subcategory-tab-bar';

const DRAWER_HEIGHT_RATIO = 0.82;
const FLING_VELOCITY_THRESHOLD = 150;
const DISMISS_DISTANCE_RATIO = 0.3;
const SPRING_CONFIG = { stiffness: 140, damping: 18, mass: 1 };

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#020617',
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
  },
  default: { elevation: 10 },
});

export type DiscoverDrawerProps = {
  category: FilterTab | null;
  places: Place[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onClose: () => void;
  onSelectPlace: (place: Place) => void;
};

/** Bottom drawer listing one Discover category's places, grouped into subcategory sections. */
export function DiscoverDrawer({
  category,
  places,
  isLoading,
  isError,
  onRetry,
  onClose,
  onSelectPlace,
}: DiscoverDrawerProps) {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sheetHeight = windowHeight * DRAWER_HEIGHT_RATIO;

  const isOpen = category != null;
  const translateY = useSharedValue(sheetHeight);
  const startTranslateY = useSharedValue(sheetHeight);

  // Drives the open/close animation from the `isOpen` prop via Reanimated's
  // own "react to a value changing" hook rather than a React useEffect — this
  // runs on the UI thread, isn't a React effect, and (unlike useEffect) won't
  // make the gesture handlers' mutations below trip the React Compiler's
  // shared-value-immutability lint rule.
  useAnimatedReaction(
    () => isOpen,
    (current, previous) => {
      if (current !== previous) {
        translateY.value = withSpring(current ? 0 : sheetHeight, SPRING_CONFIG);
      }
    },
    [isOpen, sheetHeight],
  );

  // The lint rule below treats translateY as owned once useAnimatedReaction
  // above writes to it, flagging every other writer as a conflict — but
  // gesture-driven drag and the prop-driven snap above never run at the same
  // time (a drag can only happen while the drawer is already open), so these
  // writes are intentional and safe.
  const pan = Gesture.Pan()
    .minDistance(6)
    .onStart(() => {
      startTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      const next = startTranslateY.value + event.translationY;
      // eslint-disable-next-line react-hooks/immutability
      translateY.value = Math.min(sheetHeight, Math.max(0, next));
    })
    .onEnd((event) => {
      const shouldDismiss =
        event.velocityY > FLING_VELOCITY_THRESHOLD ||
        translateY.value >= sheetHeight * DISMISS_DISTANCE_RATIO;
      if (shouldDismiss) {
        onClose();
      } else {
        // eslint-disable-next-line react-hooks/immutability
        translateY.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, sheetHeight], [1, 0]),
  }));

  const sections = useMemo(() => groupPlacesBySubcategory(places), [places]);
  const title = FILTER_TABS.find((tab) => tab.id === category)?.label ?? '';

  // Tracks which drawer (`category`) the pick belongs to, not just the pick
  // itself — reopening the drawer for a different category falls back to the
  // first tab instead of carrying over the previous category's selection,
  // with no effect/ref needed to "reset on prop change".
  const [selection, setSelection] = useState<{
    category: FilterTab | null;
    subcategoryId: PlaceSubcategoryId | null;
  }>({ category: null, subcategoryId: null });

  const activeSubcategoryId =
    selection.category === category ? selection.subcategoryId : (sections[0]?.subcategory.id ?? null);
  const activeSection = sections.find((s) => s.subcategory.id === activeSubcategoryId) ?? sections[0] ?? null;

  return (
    <>
      <Animated.View
        style={[styles.backdrop, backdropStyle]}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        <Pressable
          accessibilityRole='button'
          accessibilityLabel='Close'
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
      </Animated.View>

      <Animated.View
        style={[styles.sheetShell, { height: sheetHeight }, sheetStyle]}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }, cardShadow]}>
          <GestureDetector gesture={pan}>
            <View style={styles.handleTouch}>
              <View style={styles.handle} />
            </View>
          </GestureDetector>

          <View style={styles.header}>
            <Text style={styles.headerTitle}>{title}</Text>
            <Pressable
              accessibilityRole='button'
              accessibilityLabel='Close'
              hitSlop={8}
              onPress={onClose}
              style={styles.closeBtn}
            >
              <MaterialCommunityIcons name='close' size={16} color={COLOR.mutedText} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {isLoading ? (
              <View>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={styles.skeletonRow} />
                ))}
              </View>
            ) : isError ? (
              <View style={styles.stateCenter}>
                <MaterialCommunityIcons
                  name='alert-circle-outline'
                  size={36}
                  color={COLOR.mutedText}
                />
                <Text style={styles.stateTitle}>Could not load places</Text>
                <Pressable
                  accessibilityRole='button'
                  onPress={onRetry}
                  style={styles.retryBtn}
                >
                  <Text style={styles.retryLabel}>Retry</Text>
                </Pressable>
              </View>
            ) : sections.length === 0 ? (
              <View style={styles.stateCenter}>
                <MaterialCommunityIcons
                  name='compass-off-outline'
                  size={36}
                  color={COLOR.lightGray}
                />
                <Text style={styles.stateTitle}>No places found</Text>
              </View>
            ) : (
              <>
                <SubcategoryTabBar
                  sections={sections}
                  activeId={activeSubcategoryId}
                  onSelect={(subcategoryId) => setSelection({ category, subcategoryId })}
                />
                <View style={styles.rowList}>
                  {activeSection?.places.map((place) => (
                    <PlaceRowCard
                      key={place.id}
                      place={place}
                      icon={activeSection.subcategory.icon}
                      onPress={() => onSelectPlace(place)}
                    />
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheetShell: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: COLOR.surface,
    paddingHorizontal: 20,
  },
  handleTouch: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(17, 24, 39, 0.14)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLOR.headingText,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLOR.surfaceMuted,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: 12,
  },
  rowList: {
    gap: 8,
  },
  skeletonRow: {
    height: 56,
    borderRadius: 16,
    backgroundColor: COLOR.surfaceMuted,
    marginBottom: 10,
  },
  stateCenter: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 8,
  },
  stateTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLOR.mainText,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLOR.brandGreen,
  },
  retryLabel: {
    color: COLOR.whiteText,
    fontWeight: '600',
    fontSize: 13,
  },
});
