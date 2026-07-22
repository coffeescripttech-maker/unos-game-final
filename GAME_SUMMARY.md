# UNOS — Weather Science Educational Game

## Overview
A 2D interactive educational web game that teaches weather science and typhoon formation through hands-on gameplay. Players act as a field meteorologist, progressing through stages of atmospheric processes.

## Game Flow (7 Levels)
1. **Tutorial** — Research base briefing. 3 exercises: click-beacon, collect data streams, rapid-click burst calibration.
2. **Evaporation** — Click the sun to heat the ocean → water vapor bubbles rise. Manage cloud cover and combo timing.
3. **Condensation** — Click vapor particles → merge into clouds. Speed and accuracy improve results.
4. **Pressure** — Drag low/high pressure cells → create wind. Learn pressure gradients.
5. **Rotation** — Swipe in circular motion → spin wind into a vortex (Coriolis effect).
6. **Typhoon** — Maintain the vortex against storm surge, rainbands, and wind shear.
7. **Boss** — Typhoon makes landfall. Combine all skills to survive the storm.

## Key Features
- Interactive 2D levels with real-time feedback (particles, shake, glow effects)
- Combo system rewarding precise timing
- NOAA-sourced educational science facts
- Retro-card UI with React DOM overlays (crisp, non-pixelated)
- Responsive canvas (Phaser 3 FIT + CENTER)

## Tech Stack
React · TypeScript · Phaser 3 · Tailwind CSS · Node.js · Socket.IO · Vite · Turborepo
