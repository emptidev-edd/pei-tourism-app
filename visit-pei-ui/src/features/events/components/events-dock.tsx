import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { EVENT } from '../theme';
import { tapHaptic, UiIcon } from '../ui-icon';

export type EventsPane = 'explore' | 'tickets' | 'liked' | 'settings';

const ITEM_WIDTH = 70;

export function EventsDock({
  compact,
  pane,
  searchOpen,
  bottomInset,
  onPane,
  onSearch,
}: {
  compact: SharedValue<number>;
  pane: EventsPane;
  searchOpen: boolean;
  bottomInset: number;
  onPane: (pane: EventsPane) => void;
  onSearch: () => void;
}) {
  const extrasStyle = useAnimatedStyle(() => ({
    width: interpolate(compact.value, [0, 1], [ITEM_WIDTH * 3, 0]),
    opacity: interpolate(compact.value, [0, 0.45], [1, 0], 'clamp'),
  }));
  const exploreLabelStyle = useAnimatedStyle(() => ({
    height: interpolate(compact.value, [0, 1], [16, 0]),
    opacity: interpolate(compact.value, [0, 0.35], [1, 0], 'clamp'),
  }));
  const exploreSlotStyle = useAnimatedStyle(() => ({
    width: interpolate(compact.value, [0, 1], [ITEM_WIDTH, 56]),
  }));
  const exploreCircleStyle = useAnimatedStyle(() => ({
    width: interpolate(compact.value, [0, 1], [34, 56]),
    height: interpolate(compact.value, [0, 1], [34, 56]),
    borderRadius: interpolate(compact.value, [0, 1], [17, 28]),
  }));
  const shellStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      compact.value,
      [0, 1],
      [EVENT.elevated, 'rgba(22,22,22,0)'],
    ),
    borderColor: interpolateColor(
      compact.value,
      [0, 1],
      [EVENT.border, 'rgba(232,223,208,0)'],
    ),
    paddingHorizontal: interpolate(compact.value, [0, 1], [8, 0]),
    paddingVertical: interpolate(compact.value, [0, 1], [8, 0]),
  }));

  return (
    <View style={[styles.wrap, { bottom: Math.max(bottomInset, 10) }]}>
      <Animated.View style={[styles.shell, shellStyle]}>
        <Animated.View style={exploreSlotStyle}>
          <Pressable
            accessibilityRole='button'
            accessibilityLabel='Explore'
            onPress={() => {
              tapHaptic();
              onPane('explore');
            }}
            style={styles.explore}
          >
            <Animated.View
              style={[
                styles.exploreCircle,
                pane === 'explore' && styles.exploreCircleOn,
                exploreCircleStyle,
              ]}
            >
              <UiIcon
                sf='house.fill'
                android='home'
                size={20}
                color={pane === 'explore' ? EVENT.onAccent : EVENT.accent}
              />
            </Animated.View>
            <Animated.Text
              style={[
                styles.exploreLabel,
                pane === 'explore' && styles.labelOn,
                exploreLabelStyle,
              ]}
            >
              Explore
            </Animated.Text>
          </Pressable>
        </Animated.View>

        <Animated.View style={[styles.extras, extrasStyle]}>
          <DockItem
            label='Tickets'
            sf='ticket'
            android='ticket-confirmation-outline'
            selected={pane === 'tickets'}
            onPress={() => onPane('tickets')}
          />
          <DockItem
            label='Liked'
            sf={pane === 'liked' ? 'heart.fill' : 'heart'}
            android={pane === 'liked' ? 'heart' : 'heart-outline'}
            selected={pane === 'liked'}
            onPress={() => onPane('liked')}
          />
          <DockItem
            label='Settings'
            sf='gearshape'
            android='cog-outline'
            selected={pane === 'settings'}
            onPress={() => onPane('settings')}
          />
        </Animated.View>
      </Animated.View>

      <Pressable
        accessibilityRole='button'
        accessibilityLabel='Search events'
        onPress={() => {
          tapHaptic();
          onSearch();
        }}
        style={[styles.search, searchOpen && styles.searchOn]}
      >
        <UiIcon
          sf='magnifyingglass'
          android='magnify'
          size={22}
          color={searchOpen ? EVENT.onAccent : EVENT.text}
        />
      </Pressable>
    </View>
  );
}

function DockItem({
  label,
  sf,
  android,
  selected,
  onPress,
}: {
  label: string;
  sf: string;
  android: 'ticket-confirmation-outline' | 'heart' | 'heart-outline' | 'cog-outline';
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={label}
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      style={styles.item}
    >
      <UiIcon
        sf={sf}
        android={android}
        size={22}
        color={selected ? EVENT.accent : EVENT.muted}
      />
      <Text style={[styles.label, selected && styles.labelOn]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 32,
    borderCurve: 'continuous',
    borderWidth: 1,
    overflow: 'hidden',
    boxShadow: EVENT.shadow,
  },
  explore: {
    alignItems: 'center',
    gap: 2,
  },
  exploreCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EVENT.accentSoft,
  },
  exploreCircleOn: {
    backgroundColor: EVENT.accent,
  },
  exploreLabel: {
    color: EVENT.muted,
    fontSize: 10,
    fontWeight: '700',
    overflow: 'hidden',
  },
  extras: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  item: {
    width: ITEM_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  label: {
    color: EVENT.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  labelOn: {
    color: EVENT.accent,
  },
  search: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EVENT.elevated,
    borderWidth: 1,
    borderColor: EVENT.border,
    boxShadow: EVENT.shadow,
  },
  searchOn: {
    backgroundColor: EVENT.accent,
    borderColor: EVENT.accent,
  },
});
