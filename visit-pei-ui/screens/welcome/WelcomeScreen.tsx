import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLOR } from '../../styles';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1400&q=80';

export const WelcomeScreen = () => {
  const insets = useSafeAreaInsets();

  const handleGetStarted = async () => {
    if (process.env.EXPO_OS === 'ios') {
      await Haptics.selectionAsync();
    }

    router.push('/(tabs)/home');
  };

  return (
    <>
      <StatusBar style='light' />

      <View
        style={{
          flex: 1,
          backgroundColor: '#041318',
        }}
      >
        <Image
          contentFit='cover'
          transition={200}
          source={{ uri: HERO_IMAGE }}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        />

        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: 'rgba(4, 19, 24, 0.22)',
          }}
        />

        <View
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            left: 0,
            height: '52%',
            backgroundColor: 'rgba(0, 0, 0, 0.30)',
          }}
        />

        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            paddingHorizontal: 24,
            paddingTop: insets.top + 64,
            paddingBottom: insets.bottom + 48,
            gap: 16,
          }}
        >
          <View
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: 16,
              paddingVertical: 10,
              backgroundColor: 'rgba(255, 255, 255, 0.20)',
              borderRadius: 999,
              borderCurve: 'continuous',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.18)',
            }}
          >
            <Text
              selectable
              style={{
                color: COLOR.whiteText,
                fontSize: 14,
                fontWeight: '600',
                letterSpacing: 0.2,
              }}
            >
              Welcome to Visit PEI
            </Text>
          </View>

          <View
            style={{
              gap: 12,
            }}
          >
            <Text
              selectable
              style={{
                maxWidth: 340,
                color: COLOR.whiteText,
                fontSize: 32,
                fontWeight: '800',
                lineHeight: 38,
                textShadowColor: 'rgba(0, 0, 0, 0.22)',
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 10,
              }}
            >
              Explore Prince Edward Island
            </Text>

            <Text
              selectable
              style={{
                maxWidth: 340,
                color: COLOR.whiteText,
                fontSize: 18,
                lineHeight: 24,
                opacity: 0.92,
              }}
            >
              Discover places, events, and local experiences tailored for your
              PEI trip.
            </Text>
          </View>

          <Button
            mode='contained'
            onPress={handleGetStarted}
            contentStyle={{
              minHeight: 58,
            }}
            labelStyle={{
              fontSize: 18,
              fontWeight: '700',
              color: COLOR.whiteText,
            }}
            style={{
              marginTop: 8,
              borderRadius: 999,
              borderCurve: 'continuous',
              boxShadow: '0 18px 36px rgba(0, 121, 96, 0.32)',
            }}
            buttonColor={COLOR.brandGreen}
          >
            Get Started
          </Button>
        </View>
      </View>
    </>
  );
};
