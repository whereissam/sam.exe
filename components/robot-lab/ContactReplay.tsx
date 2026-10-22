'use client';
/* oxlint-disable react/react-compiler -- Pose refs drive the existing articulated robot renderer. */
import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { TeleopBody } from '../world/TeleoperationPair';
import {
  constrainedFight,
  robotBoxes,
  type FightFrame,
} from '../world/robot-contact';
function Body({ frame, color }: { frame: FightFrame; color: string }) {
  const pose = useRef(frame.pose);
  useFrame(() => {
    pose.current = frame.pose;
  }, -1);
  return (
    <group
      position={[frame.x, -0.065, frame.z]}
      rotation={[0, frame.heading, 0]}
    >
      <TeleopBody robot gear="pico" robotColor={color} pose={pose} />
    </group>
  );
}
export default function ContactReplay({
  time,
  ghost,
  colliders,
  selected,
  onSelect,
}: {
  time: number;
  ghost: boolean;
  colliders: boolean;
  selected: string | null;
  onSelect: (name: string) => void;
}) {
  const result = constrainedFight(time);
  return (
    <Canvas
      camera={{ position: [3.8, 2.8, 4.5], fov: 43 }}
      dpr={[1, 1.5]}
      frameloop="demand"
      gl={{ powerPreference: 'low-power' }}
    >
      <color attach="background" args={['#b8c8be']} />
      <ambientLight intensity={1.7} />
      <directionalLight position={[3, 8, 5]} intensity={2} />
      <mesh position={[0, -0.18, -0.5]}>
        <cylinderGeometry args={[2.5, 2.55, 0.2, 64]} />
        <meshStandardMaterial color="#e3d8bb" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.074, -0.5]}>
        <ringGeometry args={[2.2, 2.215, 64]} />
        <meshBasicMaterial color="#9b8a5c" />
      </mesh>
      {result.frames.map((f, i) => (
        <Body key={i} frame={f} color={i ? '#648f82' : '#b46d4e'} />
      ))}
      {(ghost ? result.raw : []).flatMap((f, i) =>
        robotBoxes(f)
          .filter((b) => b.name !== 'stance')
          .map((b) => (
            <mesh
              key={`ghost-${i}-${b.name}`}
              position={b.center}
              rotation={b.rotation}
              raycast={() => {}}
            >
              <boxGeometry args={b.size} />
              <meshBasicMaterial
                color="#f9f1d8"
                wireframe
                transparent
                opacity={0.4}
                depthWrite={false}
              />
            </mesh>
          )),
      )}
      {result.frames.flatMap((f, i) =>
        robotBoxes(f)
          .filter((b) => b.name !== 'stance')
          .map((b) => (
            <mesh
              key={`${i}-${b.name}`}
              position={b.center}
              rotation={b.rotation}
              onClick={(e) => {
                if (e.delta > 5) return;
                e.stopPropagation();
                onSelect(`${i ? 'Jade' : 'Rust'} / ${b.name}`);
              }}
            >
              <boxGeometry args={b.size} />
              <meshBasicMaterial
                color={
                  selected === `${i ? 'Jade' : 'Rust'} / ${b.name}`
                    ? '#fff0a7'
                    : result.parts[i] === b.name
                      ? '#bc633d'
                      : '#486c5d'
                }
                wireframe
                transparent
                opacity={
                  colliders || selected === `${i ? 'Jade' : 'Rust'} / ${b.name}`
                    ? 0.85
                    : 0
                }
                depthWrite={false}
              />
            </mesh>
          )),
      )}
      <OrbitControls
        makeDefault
        target={[0, 1, -0.5]}
        minDistance={2.8}
        maxDistance={9}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  );
}
