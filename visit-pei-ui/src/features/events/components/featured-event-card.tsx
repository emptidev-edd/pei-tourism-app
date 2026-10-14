import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TickitUpEvent } from '../../../types/api';
import { EventImage, resolveEventImageUrl } from '../event-image';
import {
  eventPlace,
  eventPriceLabel,
  getEventBadgeState,
  organiserHandle,
} from '../event-timing';
import { useLikedEvents } from '../liked-events';
import { EVENT } from '../theme';
import { tapHaptic, UiIcon } from '../ui-icon';

export const FEATURED_CARD_ASPECT = 0.72;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

// Second-granularity countdown for this card; `getEventBadgeState` in
// `event-timing.ts` holds the minute-granularity sibling of this logic.
function useSecondNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function countdownParts(startIso: string, now: number) {
  const totalSec = Math.floor((new Date(startIso).getTime() - now) / 1000);
  if (totalSec <= 0) return null;
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (days > 0) {
    return [
      { value: days, label: 'Days' },
      { value: hours, label: 'Hrs' },
      { value: minutes, label: 'Min' },
    ];
  }
  return [
    { value: hours, label: 'Hrs' },
    { value: minutes, label: 'Min' },
    { value: seconds, label: 'Sec' },
  ];
}

function CountdownPill({ startIso }: { startIso: string }) {
  const now = useSecondNow();
  const units = countdownParts(startIso, now);
  if (!units) return null;

  return (
    <View style={styles.countdown}>
      <UiIcon sf='clock' android='clock-outline' size={20} color='#ffffff' />
      <View style={styles.countdownUnits}>
        {units.map((unit, index) => (
          <View key={unit.label} style={styles.countdownUnitRow}>
            {index > 0 ? <Text style={styles.countdownColon}>:</Text> : null}
            <View style={styles.countdownUnit}>
              <Text selectable style={styles.countdownValue}>
                {pad(unit.value)}
              </Text>
              <Text style={styles.countdownLabel}>{unit.label}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function FeaturedEventCard({
  event,
  now,
  width,
}: {
  event: TickitUpEvent;
  now: number;
  width: number;
}) {
  const liked = useLikedEvents();
  const place = eventPlace(event);
  const price = eventPriceLabel(event);
  const orgName = event.organiser?.organisationName?.trim() || 'Organiser';
  const orgLogoUri = resolveEventImageUrl(event.organiser?.organisationLogoUrl);
  const saved = liked.hydrated && liked.has(event.id);
  const phase = getEventBadgeState(event.startDate, event.endDate, now).kind;

  return (
    <View style={[styles.card, { width }]}>
      <Link
        href={{ pathname: '/events/[id]', params: { id: event.slug } }}
        asChild
      >
        <Link.Trigger>
          <Pressable style={styles.press}>
            <EventImage
              event={event}
              contentFit='cover'
              contentPosition='top'
              transition={180}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.flyerFade} />
            <View style={styles.body}>
              <View style={styles.placeRow}>
                <UiIcon sf='mappin' android='map-marker' size={16} color='#ffffff' />
                <Text numberOfLines={1} style={styles.place}>
                  {place}
                </Text>
              </View>
              <Text selectable numberOfLines={2} style={styles.title}>
                {event.title}
              </Text>
              <View style={styles.metaRow}>
                <View style={styles.orgRow}>
                  {orgLogoUri ? (
                    <Image
                      source={{ uri: orgLogoUri }}
                      style={styles.orgAvatar}
                    />
                  ) : (
                    <View style={styles.orgAvatarFallback}>
                      <Text style={styles.orgInitial}>
                        {orgName.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text numberOfLines={1} style={styles.orgName}>
                    {organiserHandle(orgName)}
                  </Text>
                </View>
                {price ? (
                  <View style={styles.priceRow}>
                    <UiIcon sf='tag' android='tag-outline' size={14} color='#ffffff' />
                    <Text selectable style={styles.price}>
                      {price}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </Pressable>
        </Link.Trigger>
        <Link.Preview />
      </Link>

      {phase === 'countdown' || phase === 'none' ? (
        <View style={styles.badgeSlot}>
          <CountdownPill startIso={event.startDate} />
        </View>
      ) : null}
      {phase === 'happening' ? (
        <View style={styles.badgeSlot}>
          <View style={styles.happening}>
            <View style={styles.happeningDot} />
            <Text style={styles.happeningText}>Happening now</Text>
          </View>
        </View>
      ) : null}
      {phase === 'ended' ? (
        <View style={styles.badgeSlot}>
          <View style={styles.ended}>
            <Text style={styles.endedText}>Ended</Text>
          </View>
        </View>
      ) : null}

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
          size={18}
          color={saved ? EVENT.happening : '#ffffff'}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    aspectRatio: FEATURED_CARD_ASPECT,
    borderRadius: 28,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: '#1c2530',
    boxShadow: EVENT.shadow,
  },
  press: {
    flex: 1,
  },
  flyerFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '62%',
    experimental_backgroundImage:
      'linear-gradient(to bottom, rgba(16,24,32,0) 0%, rgba(16,24,32,0.55) 42%, rgba(16,24,32,0.92) 100%)',
  },
  body: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingBottom: 16,
    gap: 6,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  place: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  orgRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  orgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
  },
  orgAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EVENT.accent,
  },
  orgInitial: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  orgName: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  price: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  badgeSlot: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 3,
  },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(36, 44, 58, 0.72)',
  },
  countdownUnits: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  countdownUnitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  countdownUnit: {
    alignItems: 'center',
    minWidth: 32,
  },
  countdownValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    lineHeight: 20,
  },
  countdownLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  countdownColon: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  happening: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: EVENT.happening,
  },
  happeningDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  happeningText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  ended: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(36, 44, 58, 0.72)',
  },
  endedText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  heart: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 4,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.34)',
  },
});
