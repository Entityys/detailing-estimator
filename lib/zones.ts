// No-fee service area, per the shop owner. Any lead city that doesn't match
// one of these (case-insensitively, ignoring whitespace/punctuation) gets the
// travel fee applied — but the amount and "does this even make sense" call
// always goes through the human review queue, so we don't need to be 100%
// certain here, just clearly show our reasoning.

export const NO_FEE_CITIES = [
  "Poulsbo",
  "Bainbridge Island",
  "Indianola",
  "Kingston",
  "Bremerton",
  "Suquamish",
];

export const TRAVEL_FEE_CENTS = 5000; // $50

// Washington state Kitsap-area zip prefixes, used only as a sanity check to
// flag leads that are wildly outside the service area (e.g. a city in another
// state) rather than just "a nearby town we forgot to list."
const LOCAL_STATE_HINTS = ["wa", "washington"];

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z ]/g, "");
}

export interface ZoneResult {
  inNoFeeZone: boolean;
  feeCents: number;
  farOutOfArea: boolean; // best-effort flag, always surfaced for human review, never auto-blocks
  reason: string;
}

export function evaluateZone(city: string | null | undefined, state?: string | null): ZoneResult {
  if (!city) {
    return {
      inNoFeeZone: false,
      feeCents: TRAVEL_FEE_CENTS,
      farOutOfArea: false,
      reason: "No city provided on lead — defaulting to travel fee, needs review",
    };
  }

  const normalizedCity = normalize(city);
  const match = NO_FEE_CITIES.find((c) => normalize(c) === normalizedCity);

  if (match) {
    return {
      inNoFeeZone: true,
      feeCents: 0,
      farOutOfArea: false,
      reason: `"${city}" matches no-fee city "${match}"`,
    };
  }

  const stateNormalized = state ? normalize(state) : null;
  const farOutOfArea = !!stateNormalized && !LOCAL_STATE_HINTS.includes(stateNormalized);

  return {
    inNoFeeZone: false,
    feeCents: TRAVEL_FEE_CENTS,
    farOutOfArea,
    reason: farOutOfArea
      ? `"${city}"${state ? `, ${state}` : ""} is outside the no-fee zone and outside WA — verify before sending, a flat $50 fee may not be appropriate`
      : `"${city}" is outside the no-fee zone — $50 travel fee applied`,
  };
}
