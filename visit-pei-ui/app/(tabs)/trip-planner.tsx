import { Stack } from 'expo-router';

import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

const TripPlannerTab = () => {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Trip Planner',
          headerTitleAlign: 'center',
        }}
      />
      <ScreenPlaceholder
        title='Trip Planner'
        description='This tab is ready for itinerary building, interest filters, and day-plan suggestions.'
      />
    </>
  );
};

export default TripPlannerTab;
