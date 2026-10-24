'use client';
import { playSound } from '../audio/sound';
import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { District } from './districts';
import {
  harborHeight,
  CLOCK_Z,
  HARBOR_PLANTERS,
} from './island-layout';
import { GroundLabel } from './GroundLabel';
import { CITY_TREES } from './city-layout';
import { CanalCity } from './CanalCity';
import { OceanBackdrop } from './OceanBackdrop';
import { clockHandAngles } from './clock-time';

type Vec = [number, number, number];
export function HarborBlock({
  at,
  size,
  color,
  rotation = [0, 0, 0],
}: {
  at: Vec;
  size: Vec;
  color: string;
  rotation?: Vec;
}) {
  return (
    <mesh position={at} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}
function HarborTree({ at, palm = false }: { at: Vec; palm?: boolean }) {
  return (
    <group position={at}>
      <HarborBlock
        at={[0, 0.7, 0]}
        size={[0.15, 1.4, 0.15]}
        color="#99714f"
        rotation={[0, 0, palm ? -0.12 : 0]}
      />
      {palm ? (
        Array.from({ length: 6 }, (_, i) => (
          <group
            key={i}
            position={[0, 1.5, 0]}
            rotation={[0, (i * Math.PI) / 3, 0]}
          >
            <mesh
              position={[0.38, -0.1, 0]}
              rotation={[0, 0, -0.35]}
              scale={[1, 0.16, 0.35]}
            >
              <icosahedronGeometry args={[0.75, 0]} />
              <meshStandardMaterial
                color={i % 2 ? '#88aa66' : '#b1bd75'}
                flatShading
              />
            </mesh>
          </group>
        ))
      ) : (
        <mesh position={[0, 1.45, 0]} scale={[1, 1.1, 1]} castShadow>
          <icosahedronGeometry args={[0.75, 1]} />
          <meshStandardMaterial color="#9db775" flatShading />
        </mesh>
      )}
    </group>
  );
}
function ClockFace({ night, paused }: { night: boolean; paused: boolean }) {
  const hour = useRef<THREE.Group>(null);
  const minute = useRef<THREE.Group>(null);
  const second = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const update = () => {
      const angles = clockHandAngles(new Date());
      if (hour.current) hour.current.rotation.z = angles.hour;
      if (minute.current) minute.current.rotation.z = angles.minute;
      if (second.current) second.current.rotation.z = angles.second;
      invalidate();
    };
    update();
    if (paused) return;
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [paused, invalidate]);
  return (
    <group position={[0, 2.7, 0.64]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.44, 0.44, 0.09, 32]} />
        <meshStandardMaterial color="#9f8054" />
      </mesh>
      <mesh position={[0, 0, 0.051]}>
        <circleGeometry args={[0.39, 32]} />
        <meshStandardMaterial
          color="#f7e8c2"
          emissive="#e6bd75"
          emissiveIntensity={night ? 0.4 : 0}
        />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <group key={i} rotation={[0, 0, (-i * Math.PI) / 6]}>
          <HarborBlock
            at={[0, 0.329, 0.06]}
            size={[i % 3 ? 0.018 : 0.032, i % 3 ? 0.045 : 0.075, 0.012]}
            color="#665b46"
          />
        </group>
      ))}
      <group ref={hour}>
        <HarborBlock
          at={[0, 0.1, 0.082]}
          size={[0.045, 0.23, 0.018]}
          color="#485d58"
        />
      </group>
      <group ref={minute}>
        <HarborBlock
          at={[0, 0.145, 0.105]}
          size={[0.027, 0.32, 0.018]}
          color="#485d58"
        />
      </group>
      <group ref={second}>
        <HarborBlock
          at={[0, 0.12, 0.13]}
          size={[0.012, 0.37, 0.012]}
          color="#b97350"
        />
      </group>
      <mesh position={[0, 0, 0.15]}>
        <sphereGeometry args={[0.037, 10, 8]} />
        <meshStandardMaterial color="#c19a57" />
      </mesh>
    </group>
  );
}

function CanalHouse({
  color,
  night,
  tower = false,
  paused = false,
}: {
  color: string;
  night: boolean;
  tower?: boolean;
  paused?: boolean;
}) {
  const height = tower ? 3.25 : 2.05;
  return (
    <group>
      <HarborBlock
        at={[0, height / 2, 0]}
        size={[1.2, height, 1.2]}
        color={color}
      />
      <HarborBlock
        at={[0, 0.17, 0]}
        size={[1.35, 0.34, 1.35]}
        color="#e9d5b1"
      />
      <HarborBlock
        at={[0, height - 0.18, 0]}
        size={[1.32, 0.16, 1.32]}
        color="#f6e4bd"
      />
      <mesh
        position={[0, height + 0.34, 0]}
        rotation={[0, Math.PI / 4, 0]}
        castShadow
      >
        <coneGeometry args={[1.03, 0.8, 4]} />
        <meshStandardMaterial
          color={tower ? '#5d9da5' : '#ba785e'}
          flatShading
        />
      </mesh>
      {[0, 1, 2, 3].map((side) => (
        <group key={side} rotation={[0, (side * Math.PI) / 2, 0]}>
          {[0, 1].map((row) => (
            <group key={row} position={[0, 0.75 + row * 0.8, 0.608]}>
              <HarborBlock
                at={[0, 0, 0]}
                size={[0.53, 0.52, 0.045]}
                color="#f8e3b6"
              />
              <mesh position={[0, 0, 0.026]}>
                <planeGeometry args={[0.35, 0.37]} />
                <meshStandardMaterial
                  color={night ? '#f6dc8c' : '#538b94'}
                  emissive={night ? '#f6c572' : '#203e45'}
                  emissiveIntensity={night ? 0.65 : 0}
                />
              </mesh>
              <HarborBlock
                at={[0, -0.28, 0.09]}
                size={[0.65, 0.12, 0.22]}
                color="#e4cca0"
              />
            </group>
          ))}
          <HarborBlock
            at={[0, 0.26, 0.623]}
            size={[0.35, 0.53, 0.055]}
            color="#71624d"
          />
          {tower && <ClockFace night={night} paused={paused} />}
        </group>
      ))}
      <HarborBlock
        at={[0.3, height + 0.5, 0]}
        size={[0.17, 0.85, 0.2]}
        color="#e1d2ba"
      />
    </group>
  );
}
function Boat({ paused, reduced }: { paused: boolean; reduced: boolean }) {
  const [sailing, setSailing] = useState(false),
    boat = useRef<THREE.Group>(null),
    phase = useRef(0);
  const invalidate = useThree((s) => s.invalidate);
  useFrame((_, dt) => {
    if (!paused && sailing && !reduced && boat.current) {
      phase.current += Math.min(dt, 0.05) * 0.14;
      boat.current.position.set(
        Math.sin(phase.current) * 22,
        -4.72,
        Math.cos(phase.current) * 22,
      );
      boat.current.rotation.y = phase.current + Math.PI / 2;
      invalidate();
    }
  });
  return (
    <>
      <group
        ref={boat}
        position={[0, -4.72, 22]}
        onClick={(event) => {
          if (event.delta > 5 || paused) return;
          event.stopPropagation();
          playSound('boat');
          setSailing((v) => !v);
          invalidate();
        }}
      >
        <mesh scale={[0.7, 0.35, 1.5]} rotation={[0, Math.PI / 6, 0]}>
          <cylinderGeometry args={[1, 0.7, 1, 6]} />
          <meshStandardMaterial color="#ac7357" />
        </mesh>
        <HarborBlock
          at={[0, 0.7, 0]}
          size={[0.07, 1.8, 0.07]}
          color="#8c654b"
        />
        <mesh position={[0.42, 0.95, 0]}>
          <planeGeometry args={[0.75, 1.25]} />
          <meshStandardMaterial color="#f6dc8c" side={THREE.DoubleSide} />
        </mesh>
        <HarborBlock
          at={[0, 0.18, 0]}
          size={[1.02, 0.08, 1.8]}
          color="#e4bf86"
        />
      </group>
      <GroundLabel
        title={sailing ? 'Harbor boat · moor' : 'Harbor boat · sail'}
        position={[0, harborHeight({ x: 0, z: 7.5 }) + 0.025, 7.5]}
        width={2.3}
        onClick={() => {
          if (!paused) {
            playSound('boat');
            setSailing((v) => !v);
            invalidate();
          }
        }}
      />
    </>
  );
}
export function ExhibitBack({ id }: { id: District['id'] }) {
  if (id === 'robotics')
    return (
      <group>
        <HarborBlock
          at={[0, 1.1, -0.32]}
          size={[0.55, 0.6, 0.18]}
          color="#799c8c"
        />
        {[-0.15, 0.15].map((x) => (
          <HarborBlock
            key={x}
            at={[x, 1.15, -0.42]}
            size={[0.07, 0.33, 0.02]}
            color="#e5d7ac"
          />
        ))}
      </group>
    );
  if (id === 'photography')
    return (
      <group>
        <HarborBlock
          at={[-0.15, 1.05, -0.39]}
          size={[0.9, 0.6, 0.04]}
          color="#5c777b"
        />
        {[0, 1, 2].map((i) => (
          <mesh
            key={i}
            position={[0.53, 0.87 + i * 0.18, -0.42]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.045, 0.045, 0.025, 10]} />
            <meshStandardMaterial color="#eadab9" />
          </mesh>
        ))}
      </group>
    );
  if (id === 'frontend')
    return (
      <group>
        <mesh position={[0, 1.75, -0.32]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.035, 6]} />
          <meshStandardMaterial color="#cc9e68" />
        </mesh>
        {[-0.5, -0.3, -0.1, 0.1, 0.3, 0.5].map((x) => (
          <HarborBlock
            key={x}
            at={[x, 1.35, -0.32]}
            size={[0.1, 0.03, 0.025]}
            color="#8d8071"
          />
        ))}
      </group>
    );
  if (id === 'blockchain')
    return (
      <group>
        {[-0.85, 0, 0.85].map((x, i) => (
          <group key={x}>
            {[0, 1, 2, 3].map((j) => (
              <HarborBlock
                key={j}
                at={[x, 0.65 + j * 0.4, -0.42]}
                size={[0.4, 0.1, 0.025]}
                color={i === 1 ? '#cfb8d1' : '#a7c2b8'}
              />
            ))}
          </group>
        ))}
      </group>
    );
  return null;
}
/** Low, walkable paving gives the enlarged harbor a center and six clear exits. */
function HarborCourtyard({ night }: { night: boolean }) {
  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.012, 0.4]}
        receiveShadow
      >
        <circleGeometry args={[2.45, 48]} />
        <meshStandardMaterial color="#ece7d8" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0.4]}>
        <ringGeometry args={[2.4, 2.48, 48]} />
        <meshStandardMaterial color="#94aeb5" roughness={1} />
      </mesh>
      {HARBOR_PLANTERS.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]}>
          <mesh position={[0, 0.17, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.6, 0.55, 0.34, 10]} />
            <meshStandardMaterial color="#c4ad86" />
          </mesh>
          <mesh position={[0, 0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.51, 10]} />
            <meshStandardMaterial color="#81765a" />
          </mesh>
          {[-0.27, 0, 0.27].map((x, j) => (
            <mesh
              key={j}
              position={[x, 0.54 + (j === 1 ? 0.15 : 0), 0]}
              scale={[0.31, 0.36, 0.38]}
              castShadow
            >
              <icosahedronGeometry args={[1, 1]} />
              <meshStandardMaterial
                color={j % 2 ? '#78936b' : '#a1af7c'}
                flatShading
              />
            </mesh>
          ))}
          <HarborBlock
            at={[0, 0.39, 0.44]}
            size={[0.85, 0.1, 0.23]}
            color="#ac845c"
          />
          <mesh position={[0, 0.8, 0]}>
            <sphereGeometry args={[0.09, 8, 6]} />
            <meshStandardMaterial
              color="#efd39a"
              emissive="#f4c371"
              emissiveIntensity={night ? 1 : 0}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Harbor({
  night,
  paused,
  reduced,
  onWalk,
}: {
  night: boolean;
  paused: boolean;
  reduced: boolean;
  onWalk: (p: { x: number; z: number }) => void;
}) {
  return (
    <group>
      <OceanBackdrop night={night} paused={paused} reduced={reduced} />
      <group
        onClick={(event) => {
          if (
            event.delta > 5 ||
            paused ||
            !event.face ||
            event.face.normal.y < 0.5
          )
            return;
          onWalk({ x: event.point.x, z: event.point.z });
          event.stopPropagation();
        }}
      >
        <CanalCity night={night} paused={paused} reduced={reduced} />
        {CITY_TREES.map((tree, i) => <HarborTree key={i} at={[tree.x, tree.y, tree.z]} palm={i < 2} />)}
      </group>
      <HarborCourtyard night={night} />
      <group position={[0, harborHeight({ x: 0, z: CLOCK_Z }), CLOCK_Z]}>
        <CanalHouse color="#e0b785" night={night} paused={paused} tower />
      </group>
      <GroundLabel
        title="SAM / THE CANAL CITY"
        position={[0, 0.035, 5.75]}
        width={3.3}
        dark={night}
      />
      <Boat paused={paused} reduced={reduced} />

    </group>
  );
}
