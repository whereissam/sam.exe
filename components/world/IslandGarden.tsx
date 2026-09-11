'use client';
import { playSound } from '../audio/sound';
import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GroundLabel } from './GroundLabel';
import { GARDEN_SPOTS, harborHeight } from './island-layout';

type Props = { paused: boolean; reduced: boolean; night: boolean };
function Windmill({ paused, reduced, night }: Props) {
  const [turning, setTurning] = useState(false);
  const blades = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (reduced && blades.current)
      blades.current.rotation.z = turning ? Math.PI / 4 : 0;
    invalidate();
  }, [turning, reduced, invalidate]);
  useFrame((_, dt) => {
    if (turning && !paused && !reduced && blades.current) {
      blades.current.rotation.z += Math.min(dt, 0.05) * 1.4;
      invalidate();
    }
  });
  const toggle = () => {
    if (!paused) {
      playSound('windmill');
      setTurning((v) => !v);
    }
  };
  return (
    <group
      position={[
        GARDEN_SPOTS.windmill.x,
        harborHeight(GARDEN_SPOTS.windmill),
        GARDEN_SPOTS.windmill.z,
      ]}
      scale={0.65}
    >
      <group
        onClick={(event) => {
          if (event.delta > 5) return;
          event.stopPropagation();
          toggle();
        }}
      >
        <mesh position={[0, 1, 0]} castShadow>
          <cylinderGeometry args={[0.38, 0.7, 2, 8]} />
          <meshStandardMaterial color="#ece0bb" />
        </mesh>
        <mesh position={[0, 2.2, 0]} castShadow>
          <coneGeometry args={[0.65, 0.65, 6]} />
          <meshStandardMaterial color="#a0ad7a" />
        </mesh>
        <group ref={blades} position={[0, 1.9, 0.5]}>
          {[0, 1, 2, 3].map((i) => (
            <group key={i} rotation={[0, 0, (i * Math.PI) / 2]}>
              <mesh position={[0, 0.62, 0]} castShadow>
                <boxGeometry args={[0.18, 1.3, 0.06]} />
                <meshStandardMaterial color="#957644" />
              </mesh>
              <mesh position={[0.18, 0.78, 0]} castShadow>
                <boxGeometry args={[0.3, 0.74, 0.04]} />
                <meshStandardMaterial color="#fff0c5" />
              </mesh>
            </group>
          ))}
          <mesh>
            <sphereGeometry args={[0.15, 12, 8]} />
            <meshStandardMaterial color="#d1ac63" />
          </mesh>
        </group>
      </group>
      <GroundLabel
        title={turning ? 'Windmill · pause' : 'Windmill · spin'}
        position={[0, 0.06, 1.3]}
        width={2.4}
        onClick={toggle}
        dark={night}
      />
    </group>
  );
}
function Pond({ paused, reduced, night }: Props) {
  const [feeding, setFeeding] = useState(false);
  const fish = useRef<THREE.Group>(null),
    phase = useRef(0);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!feeding) return;
    invalidate();
    const timer = setTimeout(() => {
      setFeeding(false);
      invalidate();
    }, 4500);
    return () => clearTimeout(timer);
  }, [feeding, invalidate]);
  useFrame((_, dt) => {
    if (feeding && !paused && fish.current) {
      if (!reduced) phase.current += Math.min(dt, 0.05) * 1.6;
      fish.current.rotation.y = phase.current;
      invalidate();
    }
  });
  const feed = () => {
    if (!paused) {
      playSound('splash');
      setFeeding(true);
    }
  };
  return (
    <group
      position={[
        GARDEN_SPOTS.pond.x,
        harborHeight(GARDEN_SPOTS.pond),
        GARDEN_SPOTS.pond.z,
      ]}
      scale={0.55}
    >
      <group
        onClick={(event) => {
          if (event.delta > 5) return;
          event.stopPropagation();
          feed();
        }}
      >
        <mesh position={[0, 0.025, 0]} scale={[1, 1, 0.85]}>
          <cylinderGeometry args={[1.3, 1.4, 0.12, 12]} />
          <meshStandardMaterial color="#a6a47f" />
        </mesh>
        <mesh
          position={[0, 0.09, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[1, 0.85, 1]}
        >
          <circleGeometry args={[1.17, 32]} />
          <meshStandardMaterial
            color={night ? '#567f89' : '#87c7bf'}
            metalness={0.15}
            roughness={0.25}
          />
        </mesh>
        <group ref={fish} position={[0, 0.105, 0]}>
          {[0, 1, 2].map((i) => (
            <group key={i} rotation={[0, (i * Math.PI * 2) / 3, 0]}>
              <mesh position={[0.58, 0, 0]} scale={[0.25, 0.025, 0.08]}>
                <sphereGeometry args={[1, 10, 6]} />
                <meshBasicMaterial color={i === 1 ? '#fff1ca' : '#d98d52'} />
              </mesh>
            </group>
          ))}
        </group>
        {feeding &&
          [0, 1, 2, 3, 4].map((i) => (
            <mesh
              key={i}
              position={[Math.sin(i * 2) * 0.3, 0.13, Math.cos(i * 2) * 0.3]}
            >
              <boxGeometry args={[0.06, 0.04, 0.06]} />
              <meshStandardMaterial color="#f0d28b" />
            </mesh>
          ))}
        {[0, 1, 2].map((i) => (
          <mesh
            key={i}
            position={[-0.5 + i * 0.23, 0.12, -0.55]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[0.18, 7]} />
            <meshStandardMaterial color="#6f9566" />
          </mesh>
        ))}
      </group>
      <GroundLabel
        title={feeding ? 'A little fish feast' : 'Koi pond · feed'}
        position={[0, 0.06, 1.65]}
        width={2.5}
        onClick={feed}
        dark={night}
      />
    </group>
  );
}
function Campfire({ paused, reduced, night }: Props) {
  const [lit, setLit] = useState(night),
    flame = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [lit, invalidate]);
  useFrame(({ clock }) => {
    if (lit && !paused && !reduced && flame.current) {
      flame.current.scale.y = 0.9 + Math.sin(clock.elapsedTime * 7) * 0.1;
      invalidate();
    }
  });
  const toggle = () => {
    if (!paused) {
      playSound('fire');
      setLit((v) => !v);
    }
  };
  return (
    <group
      position={[
        GARDEN_SPOTS.campfire.x,
        harborHeight(GARDEN_SPOTS.campfire),
        GARDEN_SPOTS.campfire.z,
      ]}
    >
      <group
        onClick={(event) => {
          if (event.delta > 5) return;
          event.stopPropagation();
          toggle();
        }}
      >
        {[0, 1, 2].map((i) => (
          <mesh
            key={i}
            position={[0, 0.12, 0]}
            rotation={[Math.PI / 2, 0, (i * Math.PI) / 3]}
          >
            <cylinderGeometry args={[0.1, 0.1, 0.8, 7]} />
            <meshStandardMaterial color="#8b6541" />
          </mesh>
        ))}
        {lit && (
          <group ref={flame} position={[0, 0.13, 0]}>
            <mesh position={[0, 0.25, 0]}>
              <coneGeometry args={[0.25, 0.65, 7]} />
              <meshBasicMaterial color="#eba25b" />
            </mesh>
            <mesh position={[0, 0.15, 0.04]}>
              <coneGeometry args={[0.15, 0.42, 6]} />
              <meshBasicMaterial color="#ffe3a1" />
            </mesh>
            <pointLight color="#ffc078" intensity={2} distance={4} />
          </group>
        )}
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.55, 0.6, 0.1, 10]} />
          <meshStandardMaterial color="#b6aa8a" />
        </mesh>
      </group>
      <GroundLabel
        title={lit ? 'Campfire · lights out' : 'Campfire · light it'}
        position={[0, 0.055, 1.05]}
        width={2.5}
        onClick={toggle}
        dark={night}
      />
    </group>
  );
}
export function IslandGarden(props: Props) {
  return (
    <>
      <Windmill {...props} />
      <Pond {...props} />
      <Campfire {...props} />
      {Array.from({ length: 20 }, (_, i) => {
        const a = i * 2.399,
          r = 0.4 + (i % 5) * 0.23;
        return (
          <group
            key={i}
            position={[
              12.8 + Math.cos(a) * r * 0.5,
              harborHeight({ x: 12.8, z: -10.8 }),
              -10.8 + Math.sin(a) * r * 0.5,
            ]}
          >
            <mesh position={[0, 0.18, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.35, 4]} />
              <meshStandardMaterial color="#7f9b62" />
            </mesh>
            <mesh position={[0, 0.35, 0]}>
              <icosahedronGeometry args={[0.085, 0]} />
              <meshStandardMaterial color={i % 3 ? '#f7e9b7' : '#ddae98'} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}
