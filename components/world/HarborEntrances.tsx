'use client';

import { useRef, useState, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { HarborBlock as Block } from './Harbor';
import { GroundLabel } from './GroundLabel';
import { HARBOR_ENTRANCES } from './island-layout';
import type { Point } from './movement';

type Entrance = (typeof HARBOR_ENTRANCES)[number];
type Props = {
  player: RefObject<Point>;
  manualMovement: RefObject<boolean>;
  paused: boolean;
  night: boolean;
  onEnterRoom: () => void;
};

/** A little inhabited facade, with a clear threshold and a destination-specific roof. */
function EntranceHouse({
  entrance: e,
  player,
  manualMovement,
  paused,
  night,
  onEnter,
}: Omit<Props, 'onEnterRoom'> & { entrance: Entrance; onEnter: () => void }) {
  const [near, setNear] = useState(false);
  const [hovered, setHovered] = useState(false);
  const entered = useRef(false);
  useFrame(() => {
    if (paused) return;
    const distance = Math.hypot(player.current.x - e.x, player.current.z - e.z);
    const nextNear = distance < 1.35;
    if (nextNear !== near) setNear(nextNear);
    const dx = player.current.x - e.x,
      dz = player.current.z - e.z;
    const across = dx * Math.cos(e.rotation) - dz * Math.sin(e.rotation);
    const forward = dx * Math.sin(e.rotation) + dz * Math.cos(e.rotation);
    // Trigger on the porch, before the solid jambs narrow the approach.
    if (
      Math.abs(across) < 0.42 &&
      forward >= -0.1 &&
      forward < 0.85 &&
      manualMovement.current &&
      !entered.current
    ) {
      entered.current = true;
      onEnter();
    }
    if (distance > 1.1) entered.current = false;
  });
  const active = near || hovered;
  const approach = () => {
    if (!paused) onEnter();
  };
  return (
    <group position={[e.x, 0, e.z]} rotation={[0, e.rotation, 0]}>
      <group
        onClick={(event) => {
          if (event.delta > 5 || paused) return;
          event.stopPropagation();
          approach();
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        {/* A full cottage volume: two front wings leave an open, reachable porch. */}
        <Block at={[0, 0.08, -0.65]} size={[2.65, 0.16, 1.9]} color="#baab8e" />
        <Block at={[0, 0.055, 0.48]} size={[1.2, 0.11, 0.42]} color="#ddcbaa" />
        <Block at={[0, 0.95, -1.43]} size={[2.4, 1.74, 0.18]} color="#e6d7b7" />
        {[-1, 1].map((side) => (
          <group key={side}>
            <Block
              at={[side * 0.86, 0.95, -0.65]}
              size={[0.68, 1.74, 1.4]}
              color="#e6d7b7"
            />
            <Block
              at={[side * 1.18, 0.3, -0.65]}
              size={[0.12, 0.3, 1.5]}
              color="#cbb58f"
            />
            <Block
              at={[side * 0.87, 1.12, 0.07]}
              size={[0.52, 0.7, 0.09]}
              color="#faf0d3"
            />
            <mesh position={[side * 0.87, 1.12, 0.125]}>
              <boxGeometry args={[0.39, 0.56, 0.025]} />
              <meshStandardMaterial
                color={night ? '#f7dc9e' : '#8db7b2'}
                emissive="#e5b15d"
                emissiveIntensity={night ? 0.65 : 0}
              />
            </mesh>
            <Block
              at={[side * 0.87, 1.12, 0.15]}
              size={[0.035, 0.57, 0.03]}
              color="#f4e6c6"
            />
            <Block
              at={[side * 0.87, 1.12, 0.15]}
              size={[0.4, 0.035, 0.03]}
              color="#f4e6c6"
            />
            <Block
              at={[side * 0.87, 0.72, 0.18]}
              size={[0.57, 0.16, 0.24]}
              color="#a77d56"
            />
            {[-0.16, 0, 0.16].map((x, i) => (
              <mesh
                key={i}
                position={[side * 0.87 + x, 0.83, 0.18]}
                scale={[0.13, 0.12, 0.12]}
                castShadow
              >
                <icosahedronGeometry args={[1, 0]} />
                <meshStandardMaterial
                  color={i === 1 ? '#d9b28c' : '#8b9d69'}
                  flatShading
                />
              </mesh>
            ))}
          </group>
        ))}
        <Block at={[0, 1.7, -0.64]} size={[1.05, 0.25, 1.4]} color="#e6d7b7" />
        <Block at={[0, 0.88, -0.35]} size={[0.89, 1.5, 0.1]} color="#587e70" />
        <Block
          at={[0, 1.22, -0.285]}
          size={[0.55, 0.43, 0.035]}
          color={night ? '#ecd39d' : '#a8c8bd'}
        />
        <Block
          at={[0, 0.49, -0.28]}
          size={[0.61, 0.43, 0.03]}
          color="#6f9481"
        />
        <mesh position={[0.31, 0.85, -0.23]}>
          <sphereGeometry args={[0.045, 10, 8]} />
          <meshStandardMaterial
            color="#d7b775"
            metalness={0.4}
            roughness={0.4}
          />
        </mesh>
        {/* Front and rear gables close the roof volume; the ridge runs front to back. */}
        {[0.06, -1.48].map((z) => (
          <mesh key={z} position={[0, 1.82, z]}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[
                  new Float32Array([-1.2, 0, 0, 1.2, 0, 0, 0, 0.65, 0]),
                  3,
                ]}
              />
            </bufferGeometry>
            <meshStandardMaterial color="#e6d7b7" side={2} />
          </mesh>
        ))}
        {[-1, 1].map((side) => (
          <group key={side}>
            <Block
              at={[side * 0.65, 2.13, -0.7]}
              size={[1.53, 0.13, 1.95]}
              rotation={[0, 0, -side * 0.46]}
              color="#b57d59"
            />
            <Block
              at={[side * 1.32, 1.8, -0.7]}
              size={[0.12, 0.16, 2]}
              color="#e9d8b6"
            />
            {[-1.42, -1.02, -0.62, -0.22, 0.18].map((z) => (
              <Block
                key={z}
                at={[side * 0.65, 2.2, z]}
                size={[1.5, 0.025, 0.025]}
                rotation={[0, 0, -side * 0.46]}
                color="#a36d4e"
              />
            ))}
          </group>
        ))}
        <Block at={[0, 2.49, -0.7]} size={[0.14, 0.13, 2]} color="#a36d4e" />
        <Block
          at={[0.76, 2.35, -1.02]}
          size={[0.25, 0.85, 0.28]}
          color="#ac8064"
        />
        <Block
          at={[0.76, 2.79, -1.02]}
          size={[0.34, 0.09, 0.37]}
          color="#e5cfac"
        />
        {/* Small porch canopy and a warm wall lamp, below the main roof. */}
        <Block
          at={[0, 1.67, 0.24]}
          size={[1.12, 0.1, 0.58]}
          rotation={[0.12, 0, 0]}
          color="#78907b"
        />
        <mesh position={[0.51, 1.36, 0.18]}>
          <boxGeometry args={[0.12, 0.21, 0.15]} />
          <meshStandardMaterial
            color="#f5db9c"
            emissive="#edb76a"
            emissiveIntensity={night ? 1 : 0.15}
          />
        </mesh>
        <Block
          at={[0.51, 1.49, 0.18]}
          size={[0.17, 0.045, 0.18]}
          color="#655e49"
        />
      </group>
      <GroundLabel
        title={e.label}
        position={[0, 0.105, 0.65]}
        width={1.65}
        dark={night}
        onClick={approach}
      />
      {active && !paused && (
        <Html
          center
          position={[0, 3.05, 0]}
          zIndexRange={[20, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <span className="world-hint is-near">{`Enter · ${e.label}`}</span>
        </Html>
      )}
      <Html center position={[0, 1.1, 0]} zIndexRange={[4, 0]}>
        <button
          className="ground-key-target"
          disabled={paused}
          onClick={onEnter}
        >
          Enter {e.label}
        </button>
      </Html>
    </group>
  );
}

export function HarborEntrances(props: Props) {
  return (
    <>
      {HARBOR_ENTRANCES.map((entrance) => (
        <EntranceHouse
          key={entrance.id}
          {...props}
          entrance={entrance}
          onEnter={() => {
            if (props.paused) return;
            props.onEnterRoom();
          }}
        />
      ))}
    </>
  );
}
