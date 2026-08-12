import type { MissionState, ObjectiveId, CollectibleData } from '../types';
import MiniMap from './MiniMap';
import Compass from './Compass';
import InteractionPrompt from './InteractionPrompt';
import NotificationToast from './NotificationToast';
import * as THREE from 'three';

interface BossHUDProps {
  mission: MissionState;
  elapsedTime: number;
  boatPosition: THREE.Vector3;
  boatYaw: number;
  collectibles: CollectibleData[];
  buoyDeployed: boolean;
  onPause?: () => void;
}

const OBJECTIVE_LABELS: Record<ObjectiveId, { label: string; icon: string; color: string }> = {
  collect_temperature: { label: 'Temperature', icon: '🌡️', color: '#ff6b6b' },
  collect_humidity: { label: 'Humidity', icon: '💧', color: '#4ecdc4' },
  collect_pressure: { label: 'Pressure', icon: '🌀', color: '#a8e6cf' },
  collect_windspeed: { label: 'Wind Speed', icon: '💨', color: '#95e1d3' },
  deploy_buoy: { label: 'Deploy Weather Buoy', icon: '🛟', color: '#ffeaa7' },
  reach_eye: { label: 'Reach the Eye', icon: '👁️', color: '#dfe6e9' },
  complete: { label: 'Mission Complete', icon: '🏆', color: '#fdcb6e' },
};

/**
 * Boss mission HUD overlay.
 * Full-featured: objectives, integrity, minimap, compass, prompts, notifications, timer.
 */
export default function BossHUD({
  mission,
  elapsedTime,
  boatPosition,
  boatYaw,
  collectibles,
  buoyDeployed,
  onPause,
}: BossHUDProps) {
  const minutes = Math.floor(elapsedTime / 60);
  const seconds = Math.floor(elapsedTime % 60);

  const completedCount = mission.objectives.filter(o => o.completed).length;
  const totalCount = mission.objectives.length;

  const formatDist = (d: number) => {
    if (d >= 1000) return `${(d / 1000).toFixed(1)} km`;
    return `${Math.round(d)} m`;
  };

  // Direction from boat to eye (for compass)
  const dirToEye = Math.atan2(
    0 - boatPosition.x,
    -150 - boatPosition.z,
  );

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      fontFamily: "'Courier New', monospace",
      color: '#e0e0e0',
      userSelect: 'none',
    }}>
      {/* Top bar — integrity + timer + pause */}
      <div style={{
        position: 'absolute',
        top: 12,
        left: 12,
        right: 12,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        pointerEvents: 'auto',
      }}>
        {/* Boat integrity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 11, opacity: 0.7 }}>HULL INTEGRITY</div>
          <div style={{
            width: 160,
            height: 10,
            background: 'rgba(0,0,0,0.5)',
            borderRadius: 5,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            <div style={{
              width: `${Math.max(0, (mission.boatIntegrity / mission.maxIntegrity) * 100)}%`,
              height: '100%',
              background: mission.boatIntegrity > 60
                ? '#4ecdc4'
                : mission.boatIntegrity > 30
                  ? '#ffeaa7'
                  : '#ff6b6b',
              transition: 'width 0.3s, background 0.3s',
            }} />
          </div>
          <div style={{ fontSize: 10, opacity: 0.6 }}>
            {Math.round((mission.boatIntegrity / mission.maxIntegrity) * 100)}%
          </div>
        </div>

        {/* Mission status + compass */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{
            fontSize: 10,
            opacity: 0.7,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}>
            {mission.isInEye ? '◆ IN THE EYE ◆' : `PHASE ${mission.phase} — RIDE THE STORM`}
          </div>
          {mission.isInEye && (
            <div style={{
              fontSize: 14,
              marginTop: 2,
              color: '#ffeaa7',
              textShadow: '0 0 20px rgba(255,234,167,0.5)',
            }}>
              🌊 Calm Waters
            </div>
          )}
          <Compass boatYaw={boatYaw} targetAngle={dirToEye} />
        </div>

        {/* Timer + Pause */}
        <div style={{ textAlign: 'right', pointerEvents: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <div style={{ fontSize: 20, fontWeight: 'bold' }}>
            {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
          <MiniMap
            boatPosition={boatPosition}
            boatYaw={boatYaw}
            collectibles={collectibles}
            collectedIds={mission.collectedData}
            deployedBuoy={buoyDeployed}
            isInEye={mission.isInEye}
          />
          <button
            onClick={onPause}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#e0e0e0',
              padding: '2px 12px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            ⏸ Pause
          </button>
        </div>
      </div>

      {/* Left panel — Objectives */}
      <div style={{
        position: 'absolute',
        top: 80,
        left: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        pointerEvents: 'auto',
      }}>
        <div style={{
          fontSize: 10,
          opacity: 0.7,
          letterSpacing: 2,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}>
          Mission — {completedCount}/{totalCount}
        </div>
        {mission.objectives.filter(o => o.id !== 'complete').map(obj => {
          const info = OBJECTIVE_LABELS[obj.id];
          const isActive = mission.currentObjective === obj.id;
          const isCompleted = obj.completed;
          return (
            <div
              key={obj.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 8px',
                borderRadius: 4,
                background: isActive
                  ? 'rgba(78, 205, 196, 0.15)'
                  : isCompleted
                    ? 'rgba(255,255,255,0.05)'
                    : 'transparent',
                borderLeft: `3px solid ${isCompleted ? '#4ecdc4' : isActive ? '#ffeaa7' : 'transparent'}`,
                opacity: isCompleted ? 0.5 : 1,
                fontSize: 12,
              }}
            >
              <span>{isCompleted ? '✅' : isActive ? '▶ ' : '○ '}{info.icon}</span>
              <span style={{
                textDecoration: isCompleted ? 'line-through' : 'none',
                fontWeight: isActive ? 700 : 400,
                color: isActive ? '#ffeaa7' : '#e0e0e0',
              }}>
                {info.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Bottom center — Distance to Eye */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(0,0,0,0.4)',
        padding: '8px 20px',
        borderRadius: 12,
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{ fontSize: 10, opacity: 0.7 }}>DISTANCE TO EYE</div>
        <div style={{ fontSize: 18, fontWeight: 'bold', color: mission.isInEye ? '#ffeaa7' : '#4ecdc4' }}>
          {mission.isInEye ? '◆ INSIDE EYE' : formatDist(mission.distanceToEye)}
        </div>
      </div>

      {/* Bottom-right — Weather data */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        right: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        fontSize: 11,
        textAlign: 'right',
        opacity: 0.6,
        background: 'rgba(0,0,0,0.3)',
        padding: '8px 12px',
        borderRadius: 8,
      }}>
        <div>🌊 Wave Ht: {mission.isInEye ? '0.1m' : `${(2 + mission.distanceToEye * 0.02).toFixed(1)}m`}</div>
        <div>💨 Wind: {mission.isInEye ? '0 km/h' : `${(20 + (250 - mission.distanceToEye) * 0.2).toFixed(0)} km/h`}</div>
        <div>🌧️ Rain: {mission.isInEye ? 'None' : 'Heavy'}</div>
      </div>

      {/* Interaction prompt (Press E) */}
      <InteractionPrompt
        text={mission.interactionPrompt || ''}
        visible={!!mission.interactionPrompt}
      />

      {/* Notification toast */}
      <NotificationToast notification={mission.lastNotification} />
    </div>
  );
}
