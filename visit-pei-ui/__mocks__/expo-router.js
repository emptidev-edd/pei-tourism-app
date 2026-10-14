/**
 * expo-router's <Link.Preview> reads a context that only exists under a real
 * navigation container, so cards cannot render in isolation against the real
 * Link. Everything else in expo-router is kept intact.
 */
const React = require('react');

const actual = jest.requireActual('expo-router');

const passthrough = ({ children }) =>
  React.createElement(React.Fragment, null, children);

const Link = passthrough;
Link.Trigger = passthrough;
Link.Preview = () => null;
Link.Menu = () => null;
Link.MenuAction = () => null;

// <Stack.Screen options={...}> only declares nav options; outside a navigator
// it throws, so render it as a no-op.
const Stack = ({ children }) =>
  React.createElement(React.Fragment, null, children);
Stack.Screen = () => null;

module.exports = {
  ...actual,
  Link,
  Stack,
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    navigate: jest.fn(),
    back: jest.fn(),
    dismissTo: jest.fn(),
  },
  useFocusEffect: (effect) => React.useEffect(effect, [effect]),
};
