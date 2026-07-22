---
name: hud-architecture
description: HUD/UI rendered by React, game world rendered by Phaser
metadata:
  type: reference
---

React owns all HUD/UI elements (Score, Timer, Objective, Health bars, Result overlays, Pause Menu, Achievements, Leaderboards, Settings).

Phaser owns only the game world (Ocean, Clouds, Sun, Wind, Typhoon, Particles, Animations, Physics, Player Input).

Communication flows one way: Phaser scenes emit events via `game.events.emit()` → React subscribes via `usePhaserEvent` hook → React renders RetroUI components overlaid on the canvas.

Key events defined in `shared/src/events.ts`:
- `HUD:TIMER` — `{ remaining, total }`
- `HUD:OBJECTIVE` — `{ text, progress, target }`
- `HUD:SCORE` — `{ score, label }`
- `HUD:HEALTH` — `{ current, max, label }`
- `HUD:RESULT` — `{ type, title, score, stars, levelId, timeUsed, factsUnlocked }`
- `HUD:LEVEL_INFO` — `{ name, description }`
- `HUD:CONTINUE` — emitted by React when user clicks Continue on Result overlay; Phaser scenes listen on `game.events` and clean up in `shutdown()`.

Related: [[scene-implementation-pattern]]
