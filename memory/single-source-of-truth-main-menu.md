---
name: single-source-of-truth-main-menu
description: React HomePage is the one true main menu; Phaser MainMenuScene is a pass-through
metadata:
  type: reference
---

The React `HomePage.tsx` at route `/` is the single source of truth for the main menu. It uses the `Main Menu BG.png` from public/images as its full-screen background, with left-aligned RetroUI buttons.

The Phaser `MainMenuScene` is a minimal pass-through that immediately transitions to WorldMap — it exists only so scene references don't break. The Phaser flow is now: Boot → Preload → WorldMap.

Communication bridge:
- WorldMap's "← Menu" button emits `GAME_EVENTS.NAVIGATE_HOME`
- `GamePage.tsx` listens via `usePhaserEvent` hook and calls `navigate('/')` via React Router
- GamePage's top nav also has a "← Home" link directly

Related: [[hud-architecture]]
