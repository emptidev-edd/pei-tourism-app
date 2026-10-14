import { act, render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ActiveEventCard } from '../components/active-event-card';
import { LikedEventsProvider, useLikedEvents } from '../liked-events';
import { iso, makeEvent, NOW } from './_fixtures';

function LikedProbe() {
  const liked = useLikedEvents();
  return <Text testID='liked-ids'>{[...liked.ids].join(',')}</Text>;
}

const renderRow = async (
  event = makeEvent(),
  schedule?: 'today' | 'later',
) => {
  const result = render(
    <LikedEventsProvider>
      <ActiveEventCard event={event} now={NOW} schedule={schedule} />
      <LikedProbe />
    </LikedEventsProvider>,
  );
  await act(async () => {});
  return result;
};

describe('ActiveEventCard', () => {
  it('renders a Starts label for today rows', async () => {
    await renderRow(
      makeEvent({ startDate: iso(2026, 9, 7, 15), endDate: iso(2026, 9, 7, 18) }),
      'today',
    );
    expect(screen.getByText(/^Starts /)).toBeTruthy();
  });

  it('renders the relative weekday form for later rows', async () => {
    await renderRow(
      makeEvent({ startDate: iso(2026, 9, 8, 19), endDate: iso(2026, 9, 8, 23) }),
      'later',
    );
    expect(screen.getByText(/^Tomorrow, /)).toBeTruthy();
  });

  it('renders the venue and title', async () => {
    await renderRow();
    expect(screen.getByText('The Guild')).toBeTruthy();
    expect(screen.getByText('Harbourfront Live')).toBeTruthy();
  });

  it('shows the price alongside the time', async () => {
    await renderRow();
    expect(screen.getByText('From $25.00')).toBeTruthy();
  });

  it('omits the price block when there is no price', async () => {
    await renderRow(makeEvent({ lowestPrice: null }));
    expect(screen.queryByText(/^From /)).toBeNull();
  });

  it('replaces the time row with Happening now while in progress', async () => {
    await renderRow(
      makeEvent({ startDate: iso(2026, 9, 7, 11), endDate: iso(2026, 9, 7, 14) }),
    );
    expect(screen.getByText('Happening now')).toBeTruthy();
    expect(screen.queryByText(/^Starts /)).toBeNull();
  });

  it('toggles liked state from the heart', async () => {
    const user = userEvent.setup();
    await renderRow();

    await user.press(screen.getByLabelText('Like event'));
    expect(screen.getByTestId('liked-ids')).toHaveTextContent('evt-1');
  });
});
