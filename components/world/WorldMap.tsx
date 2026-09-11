'use client';
import { useMemo } from 'react';
import * as THREE from 'three';
import outlines from './world-land.json';

/** Natural Earth coastlines extruded into a small, north-up tabletop atlas. */
export function WorldMap({ night }: { night: boolean }) {
  const shapes = useMemo(
    () =>
      outlines.map((rings) => {
        const shape = new THREE.Shape(
          rings[0].map(([lon, lat]) => new THREE.Vector2(lon / 9, lat / 9)),
        );
        shape.holes = rings
          .slice(1)
          .map(
            (ring) =>
              new THREE.Path(
                ring.map(([lon, lat]) => new THREE.Vector2(lon / 9, lat / 9)),
              ),
          );
        return shape;
      }),
    [],
  );
  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.015, 0]}
        receiveShadow
      >
        <extrudeGeometry
          args={[
            shapes,
            { depth: 0.13, bevelEnabled: false, curveSegments: 1 },
          ]}
        />
        <meshStandardMaterial
          color={night ? '#71928d' : '#b7cb98'}
          roughness={1}
        />
      </mesh>
      {[-120, -60, 0, 60, 120].map((lon) => (
        <mesh
          key={lon}
          position={[lon / 9, 0.006, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.018, 20]} />
          <meshBasicMaterial
            color={night ? '#70878c' : '#9cbdb3'}
            transparent
            opacity={0.3}
          />
        </mesh>
      ))}
      {[-30, 0, 30, 60].map((lat) => (
        <mesh
          key={lat}
          position={[0, 0.007, -lat / 9]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[42, 0.018]} />
          <meshBasicMaterial
            color={night ? '#70878c' : '#9cbdb3'}
            transparent
            opacity={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}
