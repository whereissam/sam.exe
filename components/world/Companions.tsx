'use client';
import { playSound } from '../audio/sound';
import { harborHeight } from './island-layout';
/* oxlint-disable react/react-compiler -- Frame callbacks animate isolated Three.js object clones and mutable motion refs outside React rendering. */
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { ModelBoundary } from './DistrictModel';
import { Rest, sleepHeading, type DailyRoutine } from './daily-routine';
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
  viewing?: boolean;
  routine?: DailyRoutine;
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
  useFrame(({ clock }) => {
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
    if (m.routine === 'sleep') {
      object.rotation.z = -Math.PI / 2;
      object.position.y = 0.18;
      if (joints.LegL) joints.LegL.rotation.x = -0.4;
      if (joints.LegR) joints.LegR.rotation.x = -0.4;
      if (joints.ArmL) joints.ArmL.rotation.x = -0.9;
      if (joints.ArmR) joints.ArmR.rotation.x = -0.9;
    } else if (m.routine === 'stretch') {
      if (joints.ArmL) joints.ArmL.rotation.z = -2.6;
      if (joints.ArmR) joints.ArmR.rotation.z = 2.6;
      object.rotation.z = reduced
        ? 0.06
        : Math.sin(clock.elapsedTime * 0.7) * 0.08;
    } else if (m.routine === 'work' || m.routine === 'relax') {
      if (joints.ArmL) joints.ArmL.rotation.x = -1.1;
      if (joints.ArmR) joints.ArmR.rotation.x = -1.1;
      if (joints.Head) joints.Head.rotation.x = 0.16;
    } else if (m.routine === 'wander' && joints.Head) {
      joints.Head.rotation.y = reduced
        ? 0.2
        : Math.sin(clock.elapsedTime * 0.35) * 0.4;
    }
    if (m.viewing) {
      if (joints.ArmL) joints.ArmL.rotation.x = -1.3;
      if (joints.ArmR) joints.ArmR.rotation.x = -1.3;
    }
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

/** The small objects that appear once a traveller has settled into the hour's routine. */
function RoutineProps({
  routine,
  cloud = true,
}: {
  routine: DailyRoutine;
  /** Two sleepers side by side would stack two clouds into one dark blob, so
   *  the pair shares a single one. Each still keeps their own pillow. */
  cloud?: boolean;
}) {
  if (routine === 'sleep')
    return (
      <group>
        <mesh position={[0.7, 0.05, 0]}>
          <boxGeometry args={[0.35, 0.12, 0.45]} />
          <meshStandardMaterial color="#f6dc8c" />
        </mesh>
        {cloud && (
          <Html
            center
            position={[0.55, 0.95, 0]}
            zIndexRange={[3, 0]}
            style={{ pointerEvents: 'none' }}
          >
            <span className="sleep-cloud" aria-label="Sleeping">
              z Z z
            </span>
          </Html>
        )}
      </group>
    );
  if (routine === 'work' || routine === 'relax')
    return (
      <group position={[0, 0.68, 0.3]}>
        <mesh rotation={[-0.3, 0, 0]}>
          <boxGeometry args={[0.36, 0.035, 0.23]} />
          <meshStandardMaterial
            color={routine === 'work' ? '#96b9ad' : '#d5a87f'}
          />
        </mesh>
        {routine === 'work' && (
          <mesh position={[0, 0.12, 0.1]} rotation={[-0.2, 0, 0]}>
            <boxGeometry args={[0.36, 0.24, 0.025]} />
            <meshStandardMaterial color="#65857e" />
          </mesh>
        )}
      </group>
    );
  return null;
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
  routine = 'work',
  onSwitch,
  onAction,
  touch = false,
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
  routine?: DailyRoutine;
  onSwitch: (character: Character) => void;
  onAction: (kind: Gesture) => void;
  /** Hover-less pointers never reveal a label, so theirs stays on screen. */
  touch?: boolean;
}) {
  const rest = useRef(new Rest());
  const [hovered, setHovered] = useState<Character | null>(null);
  const [emotes, setEmotes] = useState(false);
  const [resting, setResting] = useState(false);
  const restingRef = useRef(false);
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
    setEmotes(false);
    rest.current.interrupt();
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
    setEmotes(false);
    exploration.current.switchTo(character);
    if (target) onArrive();
    invalidate();
  }, [character]);
  useEffect(() => {
    rest.current.interrupt();
    if (action) gesture.current = { kind: action.kind, time: 0, character };
    invalidate();
  }, [action]);
  useEffect(() => {
    invalidate();
  }, [character, paused, routine]);
  const inviting = !paused && hovered !== null;
  useEffect(() => {
    if (!inviting) return;
    document.body.style.cursor = 'pointer';
    return () => {
      document.body.style.cursor = '';
    };
  }, [inviting]);
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
    if (model.walkers[character].walking) playSound('step');
    for (const [id, actor, motion] of [
      ['sam', sam.current, m0.current],
      ['companion', companion.current, m1.current],
    ] as const) {
      const walker = model.walkers[id];
      actor.position.set(
        walker.position.x,
        harborHeight(walker.position) + 0.12,
        walker.position.z,
      );
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
    const isResting = rest.current.step(dt, {
      walking: model.walkers.sam.walking || model.walkers.companion.walking,
      gesturing: !!gesture.current,
      travelling: !!model.destination,
      steering: keys.current.size > 0,
      viewing: false,
    });
    const nextRoutine = rest.current.poseFor(routine);
    if (m0.current.routine !== nextRoutine) invalidate();
    for (const m of [m0.current, m1.current]) m.routine = nextRoutine;
    if (nextRoutine === 'sleep') {
      // Lying down uses the walking heading, which points wherever they last
      // travelled, so without this the two bodies can lie straight through
      // each other. A shared heading lays them out side by side instead.
      const heading = sleepHeading(
        model.walkers.sam.position,
        model.walkers.companion.position,
      );
      if (heading !== null)
        for (const actor of [sam.current, companion.current]) {
          const difference = Math.atan2(
            Math.sin(heading - actor.rotation.y),
            Math.cos(heading - actor.rotation.y),
          );
          if (Math.abs(difference) > 0.01) {
            actor.rotation.y += difference * Math.min(1, dt * 6);
            invalidate();
          } else actor.rotation.y = heading;
        }
    }
    if (restingRef.current !== isResting) {
      restingRef.current = isResting;
      setResting(isResting);
    }
    if (!isResting) invalidate();
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
          onClick={(event) => {
            if (paused || event.delta > 5) return;
            event.stopPropagation();
            setHovered(null);
            if (character === id) setEmotes((open) => !open);
            else {
              setEmotes(false);
              onSwitch(id);
            }
          }}
          onPointerMissed={
            // Only the traveller that owns the ring may close it; the other
            // one's missed-click would fire in the same event and undo the open.
            character === id ? () => setEmotes(false) : undefined
          }
          onPointerOver={(event) => {
            if (paused) return;
            event.stopPropagation();
            setHovered(id);
          }}
          onPointerOut={() => setHovered(null)}
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
          {resting && <RoutineProps routine={routine} cloud={id === 'sam'} />}
          {character === id && !paused && (
            <Html
              center
              position={[0, 1.72, 0]}
              zIndexRange={[20, 0]}
              style={{ pointerEvents: emotes ? 'auto' : 'none' }}
            >
              {emotes ? (
                <div className="emote-ring">
                  {(['wave', 'jump', 'celebrate'] as const).map((kind) => (
                    <button
                      key={kind}
                      onClick={() => {
                        setEmotes(false);
                        onAction(kind);
                      }}
                    >
                      {kind[0].toUpperCase() + kind.slice(1)}
                    </button>
                  ))}
                </div>
              ) : (
                (hovered === id || touch) && (
                  <span
                    className={`world-hint ${hovered === id ? 'is-near' : ''}`}
                  >
                    Tap for actions
                  </span>
                )
              )}
            </Html>
          )}
          {character === id
            ? (!resting || routine !== 'sleep') && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                  <torusGeometry args={[0.36, 0.023, 6, 32]} />
                  <meshBasicMaterial color="#b7f5c4" />
                </mesh>
              )
            : !paused && (
                <>
                  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                    <torusGeometry args={[0.36, 0.018, 6, 32]} />
                    <meshBasicMaterial
                      color="#ffffff"
                      transparent
                      opacity={hovered === id ? 0.85 : 0.3}
                    />
                  </mesh>
                  {(hovered === id || touch) && (
                    <Html
                      center
                      position={[0, 1.62, 0]}
                      zIndexRange={[20, 0]}
                      style={{ pointerEvents: 'none' }}
                    >
                      <span
                        className={`world-hint ${hovered === id ? 'is-near' : ''}`}
                      >
                        Play as {id === 'sam' ? 'Sam' : 'the companion'}
                      </span>
                    </Html>
                  )}
                </>
              )}
        </group>
      ))}
    </>
  );
}

export {
  Avatar as TravellerAvatar,
  Placeholder as TravellerPlaceholder,
  RoutineProps as TravellerRoutineProps,
};
