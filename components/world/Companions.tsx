'use client';
import { playSound } from '../audio/sound';
import { harborHeight } from './island-layout';
/* oxlint-disable react/react-compiler -- Frame callbacks animate isolated Three.js object clones and mutable motion refs outside React rendering. */
import {
  Suspense,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type RefObject,
  type ReactNode,
} from 'react';
import { createPortal, useFrame, useThree } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { TeaCup } from './TeaCup';
import { teaPose, placeTeaHand } from './tea-motion';
import { TeaTable } from './TeaTable';
import { ModelBoundary } from './DistrictModel';
import { Rest, type DailyRoutine } from './daily-routine';
import { stretchPose } from './stretch-motion';
import manifest from './character-manifest.json';
import { cameraRelative, nearestDistrict, hasStretchRoom, SPAWN, type Point } from './movement';
import type { District } from './districts';
import { Exploration, STRETCH_SPACE, type Character } from './exploration';
import { AmbientTour } from './ambient-tour';
export type { Character } from './exploration';

export type Gesture = 'wave' | 'jump' | 'celebrate';
export type Action = { kind: Gesture; sequence: number };
export type Motion = {
  walking: boolean;
  phase: number;
  gesture: Gesture | null;
  time: number;
  seated?: boolean;
  viewing?: boolean;
  routine?: DailyRoutine;
  teaTime?: number;
  reach?: number;
  armsBlocked?: boolean;
};
const duration = { wave: 2.2, jump: 0.85, celebrate: 2.5 };

function Avatar({
  character,
  motion,
  reduced,
  restingHeadLift = 0,
  rightHandItem,
}: {
  character: Character;
  motion: RefObject<Motion>;
  reduced: boolean;
  restingHeadLift?: number;
  rightHandItem?: ReactNode;
}) {
  const { scene } = useGLTF(manifest[character], false, false);
  const { object, joints, headDepth, wardrobe } = useMemo(() => {
    const object = cloneSkeleton(scene);
    const wardrobe = new Map<THREE.MeshStandardMaterial, { color: THREE.Color; accessory: boolean; shirt: boolean }>();
    object.traverse((n) => {
      if (!(n as THREE.Mesh).isMesh) return;
      n.castShadow = true;
      const mesh = n as THREE.Mesh;
      // Animated limbs can extend beyond the GLB's rest-pose bounds.
      mesh.frustumCulled = false;
      const adapt = (material: THREE.Material) => {
        if (!(material instanceof THREE.MeshStandardMaterial) ||
          !/shirt|thigh|camera/i.test(material.name)) return material;
        const copy = material.clone();
        wardrobe.set(copy, {
          color: copy.color.clone(),
          accessory: /camera/i.test(copy.name),
          shirt: /shirt/i.test(copy.name),
        });
        return copy;
      };
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map(adapt) : adapt(mesh.material);
    });
    return {
      object,
      wardrobe,
      headDepth: object.getObjectByName('Head')?.position.z ?? 0,
      joints: Object.fromEntries(
        [
          'ArmL',
          'ArmR',
          'ElbowL',
          'ElbowR',
          'HandL',
          'HandR',
          'LegL',
          'LegR',
          'KneeL',
          'KneeR',
          'Head',
          'Spine',
          'Chest',
        ].map((name) => [name, object.getObjectByName(name)]),
      ),
    };
  }, [scene]);
  useEffect(() => () => { wardrobe.forEach((_, material) => material.dispose()); }, [wardrobe]);
  const stretching = useRef(false);
  const stretchStart = useRef(0);
  useFrame(({ clock }) => {
    const m = motion.current;
    const activeStretch = m.routine === 'stretch' && !m.walking && !m.seated && !m.gesture && !m.viewing;
    if (activeStretch !== stretching.current) {
      stretching.current = activeStretch;
      stretchStart.current = clock.elapsedTime;
      wardrobe.forEach((original, material) => {
        material.visible = !(activeStretch && original.accessory);
        if (activeStretch && !original.accessory) {
          material.color.set(original.shirt
            ? (character === 'sam' ? '#6daaa0' : '#d39cae')
            : (character === 'sam' ? '#344d58' : '#645775'));
        } else material.color.copy(original.color);
      });
    }
    // Local +Z faces upward when the room avatar is lying on its back.
    if (joints.Head) joints.Head.position.z = headDepth + restingHeadLift;
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
    object.position.z = 0;
    if (m.reach) {
      if (joints.ArmL) joints.ArmL.rotation.x = -1.35 * m.reach;
      if (joints.Head) joints.Head.rotation.x = 0.15 * m.reach;
    }
    if (m.seated) {
      const atTable =
        m.teaTime !== undefined ||
        m.routine === 'sleep' ||
        m.routine === 'work';
      if (joints.LegL) joints.LegL.rotation.x = atTable ? -Math.PI / 2 : -1.15;
      if (joints.LegR) joints.LegR.rotation.x = atTable ? -Math.PI / 2 : -1.15;
      if (joints.KneeL) joints.KneeL.rotation.x = atTable ? Math.PI / 2 : 1.15;
      if (joints.KneeR) joints.KneeR.rotation.x = atTable ? Math.PI / 2 : 1.15;
      if (joints.ArmL) joints.ArmL.rotation.x = -0.72;
      if (joints.ArmR) joints.ArmR.rotation.x = -0.72;
      if (joints.Head) joints.Head.rotation.x = 0.1;
      if (m.routine === 'sleep') {
        if (joints.Head) {
          joints.Head.rotation.x = 0.23;
          joints.Head.rotation.z = character === 'sam' ? -0.06 : 0.06;
        }
        if (joints.ArmL) joints.ArmL.rotation.x = -0.5;
        if (joints.ArmR) joints.ArmR.rotation.x = -0.5;
        object.position.y += reduced
          ? 0
          : Math.sin(clock.elapsedTime * 1.1) * 0.004;
      }
      if (m.routine === 'work' && m.teaTime === undefined) {
        // Lean over the supported keyboard, with elbows in and palms down.
        object.position.z = 0.06;
        for (const side of ['L', 'R']) {
          const arm = joints['Arm' + side];
          const elbow = joints['Elbow' + side];
          const hand = joints['Hand' + side];
          if (arm) arm.rotation.set(-1.05, 0, side === 'L' ? 0.28 : -0.28);
          if (elbow) elbow.rotation.x = -0.45;
          if (hand) hand.rotation.x = -0.05;
        }
        if (joints.Head) joints.Head.rotation.x = 0.18;
      }
      if (m.teaTime !== undefined) {
        // Elbows close to the torso, relaxed palms resting on the thighs.
        for (const side of ['L', 'R']) {
          const arm = joints['Arm' + side];
          const elbow = joints['Elbow' + side];
          const hand = joints['Hand' + side];
          if (arm) arm.rotation.set(-0.12, 0, side === 'L' ? 0.52 : -0.52);
          if (elbow) elbow.rotation.x = -0.6;
          if (hand) hand.rotation.x = -0.65;
        }
        const pose = teaPose(reduced ? 0 : m.teaTime);
        object.position.z = pose.lean;
        if (joints.ArmR && joints.ElbowR && joints.HandR)
          placeTeaHand(
            joints.ArmR,
            joints.ElbowR,
            joints.HandR,
            [pose.hand[0], pose.hand[1], pose.hand[2] - pose.lean],
            pose.grip,
          );
        if (joints.Head) {
          joints.Head.rotation.x = 0.04 + pose.lift * 0.07;
          joints.Head.rotation.z = reduced
            ? 0
            : Math.sin(m.teaTime * 0.65) * 0.025 * (1 - pose.grip);
        }
      }
    } else if (m.routine === 'sleep') {
      object.rotation.z = -Math.PI / 2;
      object.position.y = 0.18;
      if (joints.LegL) joints.LegL.rotation.x = -0.4;
      if (joints.LegR) joints.LegR.rotation.x = -0.4;
      if (joints.ArmL) joints.ArmL.rotation.x = -0.9;
      if (joints.ArmR) joints.ArmR.rotation.x = -0.9;
    } else if (activeStretch) {
      const pose = stretchPose(clock.elapsedTime - stretchStart.current, reduced);
      if (joints.ArmL) joints.ArmL.rotation.z = pose.left;
      if (joints.ArmR) joints.ArmR.rotation.z = pose.right;
      for (const side of ['L', 'R']) {
        if (joints['Elbow' + side]) joints['Elbow' + side]!.rotation.x = pose.elbow;
        if (joints['Leg' + side]) joints['Leg' + side]!.rotation.x = -pose.squat;
        if (joints['Knee' + side]) joints['Knee' + side]!.rotation.x = pose.squat * 2;
      }
      object.position.y = -0.59 * (1 - Math.cos(pose.squat));
      if (joints.Head) joints.Head.rotation.z = pose.head;
      if (joints.Chest) joints.Chest.rotation.z = pose.head * 0.3;
      if (joints.Spine) joints.Spine.rotation.x = pose.squat * 0.2;
    } else if (m.routine === 'relax') {
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
    // Reserve an arm envelope for every free-standing animation, not just yoga.
    // Authored seated interactions use their own cup/table contact targets.
    if (m.armsBlocked && !m.seated && !m.viewing) {
      for (const side of ['L', 'R']) {
        joints['Arm' + side]?.rotation.set(0, 0, 0);
        joints['Elbow' + side]?.rotation.set(0, 0, 0);
        joints['Hand' + side]?.rotation.set(0, 0, 0);
      }
      object.rotation.z = 0;
    }
  });
  return (
    <>
      <primitive object={object} dispose={null} scale={0.52} />
      {rightHandItem &&
        joints.ArmR &&
        createPortal(
          <group position={[0.12, -0.525, 0.13]}>{rightHandItem}</group>,
          joints.ArmR,
        )}
    </>
  );
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
  if (routine === 'stretch')
    return (
      <group>
        {/* A mat is a ground footprint, so it stays readable from the island's
         *  high camera angle where a held object would be a few pixels. */}
        <mesh position={[0, 0.01, 0.05]} receiveShadow>
          <boxGeometry args={[0.64, 0.04, 1.24]} />
          <meshStandardMaterial color="#dc9a80" />
        </mesh>
        <mesh position={[0, 0.09, -0.52]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 0.58, 8]} />
          <meshStandardMaterial color="#c4806a" />
        </mesh>
      </group>
    );
  if (routine === 'relax')
    return (
      <group position={[0, 0.68, 0.3]}>
        <mesh rotation={[-0.3, 0, 0]}>
          <boxGeometry args={[0.36, 0.035, 0.23]} />
          <meshStandardMaterial color="#d5a87f" />
        </mesh>
      </group>
    );
  return null;
}

export default function Companions({
  roaming,
  autonomous,
  manualMovement,
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
  roaming: boolean;
  autonomous: RefObject<boolean>;
  manualMovement: RefObject<boolean>;
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
  const tour = useRef(new AmbientTour());
  const [tourLabel, setTourLabel] = useState<string | null>(null);
  const lastTourLabel = useRef<string | null>(null);
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
  const restFrame = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (restFrame.current !== null) clearTimeout(restFrame.current);
    },
    [],
  );
  const resetExploration = useEffectEvent(() => {
    setEmotes(false);
    rest.current.interrupt();
    tour.current.interrupt(exploration.current);
    tour.current = new AmbientTour();
    autonomous.current = false;
    exploration.current.reset(character);
    previous.current = null;
    gesture.current = null;
    positionRef.current = {
      ...exploration.current.walkers[character].position,
    };
    onNear(null);
    invalidate();
  });
  useEffect(() => {
    resetExploration();
  }, [reset]);
  useEffect(() => {
    if (target) {
      tour.current.interrupt(exploration.current);
      autonomous.current = false;
      exploration.current.goTo(target);
    } else exploration.current.cancel();
    invalidate();
  }, [target, invalidate, autonomous]);
  const switchCharacter = useEffectEvent(() => {
    setEmotes(false);
    tour.current.interrupt(exploration.current);
    autonomous.current = false;
    exploration.current.switchTo(character);
    if (target) onArrive();
    invalidate();
  });
  useEffect(() => {
    switchCharacter();
  }, [character]);
  const triggerAction = useEffectEvent(() => {
    rest.current.interrupt();
    if (action) {
      tour.current.interrupt(exploration.current);
      autonomous.current = false;
      gesture.current = { kind: action.kind, time: 0, character };
    }
    invalidate();
  });
  useEffect(() => {
    triggerAction();
  }, [action]);
  useEffect(() => {
    invalidate();
  }, [character, paused, routine, invalidate]);
  useEffect(() => {
    if (paused || reduced || !roaming) {
      tour.current.interrupt(exploration.current);
      autonomous.current = false;
      setTourLabel(null);
      lastTourLabel.current = null;
      invalidate();
      return;
    }
    // Wake a demand-rendered canvas without keeping it running while idle.
    const timer = setInterval(invalidate, 500);
    return () => clearInterval(timer);
  }, [paused, reduced, roaming, routine, invalidate, autonomous]);
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
    const elapsed = dt;
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
    tour.current.step(
      elapsed,
      model,
      roaming &&
        !reduced &&
        !emotes &&
        !gesture.current &&
        !target &&
        !x &&
        !z &&
        routine !== 'stretch' &&
        routine !== 'relax',
      routine === 'sleep',
      routine === 'work',
      routine === 'tea',
    );
    autonomous.current = tour.current.active;
    if (lastTourLabel.current !== tour.current.label) {
      lastTourLabel.current = tour.current.label;
      setTourLabel(tour.current.label);
    }
    const preparingStretch = routine === 'stretch' && !tour.current.active &&
      !gesture.current && !target && !x && !z && !model.destination;
    const needsFrame = model.step(dt, direction, preparingStretch ? STRETCH_SPACE : undefined);
    manualMovement.current =
      !autonomous.current && model.walkers[character].walking;
    if (model.walkers[character].walking && !autonomous.current)
      playSound('step');
    for (const [id, actor, motion] of [
      ['sam', sam.current, m0.current],
      ['companion', companion.current, m1.current],
    ] as const) {
      const walker = model.walkers[id];
      actor.position.set(
        walker.position.x,
        harborHeight(walker.position) +
          0.12 +
          (['work', 'tea', 'sleep'].includes(tour.current.phase) ? -0.18 : 0),
        walker.position.z,
      );
      actor.rotation.y = walker.heading;
      const other = model.walkers[id === 'sam' ? 'companion' : 'sam'].position;
      motion.armsBlocked = Math.hypot(walker.position.x - other.x, walker.position.z - other.z) < STRETCH_SPACE ||
        !hasStretchRoom(walker.position);
      motion.walking = walker.walking;
      motion.phase = walker.phase;
      motion.seated = ['work', 'tea', 'sleep'].includes(tour.current.phase);
      motion.teaTime =
        tour.current.phase === 'tea'
          ? tour.current.teaSeconds + (id === 'sam' ? 0 : 9)
          : undefined;
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
    let nextRoutine =
      tour.current.phase === 'work'
        ? 'work'
        : tour.current.phase === 'sleep'
          ? 'sleep'
          : tour.current.phase === 'visiting'
            ? 'wander'
            : routine === 'sleep' || routine === 'work'
              ? undefined
              : rest.current.poseFor(routine);
    if (nextRoutine === 'stretch') {
      const a = model.walkers.sam.position, b = model.walkers.companion.position;
      if (!preparingStretch || Math.hypot(a.x - b.x, a.z - b.z) < STRETCH_SPACE ||
        !hasStretchRoom(a) || !hasStretchRoom(b)) nextRoutine = undefined;
    }
    if (m0.current.routine !== nextRoutine) invalidate();
    for (const m of [m0.current, m1.current]) m.routine = nextRoutine;
    const showRest = isResting && (routine !== 'stretch' || nextRoutine === 'stretch');
    if (restingRef.current !== showRest) {
      restingRef.current = showRest;
      setResting(showRest);
    }
    const seated = ['work', 'tea', 'sleep'].includes(tour.current.phase);
    if (!isResting && !seated) invalidate();
    positionRef.current.x = p.x;
    positionRef.current.z = p.z;
    const near = autonomous.current ? null : nearestDistrict(p);
    if (previous.current !== (near?.id ?? null)) {
      previous.current = near?.id ?? null;
      onNear(near);
    }
    if (seated && !needsFrame) {
      // Quiet table animations need fewer redraws than direct player movement.
      if (restFrame.current === null)
        restFrame.current = setTimeout(() => {
          restFrame.current = null;
          invalidate();
        }, 1000 / 24);
    } else if (needsFrame || tour.current.active) invalidate();
  });
  return (
    <>
      <TeaTable
        working={tourLabel === 'Working together'}
        tea={tourLabel === 'Tea for two'}
      />
      {(['sam', 'companion'] as const).map((id, i) => (
        <group
          key={id}
          ref={i === 0 ? sam : companion}
          position={[SPAWN.x - i * 0.85, 0.12, SPAWN.z]}
          onClick={(event) => {
            if (paused || event.delta > 5) return;
            event.stopPropagation();
            tour.current.interrupt(exploration.current);
            autonomous.current = false;
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
          <TeaCup motion={i === 0 ? m0 : m1} reduced={reduced} />
          {resting && !tourLabel && routine !== 'sleep' && (
            <RoutineProps routine={routine} cloud={id === 'sam'} />
          )}
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
                (hovered === id || touch || tourLabel) && (
                  <span
                    className={`world-hint ${hovered === id ? 'is-near' : ''}`}
                  >
                    {tourLabel ?? 'Tap for actions'}
                  </span>
                )
              )}
            </Html>
          )}
          {character === id
            ? !tourLabel &&
              (!resting || routine !== 'sleep') && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                  <torusGeometry args={[0.36, 0.023, 6, 32]} />
                  <meshBasicMaterial color="#b7f5c4" />
                </mesh>
              )
            : !paused &&
              !tourLabel && (
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
