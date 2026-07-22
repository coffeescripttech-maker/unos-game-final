---
name: scene-implementation-pattern
description: Standard pattern for implementing Phaser scenes with HUD events
metadata:
  type: reference
---

Each Phaser scene follows this pattern:
1. `create()` — init state, render game world, emit `HUD_LEVEL_INFO` + `HUD_OBJECTIVE`, start timer emitting `HUD_TIMER`, register `HUD_CONTINUE` listener
2. Game logic — emit `HUD_OBJECTIVE`/`HUD_SCORE` when progress changes
3. `completeLevel()` / `failLevel()` — save to localStorage, emit `HUD_RESULT`, play victory/fail game-world effects
4. `shutdown()` — clean up `HUD_CONTINUE` listener via `this.game.events.off()`

Do NOT render any HUD/UI elements in Phaser scenes (no timers, scores, progress bars, result overlays). Those belong in React.

Scenes do NOT handle transitions themselves — React's ResultOverlay emits `HUD_CONTINUE`, which the scene listens for to call `this.scene.start(SCENES.WORLD_MAP)`.

Related: [[hud-architecture]]
