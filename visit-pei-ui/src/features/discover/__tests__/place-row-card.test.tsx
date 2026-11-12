import { render, screen, userEvent } from '@testing-library/react-native';

import type { Place } from '../../../types/api';
import { PlaceRowCard } from '../place-row-card';

const place: Place = {
  id: 'p1',
  name: 'Greenwich Dunes Trail',
  nameFr: null,
  category: 'TRAIL',
  description: null,
  descriptionFr: null,
  imageUrl: null,
  address: null,
  phone: null,
  website: null,
  region: 'Eastern PEI',
  community: 'Greenwich',
  tags: ['hiking'],
  rating: null,
  popularity: null,
  isFeatured: false,
  lat: null,
  lng: null,
  source: 'test',
  sourceUrl: null,
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('PlaceRowCard', () => {
  it('renders the place name and location', () => {
    render(<PlaceRowCard place={place} icon='hiking' onPress={jest.fn()} />);
    expect(screen.getByText('Greenwich Dunes Trail')).toBeTruthy();
    expect(screen.getByText('Greenwich')).toBeTruthy();
  });

  it('falls back to region when community is missing', () => {
    render(
      <PlaceRowCard
        place={{ ...place, community: null }}
        icon='hiking'
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByText('Eastern PEI')).toBeTruthy();
  });

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    render(<PlaceRowCard place={place} icon='hiking' onPress={onPress} />);
    await userEvent.press(screen.getByLabelText('Open Greenwich Dunes Trail'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
