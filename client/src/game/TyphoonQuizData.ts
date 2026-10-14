/**
 * Typhoon Formation science quiz questions — shared between Phaser (data source)
 * and React (quiz overlay).
 */

export interface TyphoonQuizQuestion {
  q: string;
  options: string[];
  answer: number; // index of the correct option
  fact: string; // explanation shown after answering
  topic: string; // gate key: 'heat' | 'vapor' | 'pressure' | 'spin' | 'land' | 'general'
}

export const TYPHOON_QUIZ_QUESTIONS: TyphoonQuizQuestion[] = [
  {
    q: 'Why does warm ocean water (≥26.5°C) fuel typhoon formation?',
    options: [
      'Heat and moisture evaporate, releasing latent heat that powers the storm',
      'Cold water creates stronger winds',
      'Warm water prevents clouds from forming',
      'Ocean temperature has no effect on typhoons'
    ],
    answer: 0,
    fact: 'Evaporation from warm oceans releases latent heat. As moist air rises and condenses in the storm, this heat warms the core and lowers pressure — the engine that drives the typhoon.',
    topic: 'heat',
  },
  {
    q: 'What does "Low Pressure" represent in typhoon formation?',
    options: [
      'Air that is cold and heavy, pushing down on the ocean',
      'A region where air rises, reducing weight and drawing in surrounding air',
      'High altitude air that blocks storm growth',
      'The pressure inside the eyewall eye'
    ],
    answer: 1,
    fact: 'Low surface pressure is the hallmark of a tropical cyclone. Rising air in the core reduces weight, and the surrounding higher-pressure air rushes inward — this pressure difference drives the spiraling winds.',
    topic: 'pressure',
  },
  {
    q: "What role does the Coriolis Effect play in typhoon spin?",
    options: [
      'It causes the storm to slow down and dissipate',
      "It deflects winds, creating the characteristic spiral shape",
      'It makes the ocean warmer near the equator',
      'It increases ocean evaporation rates'
    ],
    answer: 1,
    fact: "Earth's rotation deflects moving air to the right in the Northern Hemisphere. This Coriolis deflection bends the inward-flowing air into a counter-clockwise spiral — the iconic spin of a typhoon.",
    topic: 'spin',
  },
  {
    q: 'Why do typhoons weaken rapidly when they move over land?',
    options: [
      'Land reflects more sunlight, cooling the storm',
      'The storm gains moisture from rivers and lakes',
      'Warm ocean water — the fuel — is cut off, and friction over land disrupts the circulation',
      'Land pressure is always higher than ocean pressure'
    ],
    answer: 2,
    fact: 'Typhoons run on warm ocean evaporation. Over land, the moisture supply vanishes and surface friction disrupts the inflow/outflow pattern, causing rapid weakening within hours.',
    topic: 'land',
  },
  {
    q: 'Water vapor rises and condenses — what energy does this release?',
    options: [
      'Chemical bond energy',
      'Nuclear fusion energy',
      'Latent heat of condensation — the same energy used to evaporate the water',
      'Gravity potential energy'
    ],
    answer: 2,
    fact: 'Evaporation absorbs heat from the ocean; condensation releases it back. This latent heat release in the rising air is the primary energy source of a tropical cyclone — storms are called "heat engines" for this reason.',
    topic: 'vapor',
  },
  {
    q: 'In which ocean basin are typhoons most common in the Philippines?',
    options: [
      'Atlantic Ocean',
      'Indian Ocean',
      'Western North Pacific Ocean',
      'South Pacific Ocean'
    ],
    answer: 2,
    fact: "The Philippines sits in the Western North Pacific — the most active tropical cyclone basin on Earth, producing about 30% of the world's annual typhoons.",
    topic: 'general',
  },
  {
    q: 'Which part of a typhoon has the calmest weather and the lowest air pressure?',
    options: ['The eye', 'The eyewall', 'The spiral rainbands', 'The outer bands'],
    answer: 0,
    fact: 'The eye is the calm center where air sinks and spreads outward — giving light winds and clear skies, yet holding the lowest pressure in the entire storm.',
    topic: 'anatomy',
  },
  {
    q: "Where are a typhoon's strongest winds and heaviest rain concentrated?",
    options: ['The eye', 'The eyewall', 'The outer edge', 'The dry air outside the storm'],
    answer: 1,
    fact: 'The eyewall is the ring of towering clouds wrapped around the eye. Peak winds and the heaviest downpours occur here — it is the most dangerous part of a typhoon.',
    topic: 'anatomy',
  },
  {
    q: 'What are the long, curved bands of thunderstorms that spiral into a typhoon called?',
    options: ['Trade winds', 'Spiral rainbands', 'Jet streams', 'Sea breeze'],
    answer: 1,
    fact: 'Spiral rainbands wind inward toward the eyewall, bringing heavy rain and gusty winds long before the center arrives. They rotate counter-clockwise in the Northern Hemisphere.',
    topic: 'anatomy',
  },
  {
    q: 'In which general direction do most typhoons travel after forming in the Western North Pacific?',
    options: [
      'West or northwest',
      'Straight north',
      'East or southeast',
      'They stay in one place'
    ],
    answer: 0,
    fact: 'Steered by the subtropical ridge, WNP typhoons usually move west or northwest toward the Philippines and East Asia — which is why tracking their path is critical for warnings.',
    topic: 'tracking',
  },
  {
    q: "On a PAGASA track chart, what does the widening 'forecast cone' show?",
    options: [
      'Areas that will stay dry',
      'The growing uncertainty in the storm\u2019s future position',
      'The exact path the storm will take',
      'The storm\u2019s current wind speed'
    ],
    answer: 1,
    fact: 'The forecast cone widens with time because the storm\u2019s exact future path becomes less certain. The center could be anywhere inside the cone, so communities should prepare based on the closest approach.',
    topic: 'tracking',
  },
  {
    q: 'PAGASA raises Tropical Cyclone Wind Signal (TCWS) No. 3 for an area expecting winds of about…',
    options: ['30\u201360 km/h', '61\u2013120 km/h', '121\u2013184 km/h', '185+ km/h'],
    answer: 2,
    fact: 'TCWS No. 3 means winds of about 121\u2013184 km/h are expected within 36 hours — strong enough to uproot trees and damage structures. Signals are issued per area based on the expected wind speed.',
    topic: 'tracking',
  },
];

/**
 * Sequential unlock gates for Typhoon Formation. Gate i is opened by holding
 * slider i in its target zone; passing its question unlocks slider i+1.
 * Order mirrors real typhoon formation: heat → vapor → pressure → rotation.
 */
export const TYPHOON_GATE_TOPICS = ['heat', 'vapor', 'pressure', 'spin'] as const;
