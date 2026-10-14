const expoPreset = require('jest-expo/jest-preset');

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // jest replaces setupFiles rather than merging, so the preset's own entries
  // (RN native-module mocks, and process.env.EXPO_OS) must be re-listed or the
  // whole iOS code path goes unexercised.
  setupFiles: [...expoPreset.setupFiles, '<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|react-native-css-interop|react-native-reanimated|react-native-worklets|@react-native-async-storage/.*|react-native-safe-area-context|react-native-gesture-handler|@testing-library/.*|standard-navigation|react-native-is-edge-to-edge|@react-navigation/.*))',
  ],
};
