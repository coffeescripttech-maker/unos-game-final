---
name: pressure-scene-redesign
description: Stage 3 Pressure scene rewritten with clean rendering, smaller assets, compact layout, and 3-node gameplay
metadata:
  type: project
---

Stage 3 (PressureScene.ts) was fully rewritten to address "kalat" (scattered/messy) visuals and oversized images.

**Visual fixes:**
- All white-background PNGs processed via `cleanTexture()` canvas pixel-scanning → proper RGBA alpha (no MULTIPLY blend modes)
- Only `pressure_island_bg` as main background (1280×720 displaySize)
- Subtle layers: `clouds_back` (alpha 0.15, depth 0.5), `clouds_front` (alpha 0.06, depth 4.5)
- Wind meter gauge (`wind_meter_ui`, scale 0.4, alpha 0.3) as decorative UI
- Marker scale reduced to 0.25 (was 0.3), node slots at 0.25, target zone at 0.3
- Compact node layout: x spans 380→920 (was 300→1080)

**Gameplay redesign:**
- 7 nodes: 4 locked as hints + 3 empty (player fills)
- Correct answers: (560,160)=L, (920,190)=H, (480,310)=L
- `onNodeClicked` checks `type === node.assigned` for correctness
- Wrong placement refunds token + shows educational hint text
- Each correct = 33% progress toward target (3 correct = 100%)
- Token refund + context-aware hints on wrong placement

**Bug fixes:**
- `moveCloud` progress calculation: direct percentage tracking instead of position math with operator-precedence bug
- All `targets: this.tweens` (tweening the TweensManager) replaced with proper object references

**Why:** User wanted scene to match Stage 2 Condensation's cleanliness and visual organization. The white-background PNGs (RGB without alpha) were the root cause of visibility issues. Canvas-based alpha processing solves this permanently.

**How to apply:** All assets cleaned in `create()` loop. To add more cleaned textures, add the key to the array. The `α(key)` helper returns the cleaned variant or falls back to original.