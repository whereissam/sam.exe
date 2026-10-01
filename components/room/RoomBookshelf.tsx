'use client';

/* oxlint-disable react/react-compiler -- Three.js scene objects are animated through refs. */
import { Suspense, useEffect, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { ArrowLeft, ArrowRight, RotateCw } from 'lucide-react';
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

export function ShelfWorld({ selected, onSelect, turn, reduced, focused }: { selected: number; onSelect: (index: number) => void; turn: number; reduced: boolean; focused: boolean }) {
  const width = shelfBooks.length * spacing + 0.8;
  return <>
    <group>
    <mesh position={[0, 0.3, -0.65]} receiveShadow><boxGeometry args={[width, 3.4, 0.12]} /><meshStandardMaterial color="#8eaa9b" /></mesh>
    {[-1.28, 2].map(y => <mesh key={y} position={[0, y, -0.1]} castShadow receiveShadow><boxGeometry args={[width + 0.15, 0.16, 1.25]} /><meshStandardMaterial color="#b58c5b" roughness={0.9} /></mesh>)}
    {[-1, 1].map(side => <mesh key={side} position={[side * width / 2, 0.35, -0.1]} castShadow><boxGeometry args={[0.15, 3.4, 1.25]} /><meshStandardMaterial color="#9b784e" /></mesh>)}
    <mesh position={[0, -1.53, 0.6]} receiveShadow><boxGeometry args={[width + 1.5, 0.3, 4]} /><meshStandardMaterial color="#d9cba9" /></mesh>
    </group>
    {shelfBooks.map((book, index) => <Suspense key={book.cover} fallback={null}><Book book={book} index={index} selected={selected} onSelect={onSelect} turn={turn} reduced={reduced} focused={focused} /></Suspense>)}
  </>;
}

export default function RoomBookshelf({ index, focused, onSelect, onFocus, onTurn }: { index: number; focused: boolean; onSelect: (index: number) => void; onFocus: (focused: boolean) => void; onTurn: () => void }) {
  const book = shelfBooks[index];
  return <section className={`room-shelf-hud ${focused ? 'is-book-focused' : ''}`} aria-label="Bookshelf">
    {focused && <article className="room-book-details" aria-live="polite">
      <button className="room-book-back" onClick={() => onFocus(false)}><ArrowLeft size={14} /> RETURN BOOK TO SHELF</button>
      <span>{book.category}</span><h2>{book.title}</h2><p className="room-book-author">{book.author}</p>
      <p className="room-book-intro">{book.note}</p>
      <h3>About the book</h3>{book.details.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
      <div className="room-book-themes">{book.themes.map(theme => <span key={theme}>{theme}</span>)}</div>
      <a href={book.synopsisSource} target="_blank" rel="noreferrer">READ MORE · AUTHOR / PUBLISHER ↗</a>
    </article>}
    <div className="room-shelf-caption">
      <div className="room-shelf-copy" aria-live="polite">{focused ? <span>DRAG THE BOOK TO TURN IT</span> : <><span>06 / BOOKS I LOVE</span><h2>{book.title}</h2><p>{book.author}</p><button className="room-book-open" onClick={() => onFocus(true)}>PICK UP THIS BOOK ↗</button></>}</div>
      <nav className="room-shelf-navigation" aria-label="Browse books">
        <button disabled={index === 0} onClick={() => onSelect(index - 1)} aria-label="Previous book"><ArrowLeft size={18} /></button>
        <span>{String(index + 1).padStart(2, '0')} / {String(shelfBooks.length).padStart(2, '0')}</span>
        <button disabled={index === shelfBooks.length - 1} onClick={() => onSelect(index + 1)} aria-label="Next book"><ArrowRight size={18} /></button>
        <button onClick={onTurn} aria-label="Turn selected book"><RotateCw size={18} /></button>
      </nav>
    </div>
  </section>;
}
