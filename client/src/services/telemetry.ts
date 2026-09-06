/**
 * Learning-telemetry service for the UNOS research study
 * ("How typhoons develop and how they are affected by land masses and
 * bodies of water").
 *
 * Records gameplay + quiz events into localStorage, grouped into "runs"
 * (one sitting). A new run starts automatically after 30 minutes of
 * inactivity, or manually from the Dashboard ("New Session"). No server
 * needed — the researcher exports CSV/JSON from the Dashboard after each
 * session.
 *
 * Quiz-answer attempts are auto-counted per (level, question) within a run,
 * so unlock-gate retries and boss-quiz reshuffles are visible in the data.
 */

export type TelemetryEventType =
  | 'app_start'
  | 'level_start'
  | 'level_complete'
  | 'level_fail'
  | 'quiz_answer'
  | 'stage_reached'
  | 'participant_set';

export interface TelemetryEvent {
  t: number; // epoch ms
  type: TelemetryEventType;
  level?: string;
  /** quiz mode: 'gate' | 'final' | 'boss' */
  mode?: string;
  topic?: string;
  question?: string;
  correct?: boolean;
  /** auto-stamped by the service: 1 = first try, 2+ = retries */
  attempt?: number;
  score?: number;
  stars?: number;
  /** seconds spent in the level */
  timeSpent?: number;
  reason?: string;
  /** typhoon formation stage tier (1-6) */
  stage?: string;
  detail?: string;
}

export interface TelemetryRun {
  id: string;
  startedAt: number;
  lastActiveAt: number;
  participantId: string;
  events: TelemetryEvent[];
}

export interface TelemetryStats {
  runCount: number;
  eventCount: number;
  lastActiveAt: number | null;
  participantId: string;
}

interface TelemetryStore {
  runs: TelemetryRun[];
}

const STORAGE_KEY = 'unos_telemetry';
const RUN_GAP_MS = 30 * 60 * 1000; // idle longer than this → new run
const MAX_RUNS = 20;
const MAX_EVENTS_PER_RUN = 1500;

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* quota / private mode — keep in memory */ }
}

class Telemetry {
  private store: TelemetryStore = { runs: [] };
  private currentRunId: string | null = null;
  private loaded = false;
  /** attempt counters per `${level}::${question}` for the current run */
  private attempts = new Map<string, number>();

  // ── persistence ──────────────────────────────────────────────────────────

  private load(): void {
    this.loaded = true;
    const raw = safeGet(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as TelemetryStore;
      if (parsed && Array.isArray(parsed.runs)) this.store = parsed;
    } catch { /* corrupted — start fresh */ }

    // Continue the newest run if it's still active, and rebuild its
    // attempt counters so quiz-retry counts survive a page reload.
    const latest = this.store.runs[this.store.runs.length - 1];
    if (latest) {
      this.currentRunId = latest.id;
      for (const e of latest.events) {
        if (e.type === 'quiz_answer' && e.level && e.question) {
          const key = e.level + '::' + e.question;
          this.attempts.set(key, Math.max(this.attempts.get(key) ?? 0, e.attempt ?? 0));
        }
      }
    }
  }

  private save(): void {
    // keep only the newest runs / events so localStorage can't overflow
    this.store.runs = this.store.runs.slice(-MAX_RUNS);
    for (const run of this.store.runs) {
      if (run.events.length > MAX_EVENTS_PER_RUN) {
        run.events = run.events.slice(-MAX_EVENTS_PER_RUN);
      }
    }
    safeSet(STORAGE_KEY, JSON.stringify(this.store));
  }

  // ── run management ───────────────────────────────────────────────────────

  private ensureRun(): TelemetryRun {
    if (!this.loaded) this.load();
    const now = Date.now();
    let run = this.currentRunId
      ? this.store.runs.find(r => r.id === this.currentRunId)
      : undefined;
    if (!run || now - run.lastActiveAt > RUN_GAP_MS) {
      run = {
        id: 'run_' + now + '_' + Math.random().toString(36).slice(2, 8),
        startedAt: now,
        lastActiveAt: now,
        participantId: '',
        events: [],
      };
      this.store.runs.push(run);
      this.currentRunId = run.id;
      this.attempts.clear();
    }
    return run;
  }

  /** Force a fresh run (new participant / new sitting) from the Dashboard. */
  startNewRun(): void {
    this.currentRunId = null;
    this.attempts.clear();
    this.ensureRun();
    this.log('app_start', { detail: 'manual session start' });
  }

  // ── events ───────────────────────────────────────────────────────────────

  log(type: TelemetryEventType, data: Partial<TelemetryEvent> = {}): void {
    const run = this.ensureRun();
    const now = Date.now();
    run.lastActiveAt = now;

    const event: TelemetryEvent = { t: now, type, ...data };

    // auto-count attempts per question within the run
    if (type === 'quiz_answer' && event.level && event.question) {
      const key = event.level + '::' + event.question;
      const next = (this.attempts.get(key) ?? 0) + 1;
      this.attempts.set(key, next);
      event.attempt = next;
    }

    run.events.push(event);
    this.save();
  }

  /** Attach a participant ID to the current run (typed per student). */
  setParticipant(id: string): void {
    const run = this.ensureRun();
    run.participantId = id.trim();
    run.lastActiveAt = Date.now();
    this.save();
    this.log('participant_set', { detail: run.participantId });
  }

  // ── read / export ────────────────────────────────────────────────────────

  getStats(): TelemetryStats {
    if (!this.loaded) this.load();
    const runs = this.store.runs;
    const current = this.currentRunId
      ? runs.find(r => r.id === this.currentRunId)
      : runs[runs.length - 1];
    return {
      runCount: runs.length,
      eventCount: runs.reduce((a, r) => a + r.events.length, 0),
      lastActiveAt: runs.length ? runs[runs.length - 1].lastActiveAt : null,
      participantId: current?.participantId ?? '',
    };
  }

  exportJSON(): string {
    if (!this.loaded) this.load();
    return JSON.stringify({ exportedAt: new Date().toISOString(), runs: this.store.runs }, null, 2);
  }

  private static readonly CSV_COLUMNS = [
    'run_id', 'participant_id', 'run_start', 'event_time', 'ms_since_run_start',
    'type', 'level', 'mode', 'topic', 'correct', 'attempt', 'score', 'stars',
    'time_spent_s', 'stage', 'reason', 'question', 'detail',
  ] as const;

  exportCSV(): string {
    if (!this.loaded) this.load();
    const esc = (v: unknown): string => {
      const s = v === undefined || v === null ? '' : String(v);
      return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const rows: string[] = [[...Telemetry.CSV_COLUMNS].join(',')];
    for (const run of this.store.runs) {
      const runStart = new Date(run.startedAt).toISOString();
      for (const e of run.events) {
        rows.push([
          run.id, run.participantId, runStart, new Date(e.t).toISOString(),
          e.t - run.startedAt, e.type, e.level, e.mode, e.topic,
          e.correct === undefined ? '' : e.correct ? 'TRUE' : 'FALSE',
          e.attempt, e.score, e.stars, e.timeSpent, e.stage, e.reason, e.question, e.detail,
        ].map(esc).join(','));
      }
    }
    return rows.join('\r\n') + '\r\n';
  }

  private download(filename: string, content: string, mime: string): void {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  downloadCSV(): void {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    this.download('unos_telemetry_' + stamp + '.csv', this.exportCSV(), 'text/csv;charset=utf-8');
  }

  downloadJSON(): void {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    this.download('unos_telemetry_' + stamp + '.json', this.exportJSON(), 'application/json');
  }

  /** Wipe all recorded data (Dashboard "Clear"). */
  clear(): void {
    this.store = { runs: [] };
    this.currentRunId = null;
    this.attempts.clear();
    this.loaded = true;
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }
}

// App boot — one event per page load; also opens the first run.
// (Module import runs exactly once per page load, even with React StrictMode.)
export const telemetry = new Telemetry();
telemetry.log('app_start');
