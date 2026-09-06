import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import DamageFlash from './components/DamageFlash';
import WindIndicator from './components/WindIndicator';
import type { DamageFlashHandle } from './components/DamageFlash';
import Ocean from './components/Ocean';
import Fish from './components/Fish';
import Storm from './components/Storm';
import Philippines from './components/Philippines';
import Boat from './components/Boat';
import Rain from './components/Rain';
import Lightning from './components/Lightning';
import LightningWarning from './components/LightningWarning';
import GiantWave from './components/GiantWave';
import Hazards from './components/Hazards';
import BoatWake from './components/BoatWake';
import WindParticles from './components/WindParticles';
import OceanSpray from './components/OceanSpray';
import StormClouds from './components/StormClouds';
import StormVignette from './components/StormVignette';
import Collectible from './components/Collectible';
import WeatherBuoy from './components/WeatherBuoy';
import BossHUD from './hud/BossHUD';
import QuizModal from './hud/QuizModal';
import { getQuizQuestions } from './hud/QuizData';
import type { QuizQuestion } from './hud/QuizData';
import { AudioManager } from './AudioManager';
import { useBossTexture, createEyeMarkerTexture } from './utils/textures';
import { useBoatController } from './BoatController';
import { LEVEL_CONFIGS } from '@shared/constants';
import type { LevelProgress } from '@shared/types';
import { ISLANDS } from './components/Philippines';
import {
  computeStormParams, getNextObjective, getPhase,
  checkEyeEntry, distanceToEye,
  createDefaultMissionState, EYE_POSITION, EYE_RADIUS,
} from './MissionManager';

/**
 * Compute normalized land proximity (0 = deep ocean, 1 = on/near land)
 * based on distance to the nearest island.
 */
function computeLandProximity(boatPos: THREE.Vector3): number {
  let minDist = Infinity;
  for (const island of ISLANDS) {
    const dist = Math.hypot(
      boatPos.x - island.position[0],
      boatPos.z - island.position[2]
    );
    minDist = Math.min(minDist, dist);
  }
  // Normalized 0→1: 0 = far from any island, 1 = on/near an island
  return Math.max(0, Math.min(1, 1 - (minDist - 15) / 25));
}
import type { MissionState, StormParams, CollectibleData, ObjectiveId, NotificationData } from './types';

// ── Collectible world positions ──
const COLLECTIBLE_DATA: CollectibleData[] = [
  { id: 'collect_temperature', position: new THREE.Vector3(80, 0.3, 20), label: 'Temperature', icon: '🌡️', color: '#ff6b6b', collected: false },
  { id: 'collect_humidity', position: new THREE.Vector3(-60, 0.3, -40), label: 'Humidity', icon: '💧', color: '#4ecdc4', collected: false },
  { id: 'collect_pressure', position: new THREE.Vector3(40, 0.3, -80), label: 'Pressure', icon: '🌀', color: '#a8e6cf', collected: false },
  { id: 'collect_windspeed', position: new THREE.Vector3(-90, 0.3, 0), label: 'Wind Speed', icon: '💨', color: '#95e1d3', collected: false },
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
  {
    icon: '🏝️',
    title: 'Why do typhoons weaken over land?',
    body: 'Typhoons are powered by warm ocean water (at least 26.5°C). When a typhoon moves over land, it loses its fuel source — the warm, moist air is replaced by cooler, drier air and increased surface friction disrupts the circulation. This causes rapid weakening, often within hours.',
  },
];

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
  showQuiz,
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
  showQuiz: boolean;
  damageFlashRef: React.MutableRefObject<{ triggerFlash: () => void } | null>;
}) {
  const [boatPos, setBoatPos] = useState(new THREE.Vector3(0, 0, 120));
  const [engineRunning, setEngineRunning] = useState(false);
  const [buoyPosition, setBuoyPosition] = useState<THREE.Vector3 | null>(null);
  const [buoyDeployed, setBuoyDeployed] = useState(false);
  const [boatYaw, setBoatYaw] = useState(0);
  const [boatSpeedLocal, setBoatSpeedLocal] = useState(0);
  const damageFlashRef = useRef<DamageFlashHandle | null>(null);

  const { yaw } = useBoatController({
    boatRef,
    storm,
    isInEye,
    disabled: showQuiz,
    onBoatMove: (state) => {
      setBoatPos(state.position.clone());
      setBoatYaw(yaw.current);
      setBoatSpeedLocal(Math.abs(state.speed));
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
      const nearest = getNearestCollectible(boatPos);
      if (nearest) onCollect(nearest);
    },
  });

  const getNearestCollectible = (pos: THREE.Vector3): ObjectiveId | null => {
    const available = COLLECTIBLE_DATA.filter(d => !d.collected && !mission.collectedData.includes(d.id));
    for (const c of available) {
      const dist = new THREE.Vector3(c.position.x, 0, c.position.z).distanceTo(new THREE.Vector3(pos.x, 0, pos.z));
      if (dist < COLLECT_DISTANCE) return c.id;
    }
    return null;
  };

  const proximityRef = useRef(0);
  useFrameEffect(() => {
    proximityRef.current++;
    if (proximityRef.current % 10 !== 0) return;
    const nearest = getNearestCollectible(boatPos);
    onNearCollectible(nearest);
  });

  useFrameEffect(() => {
    audioRef.current?.setWindIntensity(storm.windSpeed * storm.intensity);
    audioRef.current?.setRainIntensity(storm.rainIntensity);
    // Smooth ear-swell: 0 outside eye, 1 at eye center, fades on approach
    const eyeDist = boatPos.distanceTo(EYE_POSITION);
    const nearness = isInEye ? 1 : Math.max(0, 1 - eyeDist / 60);
    audioRef.current?.setEyeApproach(nearness);
  });

  return (
    <>
      {/* Flat lighting for the 2D look */}
      <ambientLight intensity={0.9} color="#ffffff" />
      <directionalLight position={[0, 50, 0]} intensity={0.3} color="#ffffff" />

      {/* World */}
      <Ocean storm={storm} isInEye={isInEye} boatRef={boatRef} />
      <Storm storm={storm} isInEye={isInEye} />
      <Philippines />
      <Fish storm={storm} isInEye={isInEye} boatPosition={boatPos} />
      <Rain storm={storm} isInEye={isInEye} boatPosition={boatPos} />
      <WindParticles storm={storm} isInEye={isInEye} boatPosition={boatPos} />
      <OceanSpray storm={storm} boatPosition={boatPos} boatYaw={boatYaw} boatSpeed={boatSpeedLocal} />
      <StormClouds storm={storm} isInEye={isInEye} boatPosition={boatPos} />
      <StormVignette storm={storm} isInEye={isInEye} />
      <LightningWarning
        storm={storm}
        isInEye={isInEye}
        boatPosition={boatPos}
        onStrike={onLightningStrike}
      />
      <Lightning
        storm={storm}
        isInEye={isInEye}
        boatPosition={boatPos}
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

      {/* Eye of the Typhoon marker (only until reached) */}
      {!mission.collectedData.includes('reach_eye') && (
        <EyeMarker position={EYE_POSITION} isInEye={isInEye} />
      )}

      {/* Boat */}
      <Boat
        boatRef={boatRef}
        integrity={mission.boatIntegrity}
        engineRunning={engineRunning}
      />
      <BoatWake
        boatPosition={boatPos}
        boatYaw={boatYaw}
        boatSpeed={boatSpeedLocal}
        visible={phase >= 1}
      />

      {/* Collectibles — only the current objective marker is visible at a time */}
      {COLLECTIBLE_DATA.filter(d => !d.collected && d.id === mission.currentObjective).map(data => (
        <Collectible
          key={data.id}
          data={data}
          boatPosition={boatPos}
          onCollect={onCollect}
        />
      ))}

      {/* Weather buoy */}
      <WeatherBuoy position={buoyPosition} deployed={buoyDeployed} />

      {/* Damage flash + low-hull vignette */}
      <DamageFlash
        ref={damageFlashRef}
        hullIntegrity={mission.boatIntegrity}
        maxIntegrity={mission.maxIntegrity}
      />
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

/** Pulsing top-down eye-of-the-typhoon marker sprite. */
function EyeMarker({ position, isInEye }: { position: THREE.Vector3; isInEye: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const planeGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const texture = useBossTexture('/assets/boss/marker_eye.png', createEyeMarkerTexture);

  useEffect(() => {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
  }, [texture]);

  useFrame(() => {
    if (!meshRef.current) return;
    const pulse = 1 + Math.sin(Date.now() * 0.004) * 0.06;
    meshRef.current.scale.setScalar(pulse * (isInEye ? 0.6 : 1.4));
    (meshRef.current.material as THREE.MeshBasicMaterial).opacity =
      isInEye ? 0.35 : 0.9 - Math.sin(Date.now() * 0.003) * 0.15;
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      geometry={planeGeo}
      renderOrder={8}
    >
      <meshBasicMaterial
        map={texture}
        transparent
        alphaTest={0.05}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/** Main BossLevel component */
export default function BossLevel({ onComplete, onExit }: { onComplete?: () => void; onExit?: () => void }) {
  const [mission, setMission] = useState<MissionState>(createDefaultMissionState());
  const [storm, setStorm] = useState<StormParams>({
    intensity: 0, windSpeed: 0, rainIntensity: 0,
    lightningRate: 0, cloudCover: 0, waveHeight: 0,
    landProximity: 0,
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
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizTopicLabel, setQuizTopicLabel] = useState('');
  const [quizRun, setQuizRun] = useState(0); // bumped to force-remount the modal on retry
  const [boatPos, setBoatPos] = useState(new THREE.Vector3(0, 0, 120));
  const [boatYaw, setBoatYaw] = useState(0);
  const [boatSpeed, setBoatSpeed] = useState(0);

  const boatRef = useRef<THREE.Group>(null);
  const audioRef = useRef<AudioManager | null>(null);
  const damageFlashRef = useRef<{ triggerFlash: () => void } | null>(null);
  const notificationIdRef = useRef(0);
  const timeRef = useRef(0);
  const progressSavedRef = useRef(false);
  const prevBoatPosRef = useRef(new THREE.Vector3(0, 0, 120));
  const containerRef = useRef<HTMLDivElement>(null);
  const landNotifiedRef = useRef(false);

  useEffect(() => {
    audioRef.current = new AudioManager();
    return () => audioRef.current?.dispose();
  }, []);

  // Keep the game area focused so keyboard events are reliably captured
  useEffect(() => {
    if (!showIntro && containerRef.current) {
      containerRef.current.focus({ preventScroll: true });
    }
  }, [showIntro]);

  const notify = useCallback((icon: string, message: string, color: string): NotificationData => ({
    id: `n-${notificationIdRef.current++}`,
    icon,
    message,
    color,
    timestamp: Date.now(),
  }), []);

  // Readable labels for each quiz topic (collectibles + milestones)
  const QUIZ_TOPIC_LABELS: Record<ObjectiveId, string> = {
    collect_temperature: 'Ocean Temperature',
    collect_humidity: 'Atmospheric Humidity',
    collect_pressure: 'Barometric Pressure',
    collect_windspeed: 'Wind Speed',
    deploy_buoy: 'Weather Buoy',
    reach_eye: 'Eye of the Typhoon',
    complete: 'Mission Complete',
  };

  /** Trigger a cumulative science quiz after a data item is collected. */
  const startQuiz = useCallback((collected: ObjectiveId[], lastId: ObjectiveId) => {
    const count = collected.length; // 1 question for 1st collect, 2 for 2nd, etc.
    const questions = getQuizQuestions(collected, count);
    setQuizQuestions(questions);
    setQuizTopicLabel(QUIZ_TOPIC_LABELS[lastId] || lastId);
    setShowQuiz(true);
  }, []);

  /** Called after each answer pick: wrong → hull rattled, correct → hull steadied. */
  const handleQuizAnswer = useCallback((correct: boolean) => {
    if (!correct) damageFlashRef.current?.triggerFlash();
    setMission(prev => {
      const delta = correct ? 3 : -8; // storm punishes misjudgment, rewards good science
      const capped = Math.max(0, Math.min(prev.maxIntegrity, prev.boatIntegrity + delta));
      return {
        ...prev,
        boatIntegrity: capped,
        lastNotification: correct
          ? notify('✅', 'Good science! Hull stabilized.', '#4ecdc4')
          : notify('⚠️', "Storm doesn't forgive mistakes! Hull rattled.", '#ff4444'),
      };
    });
  }, [notify]);

  const handleQuizClose = useCallback((correct: number, total: number) => {
    const bonus = correct * 50; // science bonus added to the running score
    setMission(prev => ({ ...prev, quizBonus: (prev.quizBonus ?? 0) + bonus }));
    setShowQuiz(false);
  }, []);

  /** Reshuffle to fresh questions. Penalty from wrong answers stays locked in. */
  const handleQuizRetry = useCallback(() => {
    const collected = [...mission.collectedData];
    if (collected.length === 0) return;
    setQuizQuestions(getQuizQuestions(collected, collected.length, Date.now()));
    setQuizRun(r => r + 1);
  }, [mission.collectedData]);

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

    // Trigger a cumulative science quiz for the newly-collected data
    startQuiz([...mission.collectedData, id as ObjectiveId], id as ObjectiveId);
  }, [mission.collectedData, notify, startQuiz]);

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
        lastNotification: notify('🛟️', 'Weather Buoy Deployed!', '#ffeaa7'),
      };
    });
    audioRef.current?.playCollect();

    // Quiz the player on buoy science after deploying
    startQuiz([...mission.collectedData, 'deploy_buoy' as ObjectiveId], 'deploy_buoy');
  }, [notify, mission.collectedData, startQuiz]);

  const handleBoatHit = useCallback((damage: number) => {
    damageFlashRef.current?.triggerFlash();
    setMission(prev => {
      const newHp = Math.max(0, prev.boatIntegrity - damage);
      return { ...prev, boatIntegrity: newHp };
    });
  }, []);

  const handleLightningStrike = useCallback((_pos: THREE.Vector3) => {
    damageFlashRef.current?.triggerFlash();
    setMission(prev => {
      const newHp = Math.max(0, prev.boatIntegrity - 15);
      return {
        ...prev,
        boatIntegrity: newHp,
        lastNotification: notify('⚡', 'Lightning Strike! Hull damaged!', '#ff4444'),
      };
    });
  }, [notify]);

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
    if (showIntro || showResult || showFailed || isPaused || showQuiz) return;

    const interval = setInterval(() => {
      timeRef.current += 0.1;
      setElapsedTime(timeRef.current);

      const pos = boatRef.current?.position;
      if (!pos) return;
      setBoatPos(pos.clone());

      const moved = pos.distanceTo(prevBoatPosRef.current);
      prevBoatPosRef.current.copy(pos);
      setBoatSpeed(moved / 0.1);

      const dist = distanceToEye(pos, EYE_POSITION);
      const inside = checkEyeEntry(pos, EYE_POSITION, EYE_RADIUS);

      const currentPhase = getPhase(mission.collectedData, inside);
      setPhase(currentPhase);

      const landProximity = computeLandProximity(pos);
      const newStorm = computeStormParams(dist, currentPhase as any, landProximity);
      setStorm(newStorm);
      setIsInEye(inside);

      // Land proximity notification — storm weakens over land
      if (landProximity > 0.4 && !landNotifiedRef.current && !inside && newStorm.intensity > 0.15) {
        landNotifiedRef.current = true;
        setMission(prev => ({
          ...prev,
          lastNotification: notify('🏝️', 'Storm weakening over land! Warm ocean fuel is cut off.', '#9b59b6'),
        }));
      } else if (landProximity < 0.25 && landNotifiedRef.current) {
        landNotifiedRef.current = false;
      }

      setMission(prev => {
        const updated = {
          ...prev,
          distanceToEye: dist,
          isInEye: inside,
          landProximity,
        };

        if (
          inside &&
          !prev.collectedData.includes('reach_eye') &&
          prev.collectedData.includes('deploy_buoy')
        ) {
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

      if (mission.boatIntegrity <= 0) {
        setShowFailed(true);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [showIntro, showResult, showFailed, isPaused, showQuiz, mission.collectedData, notify]);

  // Trigger mission complete
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

  // Save progress once when the result screen appears
  useEffect(() => {
    if (!showResult || progressSavedRef.current) return;

    const raw = localStorage.getItem('unos_progress');
    const allProgress: Record<string, LevelProgress> = raw ? JSON.parse(raw) : {};
    const existing = allProgress.boss;

    const score = Math.min(
      LEVEL_CONFIGS.boss.maxScore,
      Math.round(mission.boatIntegrity * 25 + Math.max(0, 300 - elapsedTime) * 3 + (mission.quizBonus ?? 0))
    );
    const next: LevelProgress = {
      completed: true,
      bestScore: Math.max(existing?.bestScore ?? 0, score),
      bestTime: Math.min(existing?.bestTime ?? Infinity, elapsedTime),
      stars: 1,
      attempts: (existing?.attempts ?? 0) + 1,
      factsUnlocked: Array.from(new Set([...(existing?.factsUnlocked ?? []), 'fact_boss', 'fact_land'])),
    };

    const updated = { ...allProgress, boss: next };
    localStorage.setItem('unos_progress', JSON.stringify(updated));
    progressSavedRef.current = true;
  }, [showResult, elapsedTime, mission.boatIntegrity]);

  const handleStart = useCallback(() => {
    setShowIntro(false);
    audioRef.current?.init();
    audioRef.current?.playEngineStart();
  }, []);

  const handleShowIntro = useCallback(() => {
    setShowIntro(true);
  }, []);

  const handlePause = useCallback(() => setIsPaused(p => !p), []);

  const handleRestart = useCallback(() => {
    setMission(createDefaultMissionState());
    setStorm({ intensity: 0, windSpeed: 0, rainIntensity: 0, lightningRate: 0, cloudCover: 0, waveHeight: 0, landProximity: 0 });
    setPhase(1);
    setIsInEye(false);
    setElapsedTime(0);
    setShowFailed(false);
    setShowResult(false);
    setShowEducation(false);
    setBoatPos(new THREE.Vector3(0, 0, 120));
    prevBoatPosRef.current.set(0, 0, 120);
    timeRef.current = 0;
    progressSavedRef.current = false;
    landNotifiedRef.current = false;
    COLLECTIBLE_DATA.forEach(c => c.collected = false);

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
    <div
      ref={containerRef}
      tabIndex={0}
      className="relative w-full h-full overflow-hidden bg-[#060a1a] outline-none"
    >
      <Canvas
        orthographic
        camera={{ zoom: 12, position: [0, 80, 0], near: 1, far: 500 }}
        onCreated={({ gl }) => {
          gl.setClearColor('#060a1a');
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
          showQuiz={showQuiz}
          damageFlashRef={damageFlashRef as unknown as React.MutableRefObject<{ triggerFlash: () => void } | null>}
        />
      </Canvas>

      {/* HUD */}
      <BossHUD
        mission={mission}
        elapsedTime={elapsedTime}
        boatPosition={boatPos}
        boatYaw={boatYaw}
        boatSpeed={boatSpeed}
        storm={storm}
        collectibles={COLLECTIBLE_DATA}
        buoyDeployed={mission.collectedData.includes('deploy_buoy')}
        onPause={handlePause}
        onExit={onExit}
        onShowIntro={handleShowIntro}
      />

      {/* Science quiz — pauses the storm + boat while answering */}

      {/* Wind / storm-push direction indicator */}
      <WindIndicator
        windAngle={Math.atan2(boatPos.x, boatPos.z + 150)}
        windSpeed={storm.windSpeed}
        stormIntensity={storm.intensity}
        isInEye={isInEye}
      />
      {showQuiz && (
        <QuizModal
          key={quizRun}
          topicLabel={quizTopicLabel}
          questions={quizQuestions}
          onClose={handleQuizClose}
          onAnswer={handleQuizAnswer}
          onRetry={handleQuizRetry}
        />
      )}

      {/* Pause */}
      {isPaused && (
        <BossOverlay>
          <BossModal>
            <h2 className="font-display text-3xl text-accent-yellow" style={{ textShadow: '3px 3px 0px #000' }}>⏸ PAUSED</h2>
            <button onClick={handlePause} className="retro-btn-primary">
              ▶ Resume
            </button>
          </BossModal>
        </BossOverlay>
      )}

      {/* Intro */}
      {showIntro && (
        <BossOverlay>
          <BossModal className="max-w-md">
            <span className="retro-badge bg-warning-red text-white text-xs px-6 py-1">BOSS LEVEL — Survival</span>
            <div className="text-5xl animate-float">🌀</div>
            <h1 className="font-display text-3xl text-accent-yellow" style={{ textShadow: '3px 3px 0px #000' }}>
              Ride the Storm
            </h1>
            <div className="font-body text-xs uppercase tracking-widest text-storm-light">
              — The Eye of the Typhoon —
            </div>
            <p className="font-body text-sm text-white/80 leading-relaxed">
              Survive the typhoon in your research vessel through the storm.
            </p>

            {/* Mechanics cards — matches Phaser LevelIntroOverlay style */}
            <div className="w-full flex flex-col gap-2 mt-1">
              <MechCard icon="🚤" text="Use WASD or Arrow keys to steer your research vessel" />
              <MechCard icon="🌡️" text="Collect Temperature buoys near the storm edge (warm ocean fuels the storm)" />
              <MechCard icon="💧" text="Collect Humidity buoys inside the eyewall (moist air powers cloud formation)" />
              <MechCard icon="🌪️" text="Collect Air Pressure buoys at the storm center (low pressure = stronger winds)" />
              <MechCard icon="💨" text="Collect Wind buoys deep in the eyewall (strongest winds)" />
              <MechCard icon="⚡" text="DODGE lightning, debris, and giant waves!" />
              <MechCard icon="❤️" text="Watch your BOAT INTEGRITY — hit a wave and lose health!" />
              <MechCard icon="⛵" text="Reach the EYE of the storm to collect the final data point" />
              <MechCard icon="🏝️" text="STEER clear of islands — the storm weakens over land!" />
            </div>

            <div className="w-full flex flex-col gap-1 mt-2">
              <div className="font-body text-[11px] text-storm-light">
                WASD / Arrows — Steer · Shift — Boost · Space — Deploy Buoy · E — Interact
              </div>
            </div>

            <button onClick={handleStart} className="retro-btn-primary w-full">
              ▶  DEPLOY
            </button>
          </BossModal>
        </BossOverlay>
      )}

      {/* Mission Failed */}
      {showFailed && (
        <BossOverlay>
          <BossModal className="border-warning-red">
            <div className="text-5xl">💥</div>
            <h1 className="font-display text-3xl text-warning-red" style={{ textShadow: '3px 3px 0px #000' }}>
              MISSION FAILED
            </h1>
            <p className="font-body text-sm text-white/80 leading-relaxed">
              Your research vessel sustained too much damage.
              The storm was too powerful.
            </p>
            <button onClick={handleRestart} className="retro-btn-danger">
              TRY AGAIN
            </button>
          </BossModal>
        </BossOverlay>
      )}

      {/* Mission Complete */}
      {showResult && (
        <BossOverlay>
          <BossModal className="border-accent-yellow max-w-lg">
            <div className="text-5xl">🏆</div>
            <h1 className="font-display text-3xl text-accent-yellow" style={{ textShadow: '3px 3px 0px #000' }}>
              MISSION COMPLETE
            </h1>
            <p className="font-body text-sm text-white/80 leading-relaxed">
              {resultMessage}
            </p>
            <div className="bg-black/25 border-2 border-black/40 rounded-lg p-3 font-body text-xs text-storm-light space-y-1 text-left w-full">
              <div>⏱️ Time: {Math.floor(elapsedTime / 60)}m {Math.floor(elapsedTime % 60)}s</div>
              <div>📊 Data Collected: {mission.collectedData.length}/7</div>
              <div>🛟️ Buoy Deployed: {mission.collectedData.includes('deploy_buoy') ? '✅' : '❌'}</div>
              <div>👁️ Eye Reached: {mission.collectedData.includes('reach_eye') ? '✅' : '❌'}</div>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              <button onClick={handleShowEducation} className="retro-btn-primary">
                📖 Learn More
              </button>
              <button onClick={() => onComplete?.()} className="retro-btn bg-storm-mid">
                Back to Map
              </button>
            </div>
          </BossModal>
        </BossOverlay>
      )}

      {/* Educational Content */}
      {showEducation && (
        <BossOverlay>
          <BossModal className="border-accent-green max-w-xl w-[calc(100%-2rem)] my-8">
            <div className="text-4xl">🌍</div>
            <h1 className="font-display text-3xl text-accent-green" style={{ textShadow: '3px 3px 0px #000' }}>
              Weather Science
            </h1>
            <div className="space-y-3 w-full">
              {EDUCATIONAL_FACTS.map((fact, i) => (
                <div
                  key={i}
                  className="bg-black/25 border-2 border-black/40 rounded-lg p-3 text-left"
                >
                  <div className="font-display text-sm text-accent-yellow mb-1">
                    {fact.icon} {fact.title}
                  </div>
                  <p className="font-body text-xs text-storm-light leading-relaxed">
                    {fact.body}
                  </p>
                </div>
              ))}
            </div>
            <button onClick={() => onComplete?.()} className="retro-btn-primary">
              BACK TO MAP
            </button>
          </BossModal>
        </BossOverlay>
      )}
    </div>
  );
}

// ── Helpers ──

const MECH_COLORS: Record<string, string> = {
  '🚤': 'text-white',
  '🌡️': 'text-accent-yellow',
  '💧': 'text-ocean-surface',
  '🌪️': 'text-accent-yellow',
  '💨': 'text-cyan-300',
  '⚡': 'text-warning-orange',
  '❤️': 'text-warning-red',
  '⛵': 'text-accent-green',
};

function MechCard({ icon, text }: { icon: string; text: string }) {
  const textColor = MECH_COLORS[icon] ?? 'text-white';
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-sm bg-black/20 border-l-3 border-accent-yellow/50">
      <span className="text-lg shrink-0 w-6 text-center">{icon}</span>
      <span className={`font-body text-xs ${textColor}`} style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.9)' }}>
        {text}
      </span>
    </div>
  );
}

const OBJECTIVE_LABEL_MAP: Record<string, string> = {
  collect_temperature: 'Temperature',
  collect_humidity: 'Humidity',
  collect_pressure: 'Pressure',
  collect_windspeed: 'Wind Speed',
};

function BossOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-2">
      {children}
    </div>
  );
}

function BossModal({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={[
        'modal-card',
        'retro-card max-w-md w-[calc(100%-2rem)] max-h-[95vh] overflow-y-auto',
        'flex flex-col items-center gap-3 text-center',
        '!bg-storm-dark text-white',
        className || '',
      ].join(' ')}
    >
      {children}
    </div>
  );
}
