import { act, render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import {
  FEATURED_CARD_ASPECT,
  FeaturedEventCard,
} from '../components/featured-event-card';
import { LikedEventsProvider, useLikedEvents } from '../liked-events';
import { makeEvent, iso, NOW } from './_fixtures';

function LikedProbe() {
  const liked = useLikedEvents();
  return <Text testID='liked-ids'>{[...liked.ids].join(',')}</Text>;
}

/** Renders and flushes the provider's one-shot AsyncStorage hydration. */
const renderCard = async (event = makeEvent()) => {
  const result = render(
    <LikedEventsProvider>
      <FeaturedEventCard event={event} now={NOW} width={358} />
      <LikedProbe />
    </LikedEventsProvider>,
  );
  await act(async () => {});
  return result;
};

describe('FeaturedEventCard', () => {
  it('exports a tunable aspect ratio that makes the card taller than it is wide', () => {
    expect(FEATURED_CARD_ASPECT).toBe(0.72);
    expect(FEATURED_CARD_ASPECT).toBeLessThan(1);
  });

  it('renders the venue, title, organiser handle and price', async () => {
    await renderCard();
    expect(screen.getByText('The Guild')).toBeTruthy();
    expect(screen.getByText('Harbourfront Live')).toBeTruthy();
    expect(screen.getByText('@islandsoundcollective')).toBeTruthy();
    expect(screen.getByText('From $25.00')).toBeTruthy();
  });

  it('shows a countdown for an event a couple of days out', async () => {
    await renderCard(makeEvent({ startDate: iso(2026, 9, 9, 19), endDate: iso(2026, 9, 9, 23) }));
    expect(screen.getByText('Hrs')).toBeTruthy();
    expect(screen.getByText('Min')).toBeTruthy();
    expect(screen.queryByText('Happening now')).toBeNull();
  });

  it('shows Happening now for an event in progress', async () => {
    await renderCard(makeEvent({ startDate: iso(2026, 9, 7, 11), endDate: iso(2026, 9, 7, 14) }));
    expect(screen.getByText('Happening now')).toBeTruthy();
  });

  it('renders Online in place of a venue for online events', async () => {
    await renderCard(makeEvent({ isOnline: true }));
    expect(screen.getByText('Online')).toBeTruthy();
  });

  it('omits the price block when the event has no price', async () => {
    await renderCard(makeEvent({ lowestPrice: null }));
    expect(screen.queryByText(/^From /)).toBeNull();
  });

  it('toggles liked state when the heart is pressed', async () => {
    const user = userEvent.setup();
    await renderCard();

    await user.press(screen.getByLabelText('Like event'));
    expect(screen.getByTestId('liked-ids')).toHaveTextContent('evt-1');

    await user.press(screen.getByLabelText('Remove from liked'));
    expect(screen.getByTestId('liked-ids')).toHaveTextContent('');
  });
});
