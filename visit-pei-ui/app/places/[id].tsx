import { Stack } from 'expo-router';

import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

const PlaceDetailsScreen = () => {
  return (
    <>
      <Stack.Screen options={{ title: 'Place Details' }} />
      <ScreenPlaceholder
        title='Place Details'
        description='This detail route is ready for a place profile, image gallery, category info, and trip actions.'
      />
    </>
  );
};

export default PlaceDetailsScreen;
