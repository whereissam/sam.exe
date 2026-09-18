'use client';
import { harborHeight } from './island-layout';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Html, OrbitControls, Sparkles } from '@react-three/drei';
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
import { GroundLabel } from './GroundLabel';
import { Harbor, ExhibitBack } from './Harbor';
import { IslandGarden } from './IslandGarden';
import { Beacon, CollectibleSparks } from './Playground';
import Companions, {
  type Gesture,
  type Character,
  type Action,
} from './Companions';

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
function Robot({ small = false }: { small?: boolean }) {
  const arms = useRef<THREE.Group>(null);
  const reduced = useContext(ReducedMotion);
  useFrame(({ clock }) => {
    if (arms.current && !reduced)
      arms.current.rotation.z = Math.sin(clock.elapsedTime * 2) * 0.12;
  });
  return (
    <group scale={small ? 0.45 : 1}>
      <Box position={[0, 1.2, 0]} size={[0.75, 0.9, 0.48]} color="#c5f3d0" />
      <Box position={[0, 1.95, 0]} size={[0.9, 0.62, 0.65]} color="#e0e8d5" />
      <Box
        position={[0, 1.98, 0.34]}
        size={[0.68, 0.25, 0.035]}
        color="#233b45"
      />
      {[-0.19, 0.19].map((x) => (
        <Box
          key={x}
          position={[x, 2, 0.37]}
          size={[0.12, 0.07, 0.025]}
          color="#92ffce"
          glow
        />
      ))}
      <Box
        position={[0, 1.24, 0.25]}
        size={[0.28, 0.2, 0.03]}
        color="#76dba5"
        glow
      />
      {[-0.24, 0.24].map((x) => (
        <group key={x}>
          <Box
            position={[x, 0.48, 0]}
            size={[0.25, 0.6, 0.28]}
            color="#819bab"
          />
          <Box
            position={[x, 0.16, 0.14]}
            size={[0.3, 0.22, 0.52]}
            color="#d3e5ce"
          />
        </group>
      ))}
      <group ref={arms} position={[0, 1.5, 0]}>
        {[-0.57, 0.57].map((x) => (
          <Box
            key={x}
            position={[x, -0.15, 0]}
            size={[0.24, 0.8, 0.27]}
            color="#b7e2c6"
          />
        ))}
      </group>
      <Box
        position={[0.25, 2.4, 0]}
        size={[0.035, 0.3, 0.035]}
        color="#b7f5c4"
        glow
      />
    </group>
  );
}
function Installation({
  district,
  onSelect,
  night,
}: {
  night: boolean;
  district: District;
  onSelect: (d: District) => void;
}) {
  const { id, color, position } = district;
  const reduced = useContext(ReducedMotion);
  const [hovered, setHovered] = useState(false);
  return (
    <group position={position}>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[1.8, 1.9, 0.22, 6]} />
        <meshStandardMaterial
          color={hovered ? '#d5b56c' : '#b29357'}
          emissive={color}
          emissiveIntensity={hovered ? 0.12 : 0}
        />
      </mesh>
      <group
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta <= 5) onSelect(district);
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer';
          setHovered(true);
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
          setHovered(false);
        }}
      >
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
          {id === 'robotics' && (
            <group>
              <Box
                position={[0, 0.26, 0]}
                size={[1.8, 0.28, 1.5]}
                color="#333747"
              />
              <Robot />
              <Box
                position={[-1.2, 0.8, -0.6]}
                size={[0.3, 1.5, 0.3]}
                color="#748c90"
              />
              <Box
                position={[-0.4, 1.55, -0.6]}
                size={[1.9, 0.15, 0.25]}
                color="#9ec0b1"
              />
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
      </group>
      <GroundLabel
        title={district.title}
        number={district.number}
        position={[0, 0.16, 1.45]}
        onClick={() => onSelect(district)}
        dark={night}
      />
    </group>
  );
}
type ZoomCommand = { direction: number; sequence: number };

function CameraControls({
  reset,
  paused,
  benchmarking,
  zoomCommand,
  reduced,
}: {
  reset: number;
  paused: boolean;
  benchmarking: boolean;
  zoomCommand: ZoomCommand;
  reduced: boolean;
}) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { get, invalidate, size, gl } = useThree();
  const fitted = useRef(1);
  const level = useRef(FITTED_LEVEL);
  const targetZoom = useRef(0);
  const zoomAt = useCallback(
    (next: number) => {
      level.current = clampLevel(next);
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
    camera.position.set(17, 18, 23);
    // The chrome above and below the island is a fixed ~160px on a tall
    // screen, but it folds up on a short one — reserving the full 160 there
    // leaves the island a pinhole and its labels pile on top of each other.
    fitted.current = fittedZoom(size.width, size.height);
    camera.zoom = zoomForLevel(fitted.current, FITTED_LEVEL);
    level.current = FITTED_LEVEL;
    targetZoom.current = camera.zoom;
    camera.updateProjectionMatrix();
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
    invalidate();
  }, [get, reset, size.width, size.height, invalidate]);
  useEffect(() => {
    if (!zoomCommand.direction) return;
    zoomAt(level.current + (zoomCommand.direction > 0 ? 1 : -1));
  }, [zoomCommand, zoomAt]);
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
      position={[-1.55, 0.12, 1.95]}
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

/** A walk-through threshold into the private room, placed on the central island. */
function RoomPortal({
  player,
  paused,
  onEnter,
  onApproach,
}: {
  player: React.RefObject<Point>;
  paused: boolean;
  onEnter: () => void;
  onApproach: () => void;
}) {
  const [near, setNear] = useState(false);
  const wasNear = useRef(false);
  const entered = useRef(false);
  const position = { x: 2.65, z: 1.7 };
  useFrame(() => {
    if (paused) return;
    const distance = Math.hypot(
      player.current.x - position.x,
      player.current.z - position.z,
    );
    const nextNear = distance < 1.45;
    if (nextNear !== wasNear.current) {
      wasNear.current = nextNear;
      setNear(nextNear);
    }
    if (distance < 0.52 && !entered.current) {
      entered.current = true;
      onEnter();
    }
    if (distance > 1.1) entered.current = false;
  });
  return (
    <group
      position={[position.x, 0.12, position.z]}
      rotation={[0, -0.55, 0]}
      onClick={(event) => {
        if (paused || event.delta > 5) return;
        event.stopPropagation();
        onApproach();
      }}
      onPointerOver={() => { if (!paused) document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = ''; }}
    >
      <Box position={[-0.62, 1.05, 0]} size={[0.22, 2.1, 0.38]} color="#f0dcae" />
      <Box position={[0.62, 1.05, 0]} size={[0.22, 2.1, 0.38]} color="#f0dcae" />
      <Box position={[0, 2.05, 0]} size={[1.45, 0.22, 0.38]} color="#d7bd88" />
      <Box position={[0, 1.02, 0.12]} size={[1.02, 1.82, 0.08]} color={near ? '#91d8bd' : '#538b94'} glow={near} />
      <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.56, 0.64, 32]} />
        <meshBasicMaterial color={near ? '#b7f5c4' : '#f6dc8c'} />
      </mesh>
      <Html center position={[0, 2.65, 0]} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <span className={`world-hint ${near ? 'is-near' : ''}`}>
          {near ? 'Keep walking · enter the room' : 'Sam’s room'}
        </span>
      </Html>
    </group>
  );
}

export default function World({
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
  const playerPosition = useRef<Point>({ ...SPAWN });
  useEffect(() => {
    setTarget(null);
  }, [reset, paused]);
  return (
    <Canvas
      fallback={
        <div className="scene-fallback">
          Explore the districts with the chapter buttons below.
        </div>
      }
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
        position: [12, 12, 16],
        zoom: lowPower ? 25 : 52,
        near: 0.1,
        far: 150,
      }}
      gl={{
        antialias: !lowPower,
        powerPreference: lowPower ? 'low-power' : 'default',
      }}
    >
      {perf && <RenderProbe sampling={benchmarking && !paused} />}
      <ambientLight intensity={night ? 0.65 : 1.2} />
      <hemisphereLight args={['#fff0c3', '#8d7247', 1.6]} />
      <directionalLight
        position={[-6, 12, 6]}
        color="#ffd6b0"
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
        <ReducedMotion.Provider value={reduced || lowPower}>
          <group position={[0, -0.8, 0]}>
            <Harbor
              night={night}
              paused={paused}
              reduced={reduced || lowPower}
              onWalk={(point) => {
                if (walkable(point)) setTarget(point);
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
                onSelect={onSelect}
                night={night}
              />
            ))}
            <Companions
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
            <RoomPortal
              player={playerPosition}
              paused={paused}
              onEnter={onEnterRoom}
              onApproach={() => setTarget({ x: 2.65, z: 1.7 })}
            />
            <CollectibleSparks
              player={playerPosition}
              collected={collected}
              onCollect={onCollect}
              paused={paused}
              reduced={reduced || lowPower}
            />
            <Beacon
              paused={paused}
              reduced={reduced}
              complete={collected.length === 3}
              onPulse={onPulse}
            />
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
        reset={reset}
        paused={paused}
        benchmarking={benchmarking}
        zoomCommand={zoomCommand}
        reduced={reduced}
      />
    </Canvas>
  );
}
