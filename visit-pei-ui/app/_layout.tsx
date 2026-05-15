import { Stack } from 'expo-router';
import { MD3LightTheme, PaperProvider } from 'react-native-paper';

import '../global.css';
import { COLOR } from '../styles';

const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLOR.brandGreen,
    secondary: COLOR.blue,
    surface: COLOR.surface,
    onPrimary: COLOR.whiteText,
    onSurface: COLOR.mainText,
    background: COLOR.background,
  },
};

const RootLayout = () => {
  return (
    <PaperProvider theme={paperTheme}>
      <Stack>
        <Stack.Screen
          name='index'
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name='(tabs)'
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </PaperProvider>
  );
};

export default RootLayout;
