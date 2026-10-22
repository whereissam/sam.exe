import * as THREE from 'three';
import { useMemo } from 'react';
import { platformEdge } from './platform';
import { radius, stopAngle } from './railway';

function Box({
  at,
  size,
  color,
  rotation = 0,
}: {
  at: [number, number, number];
  size: [number, number, number];
  color: string;
  rotation?: number;
}) {
  return (
    <mesh position={at} rotation={[0, rotation, 0]} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}
function Tree({
  at,
  pink = false,
}: {
  at: [number, number, number];
  pink?: boolean;
}) {
  return (
    <group position={at}>
      <Box at={[0, 0.7, 0]} size={[0.15, 1.4, 0.15]} color="#8b7053" />
      {[
        [-0.3, 1.6, 0],
        [0.3, 1.9, 0.1],
        [0, 2.25, -0.15],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <icosahedronGeometry args={[0.65, 1]} />
          <meshStandardMaterial
            color={
              pink
                ? ['#c999a1', '#ddbab8', '#e5c9bc'][i]
                : ['#71886b', '#899b74', '#a0ab7c'][i]
            }
          />
        </mesh>
      ))}
    </group>
  );
}
function Building({
  x,
  color,
  height,
  city,
}: {
  x: number;
  color: string;
  height: number;
  city: string;
}) {
  const tokyo = city === 'Tokyo',
    ny = city === 'New York';
  return (
    <group position={[x, 0, -5.6]}>
      <Box at={[0, height / 2, 0]} size={[2.15, height, 1.65]} color={color} />
      <Box
        at={[0, height + 0.08, 0]}
        size={[2.4, 0.18, 1.9]}
        color={tokyo ? '#576e64' : '#d4c5a6'}
      />
      {!ny && (
        <mesh
          position={[0, height + 0.3, 0]}
          rotation={[0, Math.PI / 4, 0]}
          castShadow
        >
          <coneGeometry args={[1.65, 0.65, 4]} />
          <meshStandardMaterial color={tokyo ? '#536c62' : '#ac7963'} />
        </mesh>
      )}
      <Box at={[0, 0.55, 0.85]} size={[0.48, 1.1, 0.08]} color="#506960" />
      {Array.from({ length: Math.max(1, Math.floor(height) - 1) }, (_, floor) =>
        [-0.65, 0, 0.65].map((wx, j) => (
          <group key={floor + ':' + j}>
            <Box
              at={[wx, 1.5 + floor * 0.8, 0.85]}
              size={[0.37, 0.47, 0.045]}
              color="#516e68"
            />
            <Box
              at={[wx, 1.25 + floor * 0.8, 0.92]}
              size={[0.48, 0.07, 0.18]}
              color="#e2d3ad"
            />
            <Box
              at={[wx, 1.5 + floor * 0.8, 0.89]}
              size={[0.025, 0.47, 0.025]}
              color="#d5c9a6"
            />
          </group>
        )),
      )}
      <Box
        at={[0, 1.15, 1.1]}
        size={[1.95, 0.09, 0.65]}
        color={tokyo ? '#a65f4e' : '#6f8d7d'}
      />
      {ny &&
        [0, 1, 2].map((i) => (
          <group key={i}>
            <Box
              at={[1.16, 0.8 + i * 0.9, 0.2]}
              size={[0.3, 0.06, 1]}
              color="#655f52"
            />
            <Box
              at={[1.2, 1.15 + i * 0.9, 0.2]}
              size={[0.04, 0.65, 1]}
              color="#655f52"
            />
          </group>
        ))}
    </group>
  );
}
export function CityQuarter({
  city,
  selected,
  count,
}: {
  count: number;
  city: string;
  selected: boolean;
}) {
  const palette =
    city === 'Tokyo'
      ? ['#c9b89d', '#b7876d']
      : city === 'Berlin'
        ? ['#d7bd96', '#b8b19a']
        : city === 'Taipei'
          ? ['#b2bc9f', '#d0ad83']
          : ['#a87965', '#bca18a'];
  return (
    <group>
      <Box at={[0, -0.24, -4.7]} size={[12, 0.42, 5.3]} color="#b6a58a" />
      <Box at={[0, -0.015, -4.7]} size={[11.9, 0.04, 5.2]} color="#d6ccb1" />
      {[-4, 4].map((x, i) => (
        <Building
          key={x}
          x={x}
          color={palette[i]}
          height={city === 'New York' ? 4.2 : 2.8}
          city={city}
        />
      ))}
      {[-5.45, 5.45].map((x) => (
        <Tree key={x} at={[x, 0, -3.5]} pink={city === 'Tokyo'} />
      ))}
      {/* A narrow service awning leaves the walking area and landmark visible. */}
      {[-4.1, -1.9].map((x) => (
        <Box
          key={x}
          at={[x, 1.6, -3.5]}
          size={[0.09, 3.2, 0.09]}
          color="#59796b"
        />
      ))}
      <Box at={[-3, 3.2, -2.95]} size={[2.65, 0.12, 1.5]} color={palette[1]} />
      <Box at={[-3, 3.05, -2.2]} size={[2.65, 0.25, 0.07]} color="#eadcbb" />
      {[
        -5, -4.5, -4, -3.5, -3, -2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2,
        2.5, 3, 3.5, 4, 4.5, 5,
      ].map((x) => (
        <Box
          key={x}
          at={[x, 0.08, platformEdge(x, count) - 0.28]}
          size={[0.23, 0.03, 0.14]}
          color={selected ? '#d0a35b' : '#eee1b7'}
        />
      ))}
      <Box at={[4.6, 0.2, -0.4]} size={[1, 0.4, 0.55]} color="#b49571" />
      {[4.3, 4.6, 4.9].map((x) => (
        <mesh key={x} position={[x, 0.55, -0.4]}>
          <icosahedronGeometry args={[0.24, 0]} />
          <meshStandardMaterial color="#8e9f70" />
        </mesh>
      ))}
    </group>
  );
}
function LakeIsland() {
  const shoreline = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-3.4, 0.2);
    shape.bezierCurveTo(-3.8, 1.5, -1.7, 2.1, -0.5, 1.6);
    shape.bezierCurveTo(0.7, 1.15, 2.3, 1.8, 3, 0.6);
    shape.bezierCurveTo(3.8, -0.7, 1.4, -1.8, 0.3, -1.4);
    shape.bezierCurveTo(-1, -0.9, -3.1, -1.5, -3.4, 0.2);
    shape.closePath();
    return shape;
  }, []);
  return (
    <group position={[-2, 0, -1]}>
      <mesh
        position={[0, -0.35, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <extrudeGeometry
          args={[
            shoreline,
            { depth: 0.42, bevelEnabled: false, curveSegments: 12 },
          ]}
        />
        <meshStandardMaterial color="#c4bea0" roughness={1} />
      </mesh>
      <mesh
        position={[0, 0.075, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[0.9, 0.88, 1]}
        receiveShadow
      >
        <shapeGeometry args={[shoreline, 12]} />
        <meshStandardMaterial color="#a5af89" roughness={1} />
      </mesh>
      <group position={[-1.6, 0.075, -0.3]} scale={0.85}>
        <Tree at={[0, 0, 0]} />
      </group>
      <group position={[-0.2, 0.075, 0.1]} scale={1.05}>
        <Tree at={[0, 0, 0]} />
      </group>
      <group position={[1.5, 0.075, -0.25]} scale={0.72}>
        <Tree at={[0, 0, 0]} />
      </group>
    </group>
  );
}
export function Landscape({ count, city }: { count: number; city: number }) {
  const r = radius(count);
  const route = useMemo(() => {
    const end = stopAngle(city, count);
    return new THREE.CatmullRomCurve3(
      Array.from({ length: 80 }, (_, i) => {
        const a = -Math.PI / 2 + ((end + Math.PI / 2) * i) / 79;
        return new THREE.Vector3(r * Math.cos(a), 0.025, r * Math.sin(a));
      }),
    );
  }, [r, city, count]);
  return (
    <group position={[0, 0, r + 2.8]}>
      {/* A continuous raised railway garden anchors the formerly floating track. */}
      <mesh position={[0, -0.85, 0]} receiveShadow>
        <cylinderGeometry args={[r + 1, r + 0.8, 0.85, 96]} />
        <meshStandardMaterial color="#a99c7c" />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.18, 0]}
        receiveShadow
      >
        <ringGeometry args={[r - 2.2, r + 1, 96]} />
        <meshStandardMaterial color="#b2b693" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.25, 0]}>
        <circleGeometry args={[r - 2.15, 96]} />
        <meshStandardMaterial color="#7baba3" roughness={0.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.21, 0]}>
        <ringGeometry args={[r - 2.4, r - 2.15, 96]} />
        <meshStandardMaterial color="#ccd1ad" />
      </mesh>
      <mesh>
        <tubeGeometry args={[route, 80, 0.035, 5, false]} />
        <meshBasicMaterial color="#e6b65b" />
      </mesh>
      <LakeIsland />
      {/* Trees are grouped along the shore, away from station sightlines. */}
      {[0.35, 0.5, 0.65, 2.8, 2.95, 3.1, 4.1, 4.25].map((a, i) => (
        <group
          key={a}
          position={[(r - 2.7) * Math.cos(a), -0.1, (r - 2.7) * Math.sin(a)]}
        >
          <Tree at={[0, 0, 0]} />
          <mesh position={[0.6, 0, 0.3]} scale={[1.2, 0.5, 0.8]}>
            <icosahedronGeometry args={[0.55, 0]} />
            <meshStandardMaterial color={i % 2 ? '#bdb9a1' : '#a8ad98'} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Depot() {
  return (
    <group>
      <Box at={[0, -0.24, -5.2]} size={[12, 0.42, 3.6]} color="#b6a58a" />
      <Box at={[0, 1.2, -5.3]} size={[7.5, 2.4, 1.8]} color="#cfb68a" />
      <Box at={[0, 2.5, -5.3]} size={[8, 0.18, 2.3]} color="#567568" />
      <Box at={[0, 2.7, -5.3]} size={[7, 0.22, 1.7]} color="#688777" />
      {[-2.8, -1.4, 0, 1.4, 2.8].map((x) => (
        <group key={x}>
          <Box at={[x, 1.3, -4.37]} size={[0.8, 1.3, 0.06]} color="#55756b" />
          <Box at={[x, 1.3, -4.32]} size={[0.04, 1.3, 0.03]} color="#e1cf9f" />
          <Box at={[x, 0.65, -4.3]} size={[0.95, 0.08, 0.2]} color="#e1cf9f" />
        </group>
      ))}
      <Tree at={[-5, 0, -5]} />
      <Tree at={[5, 0, -5]} />
    </group>
  );
}
