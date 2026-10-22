'use client';
/* oxlint-disable react/react-compiler -- Physics owns mesh transforms, copied from the rigid bodies each frame. */
import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import type { Group, Mesh, MeshBasicMaterial } from 'three';
import type { BoxingWorld, BoxingPart } from './boxing-physics';
import type { SparringCommands } from '../world/sparring';
function Part({ part }: { part: BoxingPart }) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const p = part.body.translation(),
      q = part.body.rotation();
    ref.current.position.set(p.x, p.y, p.z);
    ref.current.quaternion.set(q.x, q.y, q.z, q.w);
  }, -1);
  const accent = part.side ? '#648f82' : '#b46d4e',
    glove = part.name.includes('fist'),
    head = part.name === 'head';
  return (
    <group ref={ref}>
      <RoundedBox
        args={part.size}
        radius={glove ? 0.055 : 0.018}
        smoothness={2}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={
            glove ? accent : part.name === 'pelvis' ? '#35443f' : '#e6dfc8'
          }
          roughness={glove ? 0.8 : 0.65}
        />
      </RoundedBox>
      {glove && (
        <>
          <mesh position={[0, 0.12, 0]} castShadow>
            <boxGeometry args={[0.29, 0.09, 0.29]} />
            <meshStandardMaterial color="#ece2c6" />
          </mesh>
          <mesh position={[0, 0, 0.172]}>
            <boxGeometry args={[0.2, 0.035, 0.006]} />
            <meshStandardMaterial color="#ecddbc" />
          </mesh>
        </>
      )}
      {head && (
        <>
          <mesh position={[0, 0.03, 0.21]}>
            <boxGeometry args={[0.34, 0.1, 0.014]} />
            <meshStandardMaterial color="#293f36" />
          </mesh>
          {[
            [0, 0.23, 0, 0.52, 0.09, 0.46],
            [-0.235, 0, 0, 0.08, 0.4, 0.46],
            [0.235, 0, 0, 0.08, 0.4, 0.46],
            [0, 0, -0.21, 0.46, 0.4, 0.07],
          ].map(([x, y, z, sx, sy, sz], i) => (
            <RoundedBox
              key={i}
              position={[x, y, z]}
              args={[sx, sy, sz]}
              radius={0.025}
              smoothness={2}
              castShadow
            >
              <meshStandardMaterial color={accent} roughness={0.85} />
            </RoundedBox>
          ))}
        </>
      )}
      {part.name === 'torso' && (
        <mesh position={[0, 0, 0.196]}>
          <boxGeometry args={[0.36, 0.19, 0.012]} />
          <meshStandardMaterial color={accent} />
        </mesh>
      )}
    </group>
  );
}
/** A burst and an expanding ring where a clean strike lands, in the hit robot's colour. */
function Impact({ world, reduced }: { world: BoxingWorld; reduced: boolean }) {
  const group = useRef<Group>(null),
    ring = useRef<Mesh>(null),
    flash = useRef<Mesh>(null);
  const seen = useRef(0),
    age = useRef(1);
  useFrame((state, dt) => {
    const hit = world.lastHit;
    if (hit && hit.id !== seen.current) {
      seen.current = hit.id;
      age.current = 0;
      group.current?.position.set(...hit.position);
      // Face the ring toward the camera so it reads as a burst from any angle.
      group.current?.quaternion.copy(state.camera.quaternion);
      const color = hit.side ? '#ffe9b8' : '#fff3d6';
      for (const mesh of [ring.current, flash.current])
        (mesh?.material as MeshBasicMaterial | undefined)?.color.set(color);
    }
    age.current += dt;
    const t = Math.min(1, age.current / 0.35);
    if (!group.current) return;
    group.current.visible = t < 1;
    if (t >= 1) return;
    ring.current?.scale.setScalar(reduced ? 1 : 0.4 + t * 1.6);
    flash.current?.scale.setScalar(reduced ? 0.6 : 1 - t * 0.7);
    for (const mesh of [ring.current, flash.current]) {
      const material = mesh?.material as MeshBasicMaterial | undefined;
      if (material) material.opacity = 1 - t;
    }
  });
  return (
    <group ref={group} visible={false}>
      <mesh ref={ring}>
        <ringGeometry args={[0.16, 0.22, 32]} />
        <meshBasicMaterial transparent depthTest={false} toneMapped={false} />
      </mesh>
      <mesh ref={flash}>
        <circleGeometry args={[0.13, 24]} />
        <meshBasicMaterial transparent depthTest={false} toneMapped={false} />
      </mesh>
    </group>
  );
}
/** Seconds a knockdown is shown before the next round starts. */
const ROUND_BREAK = 3;
export default function PhysicsFight({
  paused,
  reduced,
  commands,
}: {
  paused: boolean;
  reduced: boolean;
  commands: SparringCommands;
}) {
  const [world, setWorld] = useState<BoxingWorld | null>(null),
    [error, setError] = useState(false),
    // A knockdown ends the round; a fresh world stands both robots up for the next one.
    [round, setRound] = useState(1),
    [countdown, setCountdown] = useState<number | null>(null);
  const invalidate = useThree((s) => s.invalidate);
  // The world that has already called its round, so it asks for the next one only once.
  const ended = useRef<BoxingWorld | null>(null);
  useEffect(() => {
    let active = true,
      simulation: BoxingWorld | undefined;
    import('./boxing-physics')
      .then(async (module) => {
        await module.initBoxing();
        if (!active) return;
        simulation = new module.BoxingWorld(commands);
        setWorld(simulation);
        setCountdown(null);
        invalidate();
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [invalidate, commands, round]);
  // Free a world only once its replacement is on screen (or the ring closes): until then
  // its bodies are still being drawn, and freed Rapier memory can't be read.
  useEffect(() => () => world?.dispose(), [world]);
  useFrame((_, dt) => {
    if (!world || paused || reduced || document.hidden) return;
    world.step(dt);
    invalidate();
    if (!world.downFor) return;
    const left = Math.max(0, Math.ceil(ROUND_BREAK - world.downFor));
    if (left !== countdown) setCountdown(left);
    if (world.downFor >= ROUND_BREAK && ended.current !== world) {
      ended.current = world;
      setRound((r) => r + 1);
    }
  }, -2);
  if (!world)
    return (
      <Html center position={[0, 1.5, 0]}>
        <div
          style={{
            background: '#eee5ca',
            color: '#354f42',
            padding: 16,
            borderRadius: 8,
            whiteSpace: 'nowrap',
          }}
        >
          {error
            ? 'Physics could not load. Reopen the ring to retry.'
            : 'Preparing the physics ring…'}
        </div>
      </Html>
    );
  return (
    <group position={[0, 0.3, 0]}>
      {world.parts.map((p, i) => (
        <Part key={i} part={p} />
      ))}
      <Impact world={world} reduced={reduced} />
      {countdown !== null && countdown > 0 && (
        <Html center position={[0, 2.6, -0.5]}>
          <output className="lab-knockdown">
            <b>Knockdown!</b>
            <span>Round {round + 1} in {countdown}</span>
          </output>
        </Html>
      )}
    </group>
  );
}
