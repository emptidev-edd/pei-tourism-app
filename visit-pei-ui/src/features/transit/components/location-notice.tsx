import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Linking, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { COLOR } from '../../../../styles';

/** Banner shown when location permission was denied, offering a Settings deep link. */
export function LocationNotice() {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={() => Linking.openSettings()}
      style={styles.noticeCard}
    >
      <MaterialCommunityIcons
        name='map-marker-alert-outline'
        size={18}
        color={COLOR.brandGreen}
      />
      <Text style={styles.noticeText}>
        Location access is off — showing Charlottetown by default.{' '}
        <Text style={styles.noticeLink}>Tap to open Settings.</Text>
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#f3faf7',
    marginBottom: 14,
  },
  noticeText: {
    flex: 1,
    color: '#506270',
    fontSize: 13,
    lineHeight: 18,
  },
  noticeLink: {
    color: COLOR.brandGreen,
    fontWeight: '700',
  },
});
