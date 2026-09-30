'use client';

/* oxlint-disable react/react-compiler -- Animation updates Three.js objects inside frame callbacks. */
import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import { X } from 'lucide-react';
import * as THREE from 'three';
import './room-exhibits.css';

type Vec3 = [number, number, number];
function Block({ at, size, color }: { at: Vec3; size: Vec3; color: string }) {
  return <mesh position={at} castShadow receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={0.65} /></mesh>;
}
function Joint({ at }: { at: Vec3 }) {
  return <mesh position={at} castShadow><sphereGeometry args={[0.11, 12, 8]} /><meshStandardMaterial color="#3c4845" roughness={0.7} /></mesh>;
}
function pulse(time: number, start: number, duration: number) {
  const phase = (time - start) / duration;
  return phase > 0 && phase < 1 ? Math.sin(phase * Math.PI) ** 2 : 0;
}

function strikes(cycle: number) {
  return {
    jab: pulse(cycle, 0.12, 0.32) + pulse(cycle, 0.5, 0.3) + pulse(cycle, 2.48, 0.34),
    cross: pulse(cycle, 0.9, 0.42) + pulse(cycle, 2.08, 0.38),
    kick: pulse(cycle, 1.45, 0.55),
    hook: pulse(cycle, 2.92, 0.45),
  };
}

const impacts = [0.28, 0.65, 1.11, 1.725, 2.27, 2.65, 3.145];
function fighterPosition(t: number, side: -1 | 1) {
  const cycle = (t + (side === 1 ? 4 : 0)) % 8;
  const own = strikes(cycle), other = strikes((cycle + 4) % 8);
  const attack = Math.max(own.jab, own.cross, own.hook, own.kick);
  const defend = Math.max(other.jab, other.cross, other.hook, other.kick);
  const radius = 0.98 - attack * 0.38 - defend * 0.34;
  const angle = t * 0.12 + Math.sin(t * 0.55) * 0.32;
  return new THREE.Vector3(side * radius * Math.cos(angle) + Math.sin(t * 0.4) * 0.3, 0.04, side * radius * Math.sin(angle) + Math.cos(t * 0.4) * 0.25);
}

// Solve each arm to a reachable glove target, keeping the elbow outside the torso.
function poseArm(shoulder: THREE.Group, elbow: THREE.Group, side: -1 | 1, extension: number, hook: number, block: number, reach: number) {
  const origin = shoulder.position;
  const target = new THREE.Vector3(side * (0.38 - extension * 0.19), 1.72 + block * 0.16 + hook * 0.12, 0.43 + extension * (reach - 0.43));
  const direction = target.sub(origin);
  const distance = Math.min(direction.length(), 0.89);
  direction.normalize();
  const upper = 0.47, lower = 0.44;
  const along = (upper * upper - lower * lower + distance * distance) / (2 * distance);
  const height = Math.sqrt(Math.max(0, upper * upper - along * along));
  const bend = new THREE.Vector3(side, -0.65, 0);
  bend.addScaledVector(direction, -bend.dot(direction)).normalize();
  const upperVector = direction.clone().multiplyScalar(along).addScaledVector(bend, height);
  const lowerVector = direction.clone().multiplyScalar(distance).sub(upperVector);
  shoulder.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), upperVector.normalize());
  lowerVector.applyQuaternion(shoulder.quaternion.clone().invert()).normalize();
  elbow.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), lowerVector);
}

function ImpactBursts({ time }: { time: React.RefObject<number> }) {
  const sparks = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    if (!sparks.current || !material.current) return;
    const cycle = time.current % 8;
    let age = 1, side = 1, kick = false;
    for (const offset of [0, 4]) {
      for (const hit of impacts) {
        const elapsed = cycle - offset - hit;
        if (elapsed >= 0 && elapsed < age) { age = elapsed; side = offset === 0 ? 1 : -1; kick = hit === 1.725; }
      }
    }
    sparks.current.visible = age < 0.22;
    if (age >= 0.22) return;
    const phase = age / 0.22;
    const defender = fighterPosition(time.current, side as -1 | 1);
    const attacker = fighterPosition(time.current, -side as -1 | 1);
    const normal = attacker.sub(defender).normalize();
    sparks.current.position.copy(defender).addScaledVector(normal, 0.27);
    sparks.current.position.y = kick ? 1.1 : 1.73;
    material.current.opacity = (1 - phase) * 0.85;
    sparks.current.children.forEach((spark, i) => {
      const angle = i * Math.PI * 2 / 10;
      const radius = 0.06 + phase * 0.45;
      spark.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, Math.sin(i * 2.7) * radius * 0.6);
      spark.scale.setScalar((1 - phase) * (i % 3 === 0 ? 1.5 : 1));
    });
  });
  return <group ref={sparks} visible={false}>{Array.from({ length: 10 }, (_, i) => <mesh key={i} rotation={[0, 0, i * 0.6]}>
    <octahedronGeometry args={[0.045, 0]} />
    {i === 0 ? <meshBasicMaterial ref={material} color="#f9d67c" transparent depthWrite={false} /> : <meshBasicMaterial color="#e9b865" transparent opacity={0.6} depthWrite={false} />}
  </mesh>)}</group>;
}

function Fighter({ side, color, time }: { side: -1 | 1; color: string; time: React.RefObject<number> }) {
  const root = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftElbow = useRef<THREE.Group>(null);
  const rightElbow = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightKnee = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!root.current || !leftArm.current || !rightArm.current || !leftElbow.current || !rightElbow.current || !rightLeg.current) return;
    const t = time.current;
    const cycle = (t + (side === 1 ? 4 : 0)) % 8;
    const { jab, cross, kick, hook } = strikes(cycle);
    const incoming = strikes((cycle + 4) % 8);
    const recoil = Math.max(incoming.cross, incoming.kick * 1.2, incoming.hook);
    const duck = pulse(cycle, 4.08, 0.4) + pulse(cycle, 6.42, 0.42);
    const block = Math.max(incoming.jab, incoming.cross) * 0.45;
    const position = fighterPosition(t, side);
    const opponent = fighterPosition(t, side === 1 ? -1 : 1);
    const facing = opponent.clone().sub(position);
    root.current.position.copy(position);
    root.current.position.y += Math.abs(Math.sin(t * 8)) * 0.025 - duck * 0.1;
    root.current.rotation.set(duck * 0.18 - recoil * 0.08, Math.atan2(facing.x, facing.z), 0);
    const reach = Math.min(0.86, facing.length() - 0.3);
    poseArm(leftArm.current, leftElbow.current, -1, jab, 0, block, reach);
    poseArm(rightArm.current, rightElbow.current, 1, Math.max(cross, hook), hook, block, reach);
    rightLeg.current.rotation.x = -kick * 1.15 + Math.sin(t * 8) * 0.12 * (1 - kick);
    if (leftLeg.current) leftLeg.current.rotation.x = -0.08 - Math.sin(t * 10) * 0.07;
    if (rightKnee.current) rightKnee.current.rotation.x = pulse(cycle, 1.38, 0.26) * 1.3 + pulse(cycle, 1.88, 0.2) * 0.7;
  });
  return (
    <group ref={root} position={[side, 0, 0]} rotation={[0, -side * Math.PI / 2, 0]}>
      <Block at={[0, 1.45, 0]} size={[0.6, 0.72, 0.35]} color="#e7e2cc" />
      <Block at={[0, 1.51, 0.19]} size={[0.42, 0.25, 0.035]} color={color} />
      <Block at={[0, 1.02, 0]} size={[0.5, 0.18, 0.3]} color="#3c4845" />
      <Joint at={[0, 1.9, 0]} />
      <Block at={[0, 2.1, 0]} size={[0.53, 0.4, 0.4]} color="#e7e2cc" />
      <Block at={[0, 2.13, 0.21]} size={[0.42, 0.13, 0.025]} color="#293d39" />
      {([-1, 1] as const).map((s) => <group key={s} ref={s === -1 ? leftArm : rightArm} position={[s * 0.43, 1.73, 0]} rotation={[-0.8, 0, s * 0.12]}>
        <Joint at={[0, 0, 0]} />
        <Block at={[0, -0.23, 0]} size={[0.2, 0.4, 0.23]} color="#dedac7" />
        <group ref={s === -1 ? leftElbow : rightElbow} position={[0, -0.47, 0]} rotation={[-1.4, 0, 0]}>
          <Joint at={[0, 0, 0]} />
          <Block at={[0, -0.2, 0]} size={[0.19, 0.36, 0.22]} color="#a4b5a7" />
          <Block at={[0, -0.44, 0.03]} size={[0.28, 0.24, 0.3]} color={color} />
        </group>
      </group>)}
      {([-1, 1] as const).map((s) => <group key={s} ref={s === 1 ? rightLeg : leftLeg} position={[s * 0.18, 0.98, s * 0.14]}>
        <Joint at={[0, 0, 0]} />
        <Block at={[0, -0.22, 0]} size={[0.23, 0.4, 0.25]} color="#a4b5a7" />
        <group ref={s === 1 ? rightKnee : undefined} position={[0, -0.46, 0]}>
          <Joint at={[0, 0, 0]} />
          <Block at={[0, -0.19, 0]} size={[0.19, 0.33, 0.22]} color="#667b79" />
          <Block at={[0, -0.43, 0.1]} size={[0.29, 0.15, 0.44]} color="#e7e2cc" />
        </group>
      </group>)}
    </group>
  );
}

function Arena({ playing, speed, reduced }: { playing: boolean; speed: number; reduced: boolean }) {
  const time = useRef(0);
  const { camera, size } = useThree();
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const portrait = size.width / size.height < 0.8;
    camera.fov = portrait ? 60 : 43;
    camera.position.set(portrait ? 6 : 4.5, portrait ? 5 : 3.4, portrait ? 8 : 6.2);
    camera.lookAt(0, 0.9, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  useFrame((_, dt) => { if (playing) time.current += Math.min(dt, 0.05) * speed; });
  return <>
    <color attach="background" args={['#c4d0bb']} />
    <ambientLight intensity={1.5} />
    <directionalLight position={[-4, 8, 5]} intensity={2.4} castShadow shadow-mapSize={[1024, 1024]} />
    <Block at={[0, -0.17, 0]} size={[5.8, 0.32, 4.8]} color="#b69566" />
    <Block at={[0, 0, 0]} size={[5.6, 0.04, 4.6]} color="#e8dcc0" />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}><ringGeometry args={[0.83, 0.87, 48]} /><meshBasicMaterial color="#a0875e" /></mesh>
    {[-2.65, 2.65].flatMap(x => [-2.15, 2.15].map(z => <Block key={`${x}-${z}`} at={[x, 0.8, z]} size={[0.12, 1.6, 0.12]} color={x < 0 ? '#a35e42' : '#527e77'} />))}
    {[0.65, 1.05, 1.45].flatMap(y => [
      <Block key={`back-${y}`} at={[0, y, -2.15]} size={[5.3, 0.04, 0.04]} color="#eee4c9" />,
      ...[-2.65, 2.65].map(x => <Block key={`${x}-${y}`} at={[x, y, 0]} size={[0.04, 0.04, 4.3]} color="#eee4c9" />),
    ])}
    <Fighter side={-1} color="#b96848" time={time} /><Fighter side={1} color="#527e77" time={time} />
    {!reduced && <ImpactBursts time={time} />}
    <ContactShadows position={[0, 0.03, 0]} scale={7} opacity={0.3} blur={2} far={3} />
    <OrbitControls target={[0, 0.9, 0]} enablePan={false} minDistance={5} maxDistance={16} minPolarAngle={0.45} maxPolarAngle={1.45} />
  </>;
}

export default function RoomRobotArena({ onClose, reducedMotion }: { onClose: () => void; reducedMotion: boolean }) {
  const panel = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = panel.current;
    dialog?.showModal();
    return () => { dialog?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={panel} className="room-arena" aria-labelledby="room-arena-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header className="room-library-header"><div><span>05 / G1 MOTION STUDY</span><h1 id="room-arena-title">Robot fight club.</h1></div><button onClick={onClose} aria-label="Close robot arena"><X size={22} /></button></header>
    <div className="room-arena-stage" aria-label="Two stylized humanoid robots sparring in a 3D ring">
      <Canvas shadows camera={{ position: [4.5, 3.4, 6.2], fov: 43 }} dpr={[1, 1.5]}><Arena playing={!reducedMotion} speed={1} reduced={reducedMotion} /></Canvas>
      <div className="room-arena-match"><span><i /> RUST / 01</span><small>COMBO EXCHANGE</small><span>JADE / 02 <i /></span></div>
    </div>
  </dialog>;
}
