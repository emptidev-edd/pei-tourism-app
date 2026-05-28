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

export type TransitStop = {
  id: string;
  feedId: string;
  stopId: string;
  code: string | null;
  name: string | null;
  desc?: string | null;
  lat: number | null;
  lon: number | null;
  meters?: number;
};

export type TransitArrival = {
  feedId: string;
  stopId: string;
  tripId: string;
  routeId: string;
  routeShortName: string | null;
  routeLongName: string | null;
  headsign: string | null;
  departureTime: string | null;
  arrivalTime: string | null;
  departureAtIso: string;
  stopSequence: number;
};

export type TransitServedRoute = {
  routeId: string;
  routeShortName: string | null;
  routeLongName: string | null;
  headsign: string | null;
  tripId: string | null;
};

export type NearbyTransitStopsResponse = {
  ok: boolean;
  near: {
    lat: number;
    lng: number;
  };
  radius: number;
  count: number;
  items: TransitStop[];
};

export type TransitStopArrivalsResponse = {
  ok: boolean;
  stop: TransitStop | null;
  at: string;
  count: number;
  items: TransitArrival[];
  servedRoutes: TransitServedRoute[];
};

export type TransitRouteStop = {
  stopId: string;
  stopSequence: number;
  arrivalTime: string | null;
  departureTime: string | null;
  stop: {
    id: string;
    name: string | null;
    code: string | null;
    lat: number | null;
    lon: number | null;
  } | null;
};

export type TransitRouteStopsResponse = {
  ok: boolean;
  route: {
    routeId: string;
    shortName: string | null;
    longName: string | null;
    desc: string | null;
  } | null;
  trip: {
    tripId: string;
    headsign: string | null;
    directionId: number | null;
  };
  count: number;
  items: TransitRouteStop[];
};
