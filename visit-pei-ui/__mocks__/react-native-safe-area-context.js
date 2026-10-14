const React = require('react');

const insets = { top: 44, right: 0, bottom: 34, left: 0 };
const frame = { x: 0, y: 0, width: 390, height: 844 };

const passthrough = ({ children }) =>
  React.createElement(React.Fragment, null, children);

module.exports = {
  SafeAreaProvider: passthrough,
  SafeAreaView: passthrough,
  SafeAreaInsetsContext: React.createContext(insets),
  useSafeAreaInsets: () => insets,
  useSafeAreaFrame: () => frame,
  initialWindowMetrics: { frame, insets },
};
