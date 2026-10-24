'use client';
import { useEffect, useMemo, useState } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

/** An inlaid floor sign, with a focus-only HTML equivalent for keyboard visitors. */
export function GroundLabel({
  title,
  number,
  position,
  onClick,
  width = 2.9,
  dark = false,
  variant = 'sign',
}: {
  title: string;
  number?: string;
  position: [number, number, number];
  onClick?: () => void;
  width?: number;
  dark?: boolean;
  variant?: 'sign' | 'inlay';
}) {
  const [focused, setFocused] = useState(false);
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 200;
    const ctx = canvas.getContext('2d')!;
    if (variant === 'inlay') {
      // A quiet limestone inscription, with a small oxidized-bronze index.
      ctx.fillStyle = dark ? '#34494c' : '#e6e3d5';
      ctx.fillRect(0, 0, 1024, 200);
      ctx.fillStyle = dark ? '#ddc899' : '#8b7450';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.font = '500 98px Georgia, serif';
      ctx.fillText(number ?? '', 98, 102);
      ctx.fillRect(193, 58, 2, 84);
      ctx.fillStyle = dark ? '#ede9d7' : '#3e595b';
      ctx.textAlign = 'left';
      ctx.font = '500 57px sans-serif';
      ctx.fillText(title, 235, 105, 740);
    } else {
    ctx.fillStyle = dark ? '#4d4835' : '#f1dfae';
    ctx.beginPath();
    ctx.roundRect(0, 0, 1024, 200, 24);
    ctx.fill();
    ctx.strokeStyle = dark ? '#b99c59' : '#b69b5e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(12, 12, 1000, 176, 18);
    ctx.stroke();
    ctx.fillStyle = dark ? '#f6dc8c' : '#69512c';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = '500 58px sans-serif';
    ctx.fillText(`${number ? number + '  /  ' : ''}${title}`, 512, 103, 935);
    }
    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace;
    result.anisotropy = 4;
    return result;
  }, [title, number, dark, variant]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group position={position}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(event) => {
          if (event.delta > 5 || !onClick) return;
          event.stopPropagation();
          onClick();
        }}
        onPointerOver={() => setFocused(true)}
        onPointerOut={() => setFocused(false)}
      >
        <planeGeometry args={[width, (width * 200) / 1024]} />
        <meshBasicMaterial
          map={texture}
          color={focused ? '#ffffff' : '#ede4ce'}
          toneMapped={false}
          transparent
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>
      {onClick && (
        <Html center position={[0, 0.1, 0]} zIndexRange={[4, 0]}>
          <button
            className="ground-key-target"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onClick={onClick}
          >
            {title}
          </button>
        </Html>
      )}
    </group>
  );
}
