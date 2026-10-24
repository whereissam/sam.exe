'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { districts } from './districts';
import { CITY_TERRACES, CITY_STAIRS, CITY_CANALS, CITY_HOMES, CITY_FOUNTAIN, CITY_CENTER, cityPoint } from './city-layout';

type Vec = [number, number, number];
const stone = '#e7e8db';
const trim = '#faf2dc';

function Drum({ radius, height, y, color = stone }: { radius: number; height: number; y: number; color?: string }) {
  return <mesh position={[0, y, 0]} receiveShadow castShadow>
    <cylinderGeometry args={[radius, radius, height, 64]} />
    <meshStandardMaterial color={color} roughness={0.8} />
  </mesh>;
}

function Block({ at, size, color = stone }: { at: Vec; size: Vec; color?: string }) {
  return <mesh position={at} castShadow receiveShadow>
    <boxGeometry args={size} /><meshStandardMaterial color={color} roughness={0.8} />
  </mesh>;
}

/** A real open arch: the opening is never filled by a dark painted rectangle. */
function Arch({ width = 1.2, height = 2.4, depth = 0.35 }: { width?: number; height?: number; depth?: number }) {
  const geometry = useMemo(() => {
    const r = width / 2, spring = height - r, edge = 0.2;
    const shape = new THREE.Shape();
    shape.moveTo(-r - edge, 0);
    shape.lineTo(-r - edge, spring);
    shape.absarc(0, spring, r + edge, Math.PI, 0, true);
    shape.lineTo(r + edge, 0);
    shape.lineTo(r, 0);
    shape.lineTo(r, spring);
    shape.absarc(0, spring, r, 0, Math.PI, false);
    shape.lineTo(-r, 0);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 12 });
  }, [width, height, depth]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh castShadow receiveShadow><primitive object={geometry} attach="geometry" /><meshStandardMaterial color={trim} roughness={0.8} /></mesh>;
}

function Palazzo({ variant, night }: { variant: number; night: boolean }) {
  const height = 2.4 + (variant % 4) * .65;
  const width = 2 + (variant % 3) * .28;
  const depth = 2;
  const wall = ['#e9e2ca', '#d3dfda', '#e6c9aa', '#e4ddca'][variant % 4];
  const roof = variant % 3 === 0 ? '#b88769' : '#ae785d';
  return <group>
    <Block at={[0, height / 2, 0]} size={[width, height, depth]} color={wall} />
    <Block at={[0, .15, 0]} size={[width + .15, .3, depth + .13]} color={trim} />
    <Block at={[0, height - .07, 0]} size={[width + .18, .16, depth + .18]} color={trim} />
    {variant % 3 === 0 ? <mesh position={[0, height, 0]} scale={[1, .8, depth / width]} castShadow>
      <sphereGeometry args={[width * .58, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={roof} roughness={.85} />
    </mesh> : <mesh position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[width * .57, width * .57, depth + .2, 16, 1, false, Math.PI / 2, Math.PI]} />
      <meshStandardMaterial color={roof} roughness={.85} side={THREE.DoubleSide} />
    </mesh>}
    {[0, 1, 2, 3].map(face => <group key={face} rotation={[0, face * Math.PI / 2, 0]}>
      {Array.from({ length: Math.floor(height / .8) }, (_, row) => [-1, 1].map(side => <group key={`${row}-${side}`} position={[side * (face % 2 ? depth : width) * .25, .55 + row * .8, (face % 2 ? width : depth) / 2 + .015]}>
        <mesh><planeGeometry args={[.23, .43]} /><meshStandardMaterial color={night ? '#ffd895' : '#617c80'} emissive="#ffc77d" emissiveIntensity={night ? .6 : 0} /></mesh>
        <Block at={[0, -.24, .03]} size={[.33, .06, .1]} color={trim} />
      </group>))}
    </group>)}
    {variant % 2 === 0 && <>
      <Block at={[0, 1.45, depth / 2 + .18]} size={[width + .1, .13, .4]} color={trim} />
      <Block at={[0, 1.7, depth / 2 + .35]} size={[width, .3, .045]} color="#739393" />
    </>}
    <Block at={[width * .3, height + .5, -.4]} size={[.2, .85, .22]} color={wall} />
  </group>;
}

function Cascade({ at, height, width, paused, reduced }: { at: Vec; height: number; width: number; paused: boolean; reduced: boolean }) {
  const streaks = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  useFrame((_, dt) => {
    if (paused || reduced) return;
    elapsed.current += Math.min(dt, 0.05);
    if (streaks.current) streaks.current.position.y = -(elapsed.current * 1.8 % 0.8);
  });
  return <group position={at}>
    <mesh position={[0, -height / 2, 0]}>
      <boxGeometry args={[width, height, 0.12]} />
      <meshStandardMaterial color="#44bfdc" emissive="#1686b5" emissiveIntensity={0.25} transparent opacity={0.86} />
    </mesh>
    <group ref={streaks}>
      {Array.from({ length: Math.max(1, Math.floor((height - 0.9) / 0.8)) }, (_, i) => <Block key={i} at={[(i % 3 - 1) * width * 0.26, -0.3 - i * 0.8, 0.08]} size={[0.045, 0.32, 0.025]} color="#c4f5f5" />)}
    </group>
    <mesh position={[0, -height + 0.04, 0.15]} rotation={[-Math.PI / 2, 0, 0]} scale={[width, 0.45, 1]}>
      <circleGeometry args={[0.8, 24]} /><meshBasicMaterial color="#cdf9f4" transparent opacity={0.65} />
    </mesh>
  </group>;
}

function Ring({ inner, outer, y, color }: { inner: number; outer: number; y: number; color: string }) {
  return <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <ringGeometry args={[inner, outer, 128]} /><meshStandardMaterial color={color} roughness={0.72} side={THREE.DoubleSide} />
  </mesh>;
}

/** One concentric city: the functional districts occupy the circular streets. */
export function CanalCity({ night, paused, reduced }: { night: boolean; paused: boolean; reduced: boolean }) {
  return <group>
    <group position={[0, 0, CITY_CENTER.z]}>
      {CITY_TERRACES.map((t, tier) => <group key={t.id}>
        <Drum radius={t.outer} height={t.y + 4.6} y={(t.y - 5.4) / 2} color={tier === 0 ? '#9cb6bc' : '#c5d1cd'} />
        <Ring inner={t.inner} outer={t.outer} y={t.y} color={tier === 0 ? '#e6dfca' : '#eee8d7'} />
        <Ring inner={Math.max(0, t.inner)} outer={t.inner + .16} y={t.y + .015} color={trim} />
        <Ring inner={t.outer - .18} outer={t.outer + .16} y={t.y + .015} color={trim} />
        {[.65, 1.2].map(offset => <Ring key={offset} inner={t.outer - offset - .025} outer={t.outer - offset} y={t.y + .005} color="#c0c7bd" />)}
        <mesh position={[0, t.y - .4, 0]}>
          <cylinderGeometry args={[t.outer + .12, t.outer + .12, .2, 128, 1, true]} /><meshStandardMaterial color={trim} side={THREE.DoubleSide} />
        </mesh>
        {/* Arcaded retaining wall follows the city circumference. */}
        {Array.from({ length: tier === 0 ? 44 : tier === 1 ? 28 : 16 }, (_, i) => {
          const count = tier === 0 ? 44 : tier === 1 ? 28 : 16;
          const angle = i * Math.PI * 2 / count;
          return <group key={i} rotation={[0, angle, 0]}>
            <group position={[0, t.y - (tier === 0 ? 4.6 : 3.05), t.outer + .02]}>
              <mesh position={[0, 1.12, -.01]}><planeGeometry args={[1.1, 2.24]} /><meshStandardMaterial color="#477783" /></mesh>
              <Arch width={1.1} height={2.2} depth={.22} />
            </group>
            {i % 2 === 0 && <Block at={[0, t.y - 1.7, t.outer + .05]} size={[.22, 2.8, .28]} color="#e2e2d5" />}
          </group>;
        })}
      </group>)}
      {CITY_CANALS.map((c, i) => <group key={i}>
        <Ring inner={c.inner} outer={c.outer} y={c.y} color="#32adc9" />
        <Ring inner={c.inner + .22} outer={c.inner + .25} y={c.y + .01} color="#9de3e5" />
        <Ring inner={c.outer - .3} outer={c.outer - .27} y={c.y + .01} color="#9de3e5" />
      </group>)}
      {/* Water spills down the actual tier walls into the encircling canals. */}
      {[0, Math.PI / 2, -Math.PI / 2, Math.PI].map(angle => <group key={angle} rotation={[0, angle, 0]}>
        <Cascade at={[0, 7.02, 7.18]} height={3.6} width={.72} paused={paused} reduced={reduced} />
        <Cascade at={[0, 3.52, 14.18]} height={3.6} width={1} paused={paused} reduced={reduced} />
        <Cascade at={[0, -.05, 27.18]} height={4.9} width={1.25} paused={paused} reduced={reduced} />
      </group>)}
    </group>
    {/* Recessed stopping courts mark destinations without occupying circulation. */}
    {districts.map(d => {
      const t = CITY_TERRACES.find(t => t.y === d.position[1])!;
      const radius = Math.hypot(d.position[0], d.position[2] - CITY_CENTER.z);
      const angle = Math.atan2(d.position[0], d.position[2] - CITY_CENTER.z);
      const inner = Math.max(t.inner + .25, radius - 2.8);
      const outer = Math.min(t.outer - .25, radius + 2.8);
      const halfAngle = (d.id === 'robotics' ? 3.6 : 2.8) / radius;
      return <group key={d.id} position={[0, t.y + .006, CITY_CENTER.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <ringGeometry args={[inner, outer, 48, 1, angle - Math.PI / 2 - halfAngle, halfAngle * 2]} />
          <meshStandardMaterial color="#e5dac1" roughness={1} />
        </mesh>
        <mesh position={[0, .004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[outer - .035, outer, 48, 1, angle - Math.PI / 2 - halfAngle, halfAngle * 2]} />
          <meshStandardMaterial color="#b6a782" />
        </mesh>
      </group>;
    })}
    {CITY_STAIRS.map((s, i) => {
      const run = s.outer - s.inner, rise = s.yEnd - s.yStart;
      const length = Math.hypot(run, rise);
      const center = cityPoint((s.inner + s.outer) / 2, s.angle);
      return <group key={i} position={[center.x, (s.yStart + s.yEnd) / 2, center.z]} rotation={[0, s.angle, 0]}>
        <group rotation={[Math.atan2(rise, run), 0, 0]}>
          <Block at={[0, -.12, 0]} size={[s.width, .24, length]} color="#e7e7d9" />
          {Array.from({ length: 20 }, (_, step) => <Block key={step} at={[0, .008, -length / 2 + step * length / 20]} size={[s.width, .016, .035]} color="#9cb3b6" />)}
          {[-1, 1].map(side => <group key={side}>
            <Block at={[side * (s.width / 2 + .12), .25, 0]} size={[.2, .5, length]} color={stone} />
            <Block at={[side * (s.width / 2 + .12), .54, 0]} size={[.3, .08, length + .12]} color={trim} />
          </group>)}
        </group>
        {[-1, 1].map(side => <Block key={side} at={[0, side * rise / 2, -side * (run / 2 + .1)]} size={[s.width, .04, .25]} color={trim} />)}
      </group>;
    })}
    {CITY_HOMES.map((h, i) => <group key={i} position={[h.x, h.y, h.z]} rotation={[0, h.angle, 0]}><Palazzo variant={h.variant} night={night} /></group>)}
    <group position={[CITY_FOUNTAIN.x, CITY_FOUNTAIN.y, CITY_FOUNTAIN.z]} scale={[1, 2.6, 1]}>
      <Drum radius={2.2} height={.32} y={.16} color={trim} />
      <Drum radius={2} height={.05} y={.34} color="#35b4d2" />
      <Drum radius={.64} height={2.5} y={1.6} />
      <Drum radius={1.45} height={.22} y={2.9} color={trim} />
      <Drum radius={1.28} height={.06} y={3.04} color="#35b4d2" />
      <Drum radius={.35} height={2.2} y={4.15} />
      <Drum radius={.9} height={.2} y={5.3} color={trim} />
      <mesh position={[0, 6.3, 0]} castShadow><coneGeometry args={[.48, 1.8, 16]} /><meshStandardMaterial color="#69b8c7" metalness={.2} roughness={.35} /></mesh>
      {[0, 1, 2, 3].map(i => <group key={i} rotation={[0, i * Math.PI / 2, 0]}>
        <Cascade at={[0, 5.35, .85]} height={2.25} width={.19} paused={paused} reduced={reduced} />
        <Cascade at={[0, 3.05, 1.4]} height={2.65} width={.3} paused={paused} reduced={reduced} />
      </group>)}
    </group>
  </group>;
}
