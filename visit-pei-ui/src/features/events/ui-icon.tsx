import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import type { ComponentProps } from 'react';

type AndroidName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function tapHaptic() {
  if (process.env.EXPO_OS !== 'ios') return;
  void Haptics.selectionAsync();
}

export function UiIcon({
  sf,
  android,
  size = 22,
  color = '#ffffff',
}: {
  sf: string;
  android: AndroidName;
  size?: number;
  color?: string;
}) {
  if (process.env.EXPO_OS === 'ios') {
    return (
      <Image
        source={`sf:${sf}`}
        tintColor={color}
        style={{ width: size, height: size }}
      />
    );
  }

  return <MaterialCommunityIcons name={android} size={size} color={color} />;
}
