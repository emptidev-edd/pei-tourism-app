import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, Text, View } from 'react-native';

import { COLOR } from '../../../styles';
import { getPlaceTheme } from '../../utils/placeVisuals';
import { CATEGORY_HIGHLIGHT, FILTER_TABS, type FilterTab } from './constants';

export type CategoryLandingCardProps = {
  category: FilterTab;
  count?: number;
  onPress: () => void;
};

/** A large, data-driven landing card for one Discover category — tapping it opens that category's drawer. */
export function CategoryLandingCard({ category, count, onPress }: CategoryLandingCardProps) {
  const theme = getPlaceTheme(category);
  const title = FILTER_TABS.find((tab) => tab.id === category)?.label ?? theme.label;

  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={`Open ${title}`}
      onPress={onPress}
      className='mb-4 overflow-hidden rounded-3xl'
    >
      <View
        style={{
          padding: 20,
          experimental_backgroundImage: `linear-gradient(135deg, ${theme.softColor} 0%, ${theme.accentColor}22 100%)`,
        }}
      >
        <View
          className='absolute right-4 top-4 h-12 w-12 items-center justify-center rounded-full'
          style={{ backgroundColor: theme.accentColor }}
        >
          <MaterialCommunityIcons name={theme.icon} size={22} color={COLOR.whiteText} />
        </View>

        <Text className='text-2xl font-extrabold' style={{ color: COLOR.headingText }}>
          {title}
        </Text>

        <View className='mt-3 gap-1'>
          <Text className='text-sm font-medium' style={{ color: COLOR.mainText }}>
            {count != null ? `${count} places to explore` : 'Loading places…'}
          </Text>
          <Text className='text-sm' style={{ color: COLOR.mainText }}>
            {CATEGORY_HIGHLIGHT[category]}
          </Text>
        </View>

        <Text className='mt-4 text-xs' style={{ color: COLOR.mutedText }}>
          Tap to explore
        </Text>
      </View>
    </Pressable>
  );
}
