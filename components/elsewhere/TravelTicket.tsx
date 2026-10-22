'use client';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

export function TravelTicket({
  city,
  country,
}: {
  city: string;
  country: string;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 760;
    canvas.height = 560;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f1e3bb';
    ctx.fillRect(0, 0, 760, 560);
    ctx.fillStyle = '#36594e';
    ctx.fillRect(0, 0, 760, 76);
    ctx.fillStyle = '#f1e3bb';
    ctx.font = '500 28px sans-serif';
    ctx.fillText('ELSEWHERE  /  CIRCULAR RAILWAY', 30, 49);
    ctx.fillStyle = '#36594e';
    ctx.font = '500 26px sans-serif';
    ctx.fillText('DESTINATION', 34, 131);
    ctx.font = '600 88px sans-serif';
    ctx.fillText(city, 30, 235, 695);
    ctx.font = '500 58px sans-serif';
    ctx.fillText(country, 34, 316, 690);
    ctx.strokeStyle = '#b8a778';
    ctx.setLineDash([9, 9]);
    ctx.beginPath();
    ctx.moveTo(30, 385);
    ctx.lineTo(730, 385);
    ctx.stroke();
    ctx.font = '500 27px sans-serif';
    ctx.fillText('RING LINE  •  CITY HOPPER', 34, 437);
    ctx.font = '400 24px sans-serif';
    ctx.fillText('KEEP FOR YOUR NEXT STOP', 34, 500);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [city, country]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.38, 0.018, 0.28]} />
        <meshStandardMaterial color="#e1d0a2" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.38, 0.28]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}
