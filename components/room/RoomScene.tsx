'use client';

/* oxlint-disable react/react-compiler -- Three.js animation intentionally mutates scene refs in frame callbacks. */
import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Html, Line, OrbitControls } from '@react-three/drei';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  TravellerAvatar,
  TravellerPlaceholder,
  type Motion,
} from '@/components/world/Companions';
import { cameraRelative, type Point } from '@/components/world/movement';
import { roomObjects, roomObjectById, type RoomObjectId } from './room-data';
import RoomDesktop from './RoomDesktop';

type Vec3 = [number, number, number];
const SPAWN: Point = { x: 0, z: 2.2 };
// Only enlarge Sam in this room; furniture and island characters retain their sizes.
const PLAYER_SCALE = 1.65;
// Pillow top = 1.09. Head back = -0.33 in the model, scaled by 0.52 * PLAYER_SCALE.
const PILLOW_HEAD_LIFT = (1.09 - 1.0) / (0.52 * PLAYER_SCALE) + 0.33;
const ink = '#3b3324';
const cream = '#f1dfb2';
const teal = '#6d9d99';
const paleTeal = '#b9d0c7';
const rust = '#c87853';
const gold = '#e7b85e';

function B({ at, size, color, rotation = [0, 0, 0], glow = false }: { at: Vec3; size: Vec3; color: string; rotation?: Vec3; glow?: boolean }) {
  return (
    <mesh position={at} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.78} emissive={glow ? color : '#000000'} emissiveIntensity={glow ? 0.65 : 0} />
    </mesh>
  );
}

function Inspectable({ id, selected, onGo, labelY = 2.7, children }: { id: RoomObjectId; selected: RoomObjectId | null; onGo: (id: RoomObjectId) => void; labelY?: number; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  const active = selected === id || hovered;
  return (
    <group
      onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); if (event.delta <= 5) onGo(id); }}
      onPointerOver={(event) => { event.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = ''; }}
    >
      {children}
      {active && (
        <>
          <mesh position={[roomObjectById[id].approach[0], 0.08, roomObjectById[id].approach[1]]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.58, 0.63, 36]} />
            <meshBasicMaterial color={gold} transparent opacity={0.9} />
          </mesh>
          <Html center position={[roomObjectById[id].approach[0], labelY, roomObjectById[id].approach[1]]} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
            <span className="room-object-label"><b>{roomObjectById[id].number}</b>{roomObjectById[id].label}</span>
          </Html>
        </>
      )}
    </group>
  );
}

function MechanicalKeyboard() {
  const rows = [
    { count: 14, z: -0.19, shift: 0 },
    { count: 13, z: -0.06, shift: -0.015 },
    { count: 12, z: 0.07, shift: -0.025 },
  ];
  const bottom = [
    { x: -0.63, width: 0.12 },
    { x: -0.48, width: 0.12 },
    { x: -0.06, width: 0.62 },
    { x: 0.36, width: 0.12 },
    { x: 0.51, width: 0.12 },
    { x: 0.66, width: 0.12 },
  ];

  return (
    <group position={[-0.45, 1.34, 0.34]}>
      <B at={[0, 0, 0]} size={[1.62, 0.075, 0.62]} color="#4c5148" />
      {rows.flatMap((row, rowIndex) => Array.from({ length: row.count }, (_, keyIndex) => {
        const x = (keyIndex - (row.count - 1) / 2) * 0.105 + row.shift;
        const accent = rowIndex === 0 && keyIndex === 0
          ? rust
          : rowIndex === 1 && keyIndex === row.count - 1
            ? teal
            : '#e8ddba';
        return (
          <group key={`${rowIndex}-${keyIndex}`} position={[x, 0, row.z]}>
            <B at={[0, 0.055, 0]} size={[0.087, 0.055, 0.09]} color={accent} />
            <B at={[0, 0.084, -0.005]} size={[0.025, 0.005, 0.012]} color="#6f6b58" />
          </group>
        );
      }))}
      {bottom.map((key, index) => (
        <group key={key.x} position={[key.x, 0, 0.2]}>
          <B at={[0, 0.055, 0]} size={[key.width, 0.055, 0.09]} color={index === bottom.length - 1 ? rust : '#e8ddba'} />
          {index !== 2 && <B at={[0, 0.084, -0.005]} size={[0.025, 0.005, 0.012]} color="#6f6b58" />}
        </group>
      ))}
    </group>
  );
}

function Workstation(props: Pick<ObjectProps, 'selected' | 'onGo' | 'simulation'> & { desktopMode: boolean; onExitDesktop: () => void }) {
  return (
    <Inspectable id="workstation" selected={props.selected} onGo={props.onGo} labelY={3.25}>
      <group position={[-4.55, 0, -4.75]}>
        <B at={[0, 1.18, 0]} size={[4.1, 0.22, 1.35]} color="#a97852" />
        {[-1.72, 1.72].flatMap((x) => [-0.48, 0.48].map((z) => <B key={`${x}-${z}`} at={[x, 0.57, z]} size={[0.16, 1.14, 0.16]} color="#826043" />))}
        <group position={[-0.55, 2.02, -0.25]}>
          <B at={[0, 0, 0]} size={[2.25, 1.05, 0.12]} color={ink} />
          <mesh position={[0, 0, 0.068]}>
            <planeGeometry args={[2.02, 0.82]} />
            <meshStandardMaterial color={props.simulation ? '#86d8c0' : '#47706d'} emissive={teal} emissiveIntensity={props.simulation ? 1 : 0.22} />
          </mesh>
          {!props.desktopMode && [0.32, 0.08, -0.18].map((y, i) => <B key={y} at={[-0.42 + i * 0.12, y, 0.075]} size={[0.84 - i * 0.14, 0.035, 0.012]} color={cream} glow={props.simulation} />)}
          {props.desktopMode && (
            <Html
              transform
              center
              position={[0, 0, 0.078]}
              scale={0.085}
              zIndexRange={[8, 0]}
              style={{ pointerEvents: 'auto' }}
            >
              <RoomDesktop onClose={props.onExitDesktop} />
            </Html>
          )}
          <B at={[0, -0.72, 0]} size={[0.13, 0.42, 0.13]} color={ink} />
        </group>
        <group position={[1.05, 1.38, 0.03]} rotation={[0, -0.2, 0]}>
          <B at={[0, 0, 0]} size={[1.05, 0.05, 0.68]} color="#6e817e" />
          <B at={[0, 0.36, -0.32]} size={[1.05, 0.7, 0.05]} color="#86aaa3" rotation={[-0.08, 0, 0]} />
        </group>
        <MechanicalKeyboard />
        <mesh position={[1.72, 1.48, 0.35]} castShadow><cylinderGeometry args={[0.18, 0.16, 0.38, 10]} /><meshStandardMaterial color={rust} /></mesh>
        <group position={[-0.55, 0, 1.25]}>
          <B at={[0, 0.72, 0]} size={[0.95, 0.16, 0.9]} color="#526e68" />
          <B at={[0, 1.24, 0.39]} size={[0.95, 0.95, 0.14]} color="#526e68" />
          {[-0.35, 0.35].flatMap((x) => [-0.32, 0.32].map((z) => <B key={`${x}-${z}`} at={[x, 0.32, z]} size={[0.09, 0.64, 0.09]} color={ink} />))}
        </group>
      </group>
    </Inspectable>
  );
}

function AICore({ selected, onGo, simulation }: ObjectProps) {
  const core = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (core.current) core.current.rotation.y += dt * (simulation ? 0.9 : 0.22); });
  return (
    <Inspectable id="ai-core" selected={selected} onGo={onGo} labelY={2.75}>
      <group position={[-0.85, 1.32, -4.95]} scale={0.42}>
        <mesh position={[0, 0.24, 0]} castShadow receiveShadow><cylinderGeometry args={[0.82, 0.98, 0.45, 6]} /><meshStandardMaterial color="#d6bb7b" /></mesh>
        <group ref={core} position={[0, 1.25, 0]} rotation={[0.3, 0.4, 0.2]}>
          <mesh castShadow><octahedronGeometry args={[0.54, 0]} /><meshStandardMaterial color={simulation ? '#b9f0d5' : gold} emissive={simulation ? '#66d4ae' : gold} emissiveIntensity={simulation ? 1.4 : 0.32} flatShading /></mesh>
          <mesh scale={1.32}><boxGeometry args={[0.78, 0.78, 0.78]} /><meshBasicMaterial color={teal} wireframe transparent opacity={simulation ? 0.72 : 0.24} /></mesh>
        </group>
        {[0, 1, 2].map((i) => <mesh key={i} position={[0, 1.25, 0]} rotation={[Math.PI / 2, i * 1.05, 0]}><torusGeometry args={[0.88 + i * 0.08, 0.018, 6, 40]} /><meshBasicMaterial color={simulation ? '#8de2c5' : cream} transparent opacity={simulation ? 0.8 : 0.35} /></mesh>)}
      </group>
    </Inspectable>
  );
}

function WebGLStudy({ selected, onGo, simulation }: ObjectProps) {
  const art = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (art.current) art.current.rotation.z = Math.sin(clock.elapsedTime * 0.45) * (simulation ? 0.2 : 0.06); });
  return (
    <Inspectable id="webgl" selected={selected} onGo={onGo} labelY={4.8}>
      <group position={[-2.45, 0, -5.79]}>
        <B at={[0, 3.5, 0]} size={[2.7, 2.35, 0.14]} color="#e8d7ad" />
        <group ref={art} position={[0, 3.5, 0.12]}>
          <mesh><torusKnotGeometry args={[0.55, 0.16, 48, 8]} /><meshStandardMaterial color={teal} emissive={teal} emissiveIntensity={simulation ? 0.7 : 0.08} flatShading /></mesh>
          <mesh rotation={[0, 0, Math.PI / 4]}><torusGeometry args={[0.95, 0.035, 6, 36]} /><meshBasicMaterial color={rust} /></mesh>
        </group>
      </group>
    </Inspectable>
  );
}

function RobotArm({ selected, onGo, simulation }: ObjectProps) {
  const arm = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (arm.current) arm.current.rotation.z = simulation ? Math.sin(clock.elapsedTime * 0.7) * 0.28 - 0.25 : -0.25; });
  return (
    <Inspectable id="robot-arm" selected={selected} onGo={onGo} labelY={3.1}>
      <group position={[0.7, 1.32, -4.95]} scale={0.48}>
        <mesh position={[0, 0.11, 0]} castShadow><cylinderGeometry args={[0.48, 0.62, 0.22, 12]} /><meshStandardMaterial color={cream} /></mesh>
        <group position={[0, 0.2, 0]}>
          <group ref={arm} rotation={[0, 0, -0.25]}>
            <B at={[0, 0.5, 0]} size={[0.3, 1.02, 0.32]} color={rust} />
            <mesh position={[0, 1.03, 0]} castShadow><sphereGeometry args={[0.23, 12, 8]} /><meshStandardMaterial color={cream} /></mesh>
            <group position={[0, 1.05, 0]} rotation={[0, 0, 1.08]}>
              <B at={[0, 0.43, 0]} size={[0.25, 0.9, 0.28]} color={gold} />
              <B at={[0, 0.92, 0]} size={[0.48, 0.15, 0.36]} color={ink} />
            </group>
          </group>
        </group>
      </group>
    </Inspectable>
  );
}

function G1Robot({ selected, onGo, simulation }: ObjectProps) {
  const path = useMemo(() => [[-0.5, 0.08, -2.8], [0.4, 0.08, -2.8], [1.2, 0.08, -2.1], [2, 0.08, -2.1]] as Vec3[], []);
  return (
    <Inspectable id="robot" selected={selected} onGo={onGo} labelY={3.55}>
      <group position={[2.1, 1.32, -4.95]} scale={0.48}>
        <mesh position={[0, 0.18, 0]} receiveShadow><cylinderGeometry args={[1.05, 1.18, 0.34, 6]} /><meshStandardMaterial color="#d8bd7c" /></mesh>
        <B at={[0, 1.82, 0]} size={[0.78, 1.05, 0.52]} color="#e7dfc6" />
        <B at={[0, 2.57, 0]} size={[0.88, 0.58, 0.62]} color="#e9e2ce" />
        <B at={[0, 2.58, 0.325]} size={[0.66, 0.19, 0.04]} color={simulation ? '#73d8bd' : ink} glow={simulation} />
        {[-0.28, 0.28].map((x) => <group key={x}><B at={[x, 0.82, 0]} size={[0.24, 0.95, 0.28]} color="#667b79" /><B at={[x, 0.28, 0.12]} size={[0.33, 0.2, 0.52]} color="#e7dfc6" /></group>)}
        {[-0.62, 0.62].map((x) => <B key={x} at={[x, 1.72, 0]} size={[0.22, 1.05, 0.28]} color="#c3d3c8" rotation={[0, 0, x * 0.08]} />)}
      </group>
      {simulation && <Line points={path} color="#75d7ba" lineWidth={2} dashed dashSize={0.22} gapSize={0.16} />}
    </Inspectable>
  );
}

function Learning({ selected, onGo }: ObjectProps) {
  return (
    <Inspectable id="learning" selected={selected} onGo={onGo} labelY={3.6}>
      <group position={[-7.5, 0, 0.1]}>
        <B at={[-0.22, 1.7, 0]} size={[0.1, 3.4, 2.8]} color="#8d7157" />
        {[-1.4, 1.4].map((z) => <B key={z} at={[0.18, 1.7, z]} size={[0.9, 3.4, 0.14]} color="#b28c64" />)}
        {[0.15, 0.95, 1.75, 2.55, 3.35].map((y) => <B key={y} at={[0.18, y, 0]} size={[0.9, 0.12, 2.8]} color="#c39e72" />)}
        {[0.95, 1.75, 2.55].flatMap((y, row) => Array.from({ length: 9 }, (_, i) => {
          const height = 0.44 + ((i + row) % 3) * 0.08;
          return <group key={`${row}-${i}`}>
            <B at={[0.24, y + 0.06 + height / 2, -1.15 + i * 0.25]} size={[0.48, height, 0.18]} color={[rust, '#d6bc7e', '#ded2aa', '#526e68'][ (i + row) % 4]} />
            <B at={[0.485, y + 0.2, -1.15 + i * 0.25]} size={[0.012, 0.035, 0.13]} color={cream} />
          </group>;
        }))}
        {[-0.65, 0.65].map((z) => <B key={z} at={[0.22, 0.5, z]} size={[0.65, 0.52, 1.03]} color="#a4b5a5" />)}
      </group>
    </Inspectable>
  );
}

function TravelCorner({ selected, onGo }: ObjectProps) {
  return (
    <Inspectable id="travel" selected={selected} onGo={onGo} labelY={3.5}>
      <group position={[-6.35, 0, 4.35]}>
        <B at={[-1.4, 2.8, 0]} size={[0.12, 2.25, 3.1]} color="#e9d7ad" />
        {[[-1.32, 3.3, -0.55], [-1.32, 2.75, 0.25], [-1.32, 2.25, 0.7]].map((p, i) => <mesh key={i} position={p as Vec3} rotation={[0, Math.PI / 2, 0]}><circleGeometry args={[0.08, 10]} /><meshBasicMaterial color={[rust, gold, teal][i]} /></mesh>)}
        <mesh position={[0, 1.12, -0.3]} castShadow><sphereGeometry args={[0.62, 16, 10]} /><meshStandardMaterial color={paleTeal} flatShading /></mesh>
        <mesh position={[0, 1.12, -0.3]} rotation={[0, 0, 0.4]}><torusGeometry args={[0.69, 0.035, 6, 32]} /><meshStandardMaterial color={ink} /></mesh>
        <B at={[0, 0.38, -0.3]} size={[0.65, 0.12, 0.65]} color="#b88a58" />
        <B at={[0, 0.19, -0.3]} size={[0.1, 0.38, 0.1]} color={ink} />
        <B at={[0, 0.06, -0.3]} size={[0.6, 0.12, 0.6]} color="#b88a58" />
        <B at={[0.62, 0.65, 0.72]} size={[0.82, 1.28, 0.48]} color={rust} />
        <B at={[0.62, 1.34, 0.72]} size={[0.38, 0.1, 0.16]} color={ink} />
        {[-0.22, 0.22].map((x) => <B key={x} at={[0.62 + x, 0.65, 0.965]} size={[0.07, 1.22, 0.035]} color="#e4bc87" />)}
      </group>
    </Inspectable>
  );
}

function Relic({ selected, onGo, simulation }: ObjectProps) {
  return (
    <Inspectable id="relic" selected={selected} onGo={onGo} labelY={2.15}>
      <group position={[3.25, 0.98, -3.6]} scale={0.3}>
        <mesh position={[0, 0.44, 0]} castShadow><cylinderGeometry args={[0.62, 0.78, 0.82, 6]} /><meshStandardMaterial color="#c3a56d" /></mesh>
        <mesh position={[0, 1.18, 0]} rotation={[0, 0, Math.PI / 4]} castShadow><octahedronGeometry args={[0.43, 0]} /><meshStandardMaterial color="#8778a5" emissive="#8778a5" emissiveIntensity={simulation ? 0.45 : 0.05} /></mesh>
        <mesh position={[0, 1.18, 0]}><torusGeometry args={[0.65, 0.025, 6, 32]} /><meshBasicMaterial color={cream} transparent opacity={0.6} /></mesh>
      </group>
    </Inspectable>
  );
}

function Plant({ position, scale = 1, reduced }: { position: Vec3; scale?: number; reduced: boolean }) {
  const leaves = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (leaves.current && !reduced) leaves.current.rotation.z = Math.sin(clock.elapsedTime * 0.55 + position[0]) * 0.025; });
  return <group position={position} scale={scale}><mesh position={[0, 0.38, 0]} castShadow><cylinderGeometry args={[0.43, 0.34, 0.72, 10]} /><meshStandardMaterial color="#ad7554" /></mesh><group ref={leaves} position={[0, 0.72, 0]}>{Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return <mesh key={i} position={[Math.cos(a) * 0.18, 0.48 + (i % 3) * 0.18, Math.sin(a) * 0.18]} rotation={[0, -a, Math.cos(a) * 0.5]} scale={[0.75, 2.5, 0.35]} castShadow><icosahedronGeometry args={[0.24, 1]} /><meshStandardMaterial color={i % 2 ? '#6f9c67' : '#8bad70'} flatShading /></mesh>; })}</group></group>;
}

function LivingDetails({ reduced, selected, onGo }: { reduced: boolean } & Pick<ObjectProps, 'selected' | 'onGo'>) {
  const sleeping = selected === 'bed';
  return (
    <>
      {/* A real bed: headboard against the wall, mattress, pillows and folded duvet. */}
      <Inspectable id="bed" selected={selected} onGo={onGo} labelY={2.3}>
      <group position={[5.5, 0, -2.9]}>
        {[-1.25, 1.25].flatMap((x) => [-2.2, 2.2].map((z) => <B key={`${x}-${z}`} at={[x, 0.22, z]} size={[0.16, 0.44, 0.16]} color="#8d7157" />))}
        <B at={[0, 0.42, 0]} size={[3.05, 0.3, 4.85]} color="#b28c64" />
        <B at={[0, 1.05, -2.4]} size={[3.12, 1.65, 0.18]} color="#b28c64" />
        <B at={[0, 0.72, 0]} size={[2.9, 0.34, 4.6]} color="#f2ebd8" />
        <B at={[0, sleeping ? 1.18 : 0.92, 0.6]} size={[2.94, sleeping ? 0.48 : 0.18, 3.35]} color="#789b91" />
        <B at={[0, sleeping ? 1.4 : 1.03, -0.93]} size={[2.95, 0.14, 0.38]} color="#a6bfb0" />
        {[-0.73, 0.73].map((x) => <B key={x} at={[x, 0.98, -1.65]} size={[1.18, 0.22, 0.77]} color="#fff0d7" rotation={[0, x * 0.06, 0]} />)}
        <B at={[0, sleeping ? 1.43 : 1.03, 1.53]} size={[2.98, 0.08, 0.85]} color="#d3ad72" />
      </group>
      </Inspectable>
      <group position={[3.25, 0, -3.6]}>
        <B at={[0, 0.5, 0]} size={[1.05, 0.9, 1.05]} color="#b28c64" />
        <B at={[0, 0.97, 0]} size={[1.13, 0.08, 1.13]} color="#c9a677" />
        <B at={[0, 0.61, 0.535]} size={[0.85, 0.42, 0.04]} color="#c9a677" />
        <B at={[0, 0.61, 0.57]} size={[0.22, 0.05, 0.05]} color={ink} />
      </group>
      {/* Project models live together on a conventional storage cabinet. */}
      <group position={[0.65, 0, -4.95]}>
        <B at={[0, 0.68, 0]} size={[4.4, 1.2, 1.2]} color="#789b91" />
        <B at={[0, 1.31, 0]} size={[4.52, 0.1, 1.3]} color="#c9a677" />
        {[-1.43, 0, 1.43].map((x) => <group key={x}>
          <B at={[x, 0.7, 0.615]} size={[1.35, 1.03, 0.04]} color="#91aea0" />
          <B at={[x, 1.03, 0.65]} size={[0.28, 0.05, 0.05]} color={ink} />
        </group>)}
      </group>
      <B at={[0.15, 0.045, 1.25]} size={[6.1, 0.035, 4.4]} color="#c1baa0" />
      {[-0.6, -0.45, 2.95, 3.1].map((z) => <B key={z} at={[0.15, 0.065, z]} size={[5.85, 0.009, 0.045]} color="#e9dfc4" />)}
      <Plant position={[6.75, 0, 3.5]} reduced={reduced} />
    </>
  );
}

type ObjectProps = { selected: RoomObjectId | null; onGo: (id: RoomObjectId) => void; simulation: boolean };

const obstacles = [
  [-6.65, -2.45, -5.45, -4.05], [-5.6, -4.6, -4.0, -3.05],
  [-1.61, 2.91, -5.6, -4.3], [3.94, 7.06, -5.4, -0.47],
  [2.68, 3.82, -4.17, -3.03], [-7.8, -6.85, -1.4, 1.6],
  [-7.1, -5.25, 3.3, 5.4], [6.3, 7.2, 3.05, 3.95],
] as const;

function walkable(point: Point) {
  const pad = 0.25;
  if (point.x < -7.2 || point.x > 7.2 || point.z < -5.25 || point.z > 5.25) return false;
  return !obstacles.some(([minX, maxX, minZ, maxZ]) => point.x > minX - pad && point.x < maxX + pad && point.z > minZ - pad && point.z < maxZ + pad);
}

function advance(position: Point, dx: number, dz: number) {
  const next = { x: position.x + dx, z: position.z + dz };
  if (walkable(next)) return next;
  const xOnly = { x: position.x + dx, z: position.z };
  if (walkable(xOnly)) return xOnly;
  const zOnly = { x: position.x, z: position.z + dz };
  return walkable(zOnly) ? zOnly : position;
}

function RoomPlayer({ keys, target, setTarget, reset, reduced, desktopMode, sleeping, onWake, onNearby, pending, onArrive }: { keys: React.RefObject<Set<string>>; target: Point | null; setTarget: (point: Point | null) => void; reset: number; reduced: boolean; desktopMode: boolean; sleeping: boolean; onWake: () => void; onNearby: (id: RoomObjectId | null) => void; pending: RoomObjectId | null; onArrive: (id: RoomObjectId) => void }) {
  const actor = useRef<THREE.Group>(null);
  const position = useRef<Point>({ ...SPAWN });
  const forward = useRef(new THREE.Vector3());
  const previousNear = useRef<RoomObjectId | null>(null);
  const motion = useRef<Motion>({ walking: false, phase: 0, gesture: null, time: 0 });
  const wasSleeping = useRef(false);
  useEffect(() => {
    position.current = { ...SPAWN };
    wasSleeping.current = false;
    if (actor.current) {
      actor.current.position.set(SPAWN.x, 0.12, SPAWN.z);
      actor.current.rotation.set(0, 0, 0);
    }
    setTarget(null);
  }, [reset, setTarget]);
  useEffect(() => {
    if (!actor.current) return;
    if (sleeping) {
      motion.current.walking = false;
      motion.current.seated = false;
      // Lie face-up along the mattress, independently of the island's curled resting pose.
      wasSleeping.current = true;
      motion.current.routine = undefined;
      actor.current.position.set(4.77, 1.0, -2.85);
      actor.current.rotation.set(-Math.PI / 2, 0, 0);
      setTarget(null);
    } else if (wasSleeping.current) {
      wasSleeping.current = false;
      motion.current.routine = undefined;
      position.current = { x: 5.5, z: 0.3 };
      actor.current.position.set(5.5, 0.12, 0.3);
      actor.current.rotation.set(0, 0, 0);
    }
  }, [sleeping, setTarget]);
  useEffect(() => {
    if (!actor.current) return;
    if (desktopMode) {
      position.current = { x: -4.35, z: -3.62 };
      actor.current.position.set(-4.35, 0.69, -3.62);
      actor.current.rotation.y = 0;
      motion.current.seated = true;
      motion.current.walking = false;
      setTarget(null);
    } else if (motion.current.seated) {
      position.current = { x: -4.35, z: -3.15 };
      actor.current.position.set(-4.35, 0.12, -3.15);
      motion.current.seated = false;
    }
  }, [desktopMode, setTarget]);
  useFrame(({ camera }, dt) => {
    if (!actor.current) return;
    if (desktopMode) return;
    dt = Math.min(dt, 0.05);
    const k = keys.current;
    const x = Number(k.has('d') || k.has('arrowright')) - Number(k.has('a') || k.has('arrowleft'));
    const z = Number(k.has('s') || k.has('arrowdown')) - Number(k.has('w') || k.has('arrowup'));
    if (sleeping) { if (x || z || target) onWake(); return; }
    let dx = 0, dz = 0;
    if (x || z) {
      if (target) setTarget(null);
      camera.getWorldDirection(forward.current);
      const direction = cameraRelative(x, z, forward.current);
      dx = direction.x * dt * 2.35;
      dz = direction.z * dt * 2.35;
    } else if (target) {
      const tx = target.x - position.current.x, tz = target.z - position.current.z;
      const distance = Math.hypot(tx, tz);
      if (distance < 0.12) { setTarget(null); if (pending) onArrive(pending); }
      else { const step = Math.min(distance, dt * 2.35); dx = tx / distance * step; dz = tz / distance * step; }
    }
    const walking = Math.abs(dx) + Math.abs(dz) > 0.0001;
    if (walking) {
      const next = advance(position.current, dx, dz);
      const movedX = next.x - position.current.x, movedZ = next.z - position.current.z;
      position.current = next;
      actor.current.position.set(next.x, 0.12, next.z);
      if (Math.abs(movedX) + Math.abs(movedZ) > 0.0001) actor.current.rotation.y = Math.atan2(movedX, movedZ);
      motion.current.phase += dt;
    }
    motion.current.walking = walking;
    let near: RoomObjectId | null = null, nearest = 1.35;
    for (const item of roomObjects) {
      const distance = Math.hypot(position.current.x - item.approach[0], position.current.z - item.approach[1]);
      if (distance < nearest) { nearest = distance; near = item.id; }
    }
    if (near !== previousNear.current) { previousNear.current = near; onNearby(near); }
  });
  return (
    <group ref={actor} position={[SPAWN.x, 0.12, SPAWN.z]} visible={!desktopMode}>
      <group scale={PLAYER_SCALE}><Suspense fallback={<TravellerPlaceholder character="sam" />}><TravellerAvatar character="sam" motion={motion} reduced={reduced} restingHeadLift={sleeping ? PILLOW_HEAD_LIFT : 0} /></Suspense></group>
      {sleeping ? <Html center position={[0, 1.8, 0.8]} style={{ pointerEvents: 'none' }}><span className="room-object-label">Z z z</span></Html> : <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[0.5, 0.025, 6, 32]} /><meshBasicMaterial color="#f4c469" /></mesh>}
    </group>
  );
}

function RoomShell({ simulation, selected, onGo, reduced, desktopMode, onExitDesktop, onWalk }: ObjectProps & { reduced: boolean; desktopMode: boolean; onExitDesktop: () => void; onWalk: (point: Point) => void }) {
  return (
    <group>
      <mesh position={[0, -0.12, 0]} receiveShadow onClick={(event) => { event.stopPropagation(); const point = { x: event.point.x, z: event.point.z }; if (walkable(point)) onWalk(point); }}>
        <boxGeometry args={[16, 0.24, 12]} /><meshStandardMaterial color="#eadcae" roughness={0.92} />
      </mesh>
      {Array.from({ length: 20 }, (_, i) => <B key={i} at={[-7.58 + i * 0.8, 0.015, 0]} size={[0.72, 0.025, 11.9]} color={i % 4 === 0 ? '#ddc994' : '#e8d8a8'} />)}
      <B at={[0, 3, -6.02]} size={[16, 6, 0.2]} color="#a9c5ba" />
      <B at={[-8.02, 3, 0]} size={[0.2, 6, 12]} color="#9bbab0" />
      <B at={[0, 0.16, -5.83]} size={[16, 0.32, 0.32]} color="#75968f" />
      <B at={[-7.83, 0.16, 0]} size={[0.32, 0.32, 12]} color="#75968f" />
      <group position={[5.65, 3.45, -5.86]}>
        <B at={[0, 0, 0]} size={[3.15, 2.5, 0.12]} color="#d9e1cf" />
        {[-1.55, 0, 1.55].map((x) => <B key={x} at={[x, 0, 0.09]} size={[0.09, 2.65, 0.1]} color={ink} />)}
        {[-1.25, 0, 1.25].map((y) => <B key={y} at={[0, y, 0.09]} size={[3.2, 0.09, 0.1]} color={ink} />)}
      </group>
      <Workstation selected={selected} onGo={onGo} simulation={simulation} desktopMode={desktopMode} onExitDesktop={onExitDesktop} />
      <AICore selected={selected} onGo={onGo} simulation={simulation} />
      <WebGLStudy selected={selected} onGo={onGo} simulation={simulation} />
      <RobotArm selected={selected} onGo={onGo} simulation={simulation} />
      <G1Robot selected={selected} onGo={onGo} simulation={simulation} />
      <Learning selected={selected} onGo={onGo} simulation={simulation} />
      <TravelCorner selected={selected} onGo={onGo} simulation={simulation} />
      <Relic selected={selected} onGo={onGo} simulation={simulation} />
      <LivingDetails reduced={reduced} selected={selected} onGo={onGo} />
      <ContactShadows position={[0, 0.04, 0]} opacity={0.28} scale={18} blur={2.8} far={8} />
    </group>
  );
}

function Camera({ reset, focusDesk }: { reset: number; focusDesk: boolean }) {
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const overviewPending = useRef(true);
  const { camera, size } = useThree();
  useEffect(() => {
    overviewPending.current = !focusDesk;
  }, [camera, focusDesk, reset, size.height, size.width]);
  useFrame((_, delta) => {
    if (!controls.current) return;
    const orthographic = camera as THREE.OrthographicCamera;
    if (!focusDesk) {
      if (!overviewPending.current) return;
      const fitZoom = Math.max(18, Math.min(64, Math.min(size.width / 22, size.height / 14) * 0.9));
      camera.position.set(13, 12, 16);
      controls.current.target.set(0, 0.8, 0);
      orthographic.zoom = fitZoom;
      orthographic.updateProjectionMatrix();
      controls.current.update();
      overviewPending.current = false;
      return;
    }
    overviewPending.current = true;
    camera.position.lerp(new THREE.Vector3(-5.1, 2.42, -1.2), Math.min(1, delta * 4.5));
    controls.current.target.lerp(new THREE.Vector3(-5.1, 1.88, -5.02), Math.min(1, delta * 5));
    const focusZoom = Math.min(500, size.width / 2.45);
    orthographic.zoom += (focusZoom - orthographic.zoom) * Math.min(1, delta * 4.5);
    orthographic.updateProjectionMatrix();
    controls.current.update();
  });
  return <OrbitControls ref={controls} makeDefault target={[0, 0.8, 0]} minPolarAngle={0.56} maxPolarAngle={1.18} minZoom={18} maxZoom={580} enablePan={false} enabled={!focusDesk} dampingFactor={0.08} />;
}

export default function RoomScene({ keys, selected, onSelect, onWake, onNearby, simulation, desktopMode, onExitDesktop, reset, reducedMotion }: { keys: React.RefObject<Set<string>>; selected: RoomObjectId | null; onSelect: (id: RoomObjectId) => void; onWake: () => void; onNearby: (id: RoomObjectId | null) => void; simulation: boolean; desktopMode: boolean; onExitDesktop: () => void; reset: number; reducedMotion: boolean; moving: boolean }) {
  const [target, setTargetState] = useState<Point | null>(null);
  const [pending, setPending] = useState<RoomObjectId | null>(null);
  const setTarget = useCallback((point: Point | null) => setTargetState(point), []);
  function goTo(id: RoomObjectId) { const item = roomObjectById[id]; setPending(id); setTarget({ x: item.approach[0], z: item.approach[1] }); }
  return (
    <Canvas shadows orthographic camera={{ position: [13, 12, 16], zoom: 52, near: 0.1, far: 80 }} dpr={[1, 1.6]} gl={{ antialias: true, powerPreference: 'high-performance' }} onCreated={({ camera }) => camera.lookAt(0, 0.8, 0)}>
      <color attach="background" args={[simulation ? '#263e3b' : '#bdd3ca']} />
      <fog attach="fog" args={[simulation ? '#263e3b' : '#bdd3ca', 24, 42]} />
      <ambientLight intensity={simulation ? 0.75 : 1.45} />
      <hemisphereLight args={[simulation ? '#b7f5d5' : '#fff0c9', '#7c6846', simulation ? 0.8 : 1.5]} />
      <directionalLight position={[-7, 12, 9]} color={simulation ? '#c9f4dd' : '#ffe0a8'} intensity={simulation ? 1.35 : 2.4} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-11} shadow-camera-right={11} shadow-camera-top={10} shadow-camera-bottom={-10} shadow-normalBias={0.035} />
      <RoomShell selected={selected} onGo={goTo} simulation={simulation} reduced={reducedMotion} desktopMode={desktopMode} onExitDesktop={onExitDesktop} onWalk={(point) => { setPending(null); setTarget(point); }} />
      <RoomPlayer keys={keys} target={target} setTarget={setTarget} reset={reset} reduced={reducedMotion} desktopMode={desktopMode} sleeping={selected === 'bed'} onWake={onWake} onNearby={onNearby} pending={pending} onArrive={(id) => { setPending(null); onSelect(id); }} />
      {target && <mesh position={[target.x, 0.035, target.z]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.18, 0.23, 32]} /><meshBasicMaterial color={gold} /></mesh>}
      <Camera reset={reset} focusDesk={desktopMode} />
    </Canvas>
  );
}
