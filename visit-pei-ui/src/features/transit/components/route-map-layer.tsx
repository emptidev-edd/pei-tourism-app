import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, View } from 'react-native';
import { Marker, Polyline } from 'react-native-maps';

import { COLOR } from '../../../../styles';
import type { TransitRouteStop } from '../../../types/api';

/**
 * Route polyline plus a pin per stop, highlighting the focused one.
 *
 * `coordinates` should be the route's real road geometry from the shape
 * endpoint. The stop-to-stop fallback the caller supplies when no shape is
 * available draws straight lines through buildings, so it is a last resort.
 */
export function RouteMapLayer({
  coordinates,
  items,
  focusStopId,
  routeColor,
}: {
  coordinates: { latitude: number; longitude: number }[];
  items: TransitRouteStop[];
  focusStopId: string | null | undefined;
  /** Feed-provided route colour; falls back to the brand green. */
  routeColor?: string | null;
}) {
  const strokeColor = routeColor || COLOR.brandGreen;
  return (
    <>
      {coordinates.length > 1 ? (
        <Polyline coordinates={coordinates} strokeColor={strokeColor} strokeWidth={5} />
      ) : null}

      {items.map((item) => {
        if (item.stop?.lat == null || item.stop?.lon == null) {
          return null;
        }

        const focused = item.stopId === focusStopId;

        return (
          <Marker
            key={`${item.stopId}-${item.stopSequence}`}
            coordinate={{ latitude: item.stop.lat, longitude: item.stop.lon }}
          >
            <View
              style={[
                styles.markerWrap,
                { backgroundColor: focused ? strokeColor : `${strokeColor}99` },
              ]}
            >
              <MaterialCommunityIcons name='bus' size={16} color={COLOR.whiteText} />
            </View>
          </Marker>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  markerWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
