import { Stack } from 'expo-router';

import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

const RouteDetailsScreen = () => {
  return (
    <>
      <Stack.Screen options={{ title: 'Route Details' }} />
      <ScreenPlaceholder
        title='Route Details'
        description='This detail route is ready for route badges, ordered stops, and a stop timeline.'
      />
    </>
  );
};

export default RouteDetailsScreen;
