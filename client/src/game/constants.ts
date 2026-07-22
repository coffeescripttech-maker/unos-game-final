export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const COLORS = {
  OCEAN_DEEP: 0x0a2472,
  OCEAN_MID: 0x1e5aa0,
  OCEAN_LIGHT: 0x3a87c4,
  OCEAN_SURFACE: 0x6db3e6,
  STORM_DARK: 0x2d3047,
  STORM_MID: 0x5c5f6e,
  STORM_LIGHT: 0x8c8f9e,
  WARNING_RED: 0xd62828,
  WARNING_ORANGE: 0xf77f00,
  ACCENT_YELLOW: 0xffd166,
  ACCENT_GREEN: 0x06d6a0,
  UI_WHITE: 0xffffff,
  UI_BLACK: 0x000000,
} as const;

export const FONTS = {
  DISPLAY: 'Fredoka One',
  BODY: 'Nunito',
} as const;

export const DEPTH = {
  BG: 0,
  GAME_OBJECTS: 10,
  PARTICLES: 20,
  UI: 50,
  HUD: 100,
  OVERLAY: 200,
} as const;
