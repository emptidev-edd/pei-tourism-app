import { Stack } from 'expo-router';

import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

const DiscoverTab = () => {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Discover',
          headerTitleAlign: 'center',
        }}
      />
      <ScreenPlaceholder
        title='Discover Places'
        description='This tab is ready for featured places, search, categories, and nearby recommendations.'
      />
    </>
  );
};

export default DiscoverTab;
