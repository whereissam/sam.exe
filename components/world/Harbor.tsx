'use client';
import { playSound } from '../audio/sound';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { District } from './districts';
import {
  harborIslands,
  harborBridges,
  harborHeight,
  SCENERY_SPREAD,
  CLOCK_Z,
} from './island-layout';
import { GroundLabel } from './GroundLabel';

type Vec = [number, number, number];
const colors = [
  '#8caea0',
  '#dda477',
  '#9cacca',
  '#d8ae97',
  '#b9bf91',
  '#78aaa9',
];
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
function CanalHouse({
  color,
  night,
  tower = false,
}: {
  color: string;
  night: boolean;
  tower?: boolean;
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
          {tower && (
            <group position={[0, 2.7, 0.625]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.32, 0.32, 0.045, 24]} />
                <meshStandardMaterial color="#f6e6bc" />
              </mesh>
              <HarborBlock
                at={[0, 0.07, 0.03]}
                size={[0.035, 0.2, 0.025]}
                color="#675334"
              />
              <HarborBlock
                at={[0.08, 0, 0.031]}
                size={[0.19, 0.035, 0.025]}
                color="#675334"
              />
            </group>
          )}
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
type BridgePiece = { at: Vec; size: Vec; color: string };
function Bridge({ bridge }: { bridge: (typeof harborBridges)[number] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dx = bridge.end.x - bridge.start.x,
    dz = bridge.end.z - bridge.start.z;
  const distance = Math.hypot(dx, dz),
    gap = distance - bridge.start.radius - bridge.end.radius;
  const rise = bridge.end.y - bridge.start.y,
    length = Math.hypot(gap, rise);
  const t = (bridge.start.radius + gap / 2) / distance;
  const pieces = useMemo(() => {
    const start = -length / 2,
      sides = [-(bridge.width / 2 + 0.165), bridge.width / 2 + 0.165];
    const blocks: BridgePiece[] = [
      {
        at: [0, -0.1, 0],
        size: [bridge.width + 0.3, 0.2, length + 0.25],
        color: '#ead4ac',
      },
    ];
    const count = Math.max(3, Math.ceil(length / 0.4));
    for (let i = 0; i < count; i++) {
      const z = start + (i * length) / (count - 1);
      blocks.push({
        at: [0, 0.008, z],
        size: [bridge.width + 0.22, 0.015, 0.03],
        color: '#bb9670',
      });
      for (const x of sides)
        blocks.push({
          at: [x, 0.26, z],
          size: [0.1, 0.52, 0.1],
          color: '#e6cfaa',
        });
    }
    for (const x of sides) {
      blocks.push({
        at: [x, 0.52, 0],
        size: [0.12, 0.12, length],
        color: '#efdbb5',
      });
      for (let i = 0; i < 5; i++)
        blocks.push({
          at: [x, -0.55 - Math.abs(i - 2) * 0.1, start + (length * i) / 4],
          size: [
            0.22,
            0.75 - Math.sin((i * Math.PI) / 4) * 0.6,
            length / 4 + 0.02,
          ],
          color: '#c1a587',
        });
    }
    return blocks;
  }, [bridge.width, length]);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const transform = new THREE.Object3D();
    pieces.forEach((piece, i) => {
      transform.position.set(...piece.at);
      transform.scale.set(...piece.size);
      transform.updateMatrix();
      mesh.current!.setMatrixAt(i, transform.matrix);
      mesh.current!.setColorAt(i, new THREE.Color(piece.color));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor)
      mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [pieces]);
  return (
    <group
      position={[
        bridge.start.x + dx * t,
        (bridge.start.y + bridge.end.y) / 2,
        bridge.start.z + dz * t,
      ]}
      rotation={[0, Math.atan2(dx, dz), 0]}
    >
      <group rotation={[-Math.atan2(rise, gap), 0, 0]}>
        <instancedMesh
          ref={mesh}
          args={[undefined, undefined, pieces.length]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial roughness={0.85} />
        </instancedMesh>
      </group>
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
        position={[0, harborHeight({ x: 0, z: 17.7 }) + 0.025, 17.7]}
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
/** Irregular rings share vertices: a sandy rim, broken strata and an offset rock tip. */
function IslandRock({ radius, seed }: { radius: number; seed: number }) {
  const geometry = useMemo(() => {
    const rings = [
      { y: 0, r: 1, offset: 0 },
      { y: -0.35, r: 1.05, offset: 0.05 },
      { y: -1.15 - (seed % 3) * 0.25, r: 0.93, offset: -0.18 },
      { y: -2.1 - (seed % 2) * 0.55, r: 0.67, offset: 0.3 },
      { y: -3.5 - (seed % 3) * 0.45, r: 0.035, offset: -0.7 },
    ];
    const vertices: number[] = [],
      shades: number[] = [];
    const palette = ['#ead09b', '#b7a386', '#7a8088', '#596776'];
    const point = (ring: number, j: number) => {
      const angle = (j * Math.PI) / 7;
      const uneven = 1 + 0.06 * Math.sin(j * 7.31 + seed * 4.7);
      const layer = rings[ring];
      return [
        Math.cos(angle) * (radius + 0.55) * layer.r * uneven + layer.offset,
        layer.y - (ring > 1 ? 0.18 * Math.sin(j * 2.3 + seed) : 0),
        Math.sin(angle) * (radius + 0.55) * layer.r * uneven,
      ];
    };
    const tri = (a: number[], b: number[], c: number[], color: string) => {
      vertices.push(...a, ...b, ...c);
      const shade = new THREE.Color(color);
      for (let k = 0; k < 3; k++) shades.push(shade.r, shade.g, shade.b);
    };
    for (let j = 0; j < 14; j++) {
      tri([0, 0, 0], point(0, j + 1), point(0, j), '#eddaa9');
      for (let r = 0; r < rings.length - 1; r++) {
        tri(point(r, j), point(r, j + 1), point(r + 1, j), palette[r]);
        tri(point(r, j + 1), point(r + 1, j + 1), point(r + 1, j), palette[r]);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(shades, 3));
    g.computeVertexNormals();
    return g;
  }, [radius, seed]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          vertexColors
          flatShading
          side={THREE.DoubleSide}
        />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[
            Math.cos(i * 2.5 + seed) * 1.8,
            -3.5 - i * 0.55,
            Math.sin(i * 2.5 + seed) * 1.8,
          ]}
          rotation={[i * 0.3, seed, 0.4]}
          scale={[0.38, 0.6, 0.45]}
          castShadow
        >
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color={i % 2 ? '#8b8e90' : '#b5a88c'}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}
function Waterfall({
  radius,
  drop,
  paused,
  reduced,
}: {
  radius: number;
  drop: number;
  paused: boolean;
  reduced: boolean;
}) {
  const streaks = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (streaks.current && !paused && !reduced)
      streaks.current.position.y = -((clock.elapsedTime * 0.9) % 0.65);
  });
  return (
    <group rotation={[0, -Math.PI / 2, 0]}>
      <mesh position={[0, -drop / 2, radius + 0.28]}>
        <boxGeometry args={[0.65, drop, 0.12]} />
        <meshStandardMaterial
          color="#9de0dc"
          transparent
          opacity={0.76}
          emissive="#448d9b"
          emissiveIntensity={0.15}
        />
      </mesh>
      <group ref={streaks}>
        {Array.from(
          { length: Math.max(1, Math.floor((drop - 0.7) / 0.65)) },
          (_, i) => (
            <HarborBlock
              key={i}
              at={[i % 2 ? 0.15 : -0.12, -0.2 - i * 0.65, radius + 0.36]}
              size={[0.08, 0.3, 0.02]}
              color="#e4faf0"
            />
          ),
        )}
      </group>
      <mesh
        position={[0, -drop + 0.12, radius + 0.35]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[1, 0.55, 1]}
      >
        <circleGeometry args={[0.72, 12]} />
        <meshStandardMaterial color="#d7f4e8" transparent opacity={0.7} />
      </mesh>
      <HarborBlock
        at={[0, 0.015, radius - 0.3]}
        size={[0.65, 0.035, 1.1]}
        color="#93d1c8"
      />
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
  const wave = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (wave.current && !paused && !reduced)
      wave.current.position.x = Math.sin(clock.elapsedTime * 0.2) * 0.18;
  });
  const flecks = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        x: Math.sin(i * 12.98) * 24,
        z: Math.cos(i * 7.71) * 24,
        width: 0.15 + (i % 5) * 0.12,
      })),
    [],
  );
  return (
    <group>
      <mesh position={[0, -5.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial
          color={night ? '#325969' : '#8ccdcc'}
          roughness={0.48}
          metalness={0.08}
        />
      </mesh>
      <group ref={wave}>
        {flecks.map((p, i) => (
          <mesh
            key={i}
            position={[p.x, -5.025, p.z]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[p.width, 0.035]} />
            <meshBasicMaterial
              color={night ? '#84adb6' : '#dbf3dd'}
              transparent
              opacity={0.5}
            />
          </mesh>
        ))}
      </group>
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
        {harborIslands.map((island, i) => (
          <group key={i} position={[island.x, island.y, island.z]}>
            <IslandRock radius={island.radius} seed={i} />
            {(i === 3 || i === 5) && (
              <Waterfall
                radius={island.radius}
                drop={island.y + 5}
                paused={paused}
                reduced={reduced}
              />
            )}
            {i > 0 && (
              <>
                <group position={[0, 0, -2 * SCENERY_SPREAD]}>
                  <CanalHouse color={colors[i - 1]} night={night} />
                </group>
                <HarborTree
                  at={[2.05 * SCENERY_SPREAD, 0, -1.15 * SCENERY_SPREAD]}
                  palm={i === 6 || i === 2}
                />
                <HarborTree
                  at={[-1.9 * SCENERY_SPREAD, 0, -1.35 * SCENERY_SPREAD]}
                  palm={i === 6 || i === 4}
                />
                {[-1, 1].map((side) => (
                  <group key={side}>
                    <HarborBlock
                      at={[
                        side * 2.35 * SCENERY_SPREAD,
                        0.22,
                        0.5 * SCENERY_SPREAD,
                      ]}
                      size={[0.28, 0.44, 1.1]}
                      color="#e7c891"
                    />
                    <HarborBlock
                      at={[
                        side * 2.35 * SCENERY_SPREAD,
                        0.5,
                        0.5 * SCENERY_SPREAD,
                      ]}
                      size={[0.4, 0.13, 1.25]}
                      color="#9b7a58"
                    />
                    <HarborBlock
                      at={[
                        side * 1.8 * SCENERY_SPREAD,
                        0.4,
                        1.6 * SCENERY_SPREAD,
                      ]}
                      size={[0.12, 0.8, 0.12]}
                      color="#897957"
                    />
                    <mesh
                      position={[
                        side * 1.8 * SCENERY_SPREAD,
                        0.87,
                        1.6 * SCENERY_SPREAD,
                      ]}
                    >
                      <boxGeometry args={[0.24, 0.24, 0.24]} />
                      <meshStandardMaterial
                        color="#fff0b8"
                        emissive="#f6cd7d"
                        emissiveIntensity={night ? 1.5 : 0.15}
                      />
                    </mesh>
                  </group>
                ))}
              </>
            )}
          </group>
        ))}
        {harborBridges.map((b, i) => (
          <Bridge key={i} bridge={b} />
        ))}
      </group>
      <group position={[0, 0, CLOCK_Z]}>
        <CanalHouse color="#e0b785" night={night} tower />
      </group>
      <GroundLabel
        title="SAM / CURIOSITY HARBOR"
        position={[0, 0.035, 3.7]}
        width={3.3}
        dark={night}
      />
      <Boat paused={paused} reduced={reduced} />
      {[
        [-17.5, -12.5],
        [17.5, 12.5],
        [-4, -21],
      ].map(([x, z], i) => (
        <mesh
          key={i}
          position={[x, -0.65, z]}
          scale={[1.1, 0.8, 1.3]}
          castShadow
        >
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color={i % 2 ? '#b0b6bd' : '#adbba9'}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}
