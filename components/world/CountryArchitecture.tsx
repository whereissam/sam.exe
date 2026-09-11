'use client';
import { useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AtlasCountry } from './photo-atlas';
import type { Point } from './movement';
import { HarborBlock as Block } from './Harbor';

export const landmarkNames = {
  gate: 'Brandenburg Gate',
  tower: 'Taipei 101',
  city: 'Empire State Building',
  torii: 'Tokyo Tower',
};
function Beam({
  a,
  b,
  color,
  width = 0.08,
}: {
  a: [number, number, number];
  b: [number, number, number];
  color: string;
  width?: number;
}) {
  const start = new THREE.Vector3(...a),
    end = new THREE.Vector3(...b),
    direction = end.clone().sub(start);
  return (
    <mesh
      position={start.add(end).multiplyScalar(0.5)}
      quaternion={new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.clone().normalize(),
      )}
      castShadow
    >
      <cylinderGeometry args={[width, width, direction.length(), 6]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}
export function CountryLandmark({ kind }: { kind: AtlasCountry['landmark'] }) {
  if (kind === 'tower')
    return (
      <group>
        <Block at={[0, 0.3, 0]} size={[1.35, 0.6, 1.35]} color="#a4c5af" />
        {Array.from({ length: 8 }, (_, i) => (
          <group key={i} position={[0, 0.65 + i * 0.44, 0]}>
            <mesh
              position={[0, 0.15, 0]}
              rotation={[0, Math.PI / 4, 0]}
              castShadow
            >
              <cylinderGeometry
                args={[0.71 - i * 0.025, 0.57 - i * 0.025, 0.39, 4]}
              />
              <meshStandardMaterial
                color={i % 2 ? '#629d91' : '#80b3a2'}
                flatShading
              />
            </mesh>
            <Block
              at={[0, 0.36, 0]}
              size={[1.02 - i * 0.033, 0.065, 1.02 - i * 0.033]}
              color="#b4d6b7"
            />
            {[0, 1, 2, 3].map((side) => (
              <group key={side} rotation={[0, (side * Math.PI) / 2, 0]}>
                <Block
                  at={[0, 0.18, 0.49 - i * 0.017]}
                  size={[0.04, 0.25, 0.025]}
                  color="#d9e8c5"
                />
              </group>
            ))}
          </group>
        ))}
        <Block at={[0, 4.35, 0]} size={[0.25, 0.5, 0.25]} color="#9bbfad" />
        <Block at={[0, 4.92, 0]} size={[0.055, 0.72, 0.055]} color="#f0dfae" />
      </group>
    );
  if (kind === 'gate')
    return (
      <group>
        <Block at={[0, 0.13, 0]} size={[3.6, 0.26, 1.4]} color="#d6bf99" />
        {[-1.4, -0.84, -0.28, 0.28, 0.84, 1.4].map((x) => (
          <group key={x}>
            {[-0.4, 0.4].map((z) => (
              <mesh key={z} position={[x, 1.2, z]} castShadow>
                <cylinderGeometry args={[0.12, 0.15, 2.15, 10]} />
                <meshStandardMaterial color="#e9dabb" />
              </mesh>
            ))}
          </group>
        ))}
        <Block at={[0, 2.35, 0]} size={[3.5, 0.32, 1.28]} color="#f1dfbb" />
        <Block at={[0, 2.64, 0]} size={[3.8, 0.24, 1.5]} color="#cbbd9c" />
        <Block at={[0, 2.89, 0]} size={[1.4, 0.3, 0.8]} color="#839783" />
        {[-0.5, -0.17, 0.17, 0.5].map((x) => (
          <group key={x}>
            <mesh position={[x, 3.13, 0.12]} scale={[0.12, 0.16, 0.28]}>
              <icosahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color="#759084" />
            </mesh>
            <Block
              at={[x, 3.3, 0.29]}
              size={[0.08, 0.27, 0.1]}
              color="#759084"
            />
          </group>
        ))}
      </group>
    );
  if (kind === 'torii')
    return (
      <group>
        {[-1, 1].flatMap((x) =>
          [-1, 1].map((z) => (
            <group key={`${x}:${z}`}>
              <Beam
                a={[x * 0.9, 0, z * 0.9]}
                b={[x * 0.3, 2.4, z * 0.3]}
                color="#c96f4d"
                width={0.09}
              />
              <Beam
                a={[x * 0.3, 2.4, z * 0.3]}
                b={[x * 0.11, 3.9, z * 0.11]}
                color="#e9dfc7"
                width={0.045}
              />
              {[0, 1, 2].map((i) => (
                <Beam
                  key={i}
                  a={[x * (0.9 - i * 0.2), i * 0.7, z * (0.9 - i * 0.2)]}
                  b={[-x * (0.7 - i * 0.2), (i + 1) * 0.7, z * (0.7 - i * 0.2)]}
                  color="#c96f4d"
                  width={0.035}
                />
              ))}
            </group>
          )),
        )}
        <Block at={[0, 2.25, 0]} size={[1, 0.25, 1]} color="#d9ded1" />
        <Block at={[0, 2.55, 0]} size={[0.85, 0.28, 0.85]} color="#cf754f" />
        <Block at={[0, 3.7, 0]} size={[0.4, 0.22, 0.4]} color="#cf754f" />
        {[0, 1, 2, 3, 4].map((i) => (
          <Block
            key={i}
            at={[0, 4 + i * 0.24, 0]}
            size={[0.075, 0.25, 0.075]}
            color={i % 2 ? '#e7e2d0' : '#cc734f'}
          />
        ))}
      </group>
    );
  return (
    <group>
      {[0, 1, 2, 3].map((i) => (
        <group key={i} position={[0, 0.5 + i * 0.8, 0]}>
          <Block
            at={[0, 0, 0]}
            size={[1.55 - i * 0.28, 0.85, 1.15 - i * 0.17]}
            color={i % 2 ? '#c7c3ab' : '#ddd5b8'}
          />
          {[0, 1, 2, 3].map((side) => (
            <group key={side} rotation={[0, (side * Math.PI) / 2, 0]}>
              {[-0.28, 0, 0.28].map((x) => (
                <Block
                  key={x}
                  at={[x, 0.02, 0.59 - i * 0.085]}
                  size={[0.055, 0.55, 0.016]}
                  color="#6d9296"
                />
              ))}
            </group>
          ))}
        </group>
      ))}
      <Block at={[0, 3.67, 0]} size={[0.42, 0.7, 0.42]} color="#ded6bc" />
      <Block at={[0, 4.3, 0]} size={[0.09, 0.7, 0.09]} color="#b4b7aa" />
    </group>
  );
}
/** A distant stage landmark, standing at the head of the gallery.
 *
 *  It used to track the traveller exactly, which made a building the size of
 *  Taipei 101 appear welded to a walking person. It now drifts at a fraction of
 *  their pace, the way something far away does, so it stays in shot on a long
 *  gallery without following anybody. */
const BACKDROP_PARALLAX = 0.12;
export function CountryBackdrop({
  kind,
  player,
  originX,
}: {
  originX: number;
  kind: AtlasCountry['landmark'];
  player: RefObject<Point>;
}) {
  const backdrop = useRef<THREE.Group>(null);
  useFrame(() => {
    if (backdrop.current)
      backdrop.current.position.x =
        originX - 3.65 + (player.current.x - originX) * BACKDROP_PARALLAX;
  });
  return (
    <group
      ref={backdrop}
      position={[
        originX - 3.65 + (player.current.x - originX) * BACKDROP_PARALLAX,
        0,
        -1.5,
      ]}
      scale={kind === 'gate' ? 0.7 : 0.8}
    >
      <CountryLandmark kind={kind} />
      <Block
        at={[0, -0.06, 0]}
        size={[kind === 'gate' ? 4.1 : 2.6, 0.12, 2.3]}
        color="#d8d1ad"
      />
    </group>
  );
}
