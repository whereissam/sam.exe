'use client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Html, OrbitControls, Sparkles } from '@react-three/drei';
import {
  Suspense,
  type ComponentRef,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import * as THREE from 'three';
import { districts, type District } from './districts';
import RenderProbe from '../performance/RenderProbe';
import { DistrictModel } from './DistrictModel';
import { Beacon, CollectibleSparks } from './Playground';
import Companions, { type Character, type Action } from './Companions';

import { walkable, SPAWN, type Point } from './movement';

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
}: {
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
      <Html
        position={[0, id === 'blockchain' ? 4.1 : 3.2, 0]}
        center
        zIndexRange={[10, 0]}
      >
        <button
          className="world-label"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setHovered(true)}
          onBlur={() => setHovered(false)}
          onClick={() => onSelect(district)}
          aria-label={`Explore ${district.title}`}
          style={{ '--district': color } as React.CSSProperties}
        >
          <span>{district.number}</span>
          {district.title}
          <b>↗</b>
        </button>
      </Html>
    </group>
  );
}
function Tree({ position, scale = 1 }: { position: Vec; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <Box position={[0, 0.45, 0]} size={[0.15, 0.9, 0.15]} color="#9f7c85" />
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.85 + i * 0.4, 0]} castShadow>
          <coneGeometry args={[0.65 - i * 0.14, 0.85, 5]} />
          <meshStandardMaterial
            color={['#8c945d', '#b4b76e', '#d8ca83'][i]}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}
type ZoomCommand = { direction: number; sequence: number };

function CameraControls({
  reset,
  paused,
  benchmarking,
  zoomCommand,
}: {
  reset: number;
  paused: boolean;
  benchmarking: boolean;
  zoomCommand: ZoomCommand;
}) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { get, invalidate, size } = useThree();
  useEffect(() => {
    const camera = get().camera;
    camera.position.set(12, 12, 16);
    // The chrome above and below the island is a fixed ~160px on a tall
    // screen, but it folds up on a short one — reserving the full 160 there
    // leaves the island a pinhole and its labels pile on top of each other.
    const reserved = Math.min(160, size.height * 0.2);
    camera.zoom = Math.max(
      27,
      Math.min(size.width / 18, (size.height - reserved) / 14, 75),
    );
    camera.updateProjectionMatrix();
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
    invalidate();
  }, [get, reset, size.width, size.height, invalidate]);
  useEffect(() => {
    if (!zoomCommand.direction) return;
    const camera = get().camera;
    camera.zoom = THREE.MathUtils.clamp(
      camera.zoom * (zoomCommand.direction > 0 ? 1.3 : 1 / 1.3),
      15,
      220,
    );
    camera.updateProjectionMatrix();
    controls.current?.update();
    invalidate();
  }, [get, zoomCommand, invalidate]);
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan
      enableZoom
      zoomToCursor
      screenSpacePanning
      minZoom={15}
      maxZoom={220}
      minPolarAngle={0.15}
      maxPolarAngle={Math.PI / 2 - 0.05}
      touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      enabled={!paused}
      enableDamping={false}
      autoRotate={!paused && benchmarking}
      autoRotateSpeed={0.12}
    />
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
          WebGL is unavailable. Explore the districts below.
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
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-normalBias={0.04}
      />
      <Suspense fallback={null}>
        <ReducedMotion.Provider value={reduced || lowPower}>
          <group position={[0, -0.8, 0]}>
            <mesh
              position={[0, -0.55, 0]}
              receiveShadow
              castShadow
              onClick={(event) => {
                if (
                  paused ||
                  event.delta > 5 ||
                  !event.face ||
                  event.face.normal.y < 0.5
                )
                  return;
                const point = { x: event.point.x, z: event.point.z };
                if (walkable(point)) {
                  event.stopPropagation();
                  setTarget(point);
                }
              }}
            >
              <cylinderGeometry args={[7.3, 6.5, 1.1, 8]} />
              <meshStandardMaterial color="#d1b36e" flatShading />
            </mesh>
            <mesh position={[0, -1.6, 0]}>
              <cylinderGeometry args={[6.5, 3.7, 1.3, 8]} />
              <meshStandardMaterial color="#a5824d" flatShading />
            </mesh>
            <mesh position={[0, -2.65, 0]}>
              <coneGeometry args={[3.7, 1.6, 8]} />
              <meshStandardMaterial color="#725936" flatShading />
            </mesh>
            <Box
              position={[0, 0.03, 0]}
              size={[1.5, 0.07, 11]}
              color="#ead49a"
            />
            <Box
              position={[0, 0.04, 0]}
              size={[11, 0.08, 1.3]}
              color="#ead49a"
            />
            {Array.from({ length: 12 }, (_, i) => (
              <Box
                key={i}
                position={[0, 0.09, -5.5 + i]}
                size={[0.055, 0.02, 0.35]}
                color="#eac4ae"
              />
            ))}
            {districts.map((d) => (
              <Installation key={d.id} district={d} onSelect={onSelect} />
            ))}
            {[
              [-5.5, 0, 0],
              [-1.8, 0, -5],
              [1, 0, -5.5],
              [5.4, 0, 0],
              [-1.8, 0, 5.5],
              [5, 0, 4.2],
              [-5.5, 0, -3.7],
            ].map((p, i) => (
              <Tree key={i} position={p as Vec} scale={0.65 + (i % 3) * 0.18} />
            ))}
            {[-5, -2, 2, 5].map((x, i) => (
              <group key={x} position={[x, 0, i % 2 ? 1 : -1]}>
                <Box
                  position={[0, 0.52, 0]}
                  size={[0.07, 1, 0.07]}
                  color="#c7a5b3"
                />
                <Box
                  position={[0, 1.05, 0]}
                  size={[0.22, 0.16, 0.22]}
                  color="#ffba89"
                  glow
                />
              </group>
            ))}
            <Companions
              character={character}
              action={action}
              keys={keys}
              paused={paused}
              onNear={onNear}
              reset={reset}
              target={target}
              onArrive={() => setTarget(null)}
              positionRef={playerPosition}
              reduced={reduced}
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
                position={[target.x, 0.13, target.z]}
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
      />
    </Canvas>
  );
}
