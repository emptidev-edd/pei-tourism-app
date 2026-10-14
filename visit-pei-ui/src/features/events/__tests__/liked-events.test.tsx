import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, screen, userEvent } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { LikedEventsProvider, useLikedEvents } from '../liked-events';

const STORAGE_KEY = 'visit-pei:liked-events';

function Probe() {
  const liked = useLikedEvents();
  return (
    <>
      <Text testID='hydrated'>{String(liked.hydrated)}</Text>
      <Text testID='ids'>{[...liked.ids].sort().join(',')}</Text>
      <Pressable testID='toggle-a' onPress={() => liked.toggle('a')}>
        <Text>toggle a</Text>
      </Pressable>
    </>
  );
}

const renderProbe = () =>
  render(
    <LikedEventsProvider>
      <Probe />
    </LikedEventsProvider>,
  );

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('LikedEventsProvider', () => {
  it('hydrates stored ids and flips hydrated false to true', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(['a', 'b']));

    renderProbe();
    expect(screen.getByTestId('hydrated')).toHaveTextContent('false');

    await act(async () => {});

    expect(screen.getByTestId('hydrated')).toHaveTextContent('true');
    expect(screen.getByTestId('ids')).toHaveTextContent('a,b');
  });

  it('starts empty when nothing is stored', async () => {
    renderProbe();
    await act(async () => {});

    expect(screen.getByTestId('hydrated')).toHaveTextContent('true');
    expect(screen.getByTestId('ids')).toHaveTextContent('');
  });

  it('toggles an id on and then off', async () => {
    const user = userEvent.setup();
    renderProbe();
    await act(async () => {});

    await user.press(screen.getByTestId('toggle-a'));
    expect(screen.getByTestId('ids')).toHaveTextContent('a');

    await user.press(screen.getByTestId('toggle-a'));
    expect(screen.getByTestId('ids')).toHaveTextContent('');
  });

  it('persists a JSON string array under the shared visit-pei key', async () => {
    const user = userEvent.setup();
    renderProbe();
    await act(async () => {});

    await user.press(screen.getByTestId('toggle-a'));

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify(['a']),
    );
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? '[]')).toEqual(['a']);
  });

  it('degrades to an empty set when the stored value is corrupt', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '{not json');

    renderProbe();
    await act(async () => {});

    expect(screen.getByTestId('hydrated')).toHaveTextContent('true');
    expect(screen.getByTestId('ids')).toHaveTextContent('');
  });

  it('ignores a stored value that is not an array', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ a: true }));

    renderProbe();
    await act(async () => {});

    expect(screen.getByTestId('ids')).toHaveTextContent('');
  });
});
