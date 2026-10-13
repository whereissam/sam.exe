'use client';
import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Html } from '@react-three/drei';
import { GroundLabel } from './GroundLabel';
import { surpriseRoom, type LinkedRoom } from './room-links';

type Vec = [number, number, number];
function B({ at, size, color }: { at: Vec; size: Vec; color: string }) {
  return <mesh position={at} castShadow receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={0.8} /></mesh>;
}
export function Passage({ href, label, children, current }: { href?: string; label: string; children: ReactNode; current?: LinkedRoom }) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const enter = () => router.push(current ? surpriseRoom(current).href : href!);
  return <group onClick={event => { if (event.delta > 5) return; event.stopPropagation(); enter(); }} onPointerOver={event => { event.stopPropagation(); setHovered(true); }} onPointerOut={() => setHovered(false)}>
    {children}
    {hovered && <GroundLabel title={label} position={[0, 0.025, 0.9]} width={2.2} onClick={enter} />}
    <Html center position={[0, 1, 0]}><button className="ground-key-target" onClick={enter}>{label}</button></Html>
  </group>;
}
export function StudioDoor({ lab = false, island = false }: { lab?: boolean; island?: boolean }) {
  return <Passage href={island ? '/' : lab ? '/robot-lab' : '/room'} label={island ? 'Return to the island' : lab ? 'Enter the robotics lab' : 'Enter Sam’s room'}>
    <B at={[0, 1.35, 0]} size={[1.55, 2.7, 0.14]} color="#5a6355" />
    <B at={[0, 1.34, 0.09]} size={[1.35, 2.52, 0.08]} color={lab ? '#779b90' : '#b38c60'} />
    {[-0.75, 0.75].map(x => <B key={x} at={[x, 1.4, 0.1]} size={[0.12, 2.8, 0.22]} color="#d0bc91" />)}
    <B at={[0, 2.77, 0.1]} size={[1.62, 0.12, 0.22]} color="#d0bc91" />
    <B at={[0, 1.92, 0.145]} size={[0.84, 0.85, 0.035]} color="#3d5954" />
    <B at={[0, 1.92, 0.17]} size={[0.72, 0.73, 0.025]} color="#b5cfc0" />
    {lab ? <><B at={[0, 1.95, 0.2]} size={[0.22, 0.26, 0.04]} color="#f0dfb7" /><B at={[0, 2.18, 0.2]} size={[0.24, 0.16, 0.04]} color="#f0dfb7" />{[-0.15, 0.15].map(x => <B key={x} at={[x, 1.86, 0.2]} size={[0.055, 0.3, 0.04]} color="#58776b" />)}</> : <B at={[0, 1.89, 0.2]} size={[0.38, 0.04, 0.04]} color="#8b7657" />}
    <B at={[0.47, 1.13, 0.22]} size={[0.24, 0.055, 0.09]} color="#dec387" />
    <B at={[0, 0.03, 0.3]} size={[1.6, 0.06, 0.65]} color="#cdb789" />
  </Passage>;
}
export function Luggage({ current }: { current: LinkedRoom }) {
  return <Passage current={current} label="An unplanned journey · discover another room">
    <B at={[0, 0.38, 0]} size={[0.86, 0.72, 0.45]} color="#ab734d" />
    {[-0.28, 0.28].map(x => <B key={x} at={[x, 0.39, 0.236]} size={[0.08, 0.73, 0.025]} color="#dbbe88" />)}
    <B at={[0, 0.77, 0]} size={[0.34, 0.08, 0.12]} color="#4d4938" />
    <B at={[0.12, 0.52, 0.25]} size={[0.22, 0.17, 0.025]} color="#ece0b7" />
    <B at={[-0.17, 0.24, 0.25]} size={[0.17, 0.15, 0.025]} color="#73968b" />
  </Passage>;
}
export function TravelPhotos() {
  return <Passage href="/atlas/world" label="Step into the travel photographs">
    {[-0.64, 0.64].map((x, i) => <group key={x} position={[x, i ? 0.2 : 0, 0]} rotation={[0, 0, i ? -0.07 : 0.06]}>
      <B at={[0, 0, 0]} size={[1.1, 0.9, 0.08]} color="#a4855e" />
      <B at={[0, 0, 0.05]} size={[0.97, 0.77, 0.025]} color="#eee2be" />
      <B at={[0, 0.045, 0.07]} size={[0.81, 0.54, 0.015]} color={i ? '#90afa8' : '#c9bb8c'} />
      <mesh position={[-0.15, 0.06, 0.085]} rotation={[0, 0, 0.1]}><coneGeometry args={[0.25, 0.4, 3]} /><meshStandardMaterial color={i ? '#637f70' : '#967957'} /></mesh>
      <mesh position={[0.24, 0.19, 0.085]}><circleGeometry args={[0.08, 16]} /><meshBasicMaterial color="#eed29a" /></mesh>
    </group>)}
  </Passage>;
}
export function AtlasDestinations() {
  return <>
    <group position={[-5.3, 0, 3.7]} scale={0.8}><Passage href="/room" label="Sam’s room · a place to rest">
      <B at={[0, 0.05, 0]} size={[2.3, 0.1, 1.8]} color="#c4b184" />
      <B at={[0, 0.75, 0]} size={[1.4, 1.4, 1]} color="#e2cca0" />
      <mesh position={[0, 1.65, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[1.2, 0.8, 4]} /><meshStandardMaterial color="#a87956" /></mesh>
      <B at={[0.3, 0.47, 0.53]} size={[0.42, 0.83, 0.07]} color="#6f9588" />
      <B at={[-0.37, 0.95, 0.53]} size={[0.4, 0.43, 0.06]} color="#58776e" />
      <B at={[-0.37, 0.95, 0.57]} size={[0.03, 0.43, 0.02]} color="#e5d5b2" />
    </Passage></group>
    <group position={[5.3, 0, 3.7]} scale={0.8}><Passage href="/robot-lab" label="Robotics lab · human meets machine">
      <B at={[0, 0.05, 0]} size={[2.5, 0.1, 2]} color="#bbaa85" />
      <B at={[0, 0.65, 0]} size={[1.9, 1.2, 1.25]} color="#819b8b" />
      <B at={[0, 1.3, 0]} size={[2.1, 0.13, 1.5]} color="#decda4" />
      <B at={[0, 0.8, 0.64]} size={[1.55, 0.64, 0.05]} color="#3f5c55" />
      <B at={[0, 0.72, 0.68]} size={[0.34, 0.4, 0.07]} color="#ded8bd" />
      <B at={[0, 1.05, 0.68]} size={[0.32, 0.2, 0.07]} color="#ded8bd" />
      <B at={[0, 1.05, 0.73]} size={[0.22, 0.055, 0.015]} color="#3d5550" />
    </Passage></group>
    <group position={[-4, 0.06, 4.6]} scale={0.6}><Luggage current="atlas" /></group>
  </>;
}
