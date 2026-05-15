import { Stack } from 'expo-router';

import { WelcomeScreen } from '../screens/welcome';

const Index = () => {
  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: 'Visit PEI' }} />
      <WelcomeScreen />
    </>
  );
};

export default Index;
