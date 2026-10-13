'use client';

/* oxlint-disable react/react-compiler -- Three.js scene objects are animated through refs. */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { shelfBooks, type ShelfBook } from './books';
import './room-exhibits.css';
import './book-details.css';

const spacing = 1.85;
const bookX = (index: number) => (index - (shelfBooks.length - 1) / 2) * spacing;

function Book({ book, index, selected, onSelect, turn, reduced, focused }: { book: ShelfBook; index: number; selected: number; onSelect: (index: number) => void; turn: number; reduced: boolean; focused: boolean }) {
  const cover = useTexture(book.cover, (texture) => { if (!Array.isArray(texture)) texture.colorSpace = THREE.SRGBColorSpace; });
  const model = useRef<THREE.Group>(null);
  const dragging = useRef<{ x: number; angle: number; pointer: number } | null>(null);
  const dragAngle = useRef(0);
  const [hovered, setHovered] = useState(false);
  const active = selected === index;
  const coverImage = cover.image as HTMLImageElement;
  const width = 2.44 * (coverImage.width / coverImage.height);
  useEffect(() => { dragAngle.current = 0; }, [selected, turn]);
  useFrame((_, dt) => {
    if (!model.current) return;
    const blend = reduced ? 1 : 1 - Math.exp(-dt * 8);
    model.current.position.lerp(new THREE.Vector3(bookX(index), active && focused ? 0.2 : -0.224, active && focused ? 2.5 : active ? 0.35 : hovered ? 0.18 : -0.1), blend);
    const scale = active && focused ? 1.35 : active ? 1 : 0.8;
    model.current.scale.lerp(new THREE.Vector3(scale, scale, scale), blend);
    model.current.rotation.y += ((active ? turn + dragAngle.current - 0.12 : -0.32) - model.current.rotation.y) * blend;
  });
  const release = (event: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return;
    event.stopPropagation();
    (event.target as Element).releasePointerCapture(dragging.current.pointer);
    dragging.current = null;
  };
  return <group ref={model} position={[bookX(index), 0, -0.1]} scale={0.8}
    onClick={(event) => { event.stopPropagation(); if (event.delta < 5) onSelect(index); }}
    onPointerOver={(event) => { event.stopPropagation(); setHovered(true); }}
    onPointerOut={() => setHovered(false)}
    onPointerDown={(event) => {
      if (!active) return;
      event.stopPropagation();
      dragging.current = { x: event.clientX, angle: dragAngle.current, pointer: event.pointerId };
      (event.target as Element).setPointerCapture(event.pointerId);
    }}
    onPointerMove={(event) => {
      if (!dragging.current) return;
      event.stopPropagation();
      dragAngle.current = dragging.current.angle + (event.clientX - dragging.current.x) * 0.014;
    }} onPointerUp={release} onPointerCancel={release}>
    <mesh castShadow><boxGeometry args={[width - 0.08, 2.35, 0.26]} /><meshStandardMaterial color="#eee1c6" roughness={0.9} /></mesh>
    {[-0.16, 0.16].map(z => <mesh key={z} position={[0, 0, z]} castShadow><boxGeometry args={[width, 2.44, 0.055]} /><meshStandardMaterial color={book.color} roughness={0.8} /></mesh>)}
    <mesh position={[-width / 2 + 0.035, 0, 0]} castShadow><boxGeometry args={[0.09, 2.44, 0.37]} /><meshStandardMaterial color={book.color} /></mesh>
    {Array.from({ length: 14 }, (_, i) => <mesh key={i} position={[0.03, -1.175, -0.12 + i * 0.018]}><boxGeometry args={[width - 0.15, 0.003, 0.003]} /><meshStandardMaterial color="#bfb298" /></mesh>)}
    <mesh position={[0, 0, 0.19]}><planeGeometry args={[width, 2.44]} /><meshStandardMaterial map={cover} roughness={0.8} /></mesh>
  </group>;
}

function BookTab({ label, position, color, onClick }: { label: string; position: [number, number, number]; color: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 180;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color; ctx.fillRect(0, 0, 600, 180);
    ctx.strokeStyle = '#f0e3bf'; ctx.lineWidth = 2; ctx.strokeRect(14, 14, 572, 152);
    ctx.fillStyle = '#292e25'; ctx.font = '500 52px "Noto Serif TC", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 300, 94);
    const result = new THREE.CanvasTexture(canvas); result.colorSpace = THREE.SRGBColorSpace; return result;
  }, [label, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <group position={position} onClick={event => { event.stopPropagation(); if (event.delta < 5) onClick(); }} onPointerOver={event => { event.stopPropagation(); setHovered(true); }} onPointerOut={() => setHovered(false)}>
    <mesh position={[0, hovered ? 0.035 : 0, 0]} castShadow><boxGeometry args={[1.5, 0.46, 0.05]} /><meshStandardMaterial color={color} /></mesh>
    <mesh position={[0, hovered ? 0.035 : 0, 0.028]}><planeGeometry args={[1.5, 0.45]} /><meshBasicMaterial map={texture} toneMapped={false} /></mesh>
    <Html><button className="ground-key-target" onClick={onClick}>{label}</button></Html>
  </group>;
}

export function ReadingBook({ book, index, onClose, onSelect }: { book: ShelfBook; index: number; onClose: () => void; onSelect: (index: number) => void }) {
  const cover = useTexture(book.cover);
  const [page, setPage] = useState(0);
  const sections = useMemo(() => [book.note, ...book.details], [book]);
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 1200;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f1e7ce'; ctx.fillRect(0, 0, 900, 1200);
    const gradient = ctx.createLinearGradient(0, 0, 100, 0); gradient.addColorStop(0, '#c6b48d'); gradient.addColorStop(1, '#f1e7ce'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 100, 1200);
    let y = 105;
    function paragraph(text: string, size: number, color: string, gap = 1.65) {
      ctx.font = `${size}px Georgia, "Noto Serif TC", serif`; ctx.fillStyle = color;
      let line = '';
      for (const token of text.match(/[a-zA-Z0-9’'.,!?-]+\s*|./gu) ?? []) {
        if (ctx.measureText(line + token).width > 710 && line) { ctx.fillText(line, 100, y); y += size * gap; line = ''; }
        line += token;
      }
      if (line) { ctx.fillText(line, 100, y); y += size * gap; }
    }
    paragraph(`書架 ${index + 1} / ${shelfBooks.length}  ·  ${book.category.toUpperCase()}`, 22, '#9c7353'); y += 38;
    paragraph(book.title, 42, '#3c382d', 1.35); y += 18;
    paragraph(book.author, 24, '#756951'); y += 55;
    ctx.strokeStyle = '#c7b58f'; ctx.beginPath(); ctx.moveTo(100, y); ctx.lineTo(810, y); ctx.stroke(); y += 68;
    paragraph(sections[page], 33, '#514a3b');
    ctx.font = '22px Georgia, serif'; ctx.fillStyle = '#9a7652';
    ctx.fillText(`第 ${page + 1} / ${sections.length} 頁  ·  點書頁翻閱 →`, 100, 1100);
    const result = new THREE.CanvasTexture(canvas); result.colorSpace = THREE.SRGBColorSpace; return result;
  }, [book, index, page, sections]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <group scale={1.15}>
    <mesh position={[0, 0, -0.09]} castShadow><boxGeometry args={[5.25, 3.5, 0.14]} /><meshStandardMaterial color={book.color} /></mesh>
    <group position={[-1.3, 0, 0]} rotation={[0, 0.04, 0]} onClick={event => { event.stopPropagation(); onClose(); }}>
      <mesh castShadow><boxGeometry args={[2.5, 3.35, 0.1]} /><meshStandardMaterial color="#e4d7bc" /></mesh>
      <mesh position={[0, 0, 0.056]}><planeGeometry args={[Math.min(2.36, 3.2 * ((cover.image as HTMLImageElement).width / (cover.image as HTMLImageElement).height)), 3.2]} /><meshBasicMaterial map={cover} toneMapped={false} /></mesh>
    </group>
    <group position={[1.3, 0, 0]} rotation={[0, -0.04, 0]} onClick={event => { event.stopPropagation(); setPage(value => (value + 1) % sections.length); }}>
      <mesh castShadow><boxGeometry args={[2.5, 3.35, 0.1]} /><meshStandardMaterial color="#e4d7bc" /></mesh>
      <mesh position={[0, 0, 0.057]}><planeGeometry args={[2.5, 3.35]} /><meshBasicMaterial map={texture} toneMapped={false} /></mesh>
    </group>
    <mesh position={[0, -0.3, 0.07]}><boxGeometry args={[0.065, 3.2, 0.015]} /><meshStandardMaterial color="#ad6f4b" /></mesh>
    <BookTab label="← 上一本" position={[-1.75, -1.88, 0.08]} color="#96ac96" onClick={() => onSelect((index - 1 + shelfBooks.length) % shelfBooks.length)} />
    <BookTab label="放回書架" position={[0, -1.88, 0.08]} color="#d5c5a1" onClick={onClose} />
    <BookTab label="下一本 →" position={[1.75, -1.88, 0.08]} color="#d0ad65" onClick={() => onSelect((index + 1) % shelfBooks.length)} />
    <Html position={[0, -1.8, 0]}><div className="sr-only"><button onClick={onClose}>Return book to shelf</button><button onClick={() => setPage(value => (value + 1) % sections.length)}>Turn page</button><a href={book.synopsisSource} target="_blank" rel="noreferrer">Author or publisher information</a></div></Html>
  </group>;
}

export function ShelfWorld({ selected, onSelect, turn, reduced, focused }: { selected: number; onSelect: (index: number) => void; turn: number; reduced: boolean; focused: boolean }) {
  const width = shelfBooks.length * spacing + 0.8;
  return <>
    <group>
    <mesh position={[0, 0.3, -0.65]} receiveShadow><boxGeometry args={[width, 3.4, 0.12]} /><meshStandardMaterial color="#8eaa9b" /></mesh>
    {[-1.28, 2].map(y => <mesh key={y} position={[0, y, -0.1]} castShadow receiveShadow><boxGeometry args={[width + 0.15, 0.16, 1.25]} /><meshStandardMaterial color="#b58c5b" roughness={0.9} /></mesh>)}
    {[-1, 1].map(side => <mesh key={side} position={[side * width / 2, 0.35, -0.1]} castShadow><boxGeometry args={[0.15, 3.4, 1.25]} /><meshStandardMaterial color="#9b784e" /></mesh>)}
    <mesh position={[0, -1.53, 0.6]} receiveShadow><boxGeometry args={[width + 1.5, 0.3, 4]} /><meshStandardMaterial color="#d9cba9" /></mesh>
    </group>
    {shelfBooks.map((book, index) => focused && selected === index ? null : <Suspense key={book.cover} fallback={null}><Book book={book} index={index} selected={selected} onSelect={onSelect} turn={turn} reduced={reduced} focused={focused} /></Suspense>)}
  </>;
}

export default function RoomBookshelf({ index, focused, onSelect, onFocus }: { index: number; focused: boolean; onSelect: (index: number) => void; onFocus: (focused: boolean) => void; onTurn: () => void }) {
  const book = shelfBooks[index];
  return <section className="sr-only" aria-label="Bookshelf">
    <h2>{book.title}</h2><p>{book.author}</p><p>{book.note}</p>{book.details.map(text => <p key={text}>{text}</p>)}
    <button onClick={() => onFocus(!focused)}>{focused ? 'Return book to shelf' : 'Pick up book'}</button>
    <button onClick={() => onSelect((index + shelfBooks.length - 1) % shelfBooks.length)}>Previous book</button>
    <button onClick={() => onSelect((index + 1) % shelfBooks.length)}>Next book</button>
    <a href={book.synopsisSource} target="_blank" rel="noreferrer">Author / publisher</a>
  </section>;
}
