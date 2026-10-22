'use client';
/* oxlint-disable react/react-compiler -- Frame callbacks animate Three.js refs. */
import { lazy, Suspense, useRef } from 'react';
const PhysicsFight = lazy(() => import('../robot-lab/PhysicsFight'));
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { TeleopBody } from './TeleoperationPair';
import { GroundLabel } from './GroundLabel';
import { StudioDoor, TravelPhotos, Luggage, Passage } from './RoomDoors';
import { ACTION_SECONDS, teleopPose, type CaptureGear } from './teleoperation';
import {
  operatorHeading,
  captureFrame,
  createSparringCommands,
  type SparringCommands,
} from './sparring';
import type { LabCommand } from '@/app/robot-lab/page';
type Vec = [number, number, number];
type Props = {
  commands: Record<CaptureGear, LabCommand>;
  fight: boolean;
  paused: boolean;
  reduced: boolean;
  view: 'room' | 'ring' | CaptureGear;
  reset: number;
  onInspect: (gear: CaptureGear) => void;
};
function Block({
  at,
  size,
  color = '#b69769',
}: {
  at: Vec;
  size: Vec;
  color?: string;
}) {
  return (
    <mesh position={at} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
}
/** A low outer guard leaves the ring-facing half and front entrance open. */
function CapturePlatform({ color, side }: { color: string; side: -1 | 1 }) {
  const start = side === 1 ? -Math.PI / 2 : Math.PI;
  const arc = Math.PI / 2;
  return (
    <>
      <mesh receiveShadow castShadow>
        <cylinderGeometry args={[1.38, 1.42, 0.2, 64]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.105, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.13, 1.16, 64]} />
        <meshStandardMaterial color="#e7d9b4" />
      </mesh>
      {[0.45, 0.85].map((y) => (
        <mesh
          key={y}
          position={[0, y, 0]}
          rotation={[Math.PI / 2, 0, start]}
          castShadow
        >
          <torusGeometry args={[1.3, 0.025, 8, 32, arc]} />
          <meshStandardMaterial color="#e7d9b4" roughness={0.7} />
        </mesh>
      ))}
      {[0, 0.5, 1].map((t) => (
        <Block
          key={t}
          at={[
            Math.cos(start + arc * t) * 1.3,
            0.47,
            Math.sin(start + arc * t) * 1.3,
          ]}
          size={[0.075, 0.78, 0.075]}
          color={color}
        />
      ))}
    </>
  );
}
function Pair({
  gear,
  command,
  fight,
  paused,
  reduced,
  onInspect,
  sparring,
}: {
  gear: CaptureGear;
  command: LabCommand;
  fight: boolean;
  paused: boolean;
  reduced: boolean;
  onInspect: Props['onInspect'];
  sparring: SparringCommands;
}) {
  const pose = useRef(teleopPose('wave', 0));
  const robot = useRef<THREE.Group>(null);
  const human = useRef<THREE.Group>(null);
  const timer = useRef({ sequence: -1, fight, elapsed: 0 });
  const left = gear === 'pico',
    side = left ? -1 : 1;
  const color = left ? '#b46d4e' : '#648f82';
  useFrame((_, delta) => {
    if (
      timer.current.sequence !== command.sequence ||
      timer.current.fight !== fight
    ) {
      timer.current = { sequence: command.sequence, fight, elapsed: 0 };
    }
    if (!fight && !paused && !reduced)
      timer.current.elapsed += Math.min(delta, 0.05);
    const elapsed = timer.current.elapsed;
    const spar = sparring.frames[left ? 0 : 1];
    const progress =
      command.sequence === 0
        ? 0
        : reduced
          ? 0.5
          : Math.min(1, elapsed / ACTION_SECONDS);
    pose.current = fight ? spar.pose : teleopPose(command.action, progress);
    const x = fight ? spar.x : side * 0.98;
    const z = fight ? spar.z : -0.5;
    if (robot.current) {
      robot.current.position.set(x, 0.3, z);
      robot.current.rotation.y = fight ? spar.heading : (-side * Math.PI) / 2;
    }
    if (human.current) {
      const captured = captureFrame(
        { x, z, heading: fight ? spar.heading : (-side * Math.PI) / 2 },
        side,
      );
      human.current.position.set(captured.x, 0.11, captured.z);
      human.current.rotation.y = captured.heading;
    }
  });
  return (
    <>
      <group
        position={[side * 5.4, 0.15, 1.3]}
        onClick={(event) => {
          if (event.delta > 5) return;
          event.stopPropagation();
          onInspect(gear);
        }}
      >
        <CapturePlatform color={color} side={side} />
        <group
          ref={human}
          position={[0, 0.11, 0]}
          rotation={[0, operatorHeading(side * 5.4, 1.3, side * 0.98, -0.5), 0]}
        >
          <TeleopBody robot={false} gear={gear} pose={pose} />
        </group>
        <GroundLabel
          title={left ? 'PICO / RUST CONTROL' : 'NOITOM / JADE CONTROL'}
          position={[0, -0.12, 1.7]}
          width={2.3}
          onClick={() => onInspect(gear)}
        />
      </group>
      <group
        ref={robot}
        visible={!fight}
        position={[side * 0.98, 0.3, -0.5]}
        rotation={[0, (-side * Math.PI) / 2, 0]}
      >
        <TeleopBody
          robot

          robotColor={color}
          gear={gear}
          pose={pose}
        />
      </group>
      {/* The colored line connects each human station to its side of the ring. */}
      <Block
        at={[side * 3.7, 0.035, 1.3]}
        size={[1, 0.018, 0.09]}
        color={color}
      />
      <group position={[side * 5.4, 0, -1.5]}>
        <Block at={[0, 0.85, 0]} size={[2.4, 0.12, 0.85]} />
        {[-0.95, 0.95].map((x) => (
          <Block
            key={x}
            at={[x, 0.4, 0]}
            size={[0.1, 0.8, 0.6]}
            color="#52695e"
          />
        ))}
        <Block at={[0, 1.35, -0.15]} size={[1.6, 0.88, 0.1]} color="#35443f" />
        <Block
          at={[0, 1.35, -0.09]}
          size={[1.45, 0.72, 0.025]}
          color="#779b8e"
        />
        {[0, 1, 2, 3].map((i) => (
          <Block
            key={i}
            at={[-0.16 + i * 0.07, 1.57 - i * 0.15, -0.065]}
            size={[0.9 - i * 0.1, 0.035, 0.015]}
            color={i % 2 ? '#eee0b9' : '#c6ad6d'}
          />
        ))}
        <Block at={[0, 0.94, 0.2]} size={[1.1, 0.04, 0.3]} color="#e7d9b4" />
      </group>
    </>
  );
}
/** A turntable bench with a mini humanoid: the way into the URDF playground. */
function UrdfBench({ reduced }: { reduced: boolean }) {
  const spin = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (spin.current && !reduced)
      spin.current.rotation.y += Math.min(delta, 0.05) * 0.6;
  });
  const shell = '#efe6cf',
    ink = '#35443f';
  return (
    <Passage href="/robot-lab/urdf" label="URDF playground · grab any joint">
      <Block at={[0, 0.4, 0]} size={[1.6, 0.8, 0.9]} color="#78988a" />
      <Block at={[0, 0.84, 0]} size={[1.7, 0.08, 1]} />
      <mesh position={[0, 0.92, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.42, 0.08, 40]} />
        <meshStandardMaterial color="#648f82" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.961, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.32, 0.35, 40]} />
        <meshStandardMaterial color="#e7d9b4" />
      </mesh>
      <group ref={spin} position={[0, 0.96, 0]}>
        {[-0.06, 0.06].map((x) => (
          <Block
            key={x}
            at={[x, 0.17, 0]}
            size={[0.07, 0.34, 0.08]}
            color={shell}
          />
        ))}
        {[-0.06, 0.06].map((x) => (
          <Block
            key={x}
            at={[x, 0.015, 0.03]}
            size={[0.08, 0.03, 0.14]}
            color={ink}
          />
        ))}
        <Block at={[0, 0.38, 0]} size={[0.2, 0.08, 0.12]} color={ink} />
        <Block at={[0, 0.54, 0]} size={[0.26, 0.24, 0.16]} color={shell} />
        <Block
          at={[0, 0.55, 0.085]}
          size={[0.12, 0.08, 0.01]}
          color="#b46d4e"
        />
        {[-0.17, 0.17].map((x) => (
          <Block
            key={x}
            at={[x, 0.5, 0]}
            size={[0.06, 0.28, 0.07]}
            color={shell}
          />
        ))}
        <mesh position={[0, 0.74, 0]} castShadow>
          <sphereGeometry args={[0.08, 20, 16]} />
          <meshStandardMaterial color={shell} />
        </mesh>
        <Block at={[0, 0.745, 0.06]} size={[0.12, 0.04, 0.04]} color={ink} />
      </group>
      <GroundLabel
        title="02 · URDF PLAYGROUND"
        position={[0, 0.005, 0.9]}
        width={2}
      />
    </Passage>
  );
}
function ReplayMiniature() {
  const rust = useRef(teleopPose('block', 0.5));
  const jade = useRef(teleopPose('jab', 0.5));
  return (
    <>
      <group
        position={[-0.38, 1.01, 0]}
        scale={0.38}
        rotation={[0, Math.PI / 2, 0]}
      >
        <TeleopBody robot gear="pico" pose={rust} robotColor="#b46d4e" />
      </group>
      <group
        position={[0.38, 1.01, 0]}
        scale={0.38}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <TeleopBody robot gear="noitom" pose={jade} robotColor="#648f82" />
      </group>
      <mesh position={[0, 0.997, 0.35]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.8, 0.025]} />
        <meshBasicMaterial color="#46675b" />
      </mesh>
      {[-0.75, -0.45, -0.15, 0.15, 0.45, 0.75].map((x) => (
        <Block
          key={x}
          at={[x, 1, 0.35]}
          size={[0.025, 0.025, 0.1]}
          color="#b46d4e"
        />
      ))}
      <group position={[0, 0.65, 0.506]} rotation={[Math.PI / 2, 0, 0]}>
        <GroundLabel
          title="CONTACT REPLAY →"
          position={[0, 0, 0]}
          width={1.9}
        />
      </group>
    </>
  );
}
function Camera({
  view,
  reset,
  reduced,
}: Pick<Props, 'view' | 'reset' | 'reduced'>) {
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const { camera, size } = useThree();
  const previous = useRef('');
  const transitioning = useRef(true);
  const target = useRef(new THREE.Vector3());
  const destination = useRef(new THREE.Vector3());
  useFrame((_, delta) => {
    if (!controls.current) return;
    const key = `${view}-${reset}-${size.width}-${size.height}`;
    if (key !== previous.current) {
      previous.current = key;
      transitioning.current = true;
      const x = view === 'pico' ? -5.4 : view === 'noitom' ? 5.4 : 0;
      target.current.set(
        x,
        view === 'room' ? 0.8 : 1,
        view === 'ring' ? -0.5 : view === 'room' ? 0 : 1.3,
      );
      destination.current
        .copy(target.current)
        .add(
          new THREE.Vector3(
            view === 'room' ? 12 : 5,
            view === 'room' ? 12 : 6,
            view === 'room' ? 16 : 9,
          ),
        );
    }
    if (!transitioning.current) return;
    const blend = reduced ? 1 : 1 - Math.exp(-Math.min(delta, 0.05) * 5);
    camera.position.lerp(destination.current, blend);
    controls.current.target.lerp(target.current, blend);
    const ortho = camera as THREE.OrthographicCamera;
    const zoom = Math.min(
      size.width / (view === 'room' ? 22 : 10),
      size.height / (view === 'room' ? 17 : 9),
    );
    ortho.zoom += (zoom - ortho.zoom) * blend;
    ortho.updateProjectionMatrix();
    controls.current.update();
    if (
      camera.position.distanceTo(destination.current) < 0.01 &&
      Math.abs(ortho.zoom - zoom) < 0.05
    )
      transitioning.current = false;
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      minZoom={12}
      maxZoom={140}
      minPolarAngle={0.3}
      maxPolarAngle={1.42}
      enablePan={false}
      onStart={() => {
        transitioning.current = false;
      }}
    />
  );
}
export default function RobotLabRoom(props: Props) {
  const sparring = useRef(createSparringCommands());
  return (
    <Canvas
      shadows
      orthographic
      camera={{ position: [12, 12, 16], zoom: 35 }}
      dpr={[1, 1.5]}
      fallback={<p>WebGL is required to explore the 3D lab.</p>}
    >
      <color attach="background" args={['#b9cec2']} />
      <ambientLight intensity={1.3} />
      <hemisphereLight args={['#fff0cf', '#7f765e', 1.5]} />
      <directionalLight
        position={[-7, 12, 8]}
        intensity={2.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      <Block at={[0, -0.13, 0]} size={[16, 0.24, 12]} color="#dfd4b2" />
      <Block at={[0, 2.6, -6]} size={[16, 5.2, 0.15]} color="#a4bbae" />
      <Block at={[-8, 2.6, 0]} size={[0.15, 5.2, 12]} color="#92aea0" />
      {Array.from({ length: 17 }, (_, i) => (
        <Block
          key={i}
          at={[-7.5 + i * 0.9, 0.001, 0]}
          size={[0.015, 0.01, 12]}
          color="#c2b995"
        />
      ))}
      <Block at={[0, 0.12, -0.5]} size={[6.6, 0.24, 5.4]} color="#a88b62" />
      <Block at={[0, 0.26, -0.5]} size={[6.4, 0.04, 5.2]} color="#e9dec1" />
      {[-3.1, 3.1].flatMap((x) =>
        [-3, 2].map((z) => (
          <Block
            key={`${x}-${z}`}
            at={[x, 1.1, z]}
            size={[0.14, 1.65, 0.14]}
            color={x < 0 ? '#b46d4e' : '#648f82'}
          />
        )),
      )}
      {[0.8, 1.25, 1.7].map((y) => (
        <group key={y}>
          <Block at={[0, y, -3]} size={[6.2, 0.04, 0.04]} color="#eee3be" />
          {[-3.1, 3.1].map((x) => (
            <Block
              key={x}
              at={[x, y, -0.5]}
              size={[0.04, 0.04, 5]}
              color="#eee3be"
            />
          ))}
        </group>
      ))}
      <mesh position={[0, 0.29, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 0.84, 48]} />
        <meshStandardMaterial color="#b29868" />
      </mesh>
      {props.fight && (
        <Suspense fallback={null}>
          <PhysicsFight
            paused={props.paused}
            reduced={props.reduced}
            commands={sparring.current}
          />
        </Suspense>
      )}
      {(['pico', 'noitom'] as const).map((gear) => (
        <Pair
          key={gear}
          gear={gear}
          sparring={sparring.current}
          command={props.commands[gear]}
          fight={props.fight}
          paused={props.paused}
          reduced={props.reduced}
          onInspect={props.onInspect}
        />
      ))}
      <group position={[-7.85, 0, 3.8]} rotation={[0, Math.PI / 2, 0]}>
        <StudioDoor />
      </group>
      <group position={[0, 0, -5.84]}>
        <StudioDoor island />
      </group>
      <group position={[5.4, 2.9, -5.8]}>
        <TravelPhotos />
      </group>
      <group position={[6.7, 0, -3.6]} rotation={[0, -0.2, 0]}>
        <Luggage current="robot-lab" />
      </group>
      <group position={[-2.2, 0, 4.4]}>
        <Passage href="/robot-lab/replay" label="Open contact replay">
          <Block at={[0, 0.45, 0]} size={[2.2, 0.9, 1]} color="#648f82" />
          <Block at={[0, 0.94, 0]} size={[2.3, 0.1, 1.1]} color="#e7d9b4" />
          <ReplayMiniature />
        </Passage>
      </group>
      <group position={[4.4, 0, 4.5]} rotation={[0, -0.45, 0]}>
        <UrdfBench reduced={props.reduced} />
      </group>
      <group position={[0, 3.4, -5.85]} rotation={[Math.PI / 2, 0, 0]}>
        <GroundLabel
          title="TWO HUMANS · TWO ROBOTS"
          position={[0, 0, 0]}
          width={6}
          dark
        />
      </group>
      {[-5.5, 5.5].map((x) => (
        <group key={x} position={[x, 0, -4.6]}>
          <Block at={[0, 0.65, 0]} size={[2.8, 1.3, 1]} color="#78988a" />
          <Block at={[0, 1.34, 0]} size={[2.9, 0.1, 1.1]} />
          {[-0.8, 0, 0.8].map((dx) => (
            <Block
              key={dx}
              at={[dx, 1.03, 0.52]}
              size={[0.3, 0.05, 0.05]}
              color="#35443f"
            />
          ))}
          <Block
            at={[-0.65, 1.6, 0]}
            size={[0.65, 0.42, 0.5]}
            color="#e5ddc5"
          />
          <Block
            at={[-0.65, 1.6, 0.26]}
            size={[0.52, 0.17, 0.02]}
            color="#35443f"
          />
          {[0.25, 0.65].map((dx) => (
            <Block
              key={dx}
              at={[dx, 1.5, 0]}
              size={[0.2, 0.25, 0.2]}
              color="#bd9856"
            />
          ))}
        </group>
      ))}
      <Camera view={props.view} reset={props.reset} reduced={props.reduced} />
    </Canvas>
  );
}
