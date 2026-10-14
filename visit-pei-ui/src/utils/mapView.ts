import { Platform } from 'react-native';
import { PROVIDER_GOOGLE, type Provider } from 'react-native-maps';

type NativeMapProps = {
  provider?: Provider;
  collapsable: false;
};

/** Android Google Maps needs an explicit provider. iOS keeps Apple Maps. */
export const nativeMapProps: NativeMapProps =
  Platform.OS === 'android'
    ? { provider: PROVIDER_GOOGLE, collapsable: false }
    : { collapsable: false };
