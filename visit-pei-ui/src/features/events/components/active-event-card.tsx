import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TickitUpEvent } from '../../../types/api';
import { EventImage } from '../event-image';
import {
  eventPlace,
  eventPriceLabel,
  formatExploreWhen,
  isEventInProgress,
} from '../event-timing';
import { useLikedEvents } from '../liked-events';
import { EVENT } from '../theme';
import { tapHaptic, UiIcon } from '../ui-icon';

function startsLabel(iso: string) {
  const time = new Date(iso).toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `Starts ${time}`;
}

export function ActiveEventCard({
  event,
  now,
  schedule = 'later',
}: {
  event: TickitUpEvent;
  now: number;
  schedule?: 'today' | 'later';
}) {
  const liked = useLikedEvents();
  const inProgress = isEventInProgress(event.startDate, event.endDate, now);
  const place = eventPlace(event);
  const price = eventPriceLabel(event);
  const saved = liked.hydrated && liked.has(event.id);
  const whenText =
    schedule === 'today'
      ? startsLabel(event.startDate)
      : formatExploreWhen(event.startDate, new Date(now));

  return (
    <View style={styles.shell}>
      <Link
        href={{ pathname: '/events/[id]', params: { id: event.slug } }}
        asChild
      >
        <Link.Trigger>
          <Pressable style={styles.card}>
            <View style={styles.flyer}>
              <EventImage
                event={event}
                contentFit='cover'
                style={StyleSheet.absoluteFill}
              />
            </View>
            <View style={styles.body}>
              <View style={styles.placeRow}>
                <UiIcon
                  sf='mappin'
                  android='map-marker-outline'
                  size={13}
                  color={EVENT.muted}
                />
                <Text numberOfLines={1} style={styles.place}>
                  {place}
                </Text>
              </View>
              <Text selectable numberOfLines={2} style={styles.title}>
                {event.title}
              </Text>
              {inProgress ? (
                <View style={styles.happening}>
                  <View style={styles.happeningDot} />
                  <Text style={styles.happeningText}>Happening now</Text>
                </View>
              ) : (
                <View style={styles.whenRow}>
                  {price ? (
                    <Text selectable style={styles.price}>
                      {price}
                    </Text>
                  ) : null}
                  {price ? <View style={styles.divider} /> : null}
                  <UiIcon
                    sf='clock'
                    android='clock-outline'
                    size={13}
                    color={EVENT.muted}
                  />
                  <Text selectable style={styles.when}>
                    {whenText}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        </Link.Trigger>
        <Link.Preview />
      </Link>
      <Pressable
        accessibilityLabel={saved ? 'Remove from liked' : 'Like event'}
        hitSlop={8}
        onPress={() => {
          tapHaptic();
          liked.toggle(event.id);
        }}
        style={styles.heart}
      >
        <UiIcon
          sf={saved ? 'heart.fill' : 'heart'}
          android={saved ? 'heart' : 'heart-outline'}
          size={20}
          color={saved ? EVENT.happening : EVENT.muted}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'relative',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 84,
    paddingRight: 36,
  },
  flyer: {
    width: 72,
    height: 72,
    borderRadius: 16,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: EVENT.accentSoft,
  },
  body: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 3,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  place: {
    flex: 1,
    color: EVENT.muted,
    fontSize: 12,
  },
  title: {
    color: EVENT.text,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  whenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  price: {
    color: EVENT.text,
    fontSize: 12,
    fontWeight: '600',
  },
  when: {
    color: EVENT.muted,
    fontSize: 12,
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: EVENT.borderStrong,
  },
  happening: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: EVENT.happening,
  },
  happeningDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  happeningText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  heart: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
