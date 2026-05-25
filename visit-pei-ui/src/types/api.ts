export type PlaceCategory =
  | 'VISITOR_CENTRE'
  | 'ATTRACTION'
  | 'BEACH'
  | 'PARK'
  | 'TRAIL'
  | 'LIGHTHOUSE'
  | 'MUSEUM'
  | 'HISTORIC'
  | 'FOOD_DRINK'
  | 'TRANSPORT'
  | 'OTHER';

export type Place = {
  id: string;
  name: string;
  category: PlaceCategory;
  description: string | null;
  imageUrl: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  region: string | null;
  community: string | null;
  tags: string[];
  rating: number | null;
  popularity: number | null;
  isFeatured: boolean;
  lat: number | null;
  lng: number | null;
  source: string;
  sourceUrl: string | null;
  updatedAt: string;
  createdAt: string;
};

export type FeaturedPlacesResponse = {
  ok: boolean;
  count: number;
  items: Place[];
};

export type TourismEvent = {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  venueName: string | null;
  address: string | null;
  community: string | null;
  website: string | null;
  imageUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  categories: string[];
  tags: string[];
  lat: number | null;
  lng: number | null;
  source: string;
  sourceRef: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EventsListResponse = {
  ok: boolean;
  total: number;
  page: number;
  limit: number;
  items: TourismEvent[];
};

export type EventDetailResponse = {
  ok: boolean;
  event: TourismEvent;
};
