// ────────────────────────── Voice / Speech (Web Speech API) ──────────────────────────
// Lightweight text-to-speech helper used by the HUD. No audio assets needed.
// Kids get the instructions read aloud, plus praise on every achievement.

const STORAGE_KEY = 'unos_voice_enabled';

let enabled = true;
try {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  if (saved === 'off') enabled = false;
} catch {
  /* storage unavailable — default to on */
}

const listeners = new Set<(on: boolean) => void>();

export function isVoiceEnabled(): boolean {
  return enabled && typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function setVoiceEnabled(on: boolean): void {
  enabled = on;
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
  if (!on) stopSpeaking();
  listeners.forEach(fn => fn(on));
}

export function toggleVoice(): boolean {
  setVoiceEnabled(!enabled);
  return enabled;
}

export function subscribeVoice(fn: (on: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  // Prefer a friendly US English voice, then any English voice.
  return (
    voices.find(v => /en[-_]US/i.test(v.lang) && /female|samantha|zira|aria|jenny/i.test(v.name)) ??
    voices.find(v => /en[-_]US/i.test(v.lang)) ??
    voices.find(v => /^en/i.test(v.lang)) ??
    voices[0]
  );
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}

export interface SpeakOptions {
  /** Cancel whatever is currently being spoken (default true). */
  interrupt?: boolean;
  rate?: number;
  pitch?: number;
}

/** Read a single line aloud. Safe to call on every render — it no-ops when muted. */
export function speak(text: string, opts: SpeakOptions = {}): void {
  if (!enabled || !text) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  const { interrupt = true, rate = 0.95, pitch = 1.05 } = opts;
  try {
    if (interrupt) window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = rate;
    utter.pitch = pitch;
    utter.volume = 1;
    utter.lang = 'en-US';
    const voice = pickVoice();
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
  } catch {
    /* speech unavailable — fail silently */
  }
}

/** Read several lines in order (used for level intros / step lists). */
export function speakSequence(lines: string[], opts: SpeakOptions = {}): void {
  if (!enabled) return;
  const clean = lines.map(l => l.trim()).filter(Boolean);
  if (!clean.length) return;
  speak(clean.join('. '), { ...opts, rate: opts.rate ?? 0.92 });
}

const PRAISE = ['Good job!', 'Very good!', 'Awesome work!', 'Great job!', 'You did it!'];

/** Short random praise line for achievements / level complete. */
export function speakPraise(extra?: string): void {
  const line = PRAISE[Math.floor(Math.random() * PRAISE.length)];
  speak(extra ? `${line} ${extra}` : line);
}

/** Speak a letter/word only if voices are ready; used by hint toggles. */
export function speakHint(text: string): void {
  speak(text, { rate: 0.9 });
}
