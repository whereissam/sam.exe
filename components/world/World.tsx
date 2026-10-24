'use client';
import { BEACON_SPOT, PASSPORT_POST, harborHeight } from './island-layout';
import { GroundLabel } from './GroundLabel';
import { safeCityCamera } from './city-camera';
import { oceanHorizon } from './OceanBackdrop';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Html, OrbitControls, Sparkles, useProgress } from '@react-three/drei';
import {
  Suspense,
  type ComponentRef,
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import * as THREE from 'three';
import { districts, type District } from './districts';
import type { DailyRoutine } from './daily-routine';
import RenderProbe from '../performance/RenderProbe';
import { DistrictModel } from './DistrictModel';
import RoboticsLab from './RoboticsLab';
import { Harbor, ExhibitBack } from './Harbor';
import { HarborEntrances } from './HarborEntrances';
import { IslandGarden } from './IslandGarden';
import { Beacon, CollectibleSparks } from './Playground';
import Companions, {
  type Gesture,
  type Character,
  type Action,
} from './Companions';

import type { WorldLoadProgress } from './WorldLoader';
import { walkable, SPAWN, type Point } from './movement';
import {
  clampLevel,
  fittedZoom,
  stepFromPinch,
  stepsFromWheel,
  zoomForLevel,
  FITTED_LEVEL,
  ZOOM_MAX,
  ZOOM_MIN,
} from './camera-zoom';

const ReducedMotion = createContext(false);
type Vec = [number, number, number];
// Open from the front (+Z), so exhibits face the visitor on arrival and reset.
const ISLAND_ENTRY_CAMERA: Vec = [5, 32, 36];
const ISLAND_ENTRY_ZOOM_LEVEL = FITTED_LEVEL;
function Box({
  position = [0, 0, 0],
  size = [1, 1, 1],
  color = '#64517b',
  glow = false,
}: {
  position?: Vec;
  size?: Vec;
  color?: string;
  glow?: boolean;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={0.65}
        emissive={glow ? color : '#000000'}
        emissiveIntensity={glow ? 1.7 : 0}
      />
    </mesh>
  );
}
function Ring({
  position,
  color,
  radius = 1,
  rotation = [-Math.PI / 2, 0, 0],
}: {
  position: Vec;
  color: string;
  radius?: number;
  rotation?: Vec;
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <torusGeometry args={[radius, 0.035, 8, 64]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.3}
      />
    </mesh>
  );
}
function Installation({
  district,
  onSelect,
  night,
  playerPosition,
}: {
  playerPosition: React.RefObject<Point>;
  night: boolean;
  district: District;
  onSelect: (d: District) => void;
}) {
  const { id, color, position } = district;
  const reduced = useContext(ReducedMotion);
  const [hovered, setHovered] = useState(false);
  const [nearby, setNearby] = useState(false);
  const [closeUp, setCloseUp] = useState(false);
  useFrame(({ camera, size }) => {
    const p = playerPosition.current;
    const next = Math.abs(harborHeight(p) - position[1]) < 1 && Math.hypot(p.x - position[0], p.z - position[2]) < (nearby ? 5.2 : 4.4);
    if (next !== nearby) setNearby(next);
    // Readable close-ups reveal every floor sign, regardless of player distance.
    const zoomRatio = camera.zoom / fittedZoom(size.width, size.height);
    const nextCloseUp = zoomRatio >= (closeUp ? 1.7 : 2);
    if (nextCloseUp !== closeUp) setCloseUp(nextCloseUp);
  });
  const showGroundLabel = nearby || closeUp;
  const active = hovered || nearby;
  const markerZ = id === 'robotics' ? 3.15 : 2.65;
  useEffect(() => {
    if (hovered) document.body.style.cursor = 'pointer';
    return () => { document.body.style.cursor = ''; };
  }, [hovered]);
  return (
    <group position={position}
      onClick={event => { event.stopPropagation(); if (event.delta <= 5) onSelect(district); }}
      onPointerOver={event => { event.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <cylinderGeometry args={[id === 'robotics' ? 2.4 : 1.86, id === 'robotics' ? 2.45 : 1.9, 0.19, 64]} />
        <meshStandardMaterial
          color={active ? '#f2e7c9' : '#e1decb'}
          emissive={color}
          emissiveIntensity={active ? 0.18 : 0}
        />
      </mesh>
      <mesh position={[0, .117, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[id === 'robotics' ? 2.3 : 1.76, id === 'robotics' ? 2.36 : 1.82, 64]} />
        <meshBasicMaterial color={active ? '#a16a2d' : '#b6a16e'} toneMapped={false} />
      </mesh>
      <group>
        {id === 'robotics' ? <RoboticsLab reduced={reduced} /> : <>
        <ExhibitBack id={id} />
        <DistrictModel id={id}>
          {id === 'photography' && (
            <group>
              <Box
                position={[0, 0.9, 0]}
                size={[1.6, 1, 0.65]}
                color="#dcc9a4"
              />
              <Box
                position={[-0.4, 1.5, 0]}
                size={[0.5, 0.25, 0.5]}
                color="#b6a092"
              />
              <mesh position={[0.2, 0.95, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.38, 0.38, 0.45, 16]} />
                <meshStandardMaterial color="#292738" />
              </mesh>
              <Ring
                position={[0.2, 0.95, 0.74]}
                color={color}
                radius={0.28}
                rotation={[0, 0, 0]}
              />
              <Box position={[0, 0.3, 0]} size={[0.15, 0.5, 0.15]} />
            </group>
          )}
          {id === 'travel' && (
            <group>
              <Ring
                position={[0, 1.3, 0]}
                radius={1}
                color={color}
                rotation={[0, 0, 0]}
              />
              <Ring
                position={[0, 1.3, 0]}
                radius={0.8}
                color={color}
                rotation={[0, Math.PI / 2, 0]}
              />
              <Box
                position={[0, 0.23, 0]}
                size={[1.7, 0.3, 0.8]}
                color="#6e939f"
              />
              <mesh position={[0, 1.3, 0]}>
                <icosahedronGeometry args={[0.55, 1]} />
                <meshStandardMaterial color="#94c8ca" wireframe />
              </mesh>
            </group>
          )}
          {id === 'frontend' && (
            <group rotation={[0, 0.2, 0]}>
              <Box
                position={[0, 0.9, 0]}
                size={[2.5, 0.16, 1.2]}
                color="#ae7c70"
              />
              <Box position={[-0.95, 0.45, 0]} size={[0.13, 0.9, 0.8]} />
              <Box position={[0.95, 0.45, 0]} size={[0.13, 0.9, 0.8]} />
              <Box
                position={[0, 1.72, -0.16]}
                size={[2, 1.35, 0.2]}
                color="#dbbea2"
              />
              <Box
                position={[0, 1.72, -0.045]}
                size={[1.78, 1.12, 0.04]}
                color="#232a43"
              />
              {[0, 1, 2, 3, 4].map((i) => (
                <Box
                  key={i}
                  position={[-0.2 + (i % 2) * 0.15, 2.03 - i * 0.16, -0.015]}
                  size={[0.9 - (i % 3) * 0.15, 0.035, 0.025]}
                  color={i % 2 ? '#b7f5c4' : '#f5bc79'}
                  glow
                />
              ))}
              <Box
                position={[0, 1, 0.45]}
                size={[1.1, 0.05, 0.35]}
                color="#ead3bf"
              />
            </group>
          )}
          {id === 'blockchain' && (
            <group>
              {[-0.85, 0, 0.85].map((x, i) => (
                <group key={x}>
                  <Box
                    position={[x, 1 + i * 0.35, 0]}
                    size={[0.65, 1.8 + i * 0.7, 0.8]}
                    color={i === 1 ? '#8c68a3' : '#514464'}
                  />
                  {Array.from({ length: 5 }, (_, j) => (
                    <Box
                      key={j}
                      position={[x, 0.5 + j * 0.32, 0.415]}
                      size={[0.44, 0.055, 0.025]}
                      color={color}
                      glow
                    />
                  ))}
                </group>
              ))}
              <Float speed={reduced ? 0 : 2} floatIntensity={0.3}>
                <mesh position={[0, 3.35, 0]}>
                  <octahedronGeometry args={[0.5]} />
                  <meshStandardMaterial
                    color={color}
                    wireframe
                    emissive={color}
                    emissiveIntensity={0.3}
                  />
                </mesh>
              </Float>
            </group>
          )}
          {id === 'ai' && (
            <group>
              <Box
                position={[0, 0.35, 0]}
                size={[1.35, 0.55, 1.35]}
                color="#a3767c"
              />
              <Float speed={reduced ? 0 : 1.6} floatIntensity={0.5}>
                <mesh position={[0, 1.6, 0]}>
                  <icosahedronGeometry args={[0.62, 1]} />
                  <meshStandardMaterial
                    color="#ffb995"
                    emissive="#ff705a"
                    emissiveIntensity={0.7}
                    flatShading
                  />
                </mesh>
                <Ring
                  position={[0, 1.6, 0]}
                  radius={1.1}
                  rotation={[0.6, 0.3, 0]}
                  color={color}
                />
                <Ring
                  position={[0, 1.6, 0]}
                  radius={0.9}
                  rotation={[1.5, 0, 0.7]}
                  color={color}
                />
              </Float>
            </group>
          )}
        </DistrictModel>
        </>}
      </group>
      {showGroundLabel && <GroundLabel title={district.title} width={3.4}
        position={[0, .21, id === 'robotics' ? 2 : 1.5]}
        dark={night} onClick={() => onSelect(district)} />}
      {!showGroundLabel && <Html center distanceFactor={0.05} position={[0, .2, markerZ]} zIndexRange={[24, 20]} className={`district-marker-anchor district-marker-${id}`}>
        <button
          type="button"
          className={`district-marker${active ? ' is-active' : ''}`}
          aria-label={`${district.number} ${district.title} — 點擊探索`}
          onPointerDown={event => event.stopPropagation()}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          onFocus={() => setHovered(true)}
          onBlur={() => setHovered(false)}
          onClick={event => { event.stopPropagation(); onSelect(district); }}
        >
          <span className="district-marker-index">{district.number}</span>
        </button>
      </Html>}
    </group>
  );
}
type ZoomCommand = { direction: number; sequence: number };

function CameraControls({
  walkSequence,
  reset,
  paused,
  benchmarking,
  zoomCommand,
  reduced,
  playerPosition,
  autonomous,
}: {
  walkSequence: number;
  reset: number;
  paused: boolean;
  benchmarking: boolean;
  zoomCommand: ZoomCommand;
  reduced: boolean;
  playerPosition: React.RefObject<Point>;
  autonomous: React.RefObject<boolean>;
}) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { get, invalidate, size, gl } = useThree();
  const keepCameraOutsideCity = useCallback(() => {
    if (!controls.current) return;
    const camera = get().camera;
    const pose = safeCityCamera(camera.position, controls.current.target);
    camera.position.set(pose.x, pose.y, pose.z);
    if (camera.far !== pose.far) {
      camera.far = pose.far;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();
  }, [get]);
  const following = useRef(false);
  const interacting = useRef(false);
  const lastPosition = useRef<Point>({ ...SPAWN });
  const followGoal = useRef(new THREE.Vector3());
  const followStep = useRef(new THREE.Vector3());
  const zoomFocus = useRef<'player' | 'overview' | null>(null);
  useFrame((_, dt) => {
    const p = playerPosition.current;
    const moved = Math.hypot(p.x - lastPosition.current.x, p.z - lastPosition.current.z) > 0.001;
    lastPosition.current = { ...p };
    if (moved && !autonomous.current) following.current = true;
    if (!controls.current || interacting.current || paused || benchmarking) return;
    if (!zoomFocus.current && (!following.current || autonomous.current)) return;
    // Zoom toward the traveller, including when they are standing still.
    // Nearby exhibits must not steal the focus or change the user's zoom level.
    if (zoomFocus.current === 'overview') followGoal.current.set(0, 2, -16);
    else followGoal.current.set(p.x, harborHeight(p) + .7, p.z);
    followStep.current.copy(followGoal.current).sub(controls.current.target).multiplyScalar(reduced ? 1 : 1 - Math.exp(-Math.min(dt, 0.05) * 6));
    if (followStep.current.lengthSq() < 0.000001) {
      if (zoomFocus.current === 'overview') zoomFocus.current = null;
      return;
    }
    get().camera.position.add(followStep.current);
    controls.current.target.add(followStep.current);
    keepCameraOutsideCity();
    controls.current.update();
    invalidate();
  });
  const fitted = useRef(1);
  const level = useRef(ISLAND_ENTRY_ZOOM_LEVEL);
  const targetZoom = useRef(0);
  const zoomAt = useCallback(
    (next: number) => {
      level.current = clampLevel(next);
      zoomFocus.current = level.current > FITTED_LEVEL ? 'player' : 'overview';
      following.current = false;
      targetZoom.current = zoomForLevel(fitted.current, level.current);
      if (reduced) {
        const camera = get().camera;
        camera.zoom = targetZoom.current;
        camera.updateProjectionMatrix();
        controls.current?.update();
      }
      invalidate();
    },
    [get, invalidate, reduced],
  );
  /** After a level change the camera eases to it; nothing else drives zoom. */
  useFrame(() => {
    if (!targetZoom.current) return;
    const camera = get().camera;
    const gap = targetZoom.current - camera.zoom;
    if (Math.abs(gap) < 0.05) {
      if (camera.zoom !== targetZoom.current) {
        camera.zoom = targetZoom.current;
        camera.updateProjectionMatrix();
        controls.current?.update();
      }
      return;
    }
    camera.zoom += gap * 0.22;
    camera.updateProjectionMatrix();
    controls.current?.update();
    invalidate();
  });
  useEffect(() => {
    const camera = get().camera;
    following.current = false;
    zoomFocus.current = null;
    lastPosition.current = { ...playerPosition.current };
    camera.position.set(...ISLAND_ENTRY_CAMERA);
    // The chrome above and below the island is a fixed ~160px on a tall
    // screen, but it folds up on a short one — reserving the full 160 there
    // leaves the island a pinhole and its labels pile on top of each other.
    fitted.current = fittedZoom(size.width, size.height);
    camera.zoom = zoomForLevel(fitted.current, ISLAND_ENTRY_ZOOM_LEVEL);
    level.current = ISLAND_ENTRY_ZOOM_LEVEL;
    targetZoom.current = camera.zoom;
    camera.updateProjectionMatrix();
    controls.current?.target.set(0, 2, -16);
    keepCameraOutsideCity();
    controls.current?.update();
    invalidate();
  }, [get, reset, size.width, size.height, invalidate, playerPosition, keepCameraOutsideCity]);
  useEffect(() => {
    if (!zoomCommand.direction) return;
    zoomAt(level.current + (zoomCommand.direction > 0 ? 1 : -1));
  }, [zoomCommand, zoomAt]);
  useEffect(() => {
    if (!walkSequence) return;
    // A deliberate destination click enters a readable walking view.
    zoomAt(Math.max(level.current, 5));
    zoomFocus.current = 'player';
    following.current = true;
  }, [walkSequence, zoomAt]);
  /** Wheel and pinch step through the same ladder, so zoom never lands between
   *  levels. OrbitControls' own continuous zoom stays off for that reason. */
  useEffect(() => {
    const element = gl.domElement;
    let wheel = 0;
    let pinch: number | null = null;
    const spread = (touches: TouchList) =>
      Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY,
      );
    const onWheel = (event: WheelEvent) => {
      if (paused) return;
      event.preventDefault();
      wheel += event.deltaY;
      const { steps, rest } = stepsFromWheel(wheel);
      wheel = rest;
      if (steps) zoomAt(level.current + steps);
    };
    const onTouchStart = (event: TouchEvent) => {
      pinch = event.touches.length === 2 ? spread(event.touches) : null;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (paused || pinch === null || event.touches.length !== 2) return;
      const now = spread(event.touches);
      const step = stepFromPinch(now / pinch);
      if (step) {
        zoomAt(level.current + step);
        pinch = now;
      }
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) pinch = null;
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    element.addEventListener('touchstart', onTouchStart, { passive: true });
    element.addEventListener('touchmove', onTouchMove, { passive: true });
    element.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      element.removeEventListener('wheel', onWheel);
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
    };
  }, [gl, paused, zoomAt]);
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      onChange={keepCameraOutsideCity}
      onStart={() => { interacting.current = true; following.current = false; zoomFocus.current = null; }}
      onEnd={() => { interacting.current = false; }}
      enablePan
      enableZoom={false}
      screenSpacePanning
      minZoom={ZOOM_MIN}
      maxZoom={ZOOM_MAX}
      minPolarAngle={0.15}
      maxPolarAngle={Math.PI / 2 - 0.05}
      touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.PAN }}
      enabled={!paused}
      enableDamping={false}
      autoRotate={!paused && benchmarking}
      autoRotateSpeed={0.12}
    />
  );
}

/** The passport lives on the island: a little signpost beside the landing path. */
function PassportPost({
  paused,
  visitedCount,
  onOpen,
  touch,
}: {
  paused: boolean;
  visitedCount: number;
  onOpen: () => void;
  touch: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    if (!hovered || paused) return;
    document.body.style.cursor = 'pointer';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hovered, paused]);
  return (
    <group
      position={[PASSPORT_POST.x, 0.12, PASSPORT_POST.z]}
      onClick={(event) => {
        if (paused || event.delta > 5) return;
        event.stopPropagation();
        setHovered(false);
        onOpen();
      }}
      onPointerOver={(event) => {
        if (paused) return;
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <Box position={[0, 0.42, 0]} size={[0.09, 0.84, 0.09]} color="#8a6b45" />
      <Box
        position={[0, 0.92, 0]}
        size={[0.66, 0.44, 0.07]}
        color="#f0dcae"
        glow={hovered && !paused}
      />
      <Box
        position={[0, 0.92, 0.05]}
        size={[0.4, 0.05, 0.02]}
        color="#b08a56"
      />
      <Box position={[0, 0.8, 0.05]} size={[0.3, 0.04, 0.02]} color="#c8a271" />
      {(hovered || touch) && !paused && (
        <Html
          center
          position={[0, 1.5, 0]}
          zIndexRange={[20, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <span className={`world-hint ${hovered ? 'is-near' : ''}`}>
            My passport · {visitedCount}/6
          </span>
        </Html>
      )}
    </group>
  );
}

// Wait for the asset manager and a rendered frame, including models that use
// their own Suspense boundaries and would otherwise reveal an empty island.
function SceneReady({ onReady, onProgress }: { onReady?: () => void; onProgress?: (progress: WorldLoadProgress) => void }) {
  const { active, loaded, total } = useProgress();
  useEffect(() => { onProgress?.({ active, loaded, total }); }, [active, loaded, total, onProgress]);
  const invalidate = useThree((state) => state.invalidate);
  const notified = useRef(false);
  const frame = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  useEffect(() => {
    invalidate();
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [active, invalidate]);
  useFrame(() => {
    if (active || notified.current || frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      if (useProgress.getState().active) return;
      notified.current = true;
      onReady?.();
    });
  });
  return null;
}

function CanvasFallback({ onReady }: { onReady?: () => void }) {
  useEffect(() => onReady?.(), [onReady]);
  return (
    <div className="scene-fallback">
      Explore the districts with the chapter buttons below.
    </div>
  );
}

export default function World({
  roaming = true,
  onReady,
  onProgress,
  onSelect,
  onNear,
  keys,
  paused,
  reset,
  night,
  reduced,
  lowPower,
  moving,
  benchmarking,
  perf,
  collected,
  onCollect,
  onPulse,
  character,
  action,
  zoomCommand,
  routine,
  onSwitch,
  onAction,
  onPassport,
  onEnterRoom,
  visitedCount,
  touch,
}: {
  onReady?: () => void;
  onProgress?: (progress: WorldLoadProgress) => void;
  roaming?: boolean;
  onSelect: (d: District) => void;
  onNear: (d: District | null) => void;
  keys: React.RefObject<Set<string>>;
  paused: boolean;
  reset: number;
  night: boolean;
  reduced: boolean;
  lowPower: boolean;
  moving: boolean;
  benchmarking: boolean;
  perf: boolean;
  collected: string[];
  onCollect: (id: string) => void;
  onPulse: () => void;
  character: Character;
  action: Action | null;
  zoomCommand: ZoomCommand;
  routine: DailyRoutine;
  onSwitch: (character: Character) => void;
  onAction: (kind: Gesture) => void;
  onPassport: () => void;
  onEnterRoom: () => void;
  visitedCount: number;
  touch: boolean;
}) {
  const [target, setTarget] = useState<Point | null>(null);
  const [walkSequence, setWalkSequence] = useState(0);
  const playerPosition = useRef<Point>({ ...SPAWN });
  const autonomous = useRef(false);
  const manualMovement = useRef(false);
  useEffect(() => {
    setTarget(null);
  }, [reset, paused]);
  return (
    <Canvas
      fallback={<CanvasFallback onReady={onReady} />}
      shadows={!lowPower}
      frameloop={
        paused
          ? 'never'
          : (lowPower || reduced) && !moving && !target
            ? 'demand'
            : 'always'
      }
      dpr={lowPower ? 1 : [1, 1.7]}
      orthographic
      camera={{
        position: ISLAND_ENTRY_CAMERA,
        zoom: lowPower ? 25 : 52,
        near: 0.1,
        far: 250,
      }}
      gl={{
        antialias: !lowPower,
        powerPreference: lowPower ? 'low-power' : 'default',
      }}
    >
      <color attach="background" args={[night ? oceanHorizon.night : oceanHorizon.day]} />
      {perf && <RenderProbe sampling={benchmarking && !paused} />}
      <ambientLight intensity={night ? 0.65 : 1.2} />
      <hemisphereLight args={['#e7f5ff', '#78969e', 1.35]} />
      <directionalLight
        position={[-6, 12, 6]}
        color="#fff0d7"
        intensity={night ? 1 : 2}
        castShadow={!lowPower}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-normalBias={0.04}
      />
      <Suspense fallback={null}>
        <SceneReady onReady={onReady} onProgress={onProgress} />
        <ReducedMotion.Provider value={reduced || lowPower}>
          <group position={[0, -0.8, 0]}>
            <Harbor
              night={night}
              paused={paused}
              reduced={reduced || lowPower}
              onWalk={(point) => {
                if (walkable(point)) {
                  setTarget(point);
                  setWalkSequence(value => value + 1);
                }
              }}
            />
            <IslandGarden
              paused={paused}
              reduced={reduced || lowPower}
              night={night}
            />
            {districts.map((d) => (
              <Installation
                key={d.id}
                district={d}
                playerPosition={playerPosition}
                onSelect={onSelect}
                night={night}
              />
            ))}
            <Companions
              manualMovement={manualMovement}
              roaming={roaming && !benchmarking}
              autonomous={autonomous}
              character={character}
              action={action}
              routine={routine}
              keys={keys}
              paused={paused}
              onNear={onNear}
              reset={reset}
              target={target}
              onArrive={() => setTarget(null)}
              positionRef={playerPosition}
              reduced={reduced}
              onSwitch={onSwitch}
              onAction={onAction}
              touch={touch}
            />
            <PassportPost
              paused={paused}
              visitedCount={visitedCount}
              onOpen={onPassport}
              touch={touch}
            />
            <HarborEntrances
              player={playerPosition}
              manualMovement={manualMovement}
              paused={paused}
              night={night}
              onEnterRoom={onEnterRoom}
            />
            <CollectibleSparks
              allowProximity={manualMovement}
              player={playerPosition}
              collected={collected}
              onCollect={onCollect}
              paused={paused}
              reduced={reduced || lowPower}
            />
            <group position={[BEACON_SPOT.x, 0, BEACON_SPOT.z]}>
              <Beacon
                paused={paused}
                reduced={reduced}
                complete={collected.length === 3}
                onPulse={onPulse}
              />
            </group>
            {target && (
              <Ring
                position={[target.x, harborHeight(target) + 0.13, target.z]}
                radius={0.2}
                color="#f5bc79"
              />
            )}
            {!lowPower && (
              <Sparkles
                count={35}
                scale={[15, 6, 15]}
                position={[0, 2, 0]}
                size={2}
                speed={reduced ? 0 : 0.25}
                color="#ffd4bd"
              />
            )}
          </group>
        </ReducedMotion.Provider>
      </Suspense>
      <CameraControls
        walkSequence={walkSequence}
        reset={reset}
        paused={paused}
        benchmarking={benchmarking}
        zoomCommand={zoomCommand}
        playerPosition={playerPosition}
        autonomous={autonomous}
        reduced={reduced}
      />
    </Canvas>
  );
}
