import { Stack } from 'expo-router';

import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

const EventsTab = () => {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Events',
          headerTitleAlign: 'center',
        }}
      />
      <ScreenPlaceholder
        title='Events'
        description='This tab is ready for upcoming PEI events, date filters, and event groups by day.'
      />
    </>
  );
};

export default EventsTab;
