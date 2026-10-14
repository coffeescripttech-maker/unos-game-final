/**
 * Typhoon anatomy — the labeled parts of a mature tropical cyclone.
 * Shared between the React AnatomyOverlay and (optionally) quiz content.
 * Aligned with the Philippine Science 8 / PAGASA description of a bagyo.
 */

export interface AnatomyPart {
  id: string;
  /** Filipino-friendly short name shown on the diagram chip. */
  name: string;
  /** One-line tagline. */
  subtitle: string;
  /** Full explanation shown in the detail card. */
  fact: string;
  /** Accent color (hex) used for the diagram hotspot + chip. */
  color: string;
}

export const TYPHOON_ANATOMY_PARTS: AnatomyPart[] = [
  {
    id: 'eye',
    name: 'Eye (Mata)',
    subtitle: 'The calm center',
    fact: 'The eye is the clear, calm center of the typhoon. Air sinks and spreads outward here, so the sky is often clear and winds are light — but the lowest air pressure in the whole storm is found here. It can be 10–50 km wide.',
    color: '#6ec1e4',
  },
  {
    id: 'eyewall',
    name: 'Eyewall (Pader ng Mata)',
    subtitle: 'Strongest winds & rain',
    fact: 'The eyewall is the ring of towering cumulonimbus clouds wrapped around the eye. It holds the strongest winds and the heaviest rainfall — the most dangerous part of the typhoon. A "complete" eyewall almost always signals an intense storm.',
    color: '#e63946',
  },
  {
    id: 'rainbands',
    name: 'Spiral Rainbands',
    subtitle: 'Curved bands of rain',
    fact: 'Spiral rainbands are long, curved bands of rain and thunderstorms that wind inward toward the eyewall. They rotate counter-clockwise and can bring heavy rain, squalls, and gusty winds long before the eyewall arrives.',
    color: '#457b9d',
  },
  {
    id: 'outer',
    name: 'Outer / Feeder Bands',
    subtitle: 'The outer edge',
    fact: 'The outer (feeder) bands form the ragged edge of the storm. They are the first to reach a coastline, bringing the earliest rain and wind. Warm, moist air is "fed" through these bands into the core to keep the typhoon alive.',
    color: '#2a9d8f',
  },
  {
    id: 'rotation',
    name: 'Counter-clockwise Spin',
    subtitle: 'Driven by the Coriolis effect',
    fact: "In the Northern Hemisphere the Coriolis effect deflects moving air to the right, so a typhoon's winds spiral counter-clockwise around the eye. In the Southern Hemisphere they rotate clockwise instead.",
    color: '#9b5de5',
  },
];

export const DEFAULT_ANATOMY_PART = 'eye';

/** Quick label lookup used by quizzes and overlays. */
export function anatomyPartById(id: string): AnatomyPart | undefined {
  return TYPHOON_ANATOMY_PARTS.find(p => p.id === id);
}
