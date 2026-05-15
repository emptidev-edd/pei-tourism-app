import { Stack } from 'expo-router';

import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

const StopDetailsScreen = () => {
  return (
    <>
      <Stack.Screen options={{ title: 'Stop Details' }} />
      <ScreenPlaceholder
        title='Stop Details'
        description='This detail route is ready for next arrivals, stop codes, and refresh actions.'
      />
    </>
  );
};

export default StopDetailsScreen;
