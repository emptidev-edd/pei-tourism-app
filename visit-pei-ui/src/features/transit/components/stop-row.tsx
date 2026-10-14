import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { COLOR } from '../../../../styles';

/**
 * One row in the "nearby stops" or "favorites" list. `right` carries the
 * part that differs between the two lists (walk-time text vs. a star
 * toggle) — everything else was pixel-identical in both call sites.
 */
export function StopRow({
  name,
  meta,
  selected = false,
  onPress,
  right,
}: {
  name: string;
  meta: string;
  selected?: boolean;
  onPress: () => void;
  right?: ReactNode;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      style={[styles.stopRow, selected && styles.stopRowSelected]}
    >
      <View style={styles.stopIconWrap}>
        <MaterialCommunityIcons name='bus-stop' size={18} color={COLOR.brandGreen} />
      </View>

      <View style={styles.stopCopy}>
        <Text style={styles.stopName} numberOfLines={2}>
          {name}
        </Text>
        <Text style={styles.stopMeta} numberOfLines={1}>
          {meta}
        </Text>
      </View>

      {right}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 4,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 121, 96, 0.10)',
  },
  stopRowSelected: {
    backgroundColor: '#f3faf7',
  },
  stopIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#efefef',
  },
  stopCopy: {
    flex: 1,
    gap: 3,
  },
  stopName: {
    color: '#16202a',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  stopMeta: {
    color: '#6b7e8d',
    fontSize: 13,
    lineHeight: 18,
  },
});
