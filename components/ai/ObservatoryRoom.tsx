'use client';
/* oxlint-disable react/react-compiler -- Frame callbacks update Three.js instances, not React state. */
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  RoundedBox,
  useGLTF,
  useProgress,
} from '@react-three/drei';
import * as THREE from 'three';
import manifest from './model-manifest.json';
import RoomLoading from './RoomLoading';
import ExperimentStations from './ExperimentStations';
import WorkshopLandscape from './WorkshopLandscape';
// Start both independent model requests together, before the scene suspends.
useGLTF.preload(manifest.room);
useGLTF.preload(manifest.robot);
import {
  GRID_SIZE,
  pickupOf,
  cargoColors,
  destinations,
  key,
  same,
  type Cell,
  type Destination,
  type AgentState,
} from './agent';
type Vec = [number, number, number];
type Props = {
  viewReset: number;
  state: AgentState;
  editing: boolean;
  reduced: boolean;
  onCell: (cell: Cell) => void;
  onReady: (ready: boolean) => void;
  onPlay: () => void;
  onDestination: (destination: Destination) => void;
  onPrioritize: (id: string) => void;
  onToggleEditing: () => void;
  onInspect: () => void;
};
const world = (cell: Cell): Vec => [cell.x - 3, 0.17, cell.z - 3];
function Box({
  at,
  size,
  color,
  castShadow = true,
}: {
  at: Vec;
  size: Vec;
  color: string;
  castShadow?: boolean;
}) {
  return (
    <RoundedBox
      args={size}
      radius={Math.min(...size) * 0.15}
      smoothness={1}
      position={at}
      castShadow={castShadow}
      receiveShadow
    >
      <meshStandardMaterial color={color} roughness={0.7} />
    </RoundedBox>
  );
}
function Parcel({ color = '#c49454' }: { color?: string }) {
  return (
    <group>
      <Box at={[0, 0.18, 0]} size={[0.34, 0.32, 0.3]} color={color} />
      <Box at={[0, 0.18, 0.155]} size={[0.06, 0.32, 0.012]} color="#ecdbaf" />
      <Box at={[0, 0.345, 0]} size={[0.06, 0.012, 0.3]} color="#ecdbaf" />
    </group>
  );
}
// Text is printed onto physical plaques; it follows the room perspective.
function Plaque({
  label,
  at,
  width = 1.7,
}: {
  label: string;
  at: Vec;
  width?: number;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#e7d6ab';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#a28c61';
    ctx.lineWidth = 5;
    ctx.strokeRect(6, 6, 500, 116);
    ctx.fillStyle = '#3c463c';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '500 37px sans-serif';
    ctx.fillText(label, 256, 64, 480);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [label]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={at} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, width / 4]} />
      <meshStandardMaterial map={texture} roughness={0.9} />
    </mesh>
  );
}
function BlenderModel({ src }: { src: string }) {
  const { scene } = useGLTF(src);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);
  return <primitive object={model} dispose={null} />;
}
function Robot({
  state,
  reduced,
  onPlay,
}: Pick<Props, 'state' | 'reduced' | 'onPlay'>) {
  const robot = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  const initial = useRef(world(state.position));
  const last = useRef(world(state.position));
  const facing = useRef(0);
  useEffect(() => {
    invalidate();
  }, [state.position, reduced, invalidate]);
  useFrame((_, delta) => {
    if (!robot.current) return;
    const target = new THREE.Vector3(...world(state.position));
    const dx = target.x - last.current[0],
      dz = target.z - last.current[2];
    if (Math.hypot(dx, dz) > 0.001) {
      facing.current = Math.atan2(dx, dz);
      last.current = target.toArray() as Vec;
    }
    robot.current.position.lerp(
      target,
      reduced || state.steps === 0
        ? 1
        : 1 - Math.exp(-Math.min(delta, 0.05) * 13),
    );
    const turn = Math.atan2(
      Math.sin(facing.current - robot.current.rotation.y),
      Math.cos(facing.current - robot.current.rotation.y),
    );
    robot.current.rotation.y += turn * (reduced ? 1 : 0.22);
    if (
      robot.current.position.distanceTo(target) > 0.002 ||
      Math.abs(turn) > 0.005
    )
      invalidate();
  });
  return (
    <group
      ref={robot}
      position={initial.current}
      onClick={(event) => {
        if (event.delta > 5) return;
        event.stopPropagation();
        onPlay();
      }}
    >
      <BlenderModel src={manifest.robot} />
      {state.carrying && state.status !== 'done' && (
        <group position={[0, 0.15, 0.34]} scale={0.8}>
          <Parcel color={cargoColors[state.destination]} />
        </group>
      )}
    </group>
  );
}
export function ObservatoryObjects({
  state,
  editing,
  onCell,
  onDestination,
  onPrioritize,
  onToggleEditing,
  onInspect,
}: Omit<Props, 'reduced'>) {
  const destination = destinations.find((d) => d.id === state.destination)!;
  return (
    <group>
      <BlenderModel src={manifest.room} />
      {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
        const cell = { x: i % GRID_SIZE, z: Math.floor(i / GRID_SIZE) },
          id = key(cell);
        const wall = state.walls.includes(id),
          route = state.path.some((p) => same(p, cell));
        const goal = same(cell, destination.cell),
          pickup = same(cell, pickupOf(state));
        return (
          <group
            key={id}
            position={world(cell)}
            onClick={(event) => {
              if (event.delta > 5) return;
              event.stopPropagation();
              if (editing) onCell(cell);
              else {
                const selected = destinations.find((d) => same(d.cell, cell));
                if (selected) onDestination(selected.id);
              }
            }}
          >
            <Box
              at={[0, -0.09, 0]}
              size={[0.94, 0.12, 0.94]}
              castShadow={false}
              color={
                goal
                  ? '#9bad8c'
                  : pickup
                    ? '#d2b37a'
                    : (cell.x + cell.z) % 2
                      ? '#e3d9bc'
                      : '#d8cdb0'
              }
            />
            {route && !wall && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
                <circleGeometry args={[0.09, 16]} />
                <meshBasicMaterial color="#6f9d92" />
              </mesh>
            )}
            {wall && (
              <group>
                <Box
                  at={[0, 0.28, 0]}
                  size={[0.78, 0.56, 0.78]}
                  color="#b78063"
                />
                <Box
                  at={[0, 0.57, 0]}
                  size={[0.78, 0.03, 0.13]}
                  castShadow={false}
                  color="#e7ca8e"
                />
              </group>
            )}
          </group>
        );
      })}
      {destinations.map((d) => (
        <group
          key={d.id}
          position={world(d.cell)}
          onClick={(event) => {
            if (event.delta > 5 || editing) return;
            event.stopPropagation();
            onDestination(d.id);
          }}
        >
          <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.31, 0.39, 32]} />
            <meshStandardMaterial
              color={d.id === state.destination ? '#568474' : '#bba477'}
            />
          </mesh>
          <Plaque label={d.name} at={[0, 0.045, 0.34]} width={0.92} />
        </group>
      ))}
      {state.status !== 'done' &&
        state.jobs.slice(state.jobIndex).map(
          (job, i) =>
            !(i === 0 && state.carrying) && (
              <group
                key={job.id}
                position={[job.pickup.x - 2.75, 0.17, job.pickup.z - 3.24]}
                onClick={(event) => {
                  if (event.delta > 5 || editing) return;
                  event.stopPropagation();
                  onPrioritize(job.id);
                }}
              >
                <Parcel color={cargoColors[job.destination]} />
                <Plaque label={`#${job.id}`} at={[0, 0.35, 0]} width={0.26} />
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                  <ringGeometry args={[0.25, 0.28, 20]} />
                  <meshBasicMaterial color={cargoColors[job.destination]} />
                </mesh>
              </group>
            ),
        )}
      <group
        position={[-4.45, 0, 0.3]}
        onClick={(event) => {
          if (event.delta > 5) return;
          event.stopPropagation();
          onToggleEditing();
        }}
      >
        <Box
          at={[0, 0.35, 0]}
          size={[1.55, 0.7, 0.7]}
          color={editing ? '#689582' : '#b78063'}
        />
        <Box at={[0, 0.72, 0]} size={[1.65, 0.08, 0.8]} color="#cfb782" />
        <Plaque
          label={editing ? 'FINISH BUILDING' : 'PLACE CRATES'}
          at={[0, 0.765, 0]}
          width={1.5}
        />
      </group>
      <group
        position={[-4.15, 0, 2.4]}
        onClick={(event) => {
          if (event.delta > 5) return;
          event.stopPropagation();
          onInspect();
        }}
      >
        <Box at={[0, 0.35, 0]} size={[1.55, 0.7, 0.7]} color="#728b80" />
        <Box at={[0, 0.72, 0]} size={[1.65, 0.08, 0.8]} color="#cfb782" />
        <Plaque label="FIELD NOTES" at={[0, 0.765, 0]} width={1.5} />
      </group>
      <Plaque label="FIELD STATION / 04" at={[-0.7, 0.13, -3.85]} width={2.6} />
    </group>
  );
}
function RoomCamera({ reset }: { reset: number }) {
  const { camera, size, invalidate } = useThree();
  const orbit = useRef<ComponentRef<typeof OrbitControls>>(null);
  // Fit the station, never the backdrop. Keep zoom-out close to this framing.
  const fittedZoom = Math.max(
    8,
    Math.min(
      Math.max(120, size.width - 40) / 13.6,
      Math.max(100, size.height - 72) / 10.2,
    ),
  );
  useEffect(() => {
    camera.position.set(7, 9, 12);
    camera.zoom = fittedZoom;
    camera.lookAt(0, 0.8, 0);
    camera.updateProjectionMatrix();
    if (orbit.current) {
      orbit.current.target.set(0, 0.8, 0);
      orbit.current.update();
    }
    invalidate();
  }, [camera, fittedZoom, reset, invalidate]);
  return (
    <OrbitControls
      ref={orbit}
      target={[0, 0.8, 0]}
      enablePan={false}
      minZoom={fittedZoom * 0.85}
      maxZoom={fittedZoom * 2.4}
      minPolarAngle={0.35}
      maxPolarAngle={1.1}
    />
  );
}
function Ready({ onReady }: { onReady: (ready: boolean) => void }) {
  useEffect(() => {
    onReady(true);
  }, [onReady]);
  return null;
}
export default function ObservatoryRoom(props: Props) {
  const [ready, setReady] = useState(false);
  const { loaded, total } = useProgress();
  const { onReady } = props;
  useEffect(() => {
    if (ready) onReady(true);
  }, [ready, onReady]);
  return (
    <>
      {!ready && <RoomLoading loaded={loaded} total={total} />}
      <Canvas
        shadows="soft"
        frameloop="demand"
        orthographic
        dpr={[1, 1.25]}
        camera={{ position: [7, 9, 12], zoom: 45, near: 0.1, far: 80 }}
        gl={{ antialias: true, powerPreference: 'low-power' }}
      >
        <color attach="background" args={['#c5d1c7']} />
        <WorkshopLandscape />
        <ambientLight intensity={1.8} />
        <directionalLight
          position={[-5, 10, 4]}
          intensity={2.4}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-8}
          shadow-camera-right={8}
          shadow-camera-top={8}
          shadow-camera-bottom={-8}
          // The default 500-unit depth range magnifies bias and detaches shadows.
          shadow-camera-near={0.5}
          shadow-camera-far={30}
          shadow-bias={-0.00008}
          shadow-normalBias={0.015}
        />
        <Suspense fallback={null}>
          <ObservatoryObjects {...props} />
          <ExperimentStations
            state={props.state}
            reduced={props.reduced}
            onDestination={props.onDestination}
          />
          <Ready onReady={setReady} />
          <Robot
            state={props.state}
            reduced={props.reduced}
            onPlay={props.onPlay}
          />
        </Suspense>
        <RoomCamera reset={props.viewReset} />
      </Canvas>
    </>
  );
}
