'use client';

/* oxlint-disable react/react-compiler -- Three.js scene objects are animated through refs. */
import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { ContactShadows, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { ArrowLeft, ArrowRight, RotateCw, X } from 'lucide-react';
import { shelfBooks, type ShelfBook } from './books';
import './room-exhibits.css';
import './book-details.css';

const spacing = 1.85;
const bookX = (index: number) => (index - (shelfBooks.length - 1) / 2) * spacing;

function ShelfCamera({ selected, reduced, focused }: { selected: number; reduced: boolean; focused: boolean }) {
  const { camera, size } = useThree();
  const focus = useRef(new THREE.Vector3());
  useFrame((_, dt) => {
    const mobile = size.width < 650;
    const x = bookX(selected) * (focused || mobile ? 1 : 0.4);
    const distance = focused ? Math.max(6.4, 1.4 / (size.width / size.height) / Math.tan(23 * Math.PI / 180) + 1.35) : mobile ? 6.6 : Math.max(7.5, 4.8 / (size.width / size.height) / Math.tan(23 * Math.PI / 180));
    const blend = reduced ? 1 : 1 - Math.exp(-dt * 5);
    camera.position.lerp(new THREE.Vector3(x + (focused ? 0.15 : 0.35), focused ? 0.25 : 1.1, distance), blend);
    focus.current.lerp(new THREE.Vector3(x, -0.05, 0.5), blend);
    camera.lookAt(focus.current);
  });
  return null;
}

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
    model.current.position.lerp(new THREE.Vector3(bookX(index), active ? -0.15 : -0.224, active ? 1.35 : hovered ? 0.18 : -0.1), blend);
    const scale = active ? 1 : 0.8;
    model.current.scale.lerp(new THREE.Vector3(scale, scale, scale), blend);
    model.current.rotation.y += ((active ? turn + dragAngle.current - 0.12 : -0.32) - model.current.rotation.y) * blend;
  });
  const release = (event: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return;
    event.stopPropagation();
    (event.target as Element).releasePointerCapture(dragging.current.pointer);
    dragging.current = null;
  };
  return <group ref={model} position={[bookX(index), 0, -0.1]} scale={0.8} visible={!focused || active}
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

function Shelf({ selected, onSelect, turn, reduced, focused }: { selected: number; onSelect: (index: number) => void; turn: number; reduced: boolean; focused: boolean }) {
  const width = shelfBooks.length * spacing + 0.8;
  return <>
    <color attach="background" args={['#aebeb0']} />
    <ambientLight intensity={1.7} />
    <directionalLight position={[-3, 7, 6]} intensity={2.5} castShadow shadow-mapSize={[1024, 1024]} />
    <ShelfCamera selected={selected} reduced={reduced} focused={focused} />
    <group visible={!focused}>
    <mesh position={[0, 0.3, -0.65]} receiveShadow><boxGeometry args={[width, 3.4, 0.12]} /><meshStandardMaterial color="#8eaa9b" /></mesh>
    {[-1.28, 2].map(y => <mesh key={y} position={[0, y, -0.1]} castShadow receiveShadow><boxGeometry args={[width + 0.15, 0.16, 1.25]} /><meshStandardMaterial color="#b58c5b" roughness={0.9} /></mesh>)}
    {[-1, 1].map(side => <mesh key={side} position={[side * width / 2, 0.35, -0.1]} castShadow><boxGeometry args={[0.15, 3.4, 1.25]} /><meshStandardMaterial color="#9b784e" /></mesh>)}
    <mesh position={[0, -1.53, 0.6]} receiveShadow><boxGeometry args={[width + 1.5, 0.3, 4]} /><meshStandardMaterial color="#d9cba9" /></mesh>
    </group>
    {shelfBooks.map((book, index) => <Suspense key={book.cover} fallback={null}><Book book={book} index={index} selected={selected} onSelect={onSelect} turn={turn} reduced={reduced} focused={focused} /></Suspense>)}
    <ContactShadows position={[0, -1.37, 0.5]} opacity={0.25} scale={12} blur={2.5} far={5} />
  </>;
}

export default function RoomBookshelf({ onClose, reducedMotion = false }: { onClose: () => void; reducedMotion?: boolean }) {
  const [index, setIndex] = useState(0);
  const [turn, setTurn] = useState(0);
  const [focused, setFocused] = useState(false);
  const panel = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const book = shelfBooks[index];
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = panel.current;
    dialog?.showModal();
    return () => { dialog?.close(); previous?.focus(); };
  }, []);
  useEffect(() => {
    const element = stage.current;
    let accumulated = 0, lastChange = 0;
    function wheel(event: WheelEvent) {
      event.preventDefault();
      if (focused) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (Math.abs(delta) < 1) return;
      accumulated += delta * (event.deltaMode === 1 ? 16 : 1);
      if (Math.abs(accumulated) < 35 || performance.now() - lastChange < 280) return;
      const step = Math.sign(accumulated);
      setIndex(value => Math.max(0, Math.min(shelfBooks.length - 1, value + step)));
      setTurn(0);
      accumulated = 0;
      lastChange = performance.now();
    }
    element?.addEventListener('wheel', wheel, { passive: false });
    return () => element?.removeEventListener('wheel', wheel);
  }, [focused]);
  function select(value: number) { setIndex(Math.max(0, Math.min(shelfBooks.length - 1, value))); setTurn(0); }
  return <dialog ref={panel} className={`room-library room-library-spatial ${focused ? 'is-book-focused' : ''}`} aria-labelledby="room-library-title" onCancel={event => { event.preventDefault(); if (focused) setFocused(false); else onClose(); }} onKeyDown={event => {
    if (event.key === 'Escape' && focused) { event.preventDefault(); event.stopPropagation(); setFocused(false); }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); select(index + (event.key === 'ArrowRight' ? 1 : -1)); }
  }}>
    <header className="room-library-header"><div><span>06 / THE PERSONAL SHELF</span><h1 id="room-library-title">Books I love.</h1></div><button onClick={onClose} aria-label="Close bookshelf"><X size={22} /></button></header>
    <div className="room-shelf-experience">
    <div ref={stage} className="room-shelf-stage" aria-label="Interactive 3D bookshelf. Scroll to browse, click a book for details, and drag the selected book to turn it.">
      <Canvas shadows camera={{ position: [0.35, 1.1, 9], fov: 46 }} dpr={[1, 1.5]}><Shelf selected={index} onSelect={value => { select(value); setFocused(true); }} turn={turn} reduced={reducedMotion} focused={focused} /></Canvas>
      <span className="room-shelf-instructions">{focused ? 'DRAG TO TURN THE BOOK' : 'SCROLL TO BROWSE · CLICK A BOOK FOR DETAILS'}</span>
    </div>
    {focused && <article className="room-book-details" aria-live="polite">
      <button className="room-book-back" onClick={() => setFocused(false)}><ArrowLeft size={14} /> BACK TO SHELF</button>
      <span>{book.category}</span><h2>{book.title}</h2><p className="room-book-author">{book.author}</p>
      <p className="room-book-intro">{book.note}</p>
      <h3>About the book</h3>{book.details.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
      <div className="room-book-themes">{book.themes.map(theme => <span key={theme}>{theme}</span>)}</div>
      <a href={book.synopsisSource} target="_blank" rel="noreferrer">READ MORE · AUTHOR / PUBLISHER ↗</a>
    </article>}
    </div>
    <div className="room-shelf-caption">
      <div className="room-shelf-copy" aria-live="polite">{focused ? <span>BOOK IN FOCUS · DRAG TO INSPECT</span> : <><span>{book.category}</span><h2>{book.title}</h2><p>{book.author}</p><button className="room-book-open" onClick={() => setFocused(true)}>EXPLORE THIS BOOK ↗</button></>}</div>
      <nav className="room-shelf-navigation" aria-label="Browse books">
        <button disabled={index === 0} onClick={() => select(index - 1)} aria-label="Previous book"><ArrowLeft size={18} /></button>
        <span>{String(index + 1).padStart(2, '0')} / {String(shelfBooks.length).padStart(2, '0')}</span>
        <button disabled={index === shelfBooks.length - 1} onClick={() => select(index + 1)} aria-label="Next book"><ArrowRight size={18} /></button>
        <button onClick={() => setTurn(value => value + Math.PI / 2)} aria-label="Turn selected book"><RotateCw size={18} /></button>
      </nav>
    </div>
  </dialog>;
}
