import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type QueryParamValue =
  | string
  | number
  | boolean
  | null
  | undefined;

export type QueryParams = Record<
  string,
  QueryParamValue | QueryParamValue[]
>;

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '');

type ExpoConstantsShape = {
  expoConfig?: {
    hostUri?: string;
  };
  expoGoConfig?: {
    debuggerHost?: string;
  };
  linkingUri?: string;
  manifest2?: {
    extra?: {
      expoClient?: {
        hostUri?: string;
      };
    };
  };
};

const getHostFromRuntimeValue = (value?: string | null) => {
  if (!value) return null;

  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  try {
    const parsedUrl = new URL(trimmedValue);
    return parsedUrl.hostname || null;
  } catch {
    const withoutProtocol = trimmedValue.replace(/^[a-z]+:\/\//i, '');
    const hostCandidate = withoutProtocol.split('/')[0] ?? '';
    const [host] = hostCandidate.split(':');
    return host?.trim() || null;
  }
};

const getDevelopmentApiBaseUrl = () => {
  const constants = Constants as ExpoConstantsShape;
  const runtimeHost =
    getHostFromRuntimeValue(constants.expoGoConfig?.debuggerHost) ??
    getHostFromRuntimeValue(constants.expoConfig?.hostUri) ??
    getHostFromRuntimeValue(constants.manifest2?.extra?.expoClient?.hostUri) ??
    getHostFromRuntimeValue(constants.linkingUri);

  if (runtimeHost) {
    return `http://${runtimeHost}:4000`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000';
  }

  if (Platform.OS === 'ios') {
    return 'http://127.0.0.1:4000';
  }

  return null;
};

export const getApiBaseUrl = () => {
  const configuredBaseUrl =
    process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ??
    getDevelopmentApiBaseUrl();

  if (!configuredBaseUrl) {
    throw new Error(
      'Unable to determine the API server URL. Set EXPO_PUBLIC_API_BASE_URL to your Express server, for example http://192.168.x.x:4000.',
    );
  }

  const normalizedBaseUrl = normalizeBaseUrl(configuredBaseUrl);
  return normalizedBaseUrl.endsWith('/api')
    ? normalizedBaseUrl
    : `${normalizedBaseUrl}/api`;
};

export const buildApiUrl = (path: string, params?: QueryParams) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${getApiBaseUrl()}${normalizedPath}`);

  if (!params) return url.toString();

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item == null) return;
        url.searchParams.append(key, String(item));
      });
      return;
    }

    if (value == null) return;
    url.searchParams.set(key, String(value));
  });

  return url.toString();
};
