import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, View } from 'react-native';

import { COLOR } from '../../../../styles';
import type { TransitRouteStop } from '../../../types/api';

export type ScheduledRouteStop = TransitRouteStop & { scheduledAtIso: string | null };

/** One stop in the route's vertical timeline: connector line, dot, name, connections, time. */
export function RouteTimelineItem({
  item,
  index,
  activeStopIndex,
  isFirst,
  isLast,
  focused,
  walkMinutes,
  absoluteTime,
}: {
  item: ScheduledRouteStop;
  index: number;
  activeStopIndex: number;
  isFirst: boolean;
  isLast: boolean;
  focused: boolean;
  walkMinutes: number | null;
  absoluteTime: string | null;
}) {
  const active = index === activeStopIndex;
  const isPast = index <= activeStopIndex;
  const connecting = (item.connectingRoutes ?? []).slice(0, 4);

  const lineColor = (above: boolean) => {
    if (above) {
      return isFirst ? 'transparent' : index <= activeStopIndex ? COLOR.brandGreen : '#d1d5db';
    }
    return isLast ? 'transparent' : index < activeStopIndex ? COLOR.brandGreen : '#d1d5db';
  };

  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineLineCol}>
        <View style={[styles.timelineLineSeg, { backgroundColor: lineColor(true) }]} />
        <View
          style={[
            styles.timelineDot,
            isPast ? styles.timelineDotPast : styles.timelineDotFuture,
            focused && styles.timelineDotFocused,
          ]}
        />
        <View style={[styles.timelineLineSeg, { backgroundColor: lineColor(false) }]} />
      </View>

      <View style={styles.timelineContent}>
        <View style={styles.stopRow}>
          <View style={styles.stopCopy}>
            {focused && walkMinutes != null ? (
              <Text style={styles.walkText}>{walkMinutes} min walk</Text>
            ) : null}
            <Text
              style={[
                styles.stopName,
                active && styles.stopNameActive,
                focused && styles.stopNameFocused,
              ]}
            >
              {item.stop?.name ?? item.stopId}
            </Text>

            {focused ? <Text style={styles.stopHint}>Your selected stop</Text> : null}

            {connecting.length > 0 ? (
              <View style={styles.connectRow}>
                {connecting.map((name) => (
                  <View key={name} style={styles.connectChip}>
                    <MaterialCommunityIcons name='bus' size={12} color={COLOR.brandGreen} />
                    <Text style={styles.connectChipText}>{name}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          {absoluteTime ? (
            <View style={styles.stopTimeAside}>
              <View style={[styles.stopTimePill, focused && styles.stopTimePillFocused]}>
                <Text
                  style={[
                    styles.stopTimePrimaryText,
                    focused && styles.stopTimePrimaryTextFocused,
                  ]}
                >
                  {absoluteTime}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  timelineItem: {
    flexDirection: 'row',
  },
  timelineLineCol: {
    width: 28,
    alignItems: 'center',
  },
  timelineLineSeg: {
    flex: 1,
    width: 2,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineDotPast: {
    backgroundColor: COLOR.brandGreen,
  },
  timelineDotFuture: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  timelineDotFocused: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLOR.brandGreen,
    borderWidth: 2,
    borderColor: COLOR.brandGreen,
  },
  timelineContent: {
    flex: 1,
  },
  stopRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingLeft: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 121, 96, 0.10)',
  },
  stopCopy: {
    flex: 1,
    gap: 3,
  },
  stopTimeAside: {
    alignItems: 'flex-end',
  },
  stopName: {
    color: '#4a5f6d',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  stopNameActive: {
    color: '#16355b',
  },
  stopNameFocused: {
    color: '#16202a',
  },
  walkText: {
    color: COLOR.brandGreen,
    fontSize: 13,
    fontWeight: '700',
  },
  stopHint: {
    color: COLOR.brandGreen,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  connectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  connectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#efefef',
  },
  connectChipText: {
    color: '#16202a',
    fontSize: 12,
    fontWeight: '800',
  },
  stopTimePill: {
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#efefef',
  },
  stopTimePrimaryText: {
    color: '#16202a',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 16,
  },
  stopTimePrimaryTextFocused: {
    color: COLOR.whiteText,
  },
  stopTimePillFocused: {
    backgroundColor: COLOR.brandGreen,
  },
});
