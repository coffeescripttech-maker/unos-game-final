# UNOS Game — Client Feedback Revision Tracker

**Batch:** 7-point client feedback (core-learning pop-ups, clarity, voice, transitions, mechanics, hints, Level 6 fix)
**Status:** Implementation complete → build green → **manual smoke test pending**
**Last build:** `npm run build` ✅ (shared + client + server)

---

## Progress Summary

| # | Requirement | Status |
|---|-------------|--------|
| R1 | Core-learning pop-ups while playing (no need to open Walkthrough) | ✅ Done |
| R2 | Clearer Level 2 condensation + guided preview + colored bubbles | ✅ Done |
| R3 | Voice / read-aloud instructions + praise on achievements | ✅ Done |
| R4 | Level transition preview ("What happens next") | ✅ Done |
| R5 | Clearer mechanics text on every level | ✅ Done |
| R6 | Hint button that shows instructions | ✅ Done |
| R7 | Level 6 (boss) Enter/Space data collection in the eye | ✅ Fixed |

---

## R1 — Core-Learning Pop-ups ✅

**Goal:** Pressing an object (e.g. Sun) shows an info box ("Sun heats the Ocean"). When droplets start evaporating, a fact flashes ("Ocean hits 26.5 °C → Evaporate"). Same on all levels.

**What was built**
- New events: `HUD_CORE_FACT` / `HUD_CORE_FACT_DISMISS` + `CoreFactPayload` in `shared/src/events.ts`.
- `client/src/components/hud/CoreFactOverlay.tsx` — floating card, queues multiple facts, auto-dismiss (9 s default), reads the fact aloud, ✓ to close early.
- Mounted globally in `client/src/components/GameHUD.tsx`.
- Per-scene `shownFacts: Set<string>` so each fact shows only once per run.

**Facts wired per level**
| Level | File | Facts |
|-------|------|-------|
| 1 Evaporation | `EvaporationScene.ts` | Sun heats ocean · 26.5 °C evaporation starts · vapor rises · clouds block the sun |
| 2 Condensation | `CondensationScene.ts` | cooling makes droplets · sweet-spot bonus · wrong-layer hint |
| 3 Pressure | `PressureScene.ts` | air moves High → Low · wind blows High → Low |
| 4 Rotation | `RotationScene.ts` | Earth's spin bends wind (Coriolis) · wind curves left/right |
| 5 Typhoon | `TyphoonScene.ts` | warm ocean = typhoon fuel |
| 6 Boss | `BossLevel.tsx` | existing fact system + spoken collect/deploy lines |

**To verify:** Click the Sun → fact card appears and is spoken; keep clicking to 26.5 °C → second fact appears; card auto-dismisses without blocking play.

---

## R2 — Level 2 Clarity ✅

**Goal:** Clearer condensation instructions, a guided preview before play, and 3 bubbles colored by the layer they belong in.

**What was built**
- Rewritten intro steps in `CondensationScene.ts` (STEP 1 → STEP 5 flow).
- New events `HUD_GUIDED_PREVIEW` / `HUD_GUIDED_PREVIEW_DONE` + `GuidedPreviewPayload`.
- `client/src/components/hud/GuidedPreviewOverlay.tsx` — animated "Where does each bubble go?" diagram:
  - ❄️ COLD SKY → white (light) vapor
  - ✨ MIDDLE → yellow (normal) vapor — sweet spot
  - 🌊 WARM OCEAN AIR → blue (heavy) vapor
  - Enter / Space / button / "Skip preview" all start the level.
- In-game colored halos on rising bubbles (blue / white / yellow) + layer labels on the left edge.
- Wrong-layer feedback emits a targeted fact.

**To verify:** Enter Level 2 → intro → guided preview diagram → Start → bubbles rise with colored halos; dropping a blue bubble in the cold layer shows "Wrong layer" + fact.

---

## R3 — Voice / Read-Aloud ✅

**Goal:** Instructions are spoken (auditory learners) and every achievement gets praise ("Good job!", "Very good!").

**What was built**
- `client/src/services/speech.ts` — Web Speech API wrapper: `speak`, `speakSequence`, `speakPraise`, `speakHint`, `toggleVoice`, persisted in `localStorage` (`unos_voice_enabled`).
- Voice on: `LevelIntroOverlay` (reads title + subtitle + all mechanics), `CoreFactOverlay`, `GuidedPreviewOverlay`, `ResultOverlay` (praise / encouragement), Boss collect + buoy deploy + mission complete.
- 🔊 / 🔇 toggle in `HUDTopBar.tsx` next to the 📖 button.

**To verify:** Intro is read aloud; toggle 🔊 off → silence and persists after reload; completing a level says "Good job!".

---

## R4 — Level Transitions ✅

**Goal:** After each level, show a preview of what happens next so learning is continuous.

**What was built**
- `ResultOverlay.tsx` — new "🔭 What happens next" card using `NEXT_PREVIEW` map + `LEVEL_CONFIGS` for the next level name; final level shows "🏁 Campaign complete".
- Voice praise on the result card.

**To verify:** Finish Level 1 → result card shows "Next: the vapor rises, cools, and condenses into clouds." with the next level name.

---

## R5 — Clearer Mechanics ✅

**Goal:** Explain what to click and why (click Sun → heat rises → ocean warms; click vapor → collect).

**What was built**
- Rewritten mechanics copy in Evaporation, Condensation, Boss intro, plus hint reminder in every intro card.
- Boss controls line updated: `WASD / Arrows — Steer · Shift — Boost · Space — Deploy Buoy · E / Enter — Collect data`.

---

## R6 — Hint Button ✅

**Goal:** A hint button that shows the instruction/guide at any time.

**What was built**
- `client/src/components/hud/HintButton.tsx` — floating 💡 Hint button (bottom-right), visible during gameplay only.
- Emits `HUD_REQUEST_INTRO` → `LevelIntroOverlay` re-opens the current level's mechanics and pauses the scene; dismissing resumes.
- Existing 📖 top-bar button kept and now shares the same flow.

**To verify:** Start any level → tap 💡 Hint → instructions open and the game freezes → continue → play resumes.

---

## R7 — Level 6 (Boss) Eye Fix ✅

**Goal:** In the eye of the storm, Enter/Space must reliably collect data.

**What was built**
- `BoatController.ts` — `Enter` / `NumpadEnter` now trigger `onInteract` (same as E); `Space` / `Enter` call `preventDefault()` so the page doesn't scroll or re-click focused buttons.
- `BossLevel.tsx` — reaching the eye completes `reach_eye` even if `deploy_buoy` was never pressed; the buoy is auto-recorded so the mission can finish. `SceneContent` derives `buoyDeployed` from mission state and places the buoy at the boat's position.
- `BossHUD.tsx` — "Press SPACE to deploy the buoy" prompt while that objective is active.
- Intro controls text updated.

**To verify:** In the boss level, sail into the eye without pressing Space → mission completes; pressing Enter/Space inside the eye collects/advances correctly.

---

## Files Changed (this batch)

**Shared**
- `shared/src/events.ts`

**New components / services**
- `client/src/services/speech.ts`
- `client/src/components/hud/CoreFactOverlay.tsx`
- `client/src/components/hud/GuidedPreviewOverlay.tsx`
- `client/src/components/hud/HintButton.tsx`

**Updated components**
- `client/src/components/GameHUD.tsx`
- `client/src/components/hud/LevelIntroOverlay.tsx`
- `client/src/components/hud/ResultOverlay.tsx`
- `client/src/components/hud/HUDTopBar.tsx`
- `client/src/game/boss/hud/BossHUD.tsx`

**Updated game scenes**
- `client/src/game/scenes/EvaporationScene.ts`
- `client/src/game/scenes/CondensationScene.ts`
- `client/src/game/scenes/PressureScene.ts`
- `client/src/game/scenes/RotationScene.ts`
- `client/src/game/scenes/TyphoonScene.ts`
- `client/src/game/boss/BossLevel.tsx`
- `client/src/game/boss/BoatController.ts`

**Styles**
- `client/src/index.css` (fact card, condensation diagram, hint button, mobile-landscape rules)

---

## Manual Smoke Test Checklist

- [ ] Level 1: Sun click → fact; 26.5 °C → evaporation fact; bubbles collectable
- [ ] Level 1: cloud appears → "clouds block the sun" fact
- [ ] Level 2: intro → guided preview diagram → Start
- [ ] Level 2: blue/white/yellow halos visible; wrong layer shows fact
- [ ] Level 3: pressure fact on start + correct placement fact
- [ ] Level 4: Coriolis fact on start; orb collect fact
- [ ] Level 5: anatomy → gameplay → typhoon fact
- [ ] Hint 💡 opens instructions and pauses; dismiss resumes
- [ ] 📖 top bar still works
- [ ] 🔊 toggle mutes voice, persists after reload
- [ ] Result card shows "What happens next" + spoken praise
- [ ] Boss: Space deploys buoy; Enter/Space works at the eye
- [ ] Boss: entering eye without buoy still completes
- [ ] Mobile landscape: fact card, hint button, preview modal fit

---

## Known Issues / Not Part of This Batch

- `client/src/services/socket.test.ts` — 4 pre-existing failures (`Cannot find module './socket'`). Unrelated to these changes.
- Boss page (`/boss`) does not mount `GameHUD`, so the 💡 Hint button is not shown there (boss has its own intro/controls card).
- Voice quality depends on the browser/OS installed voices (Web Speech API).

---

## Git

**Not committed yet.** Waiting for explicit approval before commit/push.

Suggested commit message:

```
feat: client revision batch — core facts, guided preview, voice, hints, boss eye fix
```
