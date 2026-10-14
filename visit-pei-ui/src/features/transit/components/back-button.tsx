import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { COLOR } from '../../../../styles';

/** Round translucent back arrow floated over the hero map on the route/stop detail screens. */
export function TransitBackButton({
  onPress,
  top,
}: {
  onPress: () => void;
  top: number;
}) {
  return (
    <TouchableOpacity
      accessibilityRole='button'
      activeOpacity={0.84}
      onPress={onPress}
      style={[styles.backButton, { top }]}
    >
      <MaterialCommunityIcons name='arrow-left' size={22} color={COLOR.whiteText} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    left: 20,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
});
