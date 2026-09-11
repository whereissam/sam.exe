'use client';
import { playSound } from '../audio/sound';
import { useRef, useState, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { harborHeight } from './island-layout';
import { GroundLabel } from './GroundLabel';
import type { Mesh, MeshBasicMaterial } from 'three';
import type { Point } from './movement';
export const sparks = [
  { id: 'curiosity', name: 'Curiosity', x: -12, z: -5.3 },
  { id: 'craft', name: 'Craft', x: 12, z: 10.3 },
  { id: 'wander', name: 'Wander', x: 0, z: 16.8 },
];
export function CollectibleSparks({
  player,
  collected,
  onCollect,
  paused,
  reduced,
}: {
  player: RefObject<Point>;
  collected: string[];
  onCollect: (id: string) => void;
  paused: boolean;
  reduced: boolean;
}) {
  const meshes = useRef<(Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    if (paused) return;
    sparks.forEach((spark, index) => {
      if (collected.includes(spark.id)) return;
      if (
        Math.hypot(player.current.x - spark.x, player.current.z - spark.z) <
        0.65
      )
        onCollect(spark.id);
      const mesh = meshes.current[index];
      if (mesh && !reduced) {
        mesh.rotation.y = clock.elapsedTime * 0.65;
        mesh.position.y =
          0.6 + Math.sin(clock.elapsedTime * 1.6 + index) * 0.08;
      }
    });
  });
  return (
    <>
      {sparks.map((spark, index) =>
        collected.includes(spark.id) ? null : (
          <group
            key={spark.id}
            position={[spark.x, harborHeight(spark), spark.z]}
          >
            <mesh
              ref={(element) => {
                meshes.current[index] = element;
              }}
              position={[0, 0.6, 0]}
              onClick={(event) => {
                event.stopPropagation();
                if (!paused) onCollect(spark.id);
              }}
            >
              <octahedronGeometry args={[0.17]} />
              <meshStandardMaterial
                color="#ffd599"
                emissive="#ffc16b"
                emissiveIntensity={1.8}
              />
            </mesh>
            <GroundLabel
              title={`Collect ${spark.name}`}
              position={[0, 0.14, 0.4]}
              width={1.6}
              onClick={() => {
                if (!paused) onCollect(spark.id);
              }}
            />
          </group>
        ),
      )}
    </>
  );
}
export function Beacon({
  paused,
  reduced,
  complete,
  onPulse,
}: {
  paused: boolean;
  reduced: boolean;
  complete: boolean;
  onPulse: () => void;
}) {
  const [lit, setLit] = useState(false);
  const elapsed = useRef(2);
  const pulse = useRef<Mesh>(null);
  const { invalidate } = useThree();
  const color = complete ? '#b7f5c4' : lit ? '#ffba89' : '#d7a0ff';
  function activate() {
    if (paused) return;
    playSound('discover');
    setLit((v) => !v);
    elapsed.current = 0;
    onPulse();
    invalidate();
  }
  useFrame((_, dt) => {
    if (!pulse.current || paused) return;
    if (reduced) {
      pulse.current.visible = false;
      return;
    }
    elapsed.current += Math.min(dt, 0.05);
    const t = elapsed.current / 1.2;
    pulse.current.visible = t < 1;
    if (t < 1) {
      pulse.current.scale.setScalar(0.3 + t * 2.4);
      (pulse.current.material as MeshBasicMaterial).opacity = (1 - t) * 0.65;
      invalidate();
    }
  });
  return (
    <group>
      <mesh
        position={[0, 0.4, 0]}
        onClick={(event) => {
          event.stopPropagation();
          activate();
        }}
      >
        <icosahedronGeometry args={[0.25, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={lit ? 2 : 1}
        />
      </mesh>
      <mesh
        ref={pulse}
        visible={false}
        position={[0, 0.11, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.95, 1, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      <GroundLabel
        title="Beacon · pulse"
        position={[0, 0.14, 0.5]}
        width={1.65}
        onClick={activate}
      />
    </group>
  );
}
