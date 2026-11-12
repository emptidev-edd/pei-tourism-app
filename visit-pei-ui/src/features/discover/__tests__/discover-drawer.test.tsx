import { render, screen, userEvent } from '@testing-library/react-native';

import type { Place } from '../../../types/api';
import { DiscoverDrawer } from '../discover-drawer';

const makePlace = (partial: Partial<Place>): Place => ({
  id: 'p1',
  name: 'Test Place',
  nameFr: null,
  category: 'TRAIL',
  description: null,
  descriptionFr: null,
  imageUrl: null,
  address: null,
  phone: null,
  website: null,
  region: null,
  community: null,
  tags: [],
  rating: null,
  popularity: null,
  isFeatured: false,
  lat: null,
  lng: null,
  source: 'test',
  sourceUrl: null,
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...partial,
});

const places: Place[] = [
  makePlace({ id: 'p1', name: 'Greenwich Dunes', tags: ['walking'] }),
  makePlace({ id: 'p2', name: 'Confederation Trail', tags: ['biking'] }),
  makePlace({ id: 'p3', name: 'Mystery Trail', tags: [] }),
];

const beachPlaces: Place[] = [
  makePlace({ id: 'b1', name: 'Cavendish Beach', category: 'BEACH', tags: ['national'] }),
  makePlace({ id: 'b2', name: 'Brackley Beach', category: 'BEACH', tags: ['provincial'] }),
];

const baseProps = {
  category: 'TRAIL' as const,
  places,
  isLoading: false,
  isError: false,
  onRetry: jest.fn(),
  onClose: jest.fn(),
  onSelectPlace: jest.fn(),
};

describe('DiscoverDrawer', () => {
  it('renders a tab for every subcategory, catch-all last', () => {
    render(<DiscoverDrawer {...baseProps} />);
    expect(screen.getByLabelText('Walking Trails, 1 places')).toBeTruthy();
    expect(screen.getByLabelText('Biking Trails, 1 places')).toBeTruthy();
    expect(screen.getByLabelText('Non-Biking Trails, 1 places')).toBeTruthy();

    const allText = screen.getAllByText(/.+/).map((n) => n.props.children);
    const positions = ['Walking Trails', 'Biking Trails', 'Non-Biking Trails'].map(
      (label) => allText.indexOf(label),
    );
    expect(positions[2]).toBeGreaterThan(positions[0]);
    expect(positions[2]).toBeGreaterThan(positions[1]);
  });

  it('shows only the first subcategory\'s places by default', () => {
    render(<DiscoverDrawer {...baseProps} />);
    expect(screen.getByText('Greenwich Dunes')).toBeTruthy();
    expect(screen.queryByText('Confederation Trail')).toBeNull();
    expect(screen.queryByText('Mystery Trail')).toBeNull();
  });

  it('switches the visible list when a different tab is tapped', async () => {
    render(<DiscoverDrawer {...baseProps} />);
    await userEvent.press(screen.getByLabelText('Biking Trails, 1 places'));
    expect(screen.getByText('Confederation Trail')).toBeTruthy();
    expect(screen.queryByText('Greenwich Dunes')).toBeNull();
  });

  it('resets to the first tab when the drawer reopens for a different category', async () => {
    const { rerender } = render(<DiscoverDrawer {...baseProps} />);
    await userEvent.press(screen.getByLabelText('Biking Trails, 1 places'));
    expect(screen.getByText('Confederation Trail')).toBeTruthy();

    rerender(<DiscoverDrawer {...baseProps} category='BEACH' places={beachPlaces} />);
    expect(screen.getByText('Cavendish Beach')).toBeTruthy();
    expect(screen.queryByText('Brackley Beach')).toBeNull();
  });

  it('calls onSelectPlace when a place is pressed', async () => {
    render(<DiscoverDrawer {...baseProps} />);
    await userEvent.press(screen.getByLabelText('Open Greenwich Dunes'));
    expect(baseProps.onSelectPlace).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'p1' }),
    );
  });

  it('shows a loading state', () => {
    render(<DiscoverDrawer {...baseProps} isLoading places={[]} />);
    expect(screen.queryByText('Greenwich Dunes')).toBeNull();
  });

  it('shows an error state with a working retry', async () => {
    const onRetry = jest.fn();
    render(<DiscoverDrawer {...baseProps} isError places={[]} onRetry={onRetry} />);
    expect(screen.getByText('Could not load places')).toBeTruthy();
    await userEvent.press(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state when there are no places', () => {
    render(<DiscoverDrawer {...baseProps} places={[]} />);
    expect(screen.getByText('No places found')).toBeTruthy();
  });

  it('calls onClose when the close button is pressed', async () => {
    const onClose = jest.fn();
    render(<DiscoverDrawer {...baseProps} onClose={onClose} />);
    const closeButtons = screen.getAllByLabelText('Close');
    await userEvent.press(closeButtons[closeButtons.length - 1]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
