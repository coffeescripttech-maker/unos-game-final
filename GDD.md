# UNOS: Birth of the Typhoon

## Game Design Document

> **Working Title:** UNOS: Birth of the Typhoon
> **Genre:** 2D Educational Puzzle-Platformer (Mini-Game Collection)
> **Platform:** Web (Desktop-first, Responsive)
> **Target Audience:** High school / Early college science students (Ages 14-22)
> **Core Loop:** Play a mini-game → Learn a formation concept → Earn score → Unlock next stage → Combine all stages into final typhoon simulation → Boss challenge
> **Educational Objective:** By the end, the player can explain the 5 stages of tropical cyclone formation (evaporation, condensation, pressure differential, Coriolis rotation, system organization).

---

## Table of Contents

1. [Game Overview](#1-game-overview)
2. [Story and Theme](#2-story-and-theme)
3. [Game Flow](#3-game-flow)
4. [Level Design](#4-level-design)
5. [Game Systems](#5-game-systems)
6. [Art Style Guide](#6-art-style-guide)
7. [Audio Design](#7-audio-design)
8. [Educational Content Map](#8-educational-content-map)
9. [Technical Architecture](#9-technical-architecture)
10. [Data Design](#10-data-design)
11. [Testing Strategy](#11-testing-strategy)
12. [Development Phases](#12-development-phases)

---

## 1. Game Overview

### 1.1 Concept

UNOS: Birth of the Typhoon is an educational browser game that teaches players how tropical cyclones form through a series of interactive mini-games. Each mini-game represents one stage of cyclone formation, building from evaporation all the way to a full typhoon.

### 1.2 Why This Game

Tropical cyclone formation is a complex multi-stage process taught in Earth Science curricula worldwide. Traditional teaching methods (diagrams, videos, text) are passive — students read or watch but don't *experience* the forces at work. UNOS turns each stage into an interactive mechanic, allowing players to *feel* how evaporation feeds condensation, how pressure gradients drive wind, and how the Coriolis effect creates rotation.

### 1.3 Core Loop

```
Play a mini-game → Learn a science concept → Earn score + stars
       ↓                                              |
  Unlock next stage ← (if passed) ←───────────────────┘
       ↓
Combine all elements in Typhoon Formation sandbox
       ↓
Face the Boss Challenge (survival phase)
       ↓
Review results + collected science facts
```

### 1.4 Key Differentiators

- **Educational by design** — not a game with facts bolted on; each mechanic *is* the science
- **Neo-Brutalist RetroUI** — bold, memorable visual identity
- **Co-op multiplayer** — learn together, up to 4 players
- **Progressive complexity** — from single-click to multi-system management

---

## 2. Story and Theme

### 2.1 Narrative Framing

The player is a **Weather Apprentice** aboard a research vessel in the Pacific Ocean. A **Senior Meteorologist** (the player's guide) appears between levels with briefings, science facts, and encouragement.

The framing is light — it exists to make the educational content feel purposeful, not to distract from the gameplay. There are no dialogue trees or cutscenes; the narrative is delivered through:

- **Level briefings** — "Alright, Apprentice. The ocean's sitting at 24°C. We need it at 26.5°C to get evaporation going. Let's see what you can do."
- **Educational popups** — "Did you know? The ocean must reach at least 26.5°C for a tropical cyclone to form."
- **Boss intermissions** — "The storm's building. Batten down the hatches — this is going to get rough."

### 2.2 Tone

- **Playful and vibrant** — bright colors, bouncy animations, encouraging feedback
- **Scientifically accurate** — all mechanics and facts reviewed for correctness
- **Rewarding** — every action produces satisfying visual/audio feedback
- **Neo-Brutalist** — bold outlines, flat colors, chunky UI elements, drop shadows

### 2.3 Characters

| Character | Role | Description |
|-----------|------|-------------|
| You (Apprentice) | Player | Silent protagonist, learns through doing |
| Dr. Marina Vega | Mentor | Senior meteorologist, appears via portrait + text |
| The Typhoon (Tembin) | Final Boss | A living storm entity the player must "navigate" |

---

## 3. Game Flow

### 3.1 Player Journey

```
Boot Screen
    ↓
Preload Screen (loading bar)
    ↓
Main Menu
    ├── Start Game → World Map
    ├── Multiplayer → Lobby
    ├── Settings
    └── Credits
            ↓
World Map (hub) — shows 6+1 nodes
    ├── Tutorial (forced on first play)
    ├── Level 1: Evaporation
    ├── Level 2: Condensation
    ├── Level 3: Air Pressure
    ├── Level 4: Rotation
    ├── Level 5: Typhoon Formation (unlocked after all 4)
    └── Level 6: Boss Challenge (unlocked after Typhoon)
            ↓
Results Screen (per-level)
    ├── Retry
    ├── Next Level
    └── Back to World Map
            ↓
Campaign Complete → End Credits + Statistics
```

### 3.2 Unlock Progression

```
Tutorial (always unlocked)
    ↓
Evaporation (unlocked after Tutorial)
    ↓
Condensation (unlocked after Evaporation)
    ↓
Pressure (unlocked after Condensation)
    ↓
Rotation (unlocked after Pressure)
    ↓
Typhoon Formation (unlocked after all 4 elemental levels)
    ↓
Boss Challenge (unlocked after Typhoon Formation)
```

Each level can be replayed anytime for a better score. Stars (1-3) are earned per level based on performance.

### 3.3 Multiplayer Flow

```
Main Menu → Multiplayer
    ├── Create Room (host)
    │   └── Share 6-character code
    └── Join Room (enter code)
            ↓
Lobby (2-4 players)
    ├── Player list with avatars + ready states
    ├── Level select (host picks; only levels all have unlocked)
    └── Start Game
            ↓
Co-op Level (Evaporation, Pressure, or Boss)
    └── Results (per-player + shared)
```

### 3.4 Session States

| State | Description |
|-------|-------------|
| `MENU` | Main menu or world map, no active game |
| `LOADING` | Scene transition with progress indicator |
| `PLAYING` | Active gameplay scene |
| `PAUSED` | Pause menu overlay, game time frozen |
| `FACT_POPUP` | Educational fact overlay after level completion |
| `RESULTS` | Score breakdown and star rating |
| `MULTIPLAYER_LOBBY` | Waiting for players, no active game |

---

## 4. Level Design

### 4.1 Tutorial — "Welcome Aboard"

**Objective:** Learn basic interactions (click, drag, hold, swipe) and understand the UI.

**Mechanic:** Five guided steps presented as a walkthrough overlay.

| Step | Instruction | Interaction | Success |
|------|-------------|-------------|---------|
| 1 | "Click the buoy to start" | Click a floating buoy object | Buoy bobs and rings |
| 2 | "Drag the temperature slider" | Grab and move a slider | Slider follows pointer |
| 3 | "Hold to generate solar energy" | Press and hold a button | Meter fills, particles rise |
| 4 | "Swipe to clear the fog" | Drag across the screen in a line | Fog dissipates |
| 5 | "All done! Let's begin." | Click "Continue" button | Transition to World Map |

**Failure state:** None. Tutorial is unskippable for new players but can be skipped on subsequent plays (a "Skip" button appears after 3 seconds).

**Educational content:** "A typhoon is a mature tropical cyclone that forms over warm ocean waters near the equator."

**Timer:** None.

**Scoring:** No score — completion only.

### 4.2 Evaporation — "Heat the Ocean"

**Objective:** Raise ocean surface temperature to trigger evaporation by applying solar energy.

**Mechanic:**

- Ocean surface is divided into a **6×4 grid of tiles**
- Each tile has a **heat value (0-100)** displayed as a color gradient (blue → yellow → red)
- Player **clicks or holds** on tiles to add solar energy
- When a tile reaches **60+ heat**, vapor particles spawn and rise upward
- Multiple tiles at **80+ heat** trigger a "Vapor Surge" — bonus particles
- A global **heat meter** at the top shows progress toward the target
- If any tile exceeds **100 heat**, it "overcooks" — turns brown, stops producing vapor, and reduces score

**Visual design:**

- Ocean surface with gentle wave animation (sine displacement)
- Tiles show subtle shimmer when being heated
- Vapor particles are small white circles with alpha fade, rising with sinusoidal horizontal drift
- Overcooked tiles show cracked brown texture

**Victory condition:** Total vapor released ≥ target (configurable in `levels.ts`)

**Failure condition:** Timer runs out (60 seconds)

**Scoring:**
- Base: 1000 points × (vapor released / target)
- Efficiency bonus: up to 500 points based on heat distribution (even heating = bonus)
- Overheat penalty: −200 per overcooked tile
- Time bonus: up to 300 points for speed

**Educational popup:** "The ocean must reach at least 26.5°C for evaporation to fuel a tropical cyclone. This warmth provides the energy that drives the entire storm."

### 4.3 Condensation — "Build the Clouds"

**Objective:** Guide vapor particles into cloud formations by connecting them.

**Mechanic:**

- Vapor particles drift across the screen from bottom to top
- Player **clicks and drags** from one particle to another to draw a connection line
- Connected particles merge into a **CloudCluster**
- Clouds grow larger as more particles join
- A cloud that reaches **critical mass** (10+ particles) turns dark gray (cumulonimbus)
- Clouds that reach the top of the screen contribute to the progress bar
- Unconnected particles that reach the top are lost

**Visual design:**

- Sky background transitioning from light blue to dark gray at the top
- Vapor particles: semi-transparent white circles with gentle drift tweens
- Connection lines: glowing white/blue strokes, 3px width
- CloudCluster: expands as particles join, color shifts white → gray → dark gray
- Rain streaks appear from clouds that reach critical mass

**Victory condition:** Cover 70% of the screen's upper third with cloud clusters

**Failure condition:** Timer runs out (75 seconds) without reaching threshold

**Scoring:**
- Base: 1000 points × (coverage / 70%)
- Cloud size bonus: 100 points per large cloud (15+ particles)
- Speed bonus: up to 400 points for fast completion
- Lost particle penalty: −50 per particle lost

**Educational popup:** "As water vapor rises, it cools and condenses into tiny water droplets, forming clouds. This process releases latent heat — the fuel that powers the cyclone."

### 4.4 Air Pressure — "Arrange the Pressure"

**Objective:** Correctly place low and high pressure systems to create the pressure gradient that drives cyclone winds.

**Mechanic:**

- A **weather map** with a 4×4 grid of cells is displayed
- Concentric **isobars** (ellipses) show current pressure zones
- Draggable pressure cell tokens appear on the side:
  - 1 × "L" (low pressure — center)
  - 4 × "H" (high pressure — surrounding)
- Player drags cells onto the grid
  - **Correct placement:** L in the center cell, H cells around the perimeter
  - **Incorrect placement:** Cell bounces back, screen shake, placement count decreases
- As cells are placed correctly, **wind arrows** animate inward toward the L

**Visual design:**

- Weather map background with isobar ellipses (stroke opacity decreasing outward)
- Pressure cells: draggable circles with bold "L" or "H" text
- Correct placement: cell snaps into place with a green flash
- Incorrect placement: cell bounces back with red flash + screen shake
- Wind arrows: animated arrows pointing from H cells toward L center
- Completion: all arrows converge, dramatic wind sound

**Victory condition:** All 5 cells placed correctly

**Failure condition:** Timer runs out (45 seconds) or 3 incorrect placements

**Scoring:**
- Base: 1000 points for completion
- Speed bonus: 500 points if completed in < 20 seconds
- Accuracy bonus: 200 points if 0 incorrect placements
- Star thresholds: 1 star (complete), 2 stars (under 30s), 3 stars (under 20s + no errors)

**Educational popup:** "Low pressure at the center draws in surrounding high-pressure air, creating the strong inward winds of a cyclone. The greater the pressure difference, the stronger the winds."

### 4.5 Rotation — "Create the Spin"

**Objective:** Apply the Coriolis effect to create cyclonic rotation in the forming storm.

**Mechanic:**

- A circular "pool" of air particles in the center of the screen
- Player draws **circular motions** around the pool:
  - **Northern Hemisphere:** Counter-clockwise (default)
  - **Southern Hemisphere:** Clockwise (toggle)
- Gesture detection tracks pointer movement over the last 500ms
  - Calculates angular direction and consistency
- A **spin meter** fills based on sustained cyclonic motion
  - Consistent direction → meter fills
  - Direction reversal → meter drains
- Air particles begin swirling as rotation builds
- At **50% spin**: visible vortex starts forming
- At **80% spin**: clear spiral arms visible
- At **100% spin**: fully developed vortex with visible eye
- Must maintain 100% for 3 consecutive seconds to win

**Visual design:**

- Circular pool with subtle radial gradient
- Particles: small dots rotating around center, speed increases with spin
- Vortex visualization: rotating arc graphics with increasing density
  - Low spin: scattered dots
  - Medium spin: faint spiral pattern
  - High spin: clear spiral arms with bright center
  - Full: visible eye (dark center) with bright eyewall
- Hemisphere toggle button in corner (educational: shows both behaviors)

**Victory condition:** Spin meter reaches 100% and maintains for 3 seconds

**Failure condition:** Timer runs out (60 seconds)

**Scoring:**
- Base: 1000 points for completion
- Time bonus: up to 500 points (faster = more points)
- Consistency bonus: 300 points if direction never reversed
- Star thresholds: 1 star (complete), 2 stars (under 40s), 3 stars (under 25s + no reversals)

**Educational popup:** "The Coriolis effect deflects winds to the right in the Northern Hemisphere, creating counter-clockwise rotation around the low pressure center. In the Southern Hemisphere, it's the opposite."

### 4.6 Typhoon Formation — "Assemble the Storm"

**Objective:** Combine all previous elements into a complete, organized typhoon.

**Mechanic (Sandbox/Puzzle Hybrid):**

- Four **parameter sliders** are displayed vertically on screen:
  1. **Heat** (0-100) — target zone: 60-80
  2. **Vapor** (0-100) — target zone: 60-85
  3. **Pressure** (0-100) — target zone: 50-70 (higher = lower pressure)
  4. **Rotation** (0-100) — target zone: 70-100
- Each slider shows:
  - **Gray zone** — too low, no effect
  - **Green zone** — optimal target range
  - **Red zone** — too high, destabilizes
- Central storm visualization evolves based on all four values:
  - **All low:** Scattered fair-weather clouds
  - **Heat + Vapor high:** Thick cloud cover, darkening sky
  - **Pressure in zone:** Wind arrows appear, air begins circulating
  - **Rotation in zone:** Circulation tightens, eye begins forming
  - **All four optimal:** Fully formed typhoon with:
    - Clear eye (calm center)
    - Bright eyewall (most intense winds)
    - Spiral rainbands extending outward
    - Lightning flashes in rainbands
- **Saffir-Simpson scale** indicator shows current storm category (1-5)

**Visual design:**

- Full storm view taking up 60% of screen
- Sliders on left side with RetroUI styling (thick borders, draggable knobs)
- Storm evolves through 5 visual states (see above)
- Eye formation: clear circle scaling up as conditions optimize
- Spiral rainbands: rotating arcs rendered with `Graphics`
- Lightning: random flashes in outer bands
- Saffir-Simpson meter: 5-segment bar showing current category

**Victory condition:** All four sliders in green zone for 10 consecutive seconds

**Failure condition:** Timer runs out (90 seconds)

**Scoring:**
- Base: 1000 points for stabilization
- Accuracy score: 100 points per slider within 5% of optimal center
- Time bonus: up to 500 points for fast stabilization
- Maintenance bonus: 200 points for each 5 seconds held beyond requirement
- Star thresholds: 1 star (stabilize), 2 stars (all within 10% of center), 3 stars (all within 5% + 20s hold)

**Educational popup:** "A fully formed typhoon has three parts: the eye (calm center), the eyewall (most intense winds and rain), and spiral rainbands extending outward. Category 5 typhoons have winds over 252 km/h."

### 4.7 Boss Challenge — "Ride the Storm"

**Objective:** Navigate your research vessel through the developing typhoon, responding to dynamic weather events.

**Mechanic (Survival/Action):**

- **Side-view:** Ship on ocean surface, storm fills the upper screen
- Three **waves** of increasing difficulty, each with 5-8 random events
- **Event pool:**
  1. **Lightning Strike:** Bright flash → thunder after 0.5s → player must click the lightning rod button within 800ms. Miss: −15 health.
  2. **Rogue Wave:** Large wave from left/right → player drags ship's wheel to turn into wave. Miss: −20 health (broadside hit).
  3. **Wind Gust:** Ship tilts → player holds a stabilize button. Success: minor tilt. Fail: −10 health + cargo loss (−200 score).
  4. **Rain Squall:** Visibility drops to near-zero → minimap appears → player navigates via minimap for 5 seconds. Fail: −5 health + time penalty.
  5. **Debris:** Floating debris ahead → player clicks left/right to dodge. Miss: −10 health.
- **Ship health:** Starts at 100. Warning at 30. Game over at 0.
- **Between waves:** 5-second respite with educational fact and repair (+10 health)
- **Boss health:** Starts at 1000, reduced by 200-400 per wave based on performance
- **Wave 1:** 5 events, slow pace, 2s between events
- **Wave 2:** 6 events, moderate pace, 1.5s between events
- **Wave 3:** 8 events, fast pace, 1s between events, event combinations possible

**Visual design:**

- Ship: side-view sprite with states (idle, tilting-L, tilting-R, hit)
- Ocean: animated waves, darkening as storm intensifies
- Storm: dark clouds filling upper portion, rain particles, lightning flashes
- Lightning: bright white flash with branching bolt graphic
- Rogue wave: large wave sprite that builds in height, then crashes
- Minimap: small circular radar showing ship position and obstacles
- Health bar: RetroUI bar at top, color shifts green → yellow → red

**Victory condition:** All 3 waves completed (boss health reaches 0)

**Failure condition:** Ship health reaches 0

**Scoring:**
- Base: 2000 points
- Wave completion bonus: 500 points per wave
- Health remaining bonus: 10 points per HP > 30
- Event success rate: 100 points per event
- No-miss bonus: 1000 points if all events in a wave are handled perfectly
- Star thresholds: 1 star (complete), 2 stars (health > 50 at end), 3 stars (health > 80 + 90%+ event success)

**Educational popup:** "Typhoons can reach Category 5 with sustained winds over 252 km/h — powerful enough to cause catastrophic damage. Understanding storm structure helps ships navigate safely."

---

## 5. Game Systems

### 5.1 Scoring System

**Per-level score formula:**

```
FinalScore = (BaseScore × DifficultyMultiplier) + TimeBonus + EfficiencyBonus + AccuracyBonus - Penalties
```

**Star thresholds:**

| Stars | Requirement |
|-------|-------------|
| 1 Star (Bronze) | Complete the level (pass threshold) |
| 2 Stars (Silver) | Score ≥ 60% of maximum possible |
| 3 Stars (Gold) | Score ≥ 90% of maximum possible |

**Notes on scoring:**
- DifficultyMultiplier: Tutorial = 1×, Levels 1-3 = 1×, Levels 4-5 = 1.5×, Boss = 2×
- Maximum possible score varies per level (see Level Design)
- Score is displayed with a brief breakdown animation on the Results screen

### 5.2 Power-Up System

Power-ups can be earned through achievements or found as secrets during levels.

| Power-Up | Effect | Duration | Rarity | Unlock Method |
|----------|--------|----------|--------|---------------|
| **Slow Motion** | Slows game time by 50% | 10 seconds | Common | Complete Tutorial |
| **Auto-Heal** | Restores 25 ship health (Boss only) | Instant | Uncommon | 3-star any level |
| **Double Score** | 2× points earned | 15 seconds | Rare | 3-star 3 levels |
| **Hint** | Shows visual guide for current puzzle step | Until used | Common | Fail a level once |
| **Shield** | Negates one failed event (Boss only) | One use | Rare | Complete Rotation with 3 stars |
| **Vapor Boost** | Auto-generates vapor in Evaporation | 10 seconds | Uncommon | Complete Condensation |
| **Perfect Placement** | Auto-corrects one pressure placement | One use | Rare | Score 100% on Pressure |

**Activation:** Power-ups are shown as small icons below the score bar. Click to activate. Only one can be active at a time.

**Inventory:** Max 3 of each power-up type. New pickups are discarded if inventory is full.

### 5.3 Achievement System

Achievements are organized into categories and trigger on specific game events.

**Achievement Definitions:**

| ID | Title | Description | Condition | Reward |
|----|-------|-------------|-----------|--------|
| `FIRST_STEPS` | First Steps | Complete the Tutorial | Tutorial completed | 100 XP |
| `OCEAN_WARMER` | Ocean Warmer | Complete Evaporation | Evaporation completed | 100 XP |
| `CLOUD_ARCHITECT` | Cloud Architect | Complete Condensation | Condensation completed | 100 XP |
| `PRESSURE_MASTER` | Pressure Master | Complete Pressure | Pressure completed | 100 XP |
| `SPIN_DOCTOR` | Spin Doctor | Complete Rotation | Rotation completed | 100 XP |
| `STORM_BIRTH` | Storm Birth | Complete Typhoon Formation | Typhoon completed | 200 XP |
| `STORM_RIDER` | Storm Rider | Complete the Boss Challenge | Boss completed | 300 XP |
| `FULL_CAMPAIGN` | Full Campaign | Complete all levels | All levels completed | 500 XP |
| `PERFECTIONIST` | Perfectionist | Get 3 stars on all levels | All levels 3-starred | 1000 XP |
| `SPEED_DEMON` | Speed Demon | Complete any level in < 50% of time limit | Time bonus = max | 300 XP |
| `NO_MISTAKES` | No Mistakes | Complete Pressure with zero errors | 0 incorrect placements | 200 XP |
| `STEADY_HANDS` | Steady Hands | Complete Rotation without reversing direction | 0 reversals | 200 XP |
| `STORM_SURVIVOR` | Storm Survivor | Complete Boss with > 80 health remaining | Boss health > 80 | 500 XP |
| `FACT_COLLECTOR` | Fact Collector | Unlock all educational facts | All 7 facts unlocked | 300 XP |
| `POWER_UP` | Power Up! | Use your first power-up | Power-up activated | 50 XP |
| `SOCIAL_BUTTERFLY` | Social Butterfly | Play a co-op game | Multiplayer game played | 200 XP |
| `HIDDEN_TREASURE` | Hidden Treasure | Find a secret power-up in any level | Secret collected | 150 XP |

**XP System:**
- XP accumulates across the player's career
- XP milestones at 500, 1500, 3000, 5000 unlock cosmetic profile badges
- XP has no gameplay effect (purely cosmetic progression)

**Notification:** When an achievement unlocks, an `AchievementPopup` slides in from the top showing the achievement title, description, and a RetroUI badge icon.

### 5.4 Save/Progress System

**Save triggers:**
- After each level completion
- On app close / tab switch (via `beforeunload` event)
- On setting changes

**Save data structure:**

```typescript
interface SaveData {
  version: number; // Schema version for migration support
  lastPlayed: string; // ISO date string
  totalPlayTime: number; // Seconds across all sessions

  // Per-level progress
  levels: Record<string, {
    completed: boolean;
    bestScore: number;
    bestTime: number; // Seconds
    stars: number; // 0-3
    attempts: number;
    factsUnlocked: string[];
  }>;

  // Player settings
  settings: {
    masterVolume: number; // 0-1
    sfxVolume: number; // 0-1
    musicVolume: number; // 0-1
    colorblindMode: boolean;
    reducedMotion: boolean;
    language: string; // For future localization
  };

  // Inventory
  inventory: Record<string, number>; // powerupId → count

  // Achievements
  unlockedAchievements: string[]; // Achievement IDs
  totalXP: number;
}
```

**Storage layers:**
1. **localStorage** — Always available, fast, persists across sessions
2. **Firebase Firestore** — When authenticated, syncs to cloud (source of truth when available)

**Sync strategy (when authenticated):**
- On app start: check Firestore first, fall back to localStorage
- If local has newer data (check `lastPlayed`), push local to cloud
- If cloud has newer data, pull cloud to local
- Offline: save locally, queue for upload when connection resumes

### 5.5 Multiplayer System

**Overview:**
- Co-operative only (not competitive), up to 4 players
- Host creates a room, receives a 6-character alphanumeric code
- Other players join via code
- Play together in select levels: Evaporation, Pressure, Boss

**Supported levels in co-op:**

| Level | Co-op Adaptation |
|-------|------------------|
| Evaporation | Shared ocean grid. All players click to heat tiles. Vapor particles from all players are visible. Shared progress meter. |
| Pressure | Grid split into quadrants (one per player). Each player places cells in their quadrant. Shared timer. |
| Boss | Ship stations assigned to players (lightning rod, wheel, cargo, radar). Shared ship health. |

**Synchronization approach:**
- **Input broadcasting:** Player actions are sent to all clients. Each client computes results locally.
- **State snapshots:** Host sends full game state every 5 seconds for reconciliation.
- **Critical events:** Level completion, health changes, and score updates are host-validated.
- **Late join:** A new player receives full state from host and can spectate until next level.

**Room lifecycle:**
1. Created by host → exists in memory on server
2. Players join → room fills (min 2, max 4)
3. Host selects level → all clients transition to game scene
4. Level plays → results broadcast
5. Return to lobby → can play again or disband
6. Last player leaves → room destroyed after 30 minutes idle

**Server-side (Socket.IO):**
- Event: `connection` → authenticate → create session
- Event: `room:create` → generate code → create room
- Event: `room:join` → validate code → add player
- Event: `game:input` → receive action → broadcast to room
- Event: `room:leave` / `disconnect` → remove player → transfer host if needed

### 5.6 Leaderboard System

- Per-level leaderboards + overall campaign score leaderboard
- Shows: rank, player name, score, stars, date
- Current player's entry highlighted
- Top 100 scores displayed, paginated
- Updated on level completion (automatic, no manual submit)
- Only authenticated users appear on leaderboard
- Guest players' scores are local-only

---

## 6. Art Style Guide

### 6.1 Visual Identity

**Neo-Brutalist RetroUI** — inspired by 90s arcade games and modern brutalism:
- Bold, chunky UI elements
- Thick black borders (2-3px)
- Flat colors (no gradients in UI)
- Heavy drop shadows (bottom-right offset)
- Rounded corners are minimal or absent
- High contrast for readability

### 6.2 Color Palette

```css
/* Ocean Blues — primary game environment */
--ocean-deep:   #0A2472;  /* Deepest water, backgrounds */
--ocean-mid:    #1E5AA0;  /* Mid-depth water */
--ocean-light:  #3A87C4;  /* Shallow water, UI accents */
--ocean-surface:#6DB3E6;  /* Surface water, highlights */

/* Storm Grays — weather elements */
--storm-dark:   #2D3047;  /* Dark clouds, text */
--storm-mid:    #5C5F6E;  /* Mid clouds, disabled states */
--storm-light:  #8C8F9E;  /* Light clouds, borders */

/* Warning Reds — danger, boss, errors */
--warning-red:  #D62828;  /* Health low, incorrect, danger */
--warning-orange:#F77F00; /* Caution, medium danger */

/* Accent Yellows — success, rewards */
--accent-yellow:#FFD166;  /* Stars, achievements, highlights */
--accent-green: #06D6A0;  /* Success, correct, health full */

/* UI Base */
--ui-white:     #FFFFFF;  /* Text, icons */
--ui-black:     #000000;  /* Borders, shadows */
--ui-bg:        #F0F4F8;  /* Page backgrounds (React UI) */
```

### 6.3 Typography

| Use | Font | Weight | Size |
|-----|------|--------|------|
| Headers / Titles | Fredoka One | 700 | 24-48px |
| Body text | Nunito | 400-700 | 14-20px |
| UI Labels | Nunito | 700 (bold) | 12-16px |
| Score numbers | Fredoka One | 700 | 20-36px |
| Educational facts | Nunito | 600 (semi-bold) | 16-18px |

### 6.4 UI Component Spec

**Buttons:**
- Background: flat color (varies by context — blue for primary, gray for secondary)
- Border: 3px solid black
- Shadow: 4px 4px 0 black (bottom-right)
- Hover: shadow increases to 6px 6px 0
- Active/Pressed: shadow disappears, element shifts 2px down/right
- Disabled: 50% opacity, no shadow, no hover effect
- Padding: 12px 24px (comfortable touch target)
- Text: centered, white (#FFFFFF), Nunito Bold

**Cards/Panels:**
- Background: white or ocean-light
- Border: 3px solid black
- Shadow: 4px 4px 0 black
- Padding: 16px
- Optional: colored accent bar at top (4px height)

**Progress Bars (Meters):**
- Background: storm-light with 3px black border
- Fill: retro-style segmented fill (or smooth, per context)
- Color transitions: blue → yellow → red as value increases
- Label: above or inside the bar, Nunito Bold

**Modal Dialogs:**
- Backdrop: semi-transparent dark overlay (rgba(0,0,0,0.7))
- Dialog: RetroUI card centered on screen
- Close button (X) in top-right corner
- Title, content, action buttons

### 6.5 Sprite Style

```
- Flat vectors with heavy outlines (2-3px black)
- No gradients in sprite art
- Limited animation frames (4-8 frames per action)
- Consistent 32×32 or 64×64 base grid
- High saturation colors from palette
```

### 6.6 Animation Principles

- **Bouncy** — overshoot + settle on UI elements (elastic ease)
- **Fast** — most animations < 300ms; game animations < 100ms
- **Feedback every action** — no dead clicks; every interaction produces a visual response
- **Screen shake** — on errors, impacts, boss hits (can be disabled in accessibility)
- **Particle effects** — success bursts, vapor rise, sparkles on achievements

---

## 7. Audio Design

### 7.1 Technology

- **Howler.js** for audio playback
- Audio sprite approach (single file per category with offset/duration map)
- Three mixer channels: Master, SFX, Music

### 7.2 Music (BGM)

| Scene | Style | Duration | Loop |
|-------|-------|----------|------|
| Main Menu | Lo-fi / ambient electronic | 60s | Yes |
| World Map | Calm oceanic ambience with subtle pulse | 30s | Yes |
| Tutorial | Simple, encouraging melody | 30s | Yes |
| Evaporation | Warm, building tension | 45s | Yes |
| Condensation | Ethereal, floating | 45s | Yes |
| Pressure | Urgent, ticking undertone | 45s | Yes |
| Rotation | Swirling, hypnotic | 45s | Yes |
| Typhoon Formation | Epic, cinematic | 60s | Yes |
| Boss Challenge | Intense, driving percussion | 60s (per wave variant) | Yes |
| Results | Triumphant fanfare (victory) / Somber (loss) | 10s | No |

### 7.3 Sound Effects (SFX)

| Category | Sounds | Trigger |
|----------|--------|---------|
| **UI** | Click, hover, back, confirm, cancel | Button interactions |
| **Navigation** | Scene transition, map open, level select | Scene changes |
| **Gameplay** | Vapor rise, cloud form, correct placement, incorrect, wind gust, thunder, lightning, wave crash, debris hit | Game actions |
| **Feedback** | Success chime, failure buzz, star earned, achievement unlock, power-up activate, power-up expire | Scoring/events |
| **Ambient** | Gentle waves, rain (light/heavy), wind (breeze/storm), distant thunder | Environment layers |

### 7.4 Voice (Optional Enhancement)

- Pre-recorded TTS-quality narration for educational facts
- Dr. Marina Vega's voice lines for level briefings
- Toggle: On/Off in Settings
- Can be omitted for initial build

---

## 8. Educational Content Map

### 8.1 Facts by Level

| Level | Fact ID | Fact Text | Source |
|-------|---------|-----------|--------|
| Tutorial | `fact_tutorial` | A typhoon is a mature tropical cyclone that forms over warm ocean waters near the equator. | NOAA |
| Evaporation | `fact_evaporation` | The ocean must be at least 26.5°C for evaporation to fuel a tropical cyclone. This warmth provides the energy that drives the entire storm. | NASA Earth Observatory |
| Condensation | `fact_condensation` | As water vapor rises, it cools and condenses into tiny water droplets, forming clouds. This releases latent heat — the storm's fuel. | UCAR Center for Science Education |
| Pressure | `fact_pressure` | Low pressure at the center draws in surrounding high-pressure air, creating the strong inward winds of a cyclone. The greater the pressure difference, the stronger the winds. | Met Office (UK) |
| Rotation | `fact_rotation` | The Coriolis effect deflects winds to the right in the Northern Hemisphere, creating counter-clockwise rotation. In the Southern Hemisphere, deflection is to the left (clockwise). | NOAA SciJinks |
| Typhoon Formation | `fact_typhoon` | A fully formed typhoon has three parts: the eye (calm center), the eyewall (most intense winds and rain), and spiral rainbands extending outward. | World Meteorological Organization |
| Boss Challenge | `fact_boss` | Typhoons can reach Category 5 with sustained winds over 252 km/h — powerful enough to cause catastrophic damage. The Saffir-Simpson scale categorizes storms 1-5. | National Hurricane Center |

### 8.2 Science Log

All unlocked facts are collected in a **Science Log** accessible from the Dashboard. Features:
- Searchable by keyword
- Sortable by level or topic
- Each fact shows a small icon representing its level
- "Locked" facts are shown as grayed-out cards with a padlock
- Count: "7/7 Facts Collected" when complete

### 8.3 In-Level Educational Integration

- **Terminology hover cards:** During gameplay, key terms (e.g., "latent heat", "Coriolis", "isobars") are highlighted. Hovering shows a small definition tooltip.
- **Level briefings:** Before each level, a one-line educational hook sets the context.
- **Fact popup:** After each level, a full-screen overlay presents the fact with a visual illustration.
- **Boss intermissions:** Educational content woven into the narrative between boss waves.

---

## 9. Technical Architecture

### 9.1 Project Structure

```
UNOS-Game/
├── GDD.md                          # This document
├── README.md                       # Project overview and setup
├── ARCHITECTURE.md                 # Technical architecture deep-dive
├── package.json                    # Workspace root
├── tsconfig.base.json              # Shared TypeScript config
├── .gitignore
├── .eslintrc.cjs
├── .prettierrc
│
├── client/                         # Frontend: Phaser + React
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   ├── postcss.config.cjs
│   ├── tailwind.config.ts
│   └── src/
│       ├── main.tsx                # React entry + Phaser bootstrap
│       ├── App.tsx                 # React root
│       ├── router.tsx              # Routes
│       ├── index.css               # Tailwind + globals
│       │
│       ├── game/                   # Phaser 3 game code
│       │   ├── index.ts            # Phaser.Game instantiation
│       │   ├── constants.ts        # Dimensions, scene keys, layer names
│       │   ├── scenes/
│       │   │   ├── BootScene.ts
│       │   │   ├── PreloadScene.ts
│       │   │   ├── MainMenuScene.ts
│       │   │   ├── WorldMapScene.ts
│       │   │   ├── TutorialScene.ts
│       │   │   ├── EvaporationScene.ts
│       │   │   ├── CondensationScene.ts
│       │   │   ├── PressureScene.ts
│       │   │   ├── RotationScene.ts
│       │   │   ├── TyphoonScene.ts
│       │   │   ├── BossScene.ts
│       │   │   └── ResultsScene.ts
│       │   ├── objects/            # Reusable game objects
│       │   │   ├── VaporParticle.ts
│       │   │   ├── CloudCluster.ts
│       │   │   ├── PressureCell.ts
│       │   │   ├── WindArrow.ts
│       │   │   ├── Ship.ts
│       │   │   ├── Hazard.ts
│       │   │   ├── Meter.ts
│       │   │   └── Slider.ts
│       │   ├── managers/
│       │   │   ├── GameManager.ts
│       │   │   ├── SceneManager.ts
│       │   │   ├── WeatherManager.ts
│       │   │   ├── AudioManager.ts
│       │   │   ├── SaveManager.ts
│       │   │   ├── MultiplayerManager.ts
│       │   │   ├── AchievementManager.ts
│       │   │   └── PowerupManager.ts
│       │   ├── effects/
│       │   │   ├── RainEffect.ts
│       │   │   ├── LightningEffect.ts
│       │   │   ├── VaporRiseEffect.ts
│       │   │   └── StormVortexEffect.ts
│       │   ├── data/
│       │   │   ├── levels.ts
│       │   │   ├── achievements.ts
│       │   │   ├── powerups.ts
│       │   │   ├── facts.ts
│       │   │   └── enemies.ts
│       │   └── ui/
│       │       ├── HUD.ts
│       │       ├── FactPopup.ts
│       │       ├── AchievementPopup.ts
│       │       └── PauseMenu.ts
│       │
│       ├── components/             # React UI shell
│       │   ├── GameCanvas.tsx
│       │   ├── AuthGate.tsx
│       │   ├── Navbar.tsx
│       │   ├── LoadingScreen.tsx
│       │   ├── ErrorBoundary.tsx
│       │   ├── Toaster.tsx
│       │   └── ui/
│       │       ├── Card.tsx
│       │       ├── Button.tsx
│       │       ├── Modal.tsx
│       │       ├── ProgressBar.tsx
│       │       └── Badge.tsx
│       │
│       ├── pages/                   # React Router pages
│       │   ├── HomePage.tsx
│       │   ├── DashboardPage.tsx
│       │   ├── AchievementsPage.tsx
│       │   ├── LeaderboardPage.tsx
│       │   ├── MultiplayerLobbyPage.tsx
│       │   ├── SettingsPage.tsx
│       │   └── GamePage.tsx
│       │
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   ├── usePhaserEvent.ts
│       │   ├── useSocket.ts
│       │   ├── useProgress.ts
│       │   └── useLeaderboard.ts
│       │
│       ├── contexts/
│       │   ├── AuthContext.tsx
│       │   ├── GameContext.tsx
│       │   └── MultiplayerContext.tsx
│       │
│       ├── services/
│       │   ├── api.ts
│       │   ├── auth.ts
│       │   ├── firestore.ts
│       │   └── socket.ts
│       │
│       └── types/
│           ├── game.ts
│           ├── user.ts
│           ├── multiplayer.ts
│           └── api.ts
│
├── server/                         # Node.js backend
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                # Express + Socket.IO bootstrap
│       ├── config.ts               # Environment variables
│       ├── middleware/
│       │   ├── auth.ts
│       │   └── rateLimit.ts
│       ├── routes/
│       │   ├── auth.ts
│       │   ├── progress.ts
│       │   ├── leaderboard.ts
│       │   └── achievements.ts
│       ├── socket/
│       │   ├── handler.ts
│       │   ├── rooms.ts
│       │   └── sync.ts
│       ├── models/
│       │   ├── User.ts
│       │   ├── Progress.ts
│       │   ├── Achievement.ts
│       │   └── GameHistory.ts
│       └── services/
│           ├── authService.ts
│           ├── progressService.ts
│           └── leaderboardService.ts
│
└── shared/                         # Shared types and constants
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── types.ts
        ├── constants.ts
        └── events.ts
```

### 9.2 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Game Engine | Phaser 3.80+ | 2D rendering, physics, input, scene management, particles |
| UI Framework | React 18 | Authentication, dashboard, leaderboard, settings, lobby |
| Build Tool | Vite 5 | Fast HMR, optimized builds, TypeScript support |
| Styling | Tailwind CSS 3 + PostCSS | RetroUI design system |
| Runtime | TypeScript (strict) | Type safety across all layers |
| Backend | Node.js + Express 4 | REST API for progress, leaderboard, auth |
| Real-time | Socket.IO 4 | Multiplayer state synchronization |
| Authentication | Firebase Auth | Email/password + Google OAuth |
| Database | Firebase Firestore | Player data, scores, rooms (real-time) |
| Audio | Howler.js 2 | Sound sprite playback, volume control |
| Validation | Zod | Runtime type validation for API and game data |
| Testing | Vitest, Testing Library, Supertest | Unit, component, and API tests |
| Formatting | ESLint + Prettier | Code quality |

### 9.3 Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                          │
│                                                                   │
│  ┌──────────────────────┐    ┌──────────────────────────────┐    │
│  │    React Shell       │    │     Phaser 3 Game Engine      │    │
│  │                      │    │                               │    │
│  │  - Auth (Firebase)   │    │  - Scenes (gameplay)          │    │
│  │  - Dashboard         │◄──►│  - Managers (state)           │    │
│  │  - Leaderboard       │    │  - Objects (sprites)          │    │
│  │  - Achievements      │    │  - HUD (Phaser UI)            │    │
│  │  - Lobby             │    │                               │    │
│  └──────────┬───────────┘    └──────────┬────────────────────┘    │
│             │                            │                         │
│             │      GameContext (bridge)  │                         │
│             │      Custom Events         │                         │
│             └──────────────┬─────────────┘                         │
│                            │                                       │
│  ┌─────────────────────────▼────────────────────────────────────┐  │
│  │                   Services Layer                              │  │
│  │  ┌───────────┐  ┌────────────┐  ┌───────────────────────┐   │  │
│  │  │ auth.ts   │  │ firestore  │  │ socket.ts             │   │  │
│  │  │(Firebase) │  │  .ts       │  │(Socket.IO client)     │   │  │
│  │  └─────┬─────┘  └─────┬──────┘  └───────────┬───────────┘   │  │
│  └────────┼──────────────┼──────────────────────┼───────────────┘  │
└───────────┼──────────────┼──────────────────────┼──────────────────┘
            │              │                      │
            ▼              ▼                      ▼
      Firebase Auth   Firestore DB         WebSocket (wss://)
            │              │                      │
            ▼              ▼                      ▼
      ┌────────────────────────────────────────────────────────────┐
      │                    SERVER (Node.js)                        │
      │  ┌────────┐  ┌───────────┐  ┌─────────────────────────┐   │
      │  │ Express│  │ Socket.IO │  │ Services (progress,     │   │
      │  │ Routes │  │ Handler   │  │ leaderboard, auth)      │   │
      │  └───┬────┘  └─────┬─────┘  └───────────┬─────────────┘   │
      │      └─────────────┼─────────────────────┘                 │
      │                    │                                       │
      │  ┌─────────────────▼─────────────────────────────────┐     │
      │  │            Database (Firestore)                    │     │
      │  │  Users | Progress | Leaderboards | Achievements   │     │
      │  └───────────────────────────────────────────────────┘     │
      └────────────────────────────────────────────────────────────┘
```

### 9.4 Phaser-React Bridge Pattern

This is **the most critical architectural decision**. The two frameworks share a DOM node but operate independently.

**Rules:**
1. The Phaser container `<div id="game-container">` is a single, stable React element that **NEVER re-renders**
2. Communication is **event-based** (custom events on `game.events`), not shared state variables
3. React stores a reference to the Phaser.Game instance in GameContext
4. For data shared between frameworks (current level, score): Phaser writes → game.events → React reads → GameContext updates → React re-renders

**Connection code (simplified):**

```typescript
// In GameCanvas.tsx (React side)
const gameRef = useRef<Phaser.Game | null>(null);

useEffect(() => {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.CANVAS,
    width: 800,
    height: 600,
    parent: 'game-container',
    scale: { mode: Phaser.Scale.FIT },
    scene: [BootScene, PreloadScene, MainMenuScene, /* ... */],
  };

  gameRef.current = new Phaser.Game(config);

  return () => {
    gameRef.current?.destroy(true);
  };
}, []);
```

```typescript
// In any Phaser scene (game side)
this.game.events.emit(GAME_EVENTS.SCORE_UPDATE, { score: 5000, level: 'evaporation' });
```

```typescript
// In React (hook side)
const usePhaserEvent = (eventName: string, handler: (...args: any[]) => void) => {
  const game = useContext(GameContext).game;

  useEffect(() => {
    game?.events.on(eventName, handler);
    return () => {
      game?.events.off(eventName, handler);
    };
  }, [game, eventName, handler]);
};
```

---

## 10. Data Design

### 10.1 Firestore Schema

**Collection: `users`**
```
/users/{uid}
{
  displayName: string,
  email: string,
  photoURL: string | null,
  createdAt: Timestamp,
  lastLoginAt: Timestamp,
  settings: {
    masterVolume: number,      // 0-1
    sfxVolume: number,         // 0-1
    musicVolume: number,       // 0-1
    colorblindMode: boolean,
    reducedMotion: boolean,
  }
}
```

**Collection: `progress`** (subcollection of users)
```
/users/{uid}/progress/{levelId}
{
  levelId: string,           // "evaporation", "condensation", etc.
  completed: boolean,
  bestScore: number,
  bestTime: number,          // seconds
  stars: number,             // 0-3
  factsUnlocked: string[],
  attempts: number,
  lastPlayedAt: Timestamp,
  multiplayerBest: number | null
}
```

**Collection: `leaderboard`**
```
/leaderboards/{levelId}/scores/{docId}
{
  userId: string,
  displayName: string,
  score: number,
  stars: number,
  time: number,
  achievedAt: Timestamp
}
// Index: score DESC, time ASC
```

**Collection: `achievements`** (subcollection of users)
```
/users/{uid}/achievements/{achievementId}
{
  achievementId: string,
  unlockedAt: Timestamp,
  progress: number           // 0-1 for multi-step achievements
}
```

**Collection: `rooms`**
```
/rooms/{roomCode}
{
  code: string,              // 6-char alphanumeric
  hostId: string,
  players: [{
    userId: string,
    displayName: string,
    isReady: boolean,
    joinedAt: Timestamp
  }],
  currentLevel: string | null,
  gameState: object | null,
  status: "waiting" | "playing" | "finished",
  createdAt: Timestamp,
  expiresAt: Timestamp       // TTL index for auto-cleanup
}
```

**Collection: `gameHistory`**
```
/gameHistory/{docId}
{
  userId: string,
  levelId: string,
  score: number,
  stars: number,
  time: number,
  wasMultiplayer: boolean,
  playerCount: number | null,
  powerupsUsed: string[],
  completedAt: Timestamp
}
```

### 10.2 Key TypeScript Types

```typescript
// Core game types
type LevelId = 'tutorial' | 'evaporation' | 'condensation' | 'pressure'
              | 'rotation' | 'typhoon' | 'boss';

type GamePhase = 'menu' | 'loading' | 'playing' | 'paused'
                | 'fact_popup' | 'results' | 'multiplayer_lobby';

interface LevelConfig {
  id: LevelId;
  name: string;
  description: string;
  timeLimit: number;           // seconds, 0 = no limit
  passThreshold: number;       // minimum score to pass
  maxScore: number;
  difficultyMultiplier: number;
  educationalFactId: string;
}

interface LevelProgress {
  completed: boolean;
  bestScore: number;
  bestTime: number;
  stars: number;
  attempts: number;
  factsUnlocked: string[];
}

interface GameState {
  phase: GamePhase;
  currentLevel: LevelId | null;
  score: number;
  time: number;
  health: number;             // Boss only
  activePowerups: string[];
  weatherParams: {
    temperature: number;      // 0-1
    humidity: number;         // 0-1
    pressure: number;         // 0-1
    windSpeed: number;        // 0-1
    rotation: number;         // 0-1
  };
}

// Multiplayer types
interface RoomState {
  code: string;
  hostId: string;
  players: PlayerInfo[];
  currentLevel: LevelId | null;
  sharedProgress: number;
  status: 'waiting' | 'playing' | 'finished';
}

interface PlayerInfo {
  userId: string;
  displayName: string;
  isReady: boolean;
}

// Event types (shared between Phaser and React)
interface GameEventMap {
  'GAME:SCORE_UPDATE': { score: number; level: LevelId };
  'GAME:LEVEL_COMPLETE': { level: LevelId; score: number; stars: number };
  'GAME:LEVEL_FAIL': { level: LevelId; reason: string };
  'GAME:POWERUP_ACTIVATED': { powerupId: string };
  'GAME:FACT_UNLOCKED': { factId: string };
  'GAME:PAUSE': {};
  'GAME:UNPAUSE': {};
  'GAME:SCENE_CHANGE': { from: string; to: string };
}
```

### 10.3 State Management Strategy

**No Redux** — the overhead isn't justified for this architecture.

1. **React Context** for UI-level state:
   - `AuthContext`: Firebase user, auth loading state, login/logout methods
   - `GameContext`: Current level, recent scores, game phase, Phaser game reference
   - `MultiplayerContext`: Socket connection state, room ID, players

2. **Phaser Manager Singletons** for game state:
   - `GameManager`: Level progress, current score, active powerups
   - `WeatherManager`: Weather parameter values
   - `SaveManager`: Persistence layer (localStorage + Firestore)

3. **Event Bridge** (type-safe via `shared/src/events.ts`):
   - Phaser emits → React subscribes via `usePhaserEvent` hook
   - No shared mutable state between frameworks

---

## 11. Testing Strategy

### 11.1 Test Pyramid

```
        ╱─────╲
       ╱  E2E  ╲          3-5 manual full playthroughs
      ╱─────────╲
     ╱Integration╲         Multiplayer sync, Phaser+React bridge, API
    ╱─────────────╲
   ╱   Unit Tests   ╲      Managers, scoring, components
  ╱───────────────────╲
 ╱   Static Analysis    ╲   TypeScript strict mode, ESLint
╱─────────────────────────╲
```

### 11.2 Unit Tests (Vitest)

**Managers (pure logic):**
- `GameManager` — score calculation, star rating, level progression
- `AchievementManager` — condition checking, unlock logic
- `SaveManager` — save/load/merge, schema migration
- `PowerupManager` — activation, duration, expiration
- `ScoreCalculator` — formulas for each level

**Scoring formulas:**
```typescript
describe('ScoreCalculator', () => {
  it('calculates evaporation score', () => { /* ... */ });
  it('determines star rating from percentage', () => { /* ... */ });
  it('applies difficulty multiplier', () => { /* ... */ });
});
```

**Achievement conditions:**
```typescript
describe('AchievementManager', () => {
  it('unlocks FIRST_STEPS on tutorial completion', () => { /* ... */ });
  it('does not unlock FULL_CAMPAIGN early', () => { /* ... */ });
  it('tracks progress for multi-step achievements', () => { /* ... */ });
});
```

### 11.3 Component Tests (Vitest + Testing Library)

- RetroUI components (Card, Button, Modal, ProgressBar, Badge)
- Pages (DashboardPage, AchievementsPage, LeaderboardPage)
- GameCanvas (mount/unmount Phaser cleanly)
- AuthGate (redirects when unauthenticated)

### 11.4 Phaser Scene Tests (Headless)

Use `Phaser.HEADLESS` renderer type for CI testing:
- Instantiate each scene in headless mode
- Verify `create()` runs without errors
- Verify key game objects exist
- Simulate input events and verify state changes

### 11.5 API Tests (Supertest + Vitest)

- Express routes: 200/401/400 responses
- Progress validation
- Leaderboard update rules
- Rate limiting

### 11.6 Multiplayer Tests

- Two Socket.IO clients join the same room
- Verify state broadcasts correctly
- Verify disconnect/reconnect behavior
- Use `socket.io-client` in test files

### 11.7 E2E / Manual Checklist

See `docs/test-checklist.md` for full manual test coverage:
- Full campaign playthrough
- Guest → login → merge progress
- All power-ups and achievements
- Multiplayer (2-4 players)
- Edge cases: double-click, tab switch, offline, resize

---

## 12. Development Phases

### Phase 0: Project Scaffold (Days 1-2)
- Initialize monorepo workspace
- Configure Vite + TypeScript + Tailwind + ESLint
- Create folder structure
- Verify `npm run dev` works

### Phase 1: Phaser Bootstrap + React Shell (Days 3-5)
- Boot → Preload → MainMenu Phaser scene chain
- React routing + AuthGate + basic pages
- Phaser-React bridge (GameCanvas + GameContext)
- RetroUI component library (React)

### Phase 2: World Map + Save System (Days 6-8)
- WorldMapScene with locked/unlocked nodes
- SaveManager (localStorage)
- Scene transitions with fade effects
- GameManager singleton

### Phase 3: Core Managers + HUD (Days 9-12)
- WeatherManager, AchievementManager, PowerupManager
- HUD (score, timer, health, pause)
- FactPopup, AchievementPopup
- ResultsScene

### Phase 4: Mini-Games (Days 13-22)
- TutorialScene (2 days)
- EvaporationScene (2 days) — establishes pattern
- CondensationScene (2 days)
- PressureScene (2 days)
- RotationScene (2 days)

### Phase 5: Typhoon + Boss (Days 23-27)
- TyphoonFormationScene (sandbox mode)
- BossScene (3-wave survival)

### Phase 6: Backend + Auth (Days 28-32)
- Firebase Auth integration
- Express REST API (progress, leaderboard)
- Firestore schema setup
- Persistence sync (local ↔ cloud)

### Phase 7: Multiplayer (Days 33-36)
- Socket.IO server setup
- MultiplayerManager (client)
- Co-op level variants
- Room lifecycle

### Phase 8: Audio + Polish (Days 37-40)
- Howler.js audio integration
- Particle effects and screen shake
- Accessibility (keyboard, colorblind, reduced motion)
- Responsive scaling

### Phase 9: Testing + Documentation (Days 41-45)
- Unit and component tests
- API tests
- README, ARCHITECTURE.md, API.md
- Deployment configuration

---

> **This document is a living specification.** As development progresses, details may evolve. Sections marked with specific implementation details should be updated in lockstep with code changes. The GDD serves as the single source of truth for game design decisions throughout the capstone project lifecycle.
