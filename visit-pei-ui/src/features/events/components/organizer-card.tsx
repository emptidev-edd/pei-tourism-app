import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { resolveEventImageUrl } from '../event-image';
import { organiserHandle } from '../event-timing';
import { EVENT } from '../theme';
import { UiIcon } from '../ui-icon';

export type OrganizerCardModel = {
  id: string;
  name: string;
  logoUrl: string | null;
  bannerUrl: string | null;
};

export function OrganizerCard({
  organizer,
  onPress,
}: {
  organizer: OrganizerCardModel;
  onPress: () => void;
}) {
  const bannerUri = resolveEventImageUrl(organizer.bannerUrl);
  const logoUri = resolveEventImageUrl(organizer.logoUrl);

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.banner}>
        {bannerUri ? (
          <Image
            source={{ uri: bannerUri }}
            contentFit='cover'
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={styles.bannerFallback} />
        )}
        <View style={styles.bannerFade} />
      </View>
      <View style={styles.identity}>
        {logoUri ? (
          <Image source={{ uri: logoUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.initial}>
              {organizer.name.slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.copy}>
          <Text selectable numberOfLines={1} style={styles.name}>
            {organizer.name}
          </Text>
          <Text numberOfLines={1} style={styles.handle}>
            {organiserHandle(organizer.name)}
          </Text>
        </View>
        <UiIcon sf='arrow.up.right' android='arrow-top-right' size={18} color={EVENT.faint} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: EVENT.elevated,
    borderWidth: 1,
    borderColor: EVENT.border,
  },
  banner: {
    height: 112,
    backgroundColor: EVENT.accentSoft,
  },
  bannerFallback: {
    flex: 1,
    backgroundColor: EVENT.accentSoft,
  },
  bannerFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 48,
    experimental_backgroundImage:
      'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%)',
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: -22,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: EVENT.bg,
    backgroundColor: EVENT.card,
  },
  avatarFallback: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: EVENT.bg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EVENT.accent,
  },
  initial: {
    color: EVENT.onAccent,
    fontSize: 20,
    fontWeight: '800',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    color: EVENT.text,
    fontSize: 17,
    fontWeight: '800',
  },
  handle: {
    color: EVENT.muted,
    fontSize: 13,
  },
});
