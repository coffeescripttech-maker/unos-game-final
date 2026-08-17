import type { ObjectiveId } from '../types';

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number; // index of the correct option
  fact: string; // shown after the player answers (the "why")
}

/**
 * Weather-science quiz questions keyed by the collectible / milestone they relate
 * to. The quiz is cumulative: collecting item N unlocks a question from topic N
 * plus one review question from earlier topics, so by the 3rd collect the player
 * answers 3 total — reinforcing what they've learned so far.
 */
export const QUIZ_QUESTIONS: Partial<Record<ObjectiveId, QuizQuestion[]>> = {
  collect_temperature: [
    {
      q: 'Why do warm ocean temperatures matter for typhoons?',
      options: [
        'They fuel the storm with heat and moisture',
        'They stop the storm from spinning',
        'They make the rain turn into snow',
        'They lower the air pressure to zero'
      ],
      answer: 0,
      fact: 'Typhoons are powered by warm ocean water (≈26.5 °C+). Heat and moisture evaporate from the sea and release latent heat when they rise and condense, powering the storm.'
    },
    {
      q: 'Which instrument measures sea-surface temperature?',
      options: [
        'Anemometer',
        'Barometer',
        'Thermometer / thermistor buoy',
        'Hygrometer'
      ],
      answer: 2,
      fact: 'Floating weather buoys carry thermistors that log temperature at precise depths while drifting with the current.'
    },
    {
      q: 'Which layer of the ocean warms a typhoon most?',
      options: [
        'The seafloor',
        'The warm surface mixed layer',
        'The cold deep ocean',
        'The mid-ocean thermocline alone'
      ],
      answer: 1,
      fact: 'The warm, sunlit surface mixed layer (upper ~50 m) is the fuel. If a storm churns the ocean, cooler water rises and can weaken it.'
    }
  ],
  collect_humidity: [
    {
      q: 'High humidity in the tropics helps storms grow because...',
      options: [
        'Water vapor releases latent heat when it condenses',
        'It makes the ocean colder',
        'It blocks the sun completely',
        'It prevents the air from rising'
      ],
      answer: 0,
      fact: 'Warm, humid air is the raw material of a storm. As vapor condenses into rain, it releases latent heat — warming the core and fueling stronger winds.'
    },
    {
      q: 'What does a hygrometer measure?',
      options: ['Wind speed', 'Air pressure', 'Humidity', 'Ocean temperature'],
      answer: 2,
      fact: 'A hygrometer measures how much water vapor the air holds — a key ingredient in tropical cyclone formation.'
    },
    {
      q: 'Where is humidity typically highest in a typhoon?',
      options: [
        'In the dry eye',
        'In the eyewall and rainbands',
        'At the ocean surface only',
        'In the upper atmosphere'
      ],
      answer: 1,
      fact: 'The eyewall and spiral rainbands are where warm, moist air rises rapidly — making them the most humid and dangerous parts of the storm.'
    }
  ],
  collect_pressure: [
    {
      q: 'A barometer that is steadily falling usually means...',
      options: [
        'A storm is intensifying',
        'Fair weather is arriving',
        'High pressure is building',
        'The winds are dying down'
      ],
      answer: 0,
      fact: 'A falling barometer signals dropping air pressure — the hallmark of an intensifying low-pressure system like a typhoon.'
    },
    {
      q: 'Inside the eye of a typhoon, the pressure is...',
      options: [
        'The lowest, at the very center',
        'Very high',
        'Average',
        'Rising steadily'
      ],
      answer: 0,
      fact: "The eye sits at the storm's center, where air descends and spreads outward — producing the lowest pressure and the calm, clear conditions."
    },
    {
      q: "Very low pressure at a storm's core helps it by...",
      options: [
        'Creating strong upward air motion and stronger winds',
        'Pushing air downwards',
        'Stopping rainfall',
        'Cooling the ocean surface'
      ],
      answer: 0,
      fact: 'Low pressure means air is rising vigorously, releasing latent heat and accelerating the whole cyclone circulation.'
    }
  ],
  collect_windspeed: [
    {
      q: 'Wind speeds are typically strongest near...',
      options: [
        'The calm eye',
        'The eyewall',
        'The ocean surface only',
        'High cloud tops'
      ],
      answer: 1,
      fact: "The eyewall — the ring of towering clouds surrounding the eye — contains the storm's fiercest winds, often exceeding 115 knots."
    },
    {
      q: 'An anemometer measures...',
      options: [
        'Wind speed',
        'Rainfall',
        'Atmospheric pressure',
        'Ocean temperature'
      ],
      answer: 0,
      fact: "Anemometers count how fast the wind blows — vital data for forecasting a typhoon's track and destructive potential."
    },
    {
      q: 'Why is wind speed the most dangerous part of a typhoon?',
      options: [
        'It is a destructive force that drives storm surge and debris',
        'It cools the ocean and weakens the storm',
        'It turns the rain into ice',
        'It lowers humidity to near zero'
      ],
      answer: 0,
      fact: 'Sustained winds and gusts generate the storm surge, toss debris, and are the leading cause of wind-related damage in typhoons.'
    }
  ],
  deploy_buoy: [
    {
      q: 'Why is a weather buoy deployed into a storm?',
      options: [
        'To measure real-time conditions where the storm is strongest',
        'To block the storm from moving',
        'To attract fish out of the deep',
        'To mark a safe swimming spot'
      ],
      answer: 0,
      fact: 'Drooping and drifting with the current, a buoy streams back pressure, temperature, wave height and wind data that models need to track the storm.'
    },
    {
      q: 'What is the drogue (parachute anchor) on a weather buoy for?',
      options: [
        'To keep the buoy stable while it samples at depth',
        'To make the buoy float higher',
        'To change its color for visibility',
        'To send sonar pings'
      ],
      answer: 0,
      fact: 'The drogue extends the buoy to a subsurface depth so it rides out the storm without flipping, giving accurate subsurface measurements.'
    }
  ],
  reach_eye: [
    {
      q: 'Why is the eye of a typhoon calm?',
      options: [
        'Air descends and spreads outward, suppressing clouds',
        'The storm takes a break',
        'There is no wind anywhere',
        'It sits outside the storm circulation'
      ],
      answer: 0,
      fact: 'In the eye, air sinks and diverges — sinking air warms and evaporates cloud droplets, leaving clear skies and light winds.'
    },
    {
      q: 'The eyewall surrounding the eye contains...',
      options: [
        'The strongest winds and heaviest rain',
        'Completely calm conditions',
        'Light, gentle breezes',
        'No precipitation at all'
      ],
      answer: 0,
      fact: 'The eyewall is a towering ring of thunderstorms where wind speeds peak and rainfall concentrates — the most violent part of the typhoon.'
    }
  ]
};

/**
 * Build the quiz for the Nth collected item.
 * `collected` is the ordered list of topics collected so far; `count` = how many
 * questions to show (= number of items collected). The current topic is always
 * included, and remaining slots are filled from previously-collected topics.
 */
export function getQuizQuestions(
  collected: ObjectiveId[],
  count: number,
  seed?: number
): QuizQuestion[] {
  const pool: QuizQuestion[] = [];
  const last = collected[collected.length - 1];
  const add = (id: ObjectiveId) => {
    const q = QUIZ_QUESTIONS[id];
    if (q) pool.push(...q);
  };
  // Prefer the most-recent topic first, then earlier ones
  [last, ...collected.slice(0, -1)].forEach(add);

  // Shuffle deterministically-ish. `seed` lets a retry reshuffle to fresh picks;
  // without it the seed is derived from count (stable per collection milestone).
  const rng = mulberry(seed ?? count * 1009);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, Math.min(count, pool.length));
}

function mulberry(a: number): () => number {
  let seed = a;
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
