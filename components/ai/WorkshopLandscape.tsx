'use client';
import { RoundedBox } from '@react-three/drei';
type Vec = [number, number, number];
function Part({ at, size, color }: { at: Vec; size: Vec; color: string }) {
  return (
    <RoundedBox
      args={size}
      radius={Math.min(...size) * 0.14}
      smoothness={1}
      position={at}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={color} roughness={0.85} />
    </RoundedBox>
  );
}
export default function WorkshopLandscape() {
  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.65, 0]}
        receiveShadow
      >
        <planeGeometry args={[1000, 1000]} />
        <shadowMaterial transparent opacity={0.16} depthWrite={false} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <Part
          key={i}
          at={[0, -0.48 + i * 0.12, 6.8 - i * 0.35]}
          size={[2.4 - i * 0.15, 0.15, 0.6]}
          color={['#9e9b87', '#b6ac92', '#c3b79a'][i]}
        />
      ))}
      <mesh position={[0, -0.48, 0]}>
        <cylinderGeometry args={[6.3, 6.5, 0.18, 80]} />
        <meshStandardMaterial color="#8a978a" roughness={0.8} />
      </mesh>
      {/* Receiving conveyor, positioned behind the walkable grid. */}
      <group position={[-0.65, 0, -4.8]}>
        {[-0.65, 0.65].map((x) => (
          <Part
            key={x}
            at={[x, 0.35, 0]}
            size={[0.12, 0.7, 0.65]}
            color="#637b73"
          />
        ))}
        {[-0.4, 0.4].map((z) => (
          <Part
            key={z}
            at={[0, 0.7, z]}
            size={[2.05, 0.14, 0.12]}
            color="#9d9f8a"
          />
        ))}
        {Array.from({ length: 10 }, (_, i) => (
          <mesh
            key={i}
            position={[-0.85 + i * 0.19, 0.7, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.07, 0.07, 0.7, 10]} />
            <meshStandardMaterial
              color={i % 2 ? '#87958c' : '#abb6a6'}
              metalness={0.25}
              roughness={0.5}
            />
          </mesh>
        ))}
        <Part at={[-0.5, 0.92, 0]} size={[0.42, 0.32, 0.4]} color="#ac9bbb" />
        <Part at={[-0.5, 1.09, 0]} size={[0.08, 0.015, 0.4]} color="#f0dfb3" />
        <Part at={[0.15, 1, 0]} size={[0.5, 0.5, 0.4]} color="#90a791" />
        <Part at={[0.15, 1.255, 0]} size={[0.08, 0.015, 0.4]} color="#f0dfb3" />
        <Part at={[0.85, 1.1, 0.3]} size={[0.2, 0.4, 0.1]} color="#49675d" />
      </group>
      {/* Ground anchors and brass fastening heads make the platform feel built. */}
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i * Math.PI) / 12;
        return (
          <mesh
            key={i}
            position={[5.75 * Math.cos(a), 0.055, 5.75 * Math.sin(a)]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[0.035, 8]} />
            <meshStandardMaterial
              color="#80765e"
              metalness={0.5}
              roughness={0.4}
            />
          </mesh>
        );
      })}
    </group>
  );
}
