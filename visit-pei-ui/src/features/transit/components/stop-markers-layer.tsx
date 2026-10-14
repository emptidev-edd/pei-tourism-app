import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { COLOR } from '../../../../styles';
import type { TransitStop } from '../../../types/api';

/** Bus-stop pins for the nearby-stops map, highlighting the selected one. */
export function StopMarkersLayer({
  stops,
  selectedStopId,
  onSelectStop,
}: {
  stops: TransitStop[];
  selectedStopId: string | null | undefined;
  onSelectStop: (stop: TransitStop) => void;
}) {
  return (
    <>
      {stops.map((stop) => {
        if (stop.lat == null || stop.lon == null) {
          return null;
        }

        const selected = stop.stopId === selectedStopId;

        return (
          <Marker
            key={stop.stopId}
            coordinate={{ latitude: stop.lat, longitude: stop.lon }}
            onPress={() => onSelectStop(stop)}
          >
            <View style={[styles.markerWrap, selected && styles.markerWrapSelected]}>
              <MaterialCommunityIcons name='bus' size={18} color={COLOR.brandGreen} />
            </View>
          </Marker>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  markerWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 2,
    borderColor: COLOR.brandGreen,
  },
  markerWrapSelected: {
    backgroundColor: '#f3faf7',
    borderColor: COLOR.brandGreen,
  },
});
