import { render, screen, userEvent } from '@testing-library/react-native';

import type { Place } from '../../../types/api';
import { groupPlacesBySubcategory } from '../../../utils/placeSubcategories';
import { SubcategoryTabBar } from '../subcategory-tab-bar';

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

const sections = groupPlacesBySubcategory([
  makePlace({ id: 'p1', tags: ['walking'] }),
  makePlace({ id: 'p2', tags: ['biking'] }),
]);

describe('SubcategoryTabBar', () => {
  it('renders one tab per section with a place count', () => {
    render(<SubcategoryTabBar sections={sections} activeId={null} onSelect={jest.fn()} />);
    expect(screen.getByLabelText('Walking Trails, 1 places')).toBeTruthy();
    expect(screen.getByLabelText('Biking Trails, 1 places')).toBeTruthy();
  });

  it('marks the active tab as selected', () => {
    render(
      <SubcategoryTabBar
        sections={sections}
        activeId={sections[0].subcategory.id}
        onSelect={jest.fn()}
      />,
    );
    const active = screen.getByLabelText('Walking Trails, 1 places');
    expect(active.props.accessibilityState).toMatchObject({ selected: true });
    const inactive = screen.getByLabelText('Biking Trails, 1 places');
    expect(inactive.props.accessibilityState).toMatchObject({ selected: false });
  });

  it('calls onSelect with the tapped subcategory id', async () => {
    const onSelect = jest.fn();
    render(<SubcategoryTabBar sections={sections} activeId={null} onSelect={onSelect} />);
    await userEvent.press(screen.getByLabelText('Biking Trails, 1 places'));
    expect(onSelect).toHaveBeenCalledWith(sections[1].subcategory.id);
  });
});
