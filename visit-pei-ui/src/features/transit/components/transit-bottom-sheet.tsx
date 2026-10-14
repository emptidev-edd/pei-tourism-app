import type { ReactNode } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Surface } from 'react-native-paper';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { COLLAPSED_SHEET, EXPANDED_SHEET, SHEET_MIDPOINT } from '../constants';

const MAX_TRANSLATE = EXPANDED_SHEET - COLLAPSED_SHEET;
const MIDPOINT_TRANSLATE = EXPANDED_SHEET - SHEET_MIDPOINT;

// PanResponder's `gestureState.vy` is px/ms; Reanimated's `velocityY` is
// px/s. The original fling threshold (0.15 px/ms) is 150 px/s here.
const FLING_VELOCITY_THRESHOLD = 150;

// stiffness/damping/mass chosen to numerically match the old
// Animated.spring({ tension: 90, friction: 9 }) so the snap feels the same.
const SPRING_CONFIG = { stiffness: 90, damping: 9, mass: 1 };

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#020617',
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  default: {
    elevation: 10,
  },
});

/**
 * The nearby-stops bottom sheet. This used to animate `height` via
 * `Animated.spring` driven by a `PanResponder`, which can't use the native
 * driver and stuttered against the map's own gestures underneath it.
 *
 * Now the sheet has a fixed height (the expanded size) and is translated
 * down to represent the collapsed state, so the whole drag runs on the UI
 * thread via Reanimated + `translateY`.
 */
export function TransitBottomSheet({ children }: { children: ReactNode }) {
  const translateY = useSharedValue(MAX_TRANSLATE);
  const startTranslateY = useSharedValue(MAX_TRANSLATE);
  // Mirrors the *intended* snap target (not the live animated position) so a
  // tap mid-animation toggles intent the same way the old React state did.
  const expanded = useSharedValue(false);

  // Not memoized: shared values are stable across renders already (like
  // refs), and every mutation site has to appear before `useAnimatedStyle`
  // below or the React Compiler lint rule treats `translateY` as frozen once
  // it's captured by that hook.
  const snapTo = (next: boolean) => {
    'worklet';
    expanded.value = next;
    translateY.value = withSpring(next ? 0 : MAX_TRANSLATE, SPRING_CONFIG);
  };

  const pan = Gesture.Pan()
    .minDistance(6)
    .onStart(() => {
      startTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      const next = startTranslateY.value + event.translationY;
      translateY.value = Math.min(MAX_TRANSLATE, Math.max(0, next));
    })
    .onEnd((event) => {
      const shouldExpand =
        event.velocityY < -FLING_VELOCITY_THRESHOLD ||
        translateY.value <= MIDPOINT_TRANSLATE;
      snapTo(shouldExpand);
    });

  const handlePress = () => {
    snapTo(!expanded.value);
  };

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.sheetShell, sheetStyle]}>
      <Surface style={styles.sheet} elevation={0}>
        <GestureDetector gesture={pan}>
          <View style={styles.sheetHandleTouch}>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={handlePress}
              style={styles.sheetHandlePressable}
            >
              <View style={styles.sheetHandle} />
            </TouchableOpacity>
          </View>
        </GestureDetector>

        {children}
      </Surface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheetShell: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: EXPANDED_SHEET,
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingBottom: 110,
    ...cardShadow,
  },
  sheetHandleTouch: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 14,
  },
  sheetHandlePressable: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  sheetHandle: {
    width: 56,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(17, 24, 39, 0.14)',
  },
});
