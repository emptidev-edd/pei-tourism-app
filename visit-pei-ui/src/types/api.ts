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
  | 'ACCOMMODATION'
  | 'FAMILY_FUN'
  | 'TRANSPORT'
  | 'OTHER';

export type Place = {
  id: string;
  name: string;
  nameFr: string | null;
  category: PlaceCategory;
  description: string | null;
  descriptionFr: string | null;
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

export type EventStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'SOLD_OUT'
  | 'CANCELLED'
  | 'COMPLETED';

export type TicketTierType =
  | 'GENERAL'
  | 'VIP'
  | 'EARLY_BIRD'
  | 'STUDENT'
  | 'GROUP'
  | 'BACKSTAGE'
  | 'TABLE'
  | 'CUSTOM';

export type TickitUpCategory = {
  id: string;
  name: string;
  slug: string;
  isActive?: boolean;
};

export type TickitUpCity = {
  id: string;
  name: string;
  province?: { id: string; name: string; code?: string } | null;
};

export type TickitUpOrganiser = {
  id: string;
  organisationName?: string | null;
  organisationLogoUrl?: string | null;
  bio?: string | null;
  socialInstagram?: string | null;
  socialFacebook?: string | null;
  socialTwitter?: string | null;
  contactEmail?: string | null;
};

export type TicketTier = {
  id: string;
  eventId: string;
  name: string;
  type: TicketTierType;
  description?: string | null;
  price: number;
  quantity: number | null;
  sold: number;
  available: number | null;
  maxPerOrder: number;
  minPerOrder?: number;
  saleStartDate?: string | null;
  saleEndDate?: string | null;
  onSaleNow?: boolean;
  isActive: boolean;
  sortOrder: number;
};

export type TickitUpEvent = {
  id: string;
  slug: string;
  title: string;
  description: string;
  shortSummary?: string | null;
  status: EventStatus;
  isFeatured: boolean;
  venueName?: string | null;
  venueAddress?: string | null;
  cityId?: string | null;
  city?: TickitUpCity | null;
  latitude?: number | null;
  longitude?: number | null;
  startDate: string;
  endDate: string;
  doorsOpenTime?: string | null;
  bannerImageUrl?: string | null;
  galleryUrls?: string[];
  organiserId: string;
  organiser?: TickitUpOrganiser | null;
  category?: TickitUpCategory | null;
  ticketTiers?: TicketTier[];
  lowestPrice?: number | null;
  isSoldOut?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EventsListResponse = {
  data: TickitUpEvent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type EventCategory = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  _count?: { events: number };
};

export type CreateOrderRequest = {
  eventId: string;
  items: Array<{ tierId: string; quantity: number }>;
  promoCode?: string;
  donationAmount?: number;
};

export type CreateOrderResponse = {
  orderId: string;
  orderRef: string;
  totalAmount: number;
  expiresAt: string;
  clientSecret: string;
};

export type ValidatePromoResponse = {
  valid?: boolean;
  code?: string;
  discountType?: string;
  discountValue?: number;
  message?: string;
};

export type DayPlanPlace = {
  id: string;
  name: string;
  nameFr: string | null;
  category: PlaceCategory;
  description: string | null;
  descriptionFr: string | null;
  address: string | null;
  community: string | null;
  tags: string[];
  rating: number | null;
  popularity: number | null;
  isFeatured: boolean;
  lat: number | null;
  lng: number | null;
  meters: number | null;
};

export type DayPlanSlot = {
  time: string;
  type: string;
  categories: PlaceCategory[];
  place: DayPlanPlace | null;
};

export type DayPlanResponse = {
  ok: boolean;
  generatedAt: string;
  center: { lat: number; lng: number };
  radius: number;
  plan: DayPlanSlot[];
};

export type TripInterest = 'nature' | 'food' | 'history' | 'culture' | 'outdoor';

export type VisitorCentre = {
  id: string;
  name: string;
  address: string | null;
  community: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  hours: string | null;
  season: string | null;
  imageUrl: string | null;
  lat: number | null;
  lng: number | null;
  source: string;
  sourceRef: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VisitorCentresListResponse = {
  ok: boolean;
  total: number;
  items: VisitorCentre[];
};

export type VisitorCentreDetailResponse = {
  ok: boolean;
  item: VisitorCentre;
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
  routeId: string;
  routeShortName: string | null;
  routeLongName: string | null;
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
  availableDirections: TransitRouteDirection[];
  count: number;
  items: TransitRouteStop[];
};

export type TransitRouteDirection = {
  directionId: number;
  headsign: string | null;
  tripId: string;
  // Only returned by /transit/routes/:routeId/stops, not the routes list.
  firstStopName?: string | null;
  lastStopName?: string | null;
};

export type TransitRoute = {
  routeId: string;
  feedId: string;
  shortName: string | null;
  longName: string | null;
  serviceDays: string[];
  directions: TransitRouteDirection[];
};

export type TransitRoutesResponse = {
  ok: boolean;
  feedId: string;
  count: number;
  items: TransitRoute[];
};

export type TransitStopScheduleResponse = {
  ok: boolean;
  stop: TransitStop | null;
  date: string;
  count: number;
  items: TransitArrival[];
};

export type WeatherCurrent = {
  tempC: number;
  feelsLikeC: number;
  windKmh: number;
  weatherCode: number;
  isDay: boolean;
};

export type WeatherDay = {
  date: string;
  weatherCode: number;
  minC: number;
  maxC: number;
  precipChanceMax: number | null;
};

export type WeatherResponse = {
  ok: boolean;
  fetchedAt: string;
  location: { lat: number; lng: number };
  current: WeatherCurrent;
  daily: WeatherDay[];
};
