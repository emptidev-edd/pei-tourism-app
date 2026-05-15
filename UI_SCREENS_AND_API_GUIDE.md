# Visit PEI UI Screens and API Guide

## What is in this project today

This repo has two main apps:

- `visit-pei-ui`: Expo + React Native + Expo Router + NativeWind
- `visit-pei-api`: Express + Prisma + Postgres/PostGIS

Right now the mobile app is still very early. It only has one starter screen:

- [`visit-pei-ui/app/index.tsx`](/Users/edwin/My-Projects/pei-tourism-app/visit-pei-ui/app/index.tsx#L1)
- [`visit-pei-ui/app/_layout.tsx`](/Users/edwin/My-Projects/pei-tourism-app/visit-pei-ui/app/_layout.tsx#L1)

The backend is more developed and already exposes content and transit endpoints under `/api`:

- [`visit-pei-api/src/app.ts`](/Users/edwin/My-Projects/pei-tourism-app/visit-pei-api/src/app.ts#L1)
- [`visit-pei-api/src/routes/index.ts`](/Users/edwin/My-Projects/pei-tourism-app/visit-pei-api/src/routes/index.ts#L1)

## Important note about `.agents` skills

I did not find a project-local `.agents` folder in this repo.

What I did find is:

- [`visit-pei-ui/skills-lock.json`](/Users/edwin/My-Projects/pei-tourism-app/visit-pei-ui/skills-lock.json#L1)

That file references these Expo skills:

- `building-native-ui`
- `expo-api-routes`
- `expo-cicd-workflows`

So the repo points to those skills, but the actual project-local skill files are not present here. Because of that, the guidance below is based on:

- the real code currently in this repo
- the Expo app structure already installed here
- the API routes already implemented in the backend

## Best screen structure for this app

For this project, the cleanest approach is to organize the app around a tab-based tourism flow and use stack screens for detail pages.

Recommended main screens:

1. Welcome
2. Home
3. Discover Places
4. Events
5. Transit
6. Trip Planner
7. Visitor Centres

Recommended detail screens:

1. Place Details
2. Event Details
3. Stop Details / Next Arrivals
4. Route Details / Route Stops
5. Visitor Centre Details

## Recommended Expo Router folder structure

```text
visit-pei-ui/app
  _layout.tsx
  index.tsx
  (tabs)/
    _layout.tsx
    home.tsx
    discover.tsx
    events.tsx
    transit.tsx
    trip-planner.tsx
  places/
    [id].tsx
  events/
    [id].tsx
  transit/
    stop/
      [stopId].tsx
    route/
      [routeId].tsx
  visitor-centres/
    index.tsx
    [id].tsx
```

## Best way to handle each screen

### 1. Welcome screen

Use this as a branded landing page, not just a plain text screen.

Best content:

- Hero image or PEI background
- App title: `Visit PEI`
- Short subtitle
- Primary actions:
  - `Explore Places`
  - `Find Events`
  - `Check Bus Routes`
- Quick cards for featured items

Why:

- it gives the app a tourism feel immediately
- it lets users jump into the most useful flows fast

### 2. Home screen

Treat this as the everyday dashboard after the user lands in the app.

The Home screen should not repeat the full-screen hero from the Welcome screen.
Instead, it should feel more practical, scrollable, and useful for repeat visits.

Best content:

- compact greeting header like `Good morning` or `Ready to explore PEI?`
- a smaller seasonal banner or featured image
- quick action row:
  - `Discover Places`
  - `Events`
  - `Transit`
  - `Trip Planner`
- featured places carousel
- happening soon events section
- nearby places or nearby stops section
- one helpful planning card such as `Build My Day`
- optional visitor info card for centres, weather, or local tips later

How it should look:

- use a scrollable layout instead of a single hero panel
- keep the top area branded, but shorter and lighter than Welcome
- make the first screenful action-focused, with clear jump points into the app
- use sectioned cards so users can scan quickly
- mix horizontal carousels with short vertical lists
- keep spacing soft and clean so it feels like a polished tourism guide

Recommended section order:

1. greeting and featured banner
2. quick actions
3. featured places
4. events happening soon
5. nearby section
6. trip planner or visitor info card

Why:

- Welcome is for first impression and brand
- Home is for return visits and everyday usefulness
- separating them keeps the app from feeling repetitive
- it gives you one clear onboarding screen and one clear dashboard screen

Use these backend routes:

- `GET /api/places/featured`
- `GET /api/events`
- `GET /api/places/near?near=lat,lng&radius=5000&limit=20`
- `GET /api/transit/stops?near=46.24,-63.13&radius=800&limit=10`

## 3. Discover places screen

This should be a scrollable list of featured and nearby places.

Best UI blocks:

- search bar
- category chips: `Beach`, `Trail`, `Park`, `Museum`, `Food`
- featured horizontal carousel
- nearby places vertical list
- place card with image, title, category, community, distance

Use these backend routes:

- `GET /api/places/featured`
- `GET /api/places/near?near=lat,lng&radius=5000&limit=20`
- `GET /api/places/:id`

Code references:

- [`visit-pei-api/src/controller/places.controller.ts`](/Users/edwin/My-Projects/pei-tourism-app/visit-pei-api/src/controller/places.controller.ts#L48)
- [`visit-pei-api/src/controller/places.controller.ts`](/Users/edwin/My-Projects/pei-tourism-app/visit-pei-api/src/controller/places.controller.ts#L70)
- [`visit-pei-api/src/controller/places.controller.ts`](/Users/edwin/My-Projects/pei-tourism-app/visit-pei-api/src/controller/places.controller.ts#L128)

## 4. Events screen

This should feel like a calendar + list experience.

Best UI blocks:

- date filter row
- search input
- optional community filter
- event cards grouped by day

Each event card should show:

- title
- start time
- venue or community
- image if available

Use these backend routes:

- `GET /api/events`
- `GET /api/events/:id`

Good query examples:

- `/api/events?from=2026-06-01&to=2026-06-30`
- `/api/events?q=music&community=Charlottetown`

Code reference:

- [`visit-pei-api/src/controller/events.controller.ts`](/Users/edwin/My-Projects/pei-tourism-app/visit-pei-api/src/controller/events.controller.ts#L5)

## 5. Transit screen

This should be centered around nearby stops first, because your current API is stop-first.

Best top-level layout:

- location header
- search or current-location button
- nearby stops list
- each stop opens a stop detail screen

Each stop card should show:

- stop name
- stop code if present
- distance in meters
- top 1 to 3 upcoming arrivals if preloaded later

Use this route first:

- `GET /api/transit/stops?near=46.24,-63.13&radius=800&limit=50`

Code reference:

- [`visit-pei-api/src/controller/transit.controller.ts`](/Users/edwin/My-Projects/pei-tourism-app/visit-pei-api/src/controller/transit.controller.ts#L58)

## 6. Stop details / next arrivals screen

This is one of the strongest native screens you can build now because the backend already supports it well.

Best layout:

- stop title
- stop code
- refresh button
- list of upcoming arrivals

Each arrival row should show:

- route short name
- route long name
- headsign
- departure time
- relative time like `in 12 min`

Use this route:

- `GET /api/transit/stops/:stopId/next?feedId=transitland:f-coachatlantic~pe~ca&limit=10`

Code reference:

- [`visit-pei-api/src/controller/transit.controller.ts`](/Users/edwin/My-Projects/pei-tourism-app/visit-pei-api/src/controller/transit.controller.ts#L115)

## 7. Bus route UI

The best UX for bus routes in this project is:

1. show nearby stops first
2. show upcoming arrivals at the stop
3. let the user tap a route from an arrival row
4. open a route details screen showing the ordered stops for that route

That matches the backend you already have.

### Recommended route details layout

Header:

- route badge using `shortName`
- route long name
- headsign

Body:

- vertical stop timeline
- stop sequence number
- stop name
- scheduled arrival and departure times

Useful UI pattern:

- a left rail with numbered circles for each stop
- a highlighted current stop when the user came from a stop details screen

Use this route:

- `GET /api/transit/routes/:routeId/stops?feedId=transitland:f-coachatlantic~pe~ca`

Code reference:

- [`visit-pei-api/src/controller/transit.controller.ts`](/Users/edwin/My-Projects/pei-tourism-app/visit-pei-api/src/controller/transit.controller.ts#L277)

### One important API gap for bus routes

You do not currently have an endpoint that lists all available routes.

You only have:

- nearby stops
- next arrivals for a stop
- stops for one route

So for a full `Bus Routes` tab, the backend would ideally also add:

```text
GET /api/transit/routes
```

Suggested response:

```json
{
  "ok": true,
  "count": 3,
  "items": [
    {
      "routeId": "1",
      "shortName": "1",
      "longName": "Charlottetown",
      "desc": "Main line"
    }
  ]
}
```

Without that route list endpoint, the easiest route UX is to enter from stops and arrivals instead of a master route directory.

## 8. Trip planner screen

This can be a smart itinerary screen.

Best UI blocks:

- current location
- radius selector
- interests chips: `nature`, `food`, `history`, `culture`, `outdoor`
- `Build My Day` button
- itinerary timeline

Each plan block should show:

- time
- activity type
- chosen place
- short description
- distance

Use this route:

- `GET /api/trip/day-plan?lat=46.24&lng=-63.13&radius=50000&interests=nature,food`

Code reference:

- [`visit-pei-api/src/controller/trip.controller.ts`](/Users/edwin/My-Projects/pei-tourism-app/visit-pei-api/src/controller/trip.controller.ts#L6)

## 9. Visitor centres screen

This should be a simple service screen for tourists.

Best UI:

- alphabetical or community-grouped list
- visitor centre card with name, community, phone, season
- details screen with map button, call button, website button

Use these routes:

- `GET /api/visitor-centres`
- `GET /api/visitor-centres/:id`

Code reference:

- [`visit-pei-api/src/controller/visitorCentres.controller.ts`](/Users/edwin/My-Projects/pei-tourism-app/visit-pei-api/src/controller/visitorCentres.controller.ts#L13)

## Native UI guidance for both Android and iOS

Because this app is Expo + React Native, the same screen code should serve both Android and iOS well if you keep the UI native-first.

Best practice here:

- use `Stack` for detail screens
- use tabs for top-level navigation
- use `FlatList` or `SectionList` for screen content
- use `Pressable` for cards and actions
- use `ActivityIndicator` for loading states
- use `RefreshControl` for pull-to-refresh
- use `SafeAreaView` or safe-area-aware layout for top spacing

For Android and iOS differences:

- iOS: keep spacing generous and use softer cards
- Android: make touch targets clear and elevation/shadows simple
- both: avoid deeply nested scroll views

For this app specifically, the best pattern is:

- one reusable `Screen` wrapper
- one reusable `Card`
- one reusable `SectionHeader`
- one reusable `EmptyState`
- one reusable `LoadingState`

## Best API call structure in the Expo app

The cleanest setup is to keep fetch logic out of the screen files.

Recommended structure:

```text
visit-pei-ui/src
  api/
    client.ts
    places.ts
    events.ts
    transit.ts
    trip.ts
    visitorCentres.ts
  types/
    api.ts
  components/
  features/
```

### `client.ts`

This file should hold the API base URL and shared fetch wrapper.

Example:

```ts
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
```

### Example API modules

```ts
// src/api/places.ts
import { apiFetch } from "./client";

export function getFeaturedPlaces() {
  return apiFetch("/places/featured");
}

export function getNearbyPlaces(near: string) {
  return apiFetch(`/places/near?near=${encodeURIComponent(near)}&radius=5000&limit=20`);
}

export function getPlaceById(id: string) {
  return apiFetch(`/places/${id}`);
}
```

```ts
// src/api/transit.ts
import { apiFetch } from "./client";

export function getNearbyStops(near: string) {
  return apiFetch(`/transit/stops?near=${encodeURIComponent(near)}&radius=800&limit=50`);
}

export function getNextArrivals(stopId: string) {
  return apiFetch(`/transit/stops/${encodeURIComponent(stopId)}/next?feedId=transitland:f-coachatlantic~pe~ca&limit=10`);
}

export function getRouteStops(routeId: string) {
  return apiFetch(`/transit/routes/${encodeURIComponent(routeId)}/stops?feedId=transitland:f-coachatlantic~pe~ca`);
}
```

## Recommended data flow per screen

### Welcome screen

- no heavy data is required
- optionally load featured places or current events for preview cards

### Home screen

- load featured places
- load current or upcoming events
- ask for location permission when useful
- if granted, load nearby places or nearby stops

### Discover screen

- load featured places on mount
- ask for location permission
- if granted, load nearby places

### Events screen

- load events with `from` and `to`
- support paging later

### Transit screen

- ask for location permission
- load nearby stops
- tap a stop to open next arrivals

### Route details screen

- open from an arrival item
- load route stops using `routeId`

### Trip planner screen

- ask for location
- let user choose interests
- request day plan

## Best order to build the UI

This is the fastest low-risk order:

1. create shared app layout and tabs
2. build Welcome screen
3. build Home screen dashboard
4. build Discover Places list + details
5. build Events list + details
6. build Transit nearby stops
7. build Stop details with next arrivals
8. build Route details with route stop timeline
9. build Trip Planner
10. build Visitor Centres

Why this order works:

- it uses the API that already exists
- it gives you visible progress early
- it delays harder transit route work until the stop flow is working

## Most useful backend routes already available

Current content routes:

- `GET /api/places/featured`
- `GET /api/places/near`
- `GET /api/places/:id`
- `GET /api/events`
- `GET /api/events/:id`
- `GET /api/trip/day-plan`
- `GET /api/visitor-centres`
- `GET /api/visitor-centres/:id`

Current transit routes:

- `GET /api/transit/stops`
- `GET /api/transit/stops/:stopId/next`
- `GET /api/transit/routes/:routeId/stops`

Mounted from:

- [`visit-pei-api/src/routes/index.ts`](/Users/edwin/My-Projects/pei-tourism-app/visit-pei-api/src/routes/index.ts#L11)
- [`visit-pei-api/src/routes/transit.routes.ts`](/Users/edwin/My-Projects/pei-tourism-app/visit-pei-api/src/routes/transit.routes.ts#L1)

## Data models that matter most for UI

Places:

- [`visit-pei-api/prisma/schema.prisma`](/Users/edwin/My-Projects/pei-tourism-app/visit-pei-api/prisma/schema.prisma#L65)

Events:

- [`visit-pei-api/prisma/schema.prisma`](/Users/edwin/My-Projects/pei-tourism-app/visit-pei-api/prisma/schema.prisma#L94)

Visitor centres:

- [`visit-pei-api/prisma/schema.prisma`](/Users/edwin/My-Projects/pei-tourism-app/visit-pei-api/prisma/schema.prisma#L143)

GTFS transit models:

- [`visit-pei-api/prisma/schema.prisma`](/Users/edwin/My-Projects/pei-tourism-app/visit-pei-api/prisma/schema.prisma#L248)
- [`visit-pei-api/prisma/schema.prisma`](/Users/edwin/My-Projects/pei-tourism-app/visit-pei-api/prisma/schema.prisma#L264)
- [`visit-pei-api/prisma/schema.prisma`](/Users/edwin/My-Projects/pei-tourism-app/visit-pei-api/prisma/schema.prisma#L287)
- [`visit-pei-api/prisma/schema.prisma`](/Users/edwin/My-Projects/pei-tourism-app/visit-pei-api/prisma/schema.prisma#L304)

## Final recommendation

For this repo, the best product shape is:

- a branded Welcome screen for first impression
- a practical Home screen for daily use
- content-first browsing for places and events
- a stop-first transit experience
- route details opened from an arrival
- a clean API layer inside the Expo app

If you want, the next best step is for me to build the actual Expo screen folders and the API client files from this guide so the app starts matching this structure right away.
