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
];

/**
 * Sequential unlock gates for Typhoon Formation. Gate i is opened by holding
 * slider i in its target zone; passing its question unlocks slider i+1.
 * Order mirrors real typhoon formation: heat → vapor → pressure → rotation.
 */
export const TYPHOON_GATE_TOPICS = ['heat', 'vapor', 'pressure', 'spin'] as const;
