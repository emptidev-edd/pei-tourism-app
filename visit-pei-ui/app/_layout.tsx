import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MD3LightTheme, PaperProvider } from 'react-native-paper';

import '../global.css';
import { COLOR } from '../styles';
import { FontScaleProvider, LocaleProvider } from '../src/i18n';
import { queryClient } from '../src/services/query/queryClient';

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>
          <FontScaleProvider>
            <PaperProvider theme={paperTheme}>
              <Stack>
                <Stack.Screen
                  name='index'
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name='(tabs)'
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name='settings/index'
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name='events/sign-in'
                  options={{
                    headerShown: false,
                    presentation: 'formSheet',
                    sheetGrabberVisible: true,
                    sheetAllowedDetents: [0.72, 1],
                    contentStyle: { backgroundColor: '#f2f2f7' },
                  }}
                />
                <Stack.Screen
                  name='events/ask'
                  options={{
                    headerShown: false,
                    presentation: 'formSheet',
                    sheetGrabberVisible: true,
                    sheetAllowedDetents: [0.92],
                    contentStyle: { backgroundColor: '#f2f2f7' },
                  }}
                />
              </Stack>
            </PaperProvider>
          </FontScaleProvider>
        </LocaleProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
};

export default RootLayout;
