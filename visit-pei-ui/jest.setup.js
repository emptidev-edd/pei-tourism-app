/* Test environment shims. Keep this file free of app imports. */

// The explore screen resolves API URLs at module load; pin a host so
// resolveEventImageUrl() is deterministic instead of depending on .env.
process.env.EXPO_PUBLIC_API_BASE_URL = 'http://127.0.0.1:4000';

jest.mock('react-native-reanimated');

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-safe-area-context');
jest.mock('expo-router');
