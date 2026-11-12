import { render, screen, userEvent } from '@testing-library/react-native';

import { CategoryLandingCard } from '../category-landing-card';

describe('CategoryLandingCard', () => {
  it('renders the title, count, and footnote for a category', () => {
    render(<CategoryLandingCard category='TRAIL' count={12} onPress={jest.fn()} />);
    expect(screen.getByText('Trails')).toBeTruthy();
    expect(screen.getByText('12 places to explore')).toBeTruthy();
    expect(screen.getByText('Tap to explore')).toBeTruthy();
  });

  it('shows a loading footnote when count is not yet known', () => {
    render(<CategoryLandingCard category='BEACH' onPress={jest.fn()} />);
    expect(screen.getByText('Loading places…')).toBeTruthy();
  });

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    render(<CategoryLandingCard category='PARK' count={5} onPress={onPress} />);
    await userEvent.press(screen.getByLabelText('Open Parks'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
