import { useMemo } from 'react';
import * as THREE from 'three';
import MiniMap from './MiniMap';
import Compass from './Compass';
import InteractionPrompt from './InteractionPrompt';
import NotificationToast from './NotificationToast';
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

/**
 * Retro-styled boss mission HUD.
 * Uses the game's shared Tailwind HUD tokens (hud-topbar, retro-card, font-display,
 * font-body, etc.) so the boss level feels consistent with the Phaser levels.
 */
export default function BossHUD({
  mission,
  elapsedTime,
  boatPosition,
  boatYaw,
  boatSpeed,
  storm,
  collectibles,
  buoyDeployed,
  onPause,
  onExit,
  onShowIntro,
}: BossHUDProps) {
  const minutes = Math.floor(elapsedTime / 60);
  const seconds = Math.floor(elapsedTime % 60);

  const completedCount = mission.objectives.filter(o => o.completed).length;
  const totalCount = mission.objectives.length;

  const formatDist = (d: number) => {
    if (d >= 1000) return `${(d / 1000).toFixed(1)} km`;
    return `${Math.round(d)} m`;
  };

  const dirToEye = Math.atan2(
    0 - boatPosition.x,
    -150 - boatPosition.z,
  );

  // Live running score (same curve used at mission complete)
  const score = useMemo(() => {
    const raw = Math.round(mission.boatIntegrity * 25 + Math.max(0, 300 - elapsedTime) * 3) + (mission.quizBonus ?? 0);
    return Math.min(LEVEL_CONFIGS.boss.maxScore, raw);
  }, [mission.boatIntegrity, elapsedTime, mission.quizBonus]);

  const hpPct = Math.max(0, (mission.boatIntegrity / mission.maxIntegrity) * 100);
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

  return (
    <div className="boss-hud absolute inset-0 pointer-events-none select-none">
      {/* ── Shared-style topbar header ── */}
      <div className="hud-topbar absolute top-0 left-0 right-0 z-40 grid grid-cols-3 items-center px-5 py-2.5 bg-storm-dark/90 border-b-3 border-black shadow-lg shadow-black/30 pointer-events-auto">
        {/* Left: Level name */}
        <span className={`font-display text-base text-accent-yellow truncate ${TITLE_SHADOW}`}>
          RIDE THE STORM
        </span>

        {/* Center: Live score */}
        <div className="flex items-center justify-center gap-2">
          <span className={`font-display text-[10px] uppercase tracking-wider text-storm-light ${LABEL_SHADOW}`}>Score</span>
          <span className={`font-display text-2xl text-accent-yellow tabular-nums ${TITLE_SHADOW}`}>
            {score.toLocaleString()}
          </span>
        </div>

        {/* Right: Timer + Pause + Exit */}
        <div className="flex items-center justify-end gap-2">
          <div className="hud-timer flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-ui-black/50 border border-white/10 shadow-inner">
            <span className="text-lg">⏱️</span>
            <span className={`font-display text-xl text-white tabular-nums ${TITLE_SHADOW}`}>
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          </div>
          {onShowIntro && (
            <button
              onClick={onShowIntro}
              className="flex h-9 w-9 items-center justify-center rounded-md border-2 border-black bg-ocean-surface/90 text-white shadow-retro transition-transform hover:bg-ocean-surface active:scale-95 pointer-events-auto text-sm"
              title="Show instructions"
              aria-label="Show instructions"
            >
              📖
            </button>
          )}
          {onPause && (
            <button
              onClick={onPause}
              className="flex h-9 w-9 items-center justify-center rounded-md border-2 border-black bg-storm-mid text-white shadow-retro transition-transform hover:bg-storm-light hover:shadow-retro-hover active:scale-95 active:shadow-retro-active pointer-events-auto text-sm"
              title="Pause"
              aria-label="Pause"
            >
              ⏸
            </button>
          )}
          {onExit && (
            <button
              onClick={onExit}
              className="hud-back flex h-9 w-9 items-center justify-center rounded-md border-2 border-black bg-warning-red/90 text-white shadow-retro transition-transform hover:bg-warning-red hover:shadow-retro-hover active:scale-95 active:shadow-retro-active pointer-events-auto"
              title="Back to World Map"
              aria-label="Back to World Map"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Left stack: Hull Integrity + Mission Objectives ── */}
      <div className="absolute top-[64px] left-3 flex flex-col gap-3 min-w-[150px] sm:min-w-[180px] pointer-events-auto">
        {/* Hull integrity */}
        <div className="hud-health retro-card !p-2.5 !bg-storm-dark/90 border-accent-yellow/30 flex flex-col gap-1 shadow-[0_0_12px_rgba(6,214,160,0.15)]">
          <div className={`font-body text-[10px] uppercase tracking-wider text-accent-yellow ${LABEL_SHADOW}`}>
            Hull Integrity
          </div>
          <div className="relative w-full h-2.5">
            <div className="absolute inset-0 bg-ui-black rounded border border-white/10 shadow-inner" />
            <div className="absolute inset-0 flex items-center">
              <div
                className={`h-full ${hpColor} transition-all duration-300 rounded ${hpGlow}`}
                style={{ width: `${hpPct}%` }}
              />
            </div>
          </div>
          <div className={`font-display text-xs text-${mission.boatIntegrity > 30 ? 'white' : 'warning-red'} text-right ${LABEL_SHADOW}`}>
            {Math.round(hpPct)}%
          </div>

          {/* Boost meter */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-body text-[9px] uppercase tracking-wider text-storm-light">Shift</span>
            <div className="relative w-full h-1.5">
              <div className="absolute inset-0 bg-ui-black rounded border border-white/10 shadow-inner" />
              <div
                className={`absolute inset-y-0 left-0 flex items-center transition-all duration-100 ${
                  boatSpeed > 20
                    ? 'bg-accent-yellow shadow-[0_0_6px_rgba(255,209,102,0.7)]'
                    : 'bg-storm-mid'
                }`}
                style={{ width: boatSpeed > 20 ? '100%' : '0%' }}
              />
            </div>
            <span className={`text-[9px] font-display transition-colors duration-100 ${
              boatSpeed > 20 ? 'text-accent-yellow' : 'text-storm-light'
            }`}>
              ⚡
            </span>
          </div>
        </div>

        {/* Mission Objectives */}
        <div className="retro-card !p-2.5 !bg-storm-dark/90 border-accent-yellow/40 flex flex-col gap-1.5 shadow-[0_0_12px_rgba(255,215,0,0.12)]">
          <div className={`font-body text-[10px] uppercase tracking-widest text-accent-yellow mb-0.5 ${LABEL_SHADOW}`}>
            Mission — {completedCount}/{totalCount}
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
                  'flex items-center gap-2 px-2 py-1 rounded font-body text-xs transition-colors',
                  isActive
                    ? 'bg-accent-yellow/20 border-l-2 border-accent-yellow shadow-[inset_0_0_6px_rgba(255,215,0,0.2)]'
                    : 'hover:bg-white/5',
                  isCompleted
                    ? 'opacity-60 border-l-2 border-accent-green'
                    : '',
                  !isActive && !isCompleted ? 'border-l-2 border-transparent' : '',
                ].join(' ')}
              >
                <span className={LABEL_SHADOW}>{isCompleted ? '✅' : isActive ? '▶ ' : '○ '}{info.icon}</span>
                <span className={[
                  isActive ? 'text-accent-yellow font-bold' : 'text-storm-light',
                  isCompleted ? 'line-through' : '',
                  LABEL_SHADOW,
                ].join(' ')}>
                  {info.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right stack: Phase + Compass, Mini-map ── */}
      <div className="absolute top-[64px] right-3 flex flex-col gap-3 pointer-events-auto">
        {/* Phase + compass */}
        <div className="retro-card !p-2 !bg-storm-dark/90 border-accent-yellow/40 flex flex-col items-center gap-1 min-w-[120px] shadow-[0_0_10px_rgba(255,215,0,0.12)]">
          <div className={`font-body text-[10px] uppercase tracking-widest text-accent-yellow text-center ${LABEL_SHADOW}`}>
            {mission.isInEye ? '◆ In the Eye ◆' : `Phase ${mission.phase} — Ride the Storm`}
          </div>
          {mission.isInEye && (
            <div className={`font-display text-sm text-accent-green ${LABEL_SHADOW}`}>
              🌊 Calm Waters
            </div>
          )}
          <Compass boatYaw={boatYaw} targetAngle={dirToEye} storm={storm} />
        </div>

        {/* Mini-map + boat speed */}
        <div className="retro-card !p-2 !bg-storm-dark/90 border-storm-light/40 flex flex-col items-center gap-1.5 min-w-[160px] shadow-[0_0_12px_rgba(6,214,160,0.18)]">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg">💨</span>
            <span className={`font-display text-sm text-accent-yellow ${LABEL_SHADOW}`}>Speed</span>
            <span className={`font-display text-xl text-white tabular-nums ${TITLE_SHADOW}`}>
              {boatSpeed.toFixed(1)}
            </span>
            <span className={`font-body text-[10px] text-storm-light uppercase ${LABEL_SHADOW}`}>kn</span>
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
            />
          </div>
        </div>
      </div>

      {/* Bottom center — Distance to Eye */}
      <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 retro-card !p-2 flex flex-col items-center gap-0.5 pointer-events-auto border-2 ${
        mission.isInEye
          ? 'border-accent-green/50 text-accent-yellow shadow-[0_0_12px_rgba(6,214,160,0.4)]'
          : 'border-storm-light/40 text-accent-green shadow-[0_0_10px_rgba(6,214,160,0.15)]'
      }`}>
        <div className={`font-body text-[10px] uppercase tracking-widest ${mission.isInEye ? 'text-accent-yellow' : 'text-storm-light'} ${LABEL_SHADOW}`}>
          Distance to Eye
        </div>
        <div className={`font-display text-lg sm:text-xl ${TITLE_SHADOW}`}>
          {mission.isInEye ? '◆ INSIDE EYE' : formatDist(mission.distanceToEye)}
        </div>
      </div>

      {/* Bottom-right — Weather data */}
      <div className="absolute bottom-4 right-3 retro-card !p-2.5 !bg-storm-dark/90 border-storm-light/40 flex flex-col gap-1 font-body text-[10px] sm:text-xs text-storm-light text-right pointer-events-auto shadow-[0_0_10px_rgba(6,214,160,0.12)]">
        <div className={`font-body text-[9px] uppercase tracking-wider text-accent-yellow mb-0.5 ${LABEL_SHADOW}`}>
          Weather Readout
        </div>
        <div className={`flex items-center gap-1 ${LABEL_SHADOW}`}>
          <span>🌊</span> Wave Ht: <span className={`text-white ${LABEL_SHADOW}`}>{mission.isInEye ? '0.1m' : `${(2 + mission.distanceToEye * 0.02).toFixed(1)}m`}</span>
        </div>
        <div className={`flex items-center gap-1 ${LABEL_SHADOW}`}>
          <span>💨</span> Wind: <span className={`text-white ${LABEL_SHADOW}`}>{mission.isInEye ? '0 km/h' : `${(20 + (250 - mission.distanceToEye) * 0.2).toFixed(0)} km/h`}</span>
        </div>
        <div className={`flex items-center gap-1 ${LABEL_SHADOW}`}>
          <span>🌧️</span> Rain: <span className={`text-white ${LABEL_SHADOW}`}>{mission.isInEye ? 'None' : 'Heavy'}</span>
        </div>
        <div className={`flex items-center gap-1 ${LABEL_SHADOW}`}>
          <span>🏝️</span> Land Influence: <span className={`text-white ${LABEL_SHADOW}`}>{mission.isInEye ? 'N/A' : `${Math.round(mission.landProximity * 100)}%`}</span>
        </div>
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
