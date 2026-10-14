/**
 * Typhoon tracking — a "plot the storm track" forecasting activity that mirrors
 * how PAGASA monitors a bagyo entering the Philippine Area of Responsibility
 * (PAR): observe successive positions, infer the general track, and translate
 * the intensity into a Tropical Cyclone Wind Signal (TCWS).
 */

export interface TrackPoint {
  id: number;
  x: number;
  y: number;
  label: string;
  sub: string;
}

/** The storm's observed (past) positions, east → west-northwest. */
export const PAST_TRACK: TrackPoint[] = [
  { id: 1, x: 352, y: 196, label: 'Day 1', sub: 'Tropical Depression · 55 km/h' },
  { id: 2, x: 318, y: 178, label: 'Day 2', sub: 'Tropical Storm · 75 km/h' },
  { id: 3, x: 284, y: 160, label: 'Day 3', sub: 'Severe Trop. Storm · 100 km/h' },
];

export interface TrackOption {
  id: string;
  x: number;
  y: number;
  correct: boolean;
}

/**
 * Candidate positions for the storm's NEXT location. In the Western North
 * Pacific, typhoons are steered west/northwest by the subtropical ridge, so the
 * WNW option is correct.
 */
export const NEXT_OPTIONS: TrackOption[] = [
  { id: 'nne', x: 300, y: 112, correct: false },
  { id: 'wnw', x: 248, y: 140, correct: true },
  { id: 's', x: 286, y: 212, correct: false },
];

/** Endpoint + spread of the forecast uncertainty cone drawn past the last point. */
export const FORECAST_CONE = {
  apex: { x: 248, y: 140 },
  end: { x: 186, y: 118 },
  spread: 34,
};

/** Where the storm is relative to land when the signal question is asked. */
export const LANDFALL_CONTEXT =
  'The eye is now about 150 km east of Northern Luzon (Batanes/Isabela area).';

export interface TrackingQuestion {
  q: string;
  options: string[];
  answer: number;
  fact: string;
}

export const TRACKING_QUESTION: TrackingQuestion = {
  q: 'A 150 km/h typhoon is heading toward Northern Luzon. Which PAGASA Tropical Cyclone Wind Signal should the province prepare for?',
  options: [
    'TCWS No. 1 (30–60 km/h winds expected)',
    'TCWS No. 2 (61–120 km/h winds expected)',
    'TCWS No. 3 (121–184 km/h winds expected)',
    'TCWS No. 5 (185+ km/h winds expected)',
  ],
  answer: 2,
  fact: 'The PAGASA TCWS scale is based on the wind speed expected in an area within 36 hours. A 150 km/h typhoon falls in the TCWS No. 3 band (121–184 km/h), so Northern Luzon should brace for winds that can uproot trees and damage structures. Always follow the latest PAGASA bulletin for the official signal.',
};

export const TRACKING_FACT =
  'Typhoons that enter the PAR usually form east of the Philippines and track west or northwest, steered by the subtropical ridge. Meteorologists extend a "forecast cone" from the latest position — it widens with time because the exact path grows less certain. Tracking the storm early is what gives communities time to prepare.';
