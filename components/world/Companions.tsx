'use client';
import { Suspense, useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { ModelBoundary } from './DistrictModel';
import manifest from './character-manifest.json';
import { cameraRelative, nearestDistrict, SPAWN, type Point } from './movement';
import type { District } from './districts';
import { Exploration, type Character } from './exploration';
export type { Character } from './exploration';

export type Gesture = 'wave' | 'jump' | 'celebrate';
export type Action = { kind: Gesture; sequence: number };
export type Motion = {
  walking: boolean;
  phase: number;
  gesture: Gesture | null;
  time: number;
};
const duration = { wave: 2.2, jump: 0.85, celebrate: 2.5 };

function Avatar({
  character,
  motion,
  reduced,
}: {
  character: Character;
  motion: RefObject<Motion>;
  reduced: boolean;
}) {
  const { scene } = useGLTF(manifest[character], false, false);
  const { object, joints } = useMemo(() => {
    const object = scene.clone(true);
    object.traverse((n) => {
      if ((n as THREE.Mesh).isMesh) n.castShadow = true;
    });
    return {
      object,
      joints: Object.fromEntries(
        ['ArmL', 'ArmR', 'LegL', 'LegR', 'Head'].map((name) => [
          name,
          object.getObjectByName(name),
        ]),
      ),
    };
  }, [scene]);
  useFrame(() => {
    const m = motion.current;
    const swing = m.walking
      ? Math.sin(m.phase * 10) * (reduced ? 0.18 : 0.48)
      : 0;
    for (const node of Object.values(joints))
      if (node) node.rotation.set(0, 0, 0);
    if (joints.LegL) joints.LegL.rotation.x = swing;
    if (joints.LegR) joints.LegR.rotation.x = -swing;
    if (joints.ArmL) joints.ArmL.rotation.x = -swing * 0.7;
    if (joints.ArmR) joints.ArmR.rotation.x = swing * 0.7;
    object.position.y =
      m.walking && !reduced ? Math.abs(Math.sin(m.phase * 10)) * 0.035 : 0;
    object.rotation.z = 0;
    if (m.gesture === 'wave' && joints.ArmR) {
      joints.ArmR.rotation.z =
        2.5 + (reduced ? 0 : Math.sin(m.time * 14) * 0.25);
      if (joints.Head) joints.Head.rotation.z = -0.07;
    }
    if (m.gesture === 'jump')
      object.position.y += reduced
        ? 0
        : Math.sin((Math.PI * m.time) / duration.jump) * 0.48;
    if (m.gesture === 'celebrate') {
      if (joints.ArmL) joints.ArmL.rotation.z = -2.3;
      if (joints.ArmR) joints.ArmR.rotation.z = 2.3;
      object.rotation.z = reduced ? 0 : Math.sin(m.time * 9) * 0.1;
      object.position.y += reduced ? 0 : Math.abs(Math.sin(m.time * 8)) * 0.16;
    }
  });
  return <primitive object={object} dispose={null} scale={0.52} />;
}
function Placeholder({ character }: { character: Character }) {
  return (
    <mesh position={[0, 0.55, 0]}>
      <capsuleGeometry args={[0.18, 0.55, 4, 8]} />
      <meshStandardMaterial
        color={character === 'sam' ? '#73818c' : '#b5a0e2'}
      />
    </mesh>
  );
}

export default function Companions({
  keys,
  paused,
  onNear,
  reset,
  target,
  onArrive,
  positionRef,
  reduced,
  character,
  action,
}: {
  keys: RefObject<Set<string>>;
  paused: boolean;
  onNear: (d: District | null) => void;
  reset: number;
  target: Point | null;
  onArrive: () => void;
  positionRef: RefObject<Point>;
  reduced: boolean;
  character: Character;
  action: Action | null;
}) {
  const sam = useRef<THREE.Group>(null),
    companion = useRef<THREE.Group>(null);
  const m0 = useRef<Motion>({
    walking: false,
    phase: 0,
    gesture: null,
    time: 0,
  });
  const m1 = useRef<Motion>({
    walking: false,
    phase: 0,
    gesture: null,
    time: 0,
  });
  const previous = useRef<string | null>(null),
    forward = useRef(new THREE.Vector3());
  const exploration = useRef(new Exploration());
  const gesture = useRef<{
    kind: Gesture;
    time: number;
    character: Character;
  } | null>(null);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    exploration.current.reset(character);
    previous.current = null;
    gesture.current = null;
    positionRef.current = {
      ...exploration.current.walkers[character].position,
    };
    onNear(null);
    invalidate();
  }, [reset]);
  useEffect(() => {
    if (target) exploration.current.goTo(target);
    else exploration.current.cancel();
    invalidate();
  }, [target]);
  useEffect(() => {
    exploration.current.switchTo(character);
    if (target) onArrive();
    invalidate();
  }, [character]);
  useEffect(() => {
    if (action) gesture.current = { kind: action.kind, time: 0, character };
    invalidate();
  }, [action]);
  useEffect(() => {
    invalidate();
  }, [character, paused]);
  useFrame(({ camera }, dt) => {
    if (!sam.current || !companion.current || paused) return;
    dt = Math.min(dt, 0.05);
    const k = keys.current;
    const x =
      Number(k.has('d') || k.has('arrowright')) -
      Number(k.has('a') || k.has('arrowleft'));
    const z =
      Number(k.has('s') || k.has('arrowdown')) -
      Number(k.has('w') || k.has('arrowup'));
    camera.getWorldDirection(forward.current);
    const direction =
      x || z ? cameraRelative(x, z, forward.current) : { x: 0, z: 0 };
    const model = exploration.current;
    const needsFrame = model.step(dt, direction);
    for (const [id, actor, motion] of [
      ['sam', sam.current, m0.current],
      ['companion', companion.current, m1.current],
    ] as const) {
      const walker = model.walkers[id];
      actor.position.set(walker.position.x, 0.12, walker.position.z);
      actor.rotation.y = walker.heading;
      motion.walking = walker.walking;
      motion.phase = walker.phase;
    }
    const p = model.walkers[character].position;
    if (target && !model.destination) onArrive();
    for (const m of [m0.current, m1.current]) {
      m.gesture = null;
      m.time = 0;
    }
    if (gesture.current) {
      const g = gesture.current;
      g.time += dt;
      if (g.time >= duration[g.kind]) gesture.current = null;
      else
        for (const [id, m] of [
          ['sam', m0.current],
          ['companion', m1.current],
        ] as const) {
          if (g.kind === 'celebrate' || id === g.character) {
            m.gesture = g.kind;
            m.time = g.time;
          }
        }
      invalidate();
    }
    positionRef.current.x = p.x;
    positionRef.current.z = p.z;
    const near = nearestDistrict(p);
    if (previous.current !== (near?.id ?? null)) {
      previous.current = near?.id ?? null;
      onNear(near);
    }
    if (needsFrame) invalidate();
  });
  return (
    <>
      {(['sam', 'companion'] as const).map((id, i) => (
        <group
          key={id}
          ref={i === 0 ? sam : companion}
          position={[SPAWN.x - i * 0.85, 0.12, SPAWN.z]}
        >
          <ModelBoundary fallback={<Placeholder character={id} />}>
            <Suspense fallback={<Placeholder character={id} />}>
              <Avatar
                character={id}
                motion={i === 0 ? m0 : m1}
                reduced={reduced}
              />
            </Suspense>
          </ModelBoundary>
          {character === id && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
              <torusGeometry args={[0.36, 0.023, 6, 32]} />
              <meshBasicMaterial color="#b7f5c4" />
            </mesh>
          )}
        </group>
      ))}
    </>
  );
}

export { Avatar as TravellerAvatar, Placeholder as TravellerPlaceholder };
