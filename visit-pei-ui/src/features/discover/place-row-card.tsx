import type { ComponentProps } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, Text, View } from 'react-native';

import { COLOR } from '../../../styles';
import { getDisplayPlaceName, getPlaceTheme } from '../../utils/placeVisuals';
import type { Place } from '../../types/api';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type PlaceRowCardProps = {
  place: Place;
  icon: IconName;
  onPress: () => void;
};

/** A single place inside a Discover drawer section — icon reflects the place's subcategory, not a generic location pin. */
export function PlaceRowCard({ place, icon, onPress }: PlaceRowCardProps) {
  const theme = getPlaceTheme(place.category);
  const location = place.community?.trim() || place.region?.trim() || null;
  const displayName = getDisplayPlaceName(place.name);

  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={`Open ${displayName}`}
      onPress={onPress}
      className='flex-row items-center gap-3 rounded-2xl bg-white px-3 py-3'
    >
      <View
        className='h-10 w-10 items-center justify-center rounded-full'
        style={{ backgroundColor: theme.softColor }}
      >
        <MaterialCommunityIcons name={icon} size={18} color={theme.accentColor} />
      </View>

      <View className='flex-1'>
        <Text className='text-base font-semibold text-mainText' numberOfLines={1}>
          {displayName}
        </Text>
        {location ? (
          <Text className='text-xs' numberOfLines={1} style={{ color: COLOR.mutedText }}>
            {location}
          </Text>
        ) : null}
      </View>

      <MaterialCommunityIcons name='chevron-right' size={18} color={COLOR.mutedText} />
    </Pressable>
  );
}
