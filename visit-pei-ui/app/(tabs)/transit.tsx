import { Stack } from 'expo-router';

import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

const TransitTab = () => {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Transit',
          headerTitleAlign: 'center',
        }}
      />
      <ScreenPlaceholder
        title='Transit'
        description='This tab is ready for nearby stops, next arrivals, and route drill-downs.'
      />
    </>
  );
};

export default TransitTab;
