import { act, render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { useEventCategoriesQuery } from '../../../services/query/events/useEventCategoriesQuery';
import { useEventsQuery } from '../../../services/query/events/useEventsQuery';
import { EventsExploreScreen } from '../explore-screen';
import { iso, makeEvent } from './_fixtures';

jest.mock('../../../services/query/events/useEventsQuery');
jest.mock('../../../services/query/events/useEventCategoriesQuery');

const mockEvents = useEventsQuery as jest.MockedFunction<typeof useEventsQuery>;
const mockCategories = useEventCategoriesQuery as jest.MockedFunction<
  typeof useEventCategoriesQuery
>;

/** The 19 rows GET /api/categories returns, in the order it returns them. */
const CATEGORIES = [
  ['Music', 'music'],
  ['Concerts', 'concerts'],
  ['Festivals', 'festivals'],
  ['Food & Drinks', 'food-and-drinks'],
  ['Arts & Culture', 'arts-and-culture'],
  ['Comedy', 'comedy'],
  ['Theatre & Performing Arts', 'theatre-and-performing-arts'],
  ['Sports', 'sports'],
  ['Adventures & Outdoor', 'adventures-and-outdoor'],
  ['Nightlife', 'nightlife'],
  ['Family & Kids', 'family-and-kids'],
  ['Corporate & Networking', 'corporate-and-networking'],
  ['Education & Workshops', 'education-and-workshops'],
  ['Charity & Fundraising', 'charity-and-fundraising'],
  ['Exhibitions', 'exhibitions'],
  ['Other', 'other'],
  ['Community', 'community'],
  ['Faith & Church', 'faith-and-church'],
  ['Markets & Expos', 'markets-and-expos'],
].map(([name, slug], index) => ({
  id: `cat-${index}`,
  name,
  slug,
  sortOrder: index + 1,
  isActive: true,
}));

const listResponse = (data: unknown[]) => ({
  data,
  total: data.length,
  page: 1,
  limit: 60,
  totalPages: 1,
});

const query = (data: unknown[]) =>
  ({
    data: listResponse(data),
    isPending: false,
    isError: false,
    isRefetching: false,
    refetch: jest.fn(),
  }) as never;

/** Rendered text in tree order, for assertions about section ordering. */
const visibleText = () =>
  screen
    .getAllByText(/.+/)
    .map((node) => node.props.children)
    .filter((value): value is string => typeof value === 'string');

const renderScreen = async () => {
  const result = render(<EventsExploreScreen />);
  await act(async () => {});
  return result;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCategories.mockReturnValue({ data: CATEGORIES } as never);
});

describe('EventsExploreScreen', () => {
  describe('with a full feed', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 9, 7, 12, 0, 0));

      const todayEvent = makeEvent({
        id: 'today-1',
        slug: 'today-1',
        title: 'Sunset Sessions',
        startDate: iso(2026, 9, 7, 19),
        endDate: iso(2026, 9, 7, 23),
      });
      const laterEvent = makeEvent({
        id: 'later-1',
        slug: 'later-1',
        title: 'Winter Classic',
        startDate: iso(2026, 9, 20, 12),
        endDate: iso(2026, 9, 20, 16),
      });

      mockEvents.mockReturnValue(query([todayEvent, laterEvent]));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('renders the sections in the order Trending, Featured, Today, Other, Organizers', async () => {
      await renderScreen();

      // "Today" and "Other" also appear as a filter tile and a category, so
      // anchor on the last occurrence of each — the section heading.
      const labels = visibleText();
      const positions = ['Trending', 'Featured', 'Today', 'Other', 'Organizers'].map(
        (title) => labels.lastIndexOf(title),
      );

      positions.forEach((index) => expect(index).toBeGreaterThan(-1));
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    });

    it('lists every API category in the quick rail', async () => {
      await renderScreen();

      CATEGORIES.forEach(({ name }) => {
        expect(screen.getAllByText(name).length).toBeGreaterThan(0);
      });
    });

    it('places the categories after the Weekend tile', async () => {
      await renderScreen();

      const labels = visibleText();
      expect(labels.indexOf('Weekend')).toBeGreaterThan(-1);
      expect(labels.indexOf('Music')).toBeGreaterThan(labels.indexOf('Weekend'));
    });

    it('keeps events that already finished today out of the feed', async () => {
      // Regression: merging the raw response alongside pickActiveEvents output
      // re-admitted ended events, so a 09:00-11:00 event still rendered at
      // midday under a "Starts 9:00 am" label.
      const finished = makeEvent({
        id: 'finished-1',
        slug: 'finished-1',
        title: 'Morning Yoga',
        startDate: iso(2026, 9, 7, 9),
        endDate: iso(2026, 9, 7, 11),
      });
      const live = makeEvent({
        id: 'live-1',
        slug: 'live-1',
        title: 'Lunchtime Session',
        startDate: iso(2026, 9, 7, 11, 30),
        endDate: iso(2026, 9, 7, 14),
      });
      mockEvents.mockReturnValue(query([finished, live]));

      await renderScreen();

      // Featured may still linger it for a day as an "Ended" card; what must
      // not happen is a schedule row inviting you to an event that is over.
      expect(screen.queryByText(/^Starts 9:00/)).toBeNull();
      expect(screen.getAllByText('Lunchtime Session').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Happening now').length).toBeGreaterThan(0);
    });

    it('hides the unfiltered rails while a time filter is active', async () => {
      await renderScreen();
      expect(screen.getAllByText('Trending').length).toBeGreaterThan(0);

      const user = userEvent.setup();
      await user.press(screen.getAllByText('Tomorrow')[0]);

      // Trending/Featured/Organizers ignore `when`, so they must step aside
      // rather than contradict the filter the user just applied.
      expect(screen.queryByText('Trending')).toBeNull();
      expect(screen.queryByText('Featured')).toBeNull();
      expect(screen.queryByText('Organizers')).toBeNull();
    });

    it('routes a trending tap to the event detail screen by slug', async () => {
      // The cards navigate through <Link>, which the test harness stubs out, so
      // this rail is the one place navigation intent is actually assertable.
      const user = userEvent.setup();
      await renderScreen();

      await user.press(screen.getByLabelText('Sunset Sessions'));

      expect(router.push).toHaveBeenCalledWith({
        pathname: '/events/[id]',
        params: { id: 'today-1' },
      });
    });

    it('shows the four time filters alongside Ask AI', async () => {
      await renderScreen();

      ['Ask AI', 'Happening', 'Today', 'Tomorrow', 'Weekend'].forEach((label) => {
        expect(screen.getAllByText(label).length).toBeGreaterThan(0);
      });
    });
  });

  describe('with an empty feed', () => {
    beforeEach(() => {
      mockEvents.mockReturnValue(query([]));
    });

    it('shows the empty state instead of section headings', async () => {
      await renderScreen();

      expect(screen.getByText('No events yet')).toBeTruthy();
      expect(screen.queryByText('Trending')).toBeNull();
      expect(screen.queryByText('Featured')).toBeNull();
    });

    it('still renders the category rail so filters stay reachable', async () => {
      await renderScreen();
      expect(screen.getByText('Music')).toBeTruthy();
    });
  });
});
