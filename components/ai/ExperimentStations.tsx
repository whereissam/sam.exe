'use client';
/* oxlint-disable react/react-compiler -- Animate Three objects in demand-rendered frames. */
import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import type { AgentState, Destination } from './agent';
type Vec = [number, number, number];
function Block({ at, size, color }: { at: Vec; size: Vec; color: string }) {
  return (
    <RoundedBox
      args={size}
      radius={Math.min(...size) * 0.16}
      smoothness={1}
      position={at}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={color} roughness={0.65} />
    </RoundedBox>
  );
}
function Bulb({
  at,
  color,
  radius = 0.09,
}: {
  at: Vec;
  color: string;
  radius?: number;
}) {
  return (
    <mesh position={at}>
      <sphereGeometry args={[radius, 12, 8]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.3}
      />
    </mesh>
  );
}
function Station({
  kind,
  at,
  delivered,
  selected,
  reduced,
  onSelect,
}: {
  kind: Destination;
  at: Vec;
  delivered: boolean;
  selected: boolean;
  reduced: boolean;
  onSelect: () => void;
}) {
  const [active, setActive] = useState(true);
  const [hovered, setHovered] = useState(false);
  const moving = useRef<THREE.Group>(null);
  const progress = useRef(0);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
  }, [active, delivered, invalidate]);
  useFrame((_, delta) => {
    const target = active && delivered ? 1 : 0;
    progress.current = reduced
      ? target
      : THREE.MathUtils.damp(
          progress.current,
          target,
          5,
          Math.min(delta, 0.05),
        );
    if (moving.current) {
      if (kind === 'garden')
        moving.current.scale.y = 0.25 + progress.current * 0.75;
      if (kind === 'desk')
        moving.current.rotation.y = progress.current * Math.PI * 2;
      if (kind === 'dock')
        moving.current.rotation.x = -progress.current * Math.PI * 0.65;
    }
    if (Math.abs(progress.current - target) > 0.001) invalidate();
  });
  const lamp = delivered ? '#9dcc8b' : selected ? '#e4bf71' : '#8b9f97';
  return (
    <group
      position={at}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        if (e.delta > 5) return;
        e.stopPropagation();
        if (delivered) setActive((value) => !value);
        else onSelect();
      }}
    >
      <Block
        at={[0, 0.12, 0]}
        size={[1.65, 0.24, 1.1]}
        color={hovered ? '#ddc58f' : '#a68e69'}
      />
      <Bulb at={[-0.65, 0.32, 0.44]} color={lamp} />
      {kind === 'garden' && (
        <>
          <Block at={[0, 0.32, 0]} size={[1.4, 0.2, 0.85]} color="#8f6951" />
          <Block at={[0, 0.43, 0]} size={[1.25, 0.03, 0.7]} color="#514d39" />
          {[-0.7, 0.7].map((x) =>
            [-0.45, 0.45].map((z) => (
              <Block
                key={`${x}:${z}`}
                at={[x, 0.9, z]}
                size={[0.06, 1.2, 0.06]}
                color="#c6d1b7"
              />
            )),
          )}
          {[-0.7, 0.7].map((x) => (
            <mesh
              key={x}
              position={[x, 0.99, 0]}
              rotation={[0, Math.PI / 2, 0]}
            >
              <planeGeometry args={[0.88, 1.08]} />
              <meshStandardMaterial
                color="#bdd9c8"
                transparent
                opacity={0.19}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          ))}
          {[-0.45, 0.45].map((z) => (
            <Block
              key={z}
              at={[0, 0.55, z]}
              size={[1.42, 0.04, 0.04]}
              color="#78978b"
            />
          ))}
          {[-0.42, 0, 0.42].map((x) => (
            <group key={x}>
              <mesh position={[x, 0.5, 0]}>
                <cylinderGeometry args={[0.17, 0.13, 0.15, 12]} />
                <meshStandardMaterial color="#b68c6d" />
              </mesh>
              <Block
                at={[x, 1.51, 0]}
                size={[0.035, 0.045, 0.9]}
                color="#b6c8b3"
              />
            </group>
          ))}
          <Block
            at={[0, 1.42, -0.38]}
            size={[1.18, 0.04, 0.04]}
            color="#dfd6a4"
          />
          <Block
            at={[0, 1.5, -0.45]}
            size={[1.5, 0.06, 0.06]}
            color="#c6d1b7"
          />
          <Block at={[0, 1.5, 0.45]} size={[1.5, 0.06, 0.06]} color="#c6d1b7" />
          <mesh position={[0, 1.53, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.5, 1]} />
            <meshStandardMaterial
              color="#b7d5c7"
              transparent
              opacity={0.27}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          {delivered && (
            <group ref={moving} position={[0, 0.45, 0]}>
              {[-0.42, 0, 0.42].map((x, i) => (
                <group key={x} position={[x, 0, 0]}>
                  <Block
                    at={[0, 0.27, 0]}
                    size={[0.04, 0.54, 0.04]}
                    color="#648363"
                  />
                  <mesh
                    position={[0.1, 0.25, 0]}
                    rotation={[0, 0, -0.7]}
                    scale={[0.1, 0.23, 0.07]}
                  >
                    <sphereGeometry args={[1, 10, 6]} />
                    <meshStandardMaterial color="#809768" />
                  </mesh>
                  <Bulb
                    at={[0, 0.57, 0]}
                    radius={0.13}
                    color={
                      active ? ['#d6ae71', '#bc99b2', '#e8c97d'][i] : '#809768'
                    }
                  />
                </group>
              ))}
            </group>
          )}
          <Block
            at={[0.65, 0.7, 0.55]}
            size={[0.22, 0.25, 0.18]}
            color={active ? '#80b9b5' : '#688e89'}
          />
        </>
      )}
      {kind === 'desk' && (
        <>
          <Block
            at={[-0.4, 1.055, 0.25]}
            size={[0.52, 0.03, 0.22]}
            color="#657a70"
          />
          {[0, 1, 2, 3, 4].map((i) => (
            <Block
              key={i}
              at={[-0.59 + i * 0.095, 1.075, 0.25]}
              size={[0.06, 0.012, 0.16]}
              color="#d6d6bb"
            />
          ))}
          <Block
            at={[0.69, 1.44, -0.3]}
            size={[0.07, 0.85, 0.08]}
            color="#71877e"
          />
          <Block
            at={[0.42, 1.84, -0.3]}
            size={[0.6, 0.07, 0.08]}
            color="#71877e"
          />
          <Block
            at={[0.2, 1.76, -0.3]}
            size={[0.18, 0.12, 0.18]}
            color="#405f59"
          />
          {[0.36, 0.63].map((y) => (
            <group key={y}>
              <Block
                at={[-0.4, y, 0]}
                size={[0.56, 0.23, 0.65]}
                color="#b9a27c"
              />
              <Block
                at={[-0.4, y, 0.34]}
                size={[0.19, 0.025, 0.025]}
                color="#6f705d"
              />
            </group>
          ))}

          {[-0.65, 0.65].map((x) => (
            <Block
              key={x}
              at={[x, 0.55, 0]}
              size={[0.12, 0.8, 0.7]}
              color="#88775e"
            />
          ))}
          <Block at={[0, 0.98, 0]} size={[1.7, 0.12, 1]} color="#d3ba8a" />
          <Block
            at={[-0.4, 1.3, -0.25]}
            size={[0.62, 0.45, 0.1]}
            color="#475b55"
          />
          <Block
            at={[-0.4, 1.31, -0.19]}
            size={[0.51, 0.33, 0.015]}
            color={active ? '#92c9b3' : '#738e86'}
          />
          {[0, 1, 2].map((i) => (
            <Block
              key={i}
              at={[-0.55 + i * 0.15, 1.28, -0.178]}
              size={[0.06, active ? 0.08 + i * 0.07 : 0.04, 0.01]}
              color="#e4e7ba"
            />
          ))}
          <mesh position={[0.35, 1.08, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.08, 20]} />
            <meshStandardMaterial color="#718f86" />
          </mesh>
          {delivered && (
            <group ref={moving} position={[0.35, 1.35, 0]}>
              <mesh>
                <icosahedronGeometry args={[0.2, 0]} />
                <meshStandardMaterial
                  color={active ? '#b5a0c9' : '#c6b078'}
                  metalness={0.3}
                  roughness={0.4}
                />
              </mesh>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.29, 0.015, 6, 24]} />
                <meshStandardMaterial color="#d9c58d" />
              </mesh>
            </group>
          )}
        </>
      )}
      {kind === 'dock' && (
        <>
          {[-0.48, 0.48].map((x) => (
            <group key={x}>
              <Block
                at={[x, 0.45, 0.435]}
                size={[0.08, 0.56, 0.025]}
                color="#b8ad85"
              />
              <Block
                at={[x, 0.18, 0.45]}
                size={[0.15, 0.05, 0.05]}
                color="#667169"
              />
            </group>
          ))}
          <Block
            at={[0, 0.49, 0.435]}
            size={[0.4, 0.2, 0.025]}
            color="#ded7b7"
          />
          {[0, 1, 2, 3, 4].map((i) => (
            <Block
              key={i}
              at={[-0.13 + i * 0.06, 0.49, 0.452]}
              size={[i % 2 ? 0.015 : 0.03, 0.13, 0.008]}
              color="#5b756b"
            />
          ))}

          <Block
            at={[0, 0.45, -0.35]}
            size={[1.4, 0.6, 0.14]}
            color="#67867d"
          />
          {[-0.63, 0.63].map((x) => (
            <Block
              key={x}
              at={[x, 0.45, 0]}
              size={[0.14, 0.6, 0.8]}
              color="#67867d"
            />
          ))}
          <Block at={[0, 0.45, 0.36]} size={[1.4, 0.6, 0.12]} color="#67867d" />
          <group ref={moving} position={[0, 0.78, -0.4]}>
            <Block at={[0, 0, 0.4]} size={[1.5, 0.1, 0.9]} color="#c9b281" />
            <Block
              at={[0, 0.07, 0.4]}
              size={[0.4, 0.06, 0.12]}
              color="#7d7058"
            />
          </group>
          {delivered && (
            <Block at={[0, 0.48, 0]} size={[0.6, 0.4, 0.5]} color="#d3ad70" />
          )}
        </>
      )}
      {(hovered || selected) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
          <ringGeometry args={[0.95, 1, 32]} />
          <meshBasicMaterial color={delivered ? '#b5d8a2' : '#e7c98e'} />
        </mesh>
      )}
    </group>
  );
}
export default function ExperimentStations({
  state,
  reduced,
  onDestination,
}: {
  state: AgentState;
  reduced: boolean;
  onDestination: (id: Destination) => void;
}) {
  return (
    <group>
      {(['garden', 'desk', 'dock'] as const).map((kind, i) => (
        <Station
          key={kind}
          kind={kind}
          at={
            (
              [
                [2.2, 0, -4.35],
                [4.45, 0, 1.3],
                [0, 0, 4.3],
              ] as Vec[]
            )[i]
          }
          selected={state.destination === kind}
          delivered={state.delivered.some((job) => job.destination === kind)}
          reduced={reduced}
          onSelect={() => onDestination(kind)}
        />
      ))}
    </group>
  );
}
