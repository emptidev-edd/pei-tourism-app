import { Stack } from 'expo-router';

import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

const VisitorCentreDetailsScreen = () => {
  return (
    <>
      <Stack.Screen options={{ title: 'Visitor Centre Details' }} />
      <ScreenPlaceholder
        title='Visitor Centre Details'
        description='This detail route is ready for visitor centre hours, phone, website, and map actions.'
      />
    </>
  );
};

export default VisitorCentreDetailsScreen;
