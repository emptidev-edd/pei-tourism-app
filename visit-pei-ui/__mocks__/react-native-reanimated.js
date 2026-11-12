/**
 * Reanimated 4's bundled mock still loads react-native-worklets, which needs a
 * native binding jest does not have. This covers the surface the events feature
 * actually uses: animated hosts, entering transitions, shared values and the
 * interpolation helpers the dock animates with. `useEvent` is stubbed too —
 * `react-native-gesture-handler`'s `GestureDetector` calls it unconditionally
 * on every render (not just when a gesture actually fires), so any screen
 * using `GestureDetector` crashes under test without it.
 */
const React = require('react');
const { ScrollView, Text, View } = require('react-native');

const forward = (Component) => {
  const Animated = React.forwardRef((props, ref) =>
    React.createElement(Component, { ...props, ref }),
  );
  Animated.displayName = `Animated.${Component.displayName ?? Component.name ?? 'Component'}`;
  return Animated;
};

const entering = () => {
  const builder = {
    duration: () => builder,
    delay: () => builder,
    springify: () => builder,
    withInitialValues: () => builder,
  };
  return builder;
};

const Animated = {
  View: forward(View),
  Text: forward(Text),
  ScrollView: forward(ScrollView),
  createAnimatedComponent: forward,
};

module.exports = {
  __esModule: true,
  default: Animated,
  ...Animated,
  FadeIn: entering(),
  FadeInDown: entering(),
  FadeInUp: entering(),
  FadeOut: entering(),
  useSharedValue: (initial) => ({ value: initial }),
  useAnimatedStyle: (factory) => factory(),
  useAnimatedScrollHandler: () => jest.fn(),
  useDerivedValue: (factory) => ({ value: factory() }),
  useAnimatedReaction: (prepare, react) => react(prepare(), undefined),
  withTiming: (toValue) => toValue,
  withSpring: (toValue) => toValue,
  withDelay: (_, value) => value,
  interpolate: (value, input, output) => output?.[0] ?? value,
  interpolateColor: (value, input, output) => output?.[0] ?? value,
  Easing: { linear: (v) => v, inOut: (fn) => fn, ease: (v) => v },
  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,
  useEvent: (handler, eventNames) => ({ workletEventHandler: { handler, eventNames } }),
};
