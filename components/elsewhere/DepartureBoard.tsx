'use client';
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useCursor } from '@react-three/drei';
import { useThree } from '@react-three/fiber';

type City = { id: string; city: string };
const codes: Record<string, string> = {
  Berlin: 'BER',
  Taipei: 'TPE',
  'New York': 'NYC',
  Tokyo: 'TYO',
};
function Panel({
  at,
  size,
  color,
}: {
  at: [number, number, number];
  size: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={at} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  );
}
function Ink({
  at,
  width,
  height,
  title,
  code,
  mode = 'row',
  selected = false,
}: {
  at: [number, number, number];
  width: number;
  height: number;
  title: string;
  code?: string;
  mode?: 'header' | 'row' | 'footer';
  selected?: boolean;
}) {
  const gl = useThree((state) => state.gl);
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = Math.round((1200 * height) / width);
    const ctx = canvas.getContext('2d')!;
    const h = canvas.height;
    ctx.fillStyle =
      mode === 'header' ? '#e6dab7' : selected ? '#6d8b78' : '#29473f';
    ctx.fillRect(0, 0, 1200, h);
    ctx.textBaseline = 'middle';
    if (mode === 'header') {
      ctx.fillStyle = '#36554a';
      ctx.font = `500 ${h * 0.18}px sans-serif`;
      ctx.fillText('ELSEWHERE  /  CIRCULAR RAILWAY', 50, h * 0.24);
      ctx.font = `600 ${h * 0.39}px sans-serif`;
      ctx.fillText(title, 46, h * 0.65);
      ctx.beginPath();
      ctx.arc(1090, h * 0.52, h * 0.25, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#8d7d51';
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(1090, h * 0.34);
      ctx.lineTo(1090, h * 0.52);
      ctx.lineTo(1120, h * 0.61);
      ctx.stroke();
    } else if (mode === 'row') {
      if (selected) {
        ctx.fillStyle = '#e7c789';
        ctx.fillRect(0, 0, 9, h);
      }
      ctx.fillStyle = selected ? '#f4dfaa' : '#9eb2a0';
      ctx.font = `500 ${h * 0.29}px monospace`;
      ctx.fillText(code ?? '', 45, h * 0.52);
      ctx.fillStyle = '#f0e7cc';
      ctx.font = `500 ${h * 0.43}px sans-serif`;
      ctx.fillText(title, 245, h * 0.5, 780);
      ctx.strokeStyle = selected ? '#e7c789' : '#779385';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(1125, h * 0.5, h * 0.13, 0, Math.PI * 2);
      ctx.stroke();
      if (selected) {
        ctx.fillStyle = '#e7c789';
        ctx.beginPath();
        ctx.arc(1125, h * 0.5, h * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = '#b6c3a9';
      ctx.font = `500 ${h * 0.42}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(title, 600, h * 0.5, 1120);
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    return map;
  }, [width, height, title, code, mode, selected, gl]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={at}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}
export function DepartureBoard({
  cities,
  selected,
  page,
  onSelect,
  onPage,
}: {
  cities: City[];
  selected: number;
  page: number;
  onSelect: (index: number) => void;
  onPage: (direction: number) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  useCursor(hovered !== null);
  const pages = Math.max(1, Math.ceil(cities.length / 4));
  return (
    <group position={[-1.5, 0, -2.8]}>
      <Panel at={[0, 1.54, 0]} size={[3.5, 2.55, 0.22]} color="#8e7956" />
      <Panel at={[0, 1.54, 0.125]} size={[3.36, 2.41, 0.055]} color="#29473f" />
      {[-1.55, 1.55].map((x) => (
        <group key={x}>
          <Panel at={[x, 0.2, 0]} size={[0.1, 0.4, 0.12]} color="#677765" />
          <Panel at={[x, 0.05, 0]} size={[0.35, 0.08, 0.45]} color="#8e7956" />
          {[0.38, 2.7].map((y) => (
            <mesh
              key={y}
              position={[x, y, 0.16]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.027, 0.027, 0.018, 8]} />
              <meshStandardMaterial
                color="#d5bc85"
                metalness={0.4}
                roughness={0.5}
              />
            </mesh>
          ))}
        </group>
      ))}
      <Ink
        at={[0, 2.37, 0.162]}
        width={3.17}
        height={0.59}
        title="Departures"
        mode="header"
      />
      {cities.slice(page * 4, page * 4 + 4).map((city, row) => {
        const index = page * 4 + row,
          y = 1.83 - row * 0.37;
        return (
          <group
            key={city.id}
            onClick={(e) => {
              e.stopPropagation();
              if (e.delta <= 5) onSelect(index);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHovered(index);
            }}
            onPointerOut={() => setHovered(null)}
          >
            <Panel
              at={[0, y, 0.17]}
              size={[3.17, 0.34, 0.03]}
              color={hovered === index ? '#d8bd83' : '#192e29'}
            />
            <Ink
              at={[0, y, 0.19]}
              width={3.11}
              height={0.29}
              title={city.city}
              code={codes[city.city] ?? String(index + 1).padStart(2, '0')}
              selected={selected === index || hovered === index}
            />
          </group>
        );
      })}
      <Ink
        at={[0, 0.44, 0.162]}
        width={1.85}
        height={0.19}
        title={
          hovered !== null
            ? `GO TO ${cities[hovered]?.city.toUpperCase()} →`
            : pages > 1
              ? `CLICK A CITY · ${page + 1} / ${pages}`
              : 'CLICK A CITY TO GO'
        }
        mode="footer"
      />
      {pages > 1 &&
        [-1, 1].map((direction) => (
          <group
            key={direction}
            onClick={(e) => {
              e.stopPropagation();
              if (e.delta <= 5) onPage(direction);
            }}
          >
            <Ink
              at={[direction * 1.22, 0.44, 0.17]}
              width={0.55}
              height={0.2}
              title={direction < 0 ? '← PREV' : 'NEXT →'}
              mode="footer"
            />
          </group>
        ))}
    </group>
  );
}
