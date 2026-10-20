'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { harborIslands } from './island-layout';

export const oceanHorizon = { day: '#d3dfd2', night: '#283e48' };

const vertexShader = `
  varying vec2 waterPosition;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    waterPosition = world.xz;
    gl_Position = projectionMatrix * viewMatrix * world;
    // This is scenery behind the world, not an occluding ground surface.
    // Keep it inside the depth range at grazing orthographic camera angles.
    gl_Position.z = gl_Position.w * 0.9999;
  }
`;

const fragmentShader = `
  uniform float time;
  uniform vec3 deepColor;
  uniform vec3 shallowColor;
  uniform vec3 horizonColor;
  uniform vec2 islands[7];
  varying vec2 waterPosition;

  void main() {
    vec2 p = waterPosition;
    // Large, low-contrast changes in depth; no repeated rings or foam stripes.
    float swell = sin(p.x * 0.075 + sin(p.y * 0.09) + time * 0.025)
                * cos(p.y * 0.065 - time * 0.02);
    float depth = 0.45 + swell * 0.24;
    vec3 color = mix(deepColor, shallowColor, depth);
    float shadow = 0.0;
    for (int i = 0; i < 7; i++) {
      // Soft silhouettes follow the islands and the scene's upper-left sun.
      float d = length((p - islands[i] - vec2(2.5, -2.5)) / vec2(1.2, 1.0));
      shadow = max(shadow, 1.0 - smoothstep(1.0, 7.5, d));
    }
    color *= 1.0 - shadow * 0.12;

    // The sea dissolves into the same haze as the sky before its mesh ends.
    // World-space distance keeps the composition stable as the visitor orbits.
    float haze = smoothstep(22.0, 90.0, length(p));
    color = mix(color, horizonColor, haze);
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

export function OceanBackdrop({
  night,
  paused,
  reduced,
}: {
  night: boolean;
  paused: boolean;
  reduced: boolean;
}) {
  const elapsed = useRef(0);
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      deepColor: { value: new THREE.Color(night ? '#284b55' : '#78aaa7') },
      shallowColor: { value: new THREE.Color(night ? '#385b61' : '#cbd5b9') },
      horizonColor: {
        value: new THREE.Color(night ? oceanHorizon.night : oceanHorizon.day),
      },
      islands: {
        value: harborIslands.map(({ x, z }) => new THREE.Vector2(x, z)),
      },
    }),
    [night],
  );

  useFrame((_, delta) => {
    if (!paused && !reduced) elapsed.current += Math.min(delta, 0.05);
    if (material.current)
      material.current.uniforms.time.value = elapsed.current;
  });

  return (
    <mesh
      position={[0, -5.04, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={-1}
      frustumCulled={false}
    >
      <planeGeometry args={[10000, 10000]} />
      <shaderMaterial
        ref={material}
        depthWrite={false}
        toneMapped={false}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}
