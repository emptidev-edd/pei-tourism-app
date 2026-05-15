import { Stack } from 'expo-router';

import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

const EventDetailsScreen = () => {
  return (
    <>
      <Stack.Screen options={{ title: 'Event Details' }} />
      <ScreenPlaceholder
        title='Event Details'
        description='This detail route is ready for event timing, venue info, images, and booking links.'
      />
    </>
  );
};

export default EventDetailsScreen;
