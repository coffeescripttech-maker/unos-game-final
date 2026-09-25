import { useMemo } from 'react';
import * as THREE from 'three';
import { Maximize2, Minimize2 } from 'lucide-react';
import MiniMap from './MiniMap';
import InteractionPrompt from './InteractionPrompt';
import NotificationToast from './NotificationToast';
import { useFullscreen } from '../../../hooks/useFullscreen';
import type { MissionState, ObjectiveId, CollectibleData, StormParams } from '../types';
import { LEVEL_CONFIGS } from '@shared/constants';

interface BossHUDProps {
  mission: MissionState;
  elapsedTime: number;
  boatPosition: THREE.Vector3;
  boatYaw: number;
  boatSpeed: number;
  storm: StormParams;
  collectibles: CollectibleData[];
  buoyDeployed: boolean;
  onPause?: () => void;
  onExit?: () => void;
  onShowIntro?: () => void;
}

const OBJECTIVE_LABELS: Record<ObjectiveId, { label: string; icon: string; color: string }> = {
  collect_temperature: { label: 'Temperature', icon: '🌡️', color: '#ff6b6b' },
  collect_humidity: { label: 'Humidity', icon: '💧', color: '#4ecdc4' },
  collect_pressure: { label: 'Pressure', icon: '🌀', color: '#a8e6cf' },
  collect_windspeed: { label: 'Wind Speed', icon: '💨', color: '#95e1d3' },
  deploy_buoy: { label: 'Deploy Weather Buoy', icon: '🛟️', color: '#ffeaa7' },
  reach_eye: { label: 'Reach the Eye', icon: '👁️', color: '#dfe6e9' },
  complete: { label: 'Mission Complete', icon: '🏆', color: '#fdcb6e' },
};

const TITLE_SHADOW = 'drop-shadow-[2px_2px_0_rgba(0,0,0,0.7)]';
const LABEL_SHADOW = 'drop-shadow-[1px_1px_0_rgba(0,0,0,0.6)]';

// Compact corner-button style shared by every topbar action
const ICON_BTN =
  'flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md border-2 border-black text-white shadow-retro transition-transform hover:brightness-110 active:scale-95 pointer-events-auto text-sm';

/**
 * Retro-styled boss mission HUD — kept small and out of the way so the
 * storm/action stays readable, especially on mobile. The fullscreen toggle
 * is available here (matching the Phaser level HUD) and there is no
 * hide-HUD mode; panels are just compact.
 */
export default function BossHUD({
  mission,
  elapsedTime,
  boatPosition,
  boatYaw,
  boatSpeed,
  collectibles,
  buoyDeployed,
  onPause,
  onExit,
  onShowIntro,
}: BossHUDProps) {
  const { isFullscreen, isSupported, toggle } = useFullscreen();

  const minutes = Math.floor(elapsedTime / 60);
  const seconds = Math.floor(elapsedTime % 60);
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const completedCount = mission.objectives.filter(o => o.completed).length;
  const totalCount = mission.objectives.length;

  const formatDist = (d: number) => {
    if (d >= 1000) return `${(d / 1000).toFixed(1)} km`;
    return `${Math.round(d)} m`;
  };

  // Live running score (same curve used at mission complete)
  const score = useMemo(() => {
    const raw = Math.round(mission.boatIntegrity * 25 + Math.max(0, 300 - elapsedTime) * 3) + (mission.quizBonus ?? 0);
    return Math.min(LEVEL_CONFIGS.boss.maxScore, raw);
  }, [mission.boatIntegrity, elapsedTime, mission.quizBonus]);

  const hpPct = Math.max(0, (mission.boatIntegrity / mission.maxIntegrity) * 100);
  const hpLow = mission.boatIntegrity <= 30;
  const hpColor = mission.boatIntegrity > 60
    ? 'bg-accent-green'
    : mission.boatIntegrity > 30
      ? 'bg-accent-yellow'
      : 'bg-warning-red';
  const hpGlow = mission.boatIntegrity > 60
    ? 'shadow-[0_0_6px_rgba(6,214,160,0.5)]'
    : mission.boatIntegrity > 30
      ? 'shadow-[0_0_6px_rgba(255,209,102,0.5)]'
      : 'shadow-[0_0_8px_rgba(214,40,40,0.6)]';

  const waveHt = mission.isInEye ? '0.1m' : `${(2 + mission.distanceToEye * 0.02).toFixed(1)}m`;
  const wind = mission.isInEye ? '0' : `${(20 + (250 - mission.distanceToEye) * 0.2).toFixed(0)}`;
  const rain = mission.isInEye ? 'None' : 'Heavy';
  const land = mission.isInEye ? 'N/A' : `${Math.round(mission.landProximity * 100)}%`;

  return (
    <div className="boss-hud absolute inset-0 pointer-events-none select-none">
      {/* ── Compact topbar ── */}
      <div className="hud-topbar absolute top-0 left-0 right-0 z-40 grid grid-cols-3 items-center px-2.5 sm:px-5 py-1.5 bg-storm-dark/90 border-b-3 border-black shadow-lg shadow-black/30 pointer-events-auto">
        {/* Left: Level name */}
        <span className={`font-display text-[11px] sm:text-sm text-accent-yellow truncate max-w-[80px] sm:max-w-[200px] ${TITLE_SHADOW}`}>
          RIDE THE STORM
        </span>

        {/* Center: Live score */}
        <div className="flex items-center justify-center gap-1.5">
          <span className={`hidden md:inline font-display text-[10px] uppercase tracking-wider text-storm-light ${LABEL_SHADOW}`}>Score</span>
          <span className={`font-display text-base sm:text-xl text-accent-yellow tabular-nums ${TITLE_SHADOW}`}>
            {score.toLocaleString()}
          </span>
        </div>

        {/* Right: Timer + buttons */}
        <div className="flex items-center justify-end gap-1 sm:gap-1.5">
          <div className="hidden sm:flex items-center px-1.5 py-0.5 rounded-md bg-ui-black/40 border border-white/10">
            <span className={`font-display text-sm text-white tabular-nums ${TITLE_SHADOW}`}>{timeStr}</span>
          </div>
          {onShowIntro && (
            <button onClick={onShowIntro} className={`${ICON_BTN} bg-ocean-surface/90`} title="Show instructions" aria-label="Show instructions">
              📖
            </button>
          )}
          {onPause && (
            <button onClick={onPause} className={`${ICON_BTN} bg-storm-mid`} title="Pause" aria-label="Pause">
              ⏸
            </button>
          )}
          {isSupported && (
            <button
              onClick={toggle}
              className={`${ICON_BTN} bg-storm-mid`}
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}
          {onExit && (
            <button onClick={onExit} className={`${ICON_BTN} bg-warning-red/90`} title="Back to World Map" aria-label="Back to World Map">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Top-left stack: compact hull bar + objectives ── */}
      {/* max-h keeps it clear of the on-screen joystick (bottom-left) on mobile;
          overflow-y-auto scrolls the list if the viewport is really short. */}
      <div className="absolute top-[46px] left-2 sm:left-3 flex flex-col gap-1 pointer-events-auto max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar pr-0.5">
        {/* Hull integrity + boost, single compact row */}
        <div className="retro-card !p-1 !px-2 !bg-storm-dark/80 border-accent-yellow/30 flex items-center gap-1.5 shrink-0">
          <span className="text-[11px]" aria-hidden>🛡️</span>
          <div className="relative w-14 h-1.5 min-w-14">
            <div className="absolute inset-0 bg-ui-black rounded border border-white/10" />
            <div
              className={`absolute inset-0 ${hpColor} rounded transition-all duration-300 ${hpGlow}`}
              style={{ width: `${hpPct}%` }}
            />
          </div>
          <span className={`font-display text-[10px] tabular-nums ${hpLow ? 'text-warning-red' : 'text-white'} ${LABEL_SHADOW}`}>
            {Math.round(hpPct)}%
          </span>
          <span className={`text-[9px] font-display ${boatSpeed > 20 ? 'text-accent-yellow' : 'text-storm-light/70'}`} title="Boost (Shift)">
            ⚡
          </span>
        </div>

        {/* Mission objectives, compact list */}
        <div className="retro-card !p-1 !px-1.5 !bg-storm-dark/80 border-accent-yellow/40 flex flex-col">
          <div className={`font-body text-[8px] uppercase tracking-widest text-accent-yellow ${LABEL_SHADOW}`}>
            Mission {completedCount}/{totalCount}
          </div>
          {mission.objectives.filter(o => {
            if (o.id === 'complete') return false;
            // Hide 'Reach the Eye' until the buoy is deployed
            if (o.id === 'reach_eye' && !o.completed && mission.currentObjective !== 'reach_eye') return false;
            return true;
          }).map(obj => {
            const info = OBJECTIVE_LABELS[obj.id];
            const isActive = mission.currentObjective === obj.id;
            const isCompleted = obj.completed;
            return (
              <div
                key={obj.id}
                className={[
                  'flex items-center gap-1 rounded px-1 py-[1px] font-body text-[10px] leading-tight',
                  isActive ? 'bg-accent-yellow/20 text-accent-yellow font-bold' : 'text-storm-light',
                  isCompleted ? 'opacity-50 line-through' : '',
                  LABEL_SHADOW,
                ].join(' ')}
              >
                <span className="shrink-0">{isCompleted ? '✅' : isActive ? '▶' : '○'}{info.icon}</span>
                <span className="truncate">{info.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Top-right stack: compact minimap + speed + weather ── */}
      <div className="absolute top-[46px] right-2 sm:right-3 flex flex-col gap-1 items-end pointer-events-auto">
        <div className="retro-card !p-1 !px-1.5 !bg-storm-dark/80 border-storm-light/40 flex items-center gap-2">
          <div className="flex flex-col items-end leading-tight">
            <span className={`font-body text-[8px] uppercase tracking-widest ${mission.isInEye ? 'text-accent-yellow' : 'text-storm-light'} ${LABEL_SHADOW}`}>
              {mission.isInEye ? '◆ In the Eye' : `Phase ${mission.phase}`}
            </span>
            <span className={`font-display text-[11px] text-accent-yellow tabular-nums ${TITLE_SHADOW}`}>
              💨 {boatSpeed.toFixed(1)}
              <span className="text-[8px] text-storm-light ml-0.5">kn</span>
            </span>
          </div>
          <div className="relative rounded-full ring-2 ring-accent-green/40 shadow-[0_0_8px_rgba(6,214,160,0.35)]">
            <MiniMap
              boatPosition={boatPosition}
              boatYaw={boatYaw}
              collectibles={collectibles}
              collectedIds={mission.collectedData}
              currentObjective={mission.currentObjective}
              deployedBuoy={buoyDeployed}
              isInEye={mission.isInEye}
              size={104}
            />
          </div>
        </div>

        {/* Compact weather readout (2×2 mini stats) */}
        <div className="retro-card !px-1.5 !py-1 !bg-storm-dark/80 border-storm-light/40 grid grid-cols-2 gap-x-2 gap-y-0.5 font-body text-[9px] text-storm-light text-right">
          <span><span className="mr-0.5">🌊</span><b className="text-white font-normal">{waveHt}</b></span>
          <span><span className="mr-0.5">💨</span><b className="text-white font-normal">{wind}</b><span className="text-storm-light/70">km/h</span></span>
          <span><span className="mr-0.5">🌧️</span><b className="text-white font-normal">{rain}</b></span>
          <span><span className="mr-0.5">🏝️</span><b className="text-white font-normal">{land}</b></span>
        </div>
      </div>

      {/* Bottom center — Distance to Eye (small pill) */}
      <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 retro-card !px-2 !py-0.5 pointer-events-auto border-2 ${
        mission.isInEye
          ? 'border-accent-green/50 text-accent-yellow shadow-[0_0_12px_rgba(6,214,160,0.4)]'
          : 'border-storm-light/40 text-accent-green shadow-[0_0_10px_rgba(6,214,160,0.15)]'
      }`}>
        <span className="text-[10px]" aria-hidden>{mission.isInEye ? '◆' : '👁️'}</span>
        <span className={`font-display text-[11px] ${TITLE_SHADOW}`}>
          {mission.isInEye ? 'INSIDE EYE' : `${formatDist(mission.distanceToEye)} to Eye`}
        </span>
      </div>

      {/* Interaction prompt */}
      <InteractionPrompt
        text={mission.interactionPrompt || ''}
        visible={!!mission.interactionPrompt}
      />

      {/* Notification toast */}
      <NotificationToast notification={mission.lastNotification} />
    </div>
  );
}