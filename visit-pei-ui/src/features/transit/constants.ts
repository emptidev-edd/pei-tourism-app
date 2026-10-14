export const DEFAULT_REGION = {
  latitude: 46.2382,
  longitude: -63.1311,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

export const DEFAULT_RADIUS = 1500;

export const COACH_FEED = 'transitland:f-coachatlantic~pe~ca';

/**
 * T3 Transit's operating timezone. The API resolves every departure instant
 * against the agency's own declared zone, so the client MUST format in that
 * same zone — not the handset's. A visitor whose phone is still on
 * Europe/London would otherwise see every departure shifted by hours.
 */
export const AGENCY_TZ = 'America/Halifax';

export const COLLAPSED_SHEET = 320;
export const EXPANDED_SHEET = 560;
export const SHEET_MIDPOINT = (COLLAPSED_SHEET + EXPANDED_SHEET) / 2;

/**
 * Clamps a sheet *height* into the collapsed/expanded range. Kept for parity
 * with the pre-gesture-handler implementation (and tested as such) — the
 * Reanimated sheet itself clamps `translateY` directly since that's the
 * value it actually animates.
 */
export const clampSheetHeight = (value: number) =>
  Math.min(EXPANDED_SHEET, Math.max(COLLAPSED_SHEET, value));
