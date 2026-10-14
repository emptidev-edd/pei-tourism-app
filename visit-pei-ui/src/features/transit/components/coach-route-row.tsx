import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { COLOR } from '../../../../styles';
import type { TransitRoute } from '../../../types/api';
import { formatServiceDays, getRouteNumber } from '../transit-format';

export function CoachRouteRow({
  route,
  onPress,
}: {
  route: TransitRoute;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.84} onPress={onPress} style={styles.coachRouteRow}>
      <View style={styles.routeBox}>
        <MaterialCommunityIcons name='bus' size={14} color={COLOR.brandGreen} />
        <Text style={styles.routeBoxText}>
          {getRouteNumber(route.routeId, route.shortName)}
        </Text>
      </View>

      <View style={styles.coachRouteCopy}>
        <Text style={styles.coachRouteName} numberOfLines={2}>
          {route.longName?.trim() || 'Transit route'}
        </Text>
      </View>

      <View style={styles.serviceDaysBadge}>
        <Text style={styles.serviceDaysText}>{formatServiceDays(route.serviceDays)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  coachRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 121, 96, 0.10)',
  },
  routeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#efefef',
  },
  routeBoxText: {
    color: '#16202a',
    fontSize: 13,
    fontWeight: '800',
  },
  coachRouteCopy: {
    flex: 1,
  },
  coachRouteName: {
    color: '#16202a',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  serviceDaysBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#efefef',
  },
  serviceDaysText: {
    color: '#6b7e8d',
    fontSize: 11,
    fontWeight: '700',
  },
});
