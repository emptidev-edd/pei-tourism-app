import { Image } from 'expo-image';
import { useState, type ComponentProps } from 'react';
import {
  StyleSheet,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { getApiBaseUrl } from '../../services/http/buildUrl';
import { categoryIcon } from './category-icons';
import { EVENT } from './theme';
import { UiIcon } from './ui-icon';

type ExpoImageProps = ComponentProps<typeof Image>;

/** Accepted by both `expo-image` and the fallback `View`. */
type EventImageStyle = StyleProp<ImageStyle & ViewStyle>;

type EventImageSource = {
  bannerImageUrl?: string | null;
  category?: { slug?: string | null } | null;
};

/**
 * Most banners come back as paths relative to the API host (`/sample-club.jpg`),
 * which render blank on device unless they are resolved against the server
 * origin. `getApiBaseUrl()` already ends in `/api`, so that suffix is stripped
 * before joining, and it throws when the API URL is unconfigured.
 */
export function resolveEventImageUrl(raw?: string | null): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  // Already absolute, protocol-relative, or inlined: nothing to resolve.
  if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
  if (/^data:/i.test(trimmed)) return trimmed;

  try {
    const origin = getApiBaseUrl().replace(/\/api$/, '');
    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${origin}${path}`;
  } catch {
    return null;
  }
}

/**
 * Event banner with a branded fallback: when no URL resolves, or the remote
 * load fails, the event's category icon is shown on a soft accent fill instead
 * of an empty box.
 */
export function EventImage({
  event,
  style,
  contentFit = 'cover',
  contentPosition,
  transition = 150,
}: {
  event: EventImageSource;
  style?: EventImageStyle;
  contentFit?: ExpoImageProps['contentFit'];
  contentPosition?: ExpoImageProps['contentPosition'];
  transition?: ExpoImageProps['transition'];
}) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const uri = resolveEventImageUrl(event.bannerImageUrl);
  const failed = uri != null && failedUri === uri;

  if (!uri || failed) {
    const icon = categoryIcon(event.category?.slug);
    return (
      <View style={[styles.placeholder, style]}>
        <UiIcon sf={icon.sf} android={icon.android} size={32} color={EVENT.accent} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      contentFit={contentFit}
      contentPosition={contentPosition}
      transition={transition}
      style={style}
      onError={() => setFailedUri(uri)}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EVENT.accentSoft,
  },
});
