import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, ScrollView, Text } from 'react-native';

import { COLOR } from '../../../styles';
import type { GroupedPlaces, PlaceSubcategoryId } from '../../utils/placeSubcategories';

export type SubcategoryTabBarProps = {
  sections: GroupedPlaces[];
  activeId: PlaceSubcategoryId | null;
  onSelect: (id: PlaceSubcategoryId) => void;
};

/** Horizontal row of subcategory tabs (e.g. Walking/Biking/Non-Biking) — each colored and iconed like the category landing cards, so tapping one filters the drawer's list to just that subcategory. */
export function SubcategoryTabBar({ sections, activeId, onSelect }: SubcategoryTabBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingBottom: 14 }}
    >
      {sections.map(({ subcategory, places }) => {
        const active = subcategory.id === activeId;
        return (
          <Pressable
            key={subcategory.id}
            accessibilityRole='button'
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${subcategory.label}, ${places.length} places`}
            onPress={() => onSelect(subcategory.id)}
            className='flex-row items-center gap-1.5 rounded-full px-3.5 py-2'
            style={{ backgroundColor: active ? subcategory.accentColor : subcategory.softColor }}
          >
            <MaterialCommunityIcons
              name={subcategory.icon}
              size={14}
              color={active ? COLOR.whiteText : subcategory.accentColor}
            />
            <Text
              className='text-xs font-semibold'
              style={{ color: active ? COLOR.whiteText : subcategory.accentColor }}
            >
              {subcategory.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
