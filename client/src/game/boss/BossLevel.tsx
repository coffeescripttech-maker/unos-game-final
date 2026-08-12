import { useState, useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import Ocean from './components/Ocean';
import Sky from './components/Sky';
import Storm from './components/Storm';
import Philippines from './components/Philippines';
import Boat from './components/Boat';
import Rain from './components/Rain';
import Lightning from './components/Lightning';
import LightningWarning from './components/LightningWarning';
import GiantWave from './components/GiantWave';
import Hazards from './components/Hazards';
import Birds from './components/Birds';
import GodRays from './components/GodRays';
import BoatWake from './components/BoatWake';
import WindParticles from './components/WindParticles';
import OceanSpray from './components/OceanSpray';
import Collectible from './components/Collectible';
import WeatherBuoy from './components/WeatherBuoy';
import BossHUD from './hud/BossHUD';
import { AudioManager } from './AudioManager';
import { useBoatController } from './BoatController';
import {
  computeStormParams, getNextObjective, getPhase,
  checkEyeEntry, distanceToEye,
  createDefaultMissionState, EYE_POSITION, EYE_RADIUS,
} from './MissionManager';
import type { MissionState, StormParams, CollectibleData, ObjectiveId, NotificationData } from './types';

// ── Collectible world positions ──
const COLLECTIBLE_DATA: CollectibleData[] = [
  { id: 'collect_temperature', position: new THREE.Vector3(80, 2, 20), label: 'Temperature', icon: '🌡️', color: '#ff6b6b', collected: false },
  { id: 'collect_humidity', position: new THREE.Vector3(-60, 2, -40), label: 'Humidity', icon: '💧', color: '#4ecdc4', collected: false },
  { id: 'collect_pressure', position: new THREE.Vector3(40, 2, -80), label: 'Pressure', icon: '🌀', color: '#a8e6cf', collected: false },
  { id: 'collect_windspeed', position: new THREE.Vector3(-90, 2, 0), label: 'Wind Speed', icon: '💨', color: '#95e1d3', collected: false },
];

// ── Educational facts ──
const EDUCATIONAL_FACTS = [
  {
    icon: '🌀',
    title: 'Why is the Eye calm?',
    body: 'The eye is the center of the storm where air sinks, creating clear skies and calm winds. Surrounding it, the eyewall has the strongest winds and heaviest rain.',
  },
  {
    icon: '🌊',
    title: 'Why do typhoons need warm oceans?',
    body: 'Typhoons are powered by warm ocean water (at least 26.5°C). The heat and moisture evaporate from the sea, fueling the storm\'s energy.',
  },
  {
    icon: '📡',
    title: 'Why do we collect weather data?',
    body: 'Meteorologists deploy weather buoys and research vessels to measure pressure, temperature, humidity, and wind speed. This data helps forecast track and intensity, saving lives.',
  },
];

// ── Interaction proximity ──
const COLLECT_DISTANCE = 6;

/**
 * SceneContent — all 3D objects inside the R3F Canvas.
 */
function SceneContent({
  boatRef,
  mission,
  storm,
  isInEye,
  audioRef,
  phase,
  onCollect,
  onDeployBuoy,
  onBoatHit,
  onNearCollectible,
  onLightningStrike,
}: {
  boatRef: React.MutableRefObject<THREE.Group | null>;
  mission: MissionState;
  storm: StormParams;
  isInEye: boolean;
  audioRef: React.MutableRefObject<AudioManager | null>;
  phase: number;
  onCollect: (id: string) => void;
  onDeployBuoy: () => void;
  onBoatHit: (damage: number) => void;
  onNearCollectible: (id: ObjectiveId | null) => void;
  onLightningStrike: (pos: THREE.Vector3) => void;
}) {
  const [boatPos, setBoatPos] = useState(new THREE.Vector3(0, 0, 120));
  const [engineRunning, setEngineRunning] = useState(false);
  const [buoyPosition, setBuoyPosition] = useState<THREE.Vector3 | null>(null);
  const [buoyDeployed, setBuoyDeployed] = useState(false);
  const [boatYaw, setBoatYaw] = useState(0);

  // Boat controller
  const { yaw } = useBoatController({
    boatRef,
    storm,
    isInEye,
    onBoatMove: (state) => {
      setBoatPos(state.position.clone());
      setBoatYaw(yaw.current);
      setEngineRunning(state.speed > 0.5);
      audioRef.current?.setEngineSpeed(Math.abs(state.speed) / 20);
    },
    onDeployBuoy: () => {
      if (!buoyDeployed) {
        const pos = boatRef.current?.position.clone() || new THREE.Vector3(0, 0, 120);
        setBuoyPosition(pos);
        setBuoyDeployed(true);
        onDeployBuoy();
      }
    },
    onInteract: () => {
      // Press E — check if near a collectible
      const nearest = getNearestCollectible(boatPos);
      if (nearest) onCollect(nearest);
    },
  });

  // Check proximity to collectibles each frame
  const getNearestCollectible = (pos: THREE.Vector3): ObjectiveId | null => {
    const available = COLLECTIBLE_DATA.filter(d => !d.collected && !mission.collectedData.includes(d.id));
    for (const c of available) {
      const dist = new THREE.Vector3(c.position.x, 0, c.position.z).distanceTo(new THREE.Vector3(pos.x, 0, pos.z));
      if (dist < COLLECT_DISTANCE) return c.id;
    }
    return null;
  };

  // Proximity detection loop
  const proximityRef = useRef(0);
  useFrameEffect(() => {
    proximityRef.current++;
    if (proximityRef.current % 10 !== 0) return; // check every ~10 frames
    const nearest = getNearestCollectible(boatPos);
    onNearCollectible(nearest);
  });

  // Audio update loop
  useFrameEffect(() => {
    audioRef.current?.setWindIntensity(storm.windSpeed * storm.intensity);
    audioRef.current?.setRainIntensity(storm.rainIntensity);
  });

  const showEyeContent = isInEye;

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={isInEye ? 0.6 : 0.15} color={isInEye ? '#aaddff' : '#445566'} />
      <directionalLight
        position={[100, 80, -80]}
        intensity={isInEye ? 1.2 : 0.3}
        color={isInEye ? '#ffdd99' : '#6688aa'}
      />
      <hemisphereLight args={['#aaddff', '#223344', isInEye ? 0.6 : 0.2]} />

      {/* World */}
      <Ocean storm={storm} isInEye={isInEye} boatRef={boatRef} />
      <Sky storm={storm} isInEye={isInEye} boatRef={boatRef} />
      <Storm storm={storm} isInEye={isInEye} />
      <Philippines />
      <Rain storm={storm} isInEye={isInEye} />
      <WindParticles storm={storm} isInEye={isInEye} />
      <LightningWarning
        storm={storm}
        isInEye={isInEye}
        boatPosition={boatPos}
        onStrike={onLightningStrike}
      />
      <Lightning
        storm={storm}
        isInEye={isInEye}
        onThunder={() => audioRef.current?.playThunder()}
      />
      <GiantWave
        storm={storm}
        isInEye={isInEye}
        boatPosition={boatPos}
        onBoatHit={onBoatHit}
      />
      <Hazards
        storm={storm}
        isInEye={isInEye}
        boatPosition={boatPos}
        onBoatHit={onBoatHit}
      />

      {/* Ocean spray / mist */}
      <OceanSpray
        storm={storm}
        isInEye={isInEye}
        boatPosition={boatPos}
      />

      {/* Boat */}
      <Boat
        boatRef={boatRef}
        integrity={mission.boatIntegrity}
        engineRunning={engineRunning}
      />
      <BoatWake
        boatPosition={boatPos}
        boatYaw={boatYaw}
        boatSpeed={Math.abs(mission.collectedData.length > 0 ? 5 : 0)}
        visible={phase >= 1}
      />

      {/* Collectibles (show only in appropriate phases + if not collected) */}
      {COLLECTIBLE_DATA.filter(d => !d.collected).map(data => {
        // Show only if phase allows (Phase 2+ for first 4 collectibles)
        const showInPhase = phase >= 2;
        if (!showInPhase) return null;
        return (
          <Collectible
            key={data.id}
            data={data}
            boatPosition={boatPos}
            onCollect={onCollect}
          />
        );
      })}

      {/* Weather buoy */}
      <WeatherBuoy position={buoyPosition} deployed={buoyDeployed} />

      {/* Eye content */}
      <Birds visible={showEyeContent} />
      <GodRays visible={showEyeContent} />
    </>
  );
}

/** Simple requestAnimationFrame loop for non-mesh updates */
function useFrameEffect(callback: () => void) {
  const cbRef = useRef(callback);
  cbRef.current = callback;
  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      cbRef.current();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    return () => { running = false; };
  }, []);
}

/** Main BossLevel component */
export default function BossLevel({ onComplete }: { onComplete?: () => void }) {
  const [mission, setMission] = useState<MissionState>(createDefaultMissionState());
  const [storm, setStorm] = useState<StormParams>({
    intensity: 0, windSpeed: 0, rainIntensity: 0,
    lightningRate: 0, cloudCover: 0, waveHeight: 0,
  });
  const [phase, setPhase] = useState<number>(1);
  const [isInEye, setIsInEye] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [showFailed, setShowFailed] = useState(false);
  const [showEducation, setShowEducation] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [boatPos, setBoatPos] = useState(new THREE.Vector3(0, 0, 120));
  const [boatYaw, setBoatYaw] = useState(0);

  const boatRef = useRef<THREE.Group>(null);
  const audioRef = useRef<AudioManager | null>(null);
  const notificationIdRef = useRef(0);
  const timeRef = useRef(0);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new AudioManager();
    return () => audioRef.current?.dispose();
  }, []);

  // Create notification
  const notify = useCallback((icon: string, message: string, color: string): NotificationData => ({
    id: `n-${notificationIdRef.current++}`,
    icon,
    message,
    color,
    timestamp: Date.now(),
  }), []);

  // Handle collect (called from SceneContent on E press)
  const handleCollect = useCallback((id: string) => {
    if (mission.collectedData.includes(id as ObjectiveId)) return;
    const coll = COLLECTIBLE_DATA.find(d => d.id === id);
    if (!coll) return;

    coll.collected = true;

    setMission(prev => {
      const collected = [...prev.collectedData, id as ObjectiveId];
      const objectives = prev.objectives.map(o =>
        o.id === id ? { ...o, completed: true } : o
      );
      const nextObj = getNextObjective(collected);
      const label = OBJECTIVE_LABEL_MAP[id as ObjectiveId] || id;
      return {
        ...prev,
        collectedData: collected,
        currentObjective: nextObj,
        objectives,
        interactionPrompt: null,
        lastNotification: notify(coll.icon, `✓ ${label} Collected`, coll.color),
      };
    });

    audioRef.current?.playCollect();
  }, [mission.collectedData, notify]);

  // Handle deploy buoy
  const handleDeployBuoy = useCallback(() => {
    setMission(prev => {
      if (prev.collectedData.includes('deploy_buoy')) return prev;
      const collected = [...prev.collectedData, 'deploy_buoy' as ObjectiveId];
      const objectives = prev.objectives.map(o =>
        o.id === 'deploy_buoy' ? { ...o, completed: true } : o
      );
      const nextObj = getNextObjective(collected);
      return {
        ...prev,
        collectedData: collected,
        currentObjective: nextObj,
        objectives,
        lastNotification: notify('🛟', 'Weather Buoy Deployed!', '#ffeaa7'),
      };
    });
    audioRef.current?.playCollect();
  }, [notify]);

  // Handle boat damage
  const handleBoatHit = useCallback((damage: number) => {
    setMission(prev => {
      const newHp = Math.max(0, prev.boatIntegrity - damage);
      return { ...prev, boatIntegrity: newHp };
    });
  }, []);

  // Handle lightning strike (major damage)
  const handleLightningStrike = useCallback((_pos: THREE.Vector3) => {
    setMission(prev => {
      const newHp = Math.max(0, prev.boatIntegrity - 15);
      return {
        ...prev,
        boatIntegrity: newHp,
        lastNotification: notify('⚡', 'Lightning Strike! Hull damaged!', '#ff4444'),
      };
    });
  }, [notify]);

  // Near collectible
  const handleNearCollectible = useCallback((id: ObjectiveId | null) => {
    setMission(prev => {
      if (prev.interactionPrompt && !id) return { ...prev, interactionPrompt: null };
      if (!id) return prev;
      const coll = COLLECTIBLE_DATA.find(d => d.id === id);
      if (!coll || prev.collectedData.includes(id)) {
        return { ...prev, interactionPrompt: null };
      }
      return {
        ...prev,
        interactionPrompt: `Collect ${coll.label} Data`,
      };
    });
  }, []);

  // Main game loop
  useEffect(() => {
    if (showIntro || showResult || showFailed || isPaused) return;

    const interval = setInterval(() => {
      timeRef.current += 0.1;
      setElapsedTime(timeRef.current);

      const pos = boatRef.current?.position;
      if (!pos) return;
      setBoatPos(pos.clone());

      const dist = distanceToEye(pos, EYE_POSITION);
      const inside = checkEyeEntry(pos, EYE_POSITION, EYE_RADIUS);

      // Compute phase
      const currentPhase = getPhase(mission.collectedData, inside);
      setPhase(currentPhase);

      // Compute storm from phase + distance
      const newStorm = computeStormParams(dist, currentPhase as any);
      setStorm(newStorm);
      setIsInEye(inside);

      // Update mission state
      setMission(prev => {
        const updated = {
          ...prev,
          distanceToEye: dist,
          isInEye: inside,
        };

        // Check if reach_eye objective should auto-complete
        if (inside && !prev.collectedData.includes('reach_eye')) {
          const collected = [...prev.collectedData, 'reach_eye' as ObjectiveId];
          const objectives = prev.objectives.map(o =>
            o.id === 'reach_eye' ? { ...o, completed: true } : o
          );
          return {
            ...updated,
            collectedData: collected,
            currentObjective: 'complete',
            objectives,
            status: 'eye',
            lastNotification: notify('👁️', 'You reached the Eye of the Typhoon!', '#ffeaa7'),
          };
        }

        return updated;
      });

      // Auto-fail check
      if (mission.boatIntegrity <= 0) {
        setShowFailed(true);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [showIntro, showResult, showFailed, isPaused, mission.collectedData, notify]);

  // Trigger mission complete when in eye and all collected
  useEffect(() => {
    if (mission.status === 'eye' && !showResult && !showFailed) {
      const timer = setTimeout(() => {
        audioRef.current?.playComplete();
        setResultMessage('You successfully investigated the typhoon, collected meteorological data, and reached the calm Eye of the Typhoon.');
        setShowResult(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [mission.status, showResult, showFailed]);

  // Start game
  const handleStart = useCallback(() => {
    setShowIntro(false);
    audioRef.current?.init();
    audioRef.current?.playEngineStart();
  }, []);

  // Pause
  const handlePause = useCallback(() => setIsPaused(p => !p), []);

  // Failed → restart
  const handleRestart = useCallback(() => {
    // Reset everything
    setMission(createDefaultMissionState());
    setStorm({ intensity: 0, windSpeed: 0, rainIntensity: 0, lightningRate: 0, cloudCover: 0, waveHeight: 0 });
    setPhase(1);
    setIsInEye(false);
    setElapsedTime(0);
    setShowFailed(false);
    setShowResult(false);
    setShowEducation(false);
    setBoatPos(new THREE.Vector3(0, 0, 120));
    timeRef.current = 0;
    COLLECTIBLE_DATA.forEach(c => c.collected = false);

    // Reset boat position
    if (boatRef.current) {
      boatRef.current.position.set(0, 0, 120);
      boatRef.current.rotation.set(0, 0, 0);
    }
    audioRef.current?.dispose();
    audioRef.current = new AudioManager();
    setShowIntro(true);
  }, []);

  const handleShowEducation = useCallback(() => {
    setShowResult(false);
    setShowEducation(true);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      <Canvas
        camera={{ position: [0, 15, 30], fov: 60, near: 1, far: 600 }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor('#0a1628');
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.2;
          // Atmospheric fog
          scene.fog = new THREE.FogExp2(0x0a1628, 0.0018);
        }}
      >
        <SceneContent
          boatRef={boatRef}
          mission={mission}
          storm={storm}
          isInEye={isInEye}
          audioRef={audioRef}
          phase={phase}
          onCollect={handleCollect}
          onDeployBuoy={handleDeployBuoy}
          onBoatHit={handleBoatHit}
          onNearCollectible={handleNearCollectible}
          onLightningStrike={handleLightningStrike}
        />
      </Canvas>

      {/* HUD */}
      <BossHUD
        mission={mission}
        elapsedTime={elapsedTime}
        boatPosition={boatPos}
        boatYaw={boatYaw}
        collectibles={COLLECTIBLE_DATA}
        buoyDeployed={mission.collectedData.includes('deploy_buoy')}
        onPause={handlePause}
      />

      {/* Pause */}
      {isPaused && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)', zIndex: 100,
        }}>
          <OverlayCard>
            <h2 style={{ fontSize: 32, marginBottom: 16 }}>⏸ PAUSED</h2>
            <button onClick={handlePause} style={btnStyle}>▶ Resume</button>
          </OverlayCard>
        </div>
      )}

      {/* Intro */}
      {showIntro && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,10,0.85)', zIndex: 100,
        }}>
          <OverlayCard>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🌀</div>
            <h1 style={{ fontSize: 28, margin: '0 0 8px', color: '#4ecdc4' }}>
              RIDE THE STORM
            </h1>
            <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 16, letterSpacing: 2 }}>
              — THE EYE OF THE TYPHOON —
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.8, marginBottom: 20 }}>
              Pilot the PAGASA research vessel into the heart of the super typhoon.
              Collect weather data, deploy a scientific buoy, and reach the calm
              Eye of the Typhoon.
            </p>
            <div style={{
              fontSize: 12, opacity: 0.6, marginBottom: 20,
              padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: 8,
            }}>
              <div>WASD — Steer · Shift — Boost</div>
              <div>Mouse — Look · Space — Deploy Buoy · E — Interact</div>
            </div>
            <button onClick={handleStart} style={{
              ...btnStyle, background: 'linear-gradient(135deg, #4ecdc4, #44bd9e)',
              padding: '10px 40px', fontSize: 16,
            }}>
              DEPLOY
            </button>
          </OverlayCard>
        </div>
      )}

      {/* Mission Failed */}
      {showFailed && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(10,0,0,0.8)', zIndex: 100,
        }}>
          <OverlayCard border="#ff4444">
            <div style={{ fontSize: 48, marginBottom: 8 }}>💥</div>
            <h1 style={{ fontSize: 28, margin: '0 0 8px', color: '#ff4444' }}>
              MISSION FAILED
            </h1>
            <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.8, marginBottom: 20 }}>
              Your research vessel sustained too much damage.
              The storm was too powerful.
            </p>
            <button onClick={handleRestart} style={{
              ...btnStyle, background: 'linear-gradient(135deg, #ff6b6b, #e17055)',
              padding: '10px 40px', fontSize: 16,
            }}>
              TRY AGAIN
            </button>
          </OverlayCard>
        </div>
      )}

      {/* Mission Complete */}
      {showResult && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,10,0.8)', zIndex: 100,
        }}>
          <OverlayCard border="#fdcb6e">
            <div style={{ fontSize: 48, marginBottom: 8 }}>🏆</div>
            <h1 style={{ fontSize: 28, margin: '0 0 8px', color: '#fdcb6e' }}>
              MISSION COMPLETE
            </h1>
            <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.9, marginBottom: 16 }}>
              {resultMessage}
            </p>
            <div style={{
              fontSize: 12, opacity: 0.7, marginBottom: 20,
              padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: 8,
            }}>
              <div>⏱️ Time: {Math.floor(elapsedTime / 60)}m {Math.floor(elapsedTime % 60)}s</div>
              <div>📊 Data Collected: {mission.collectedData.length}/7</div>
              <div>🛟 Buoy Deployed: {mission.collectedData.includes('deploy_buoy') ? '✅' : '❌'}</div>
              <div>👁️ Eye Reached: {mission.collectedData.includes('reach_eye') ? '✅' : '❌'}</div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={handleShowEducation} style={{
                ...btnStyle, background: 'linear-gradient(135deg, #fdcb6e, #e17055)',
                padding: '10px 20px', fontSize: 14,
              }}>
                📖 Learn More
              </button>
              <button onClick={() => onComplete?.()} style={{
                ...btnStyle, background: 'rgba(255,255,255,0.1)',
                padding: '10px 20px', fontSize: 14,
              }}>
                Back to Map
              </button>
            </div>
          </OverlayCard>
        </div>
      )}

      {/* Educational Content */}
      {showEducation && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,10,0.85)', zIndex: 100,
          overflow: 'auto',
        }}>
          <OverlayCard border="#4ecdc4" maxWidth={550}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🌍</div>
            <h1 style={{ fontSize: 24, margin: '0 0 16px', color: '#4ecdc4' }}>
              Weather Science
            </h1>
            {EDUCATIONAL_FACTS.map((fact, i) => (
              <div key={i} style={{
                marginBottom: 16,
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 8,
                textAlign: 'left',
              }}>
                <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>
                  {fact.icon} {fact.title}
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.8, margin: 0 }}>
                  {fact.body}
                </p>
              </div>
            ))}
            <button onClick={() => onComplete?.()} style={{
              ...btnStyle, background: 'linear-gradient(135deg, #4ecdc4, #44bd9e)',
              padding: '10px 40px', fontSize: 16, marginTop: 8,
            }}>
              BACK TO MAP
            </button>
          </OverlayCard>
        </div>
      )}
    </div>
  );
}

// ── Helpers ──

const OBJECTIVE_LABEL_MAP: Record<string, string> = {
  collect_temperature: 'Temperature',
  collect_humidity: 'Humidity',
  collect_pressure: 'Pressure',
  collect_windspeed: 'Wind Speed',
};

function OverlayCard({ children, border, maxWidth }: {
  children: React.ReactNode;
  border?: string;
  maxWidth?: number;
}) {
  return (
    <div style={{
      maxWidth: maxWidth || 500,
      textAlign: 'center',
      color: '#e0e0e0',
      fontFamily: "'Courier New', monospace",
      background: 'rgba(20,40,60,0.9)',
      padding: '32px 40px',
      borderRadius: 16,
      border: `1px solid ${border || 'rgba(78,205,196,0.3)'}`,
      backdropFilter: 'blur(12px)',
    }}>
      {children}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.2)',
  color: '#e0e0e0',
  padding: '8px 24px',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 'bold',
  letterSpacing: 1,
  fontFamily: "'Courier New', monospace",
};
