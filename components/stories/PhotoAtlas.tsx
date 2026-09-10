'use client';
/* oxlint-disable next/no-img-element -- Gallery images are locally resized WebP assets from the content importer. */
import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, useTexture } from '@react-three/drei';
import { ArrowLeft, ArrowRight, Map, Minus, Plus, RotateCcw, X } from 'lucide-react';
import * as THREE from 'three';
import { stories, type Photo } from '@/content/stories';
import { ModelBoundary } from '../world/DistrictModel';
import { TravellerAvatar, TravellerPlaceholder, type Character, type Motion } from '../world/Companions';
import { cameraRelative, type Point } from '../world/movement';
import { followRoute } from '../world/navigation';
import { atlasAdvance, atlasRoute, countriesFromPhotos, type AtlasBounds, type AtlasCountry, type AtlasObstacle } from '../world/photo-atlas';

const countries = countriesFromPhotos(stories.photos, stories.journeys);
const mapRadius = Math.max(6, countries.length * 0.9) + 3;
const photoX = (index: number, count: number) => (index - (count - 1) / 2) * 5.6;
type Destination = { point: Point; country?: AtlasCountry; sequence: number };
type Vec = [number, number, number];

function Block({ position, size, color, rotation = [0, 0, 0] }: { position: Vec; size: Vec; color: string; rotation?: Vec }) {
  return <mesh position={position} rotation={rotation} castShadow receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>;
}
function Tree({ position, pink = false, scale = 1 }: { position: Vec; pink?: boolean; scale?: number }) {
  return <group position={position} scale={scale}>
    <Block position={[0, 0.55, 0]} size={[0.16, 1.1, 0.16]} color="#9b7954" />
    <mesh position={[0, 1.3, 0]} castShadow><icosahedronGeometry args={[0.66, 1]} /><meshStandardMaterial color={pink ? '#e3b4bd' : '#9ab77b'} flatShading /></mesh>
    <mesh position={[0.25, 1.6, 0]} castShadow><icosahedronGeometry args={[0.4, 0]} /><meshStandardMaterial color={pink ? '#f0ccd0' : '#bfd19a'} flatShading /></mesh>
  </group>;
}
function Landmark({ kind }: { kind: AtlasCountry['landmark'] }) {
  if (kind === 'gate') return <group>
    {[-0.8, -0.4, 0, 0.4, 0.8].map((x) => <Block key={x} position={[x, 0.6, 0]} size={[0.17, 1.2, 0.35]} color="#e6d6b5" />)}
    <Block position={[0, 1.3, 0]} size={[2.1, 0.25, 0.6]} color="#e6d6b5" />
    <Block position={[0, 1.56, 0]} size={[0.7, 0.27, 0.35]} color="#7c9c87" />
  </group>;
  if (kind === 'tower') return <group>
    {[0,1,2,3,4].map((i) => <Block key={i} position={[0, 0.25 + i * 0.4, 0]} size={[0.8 - i * 0.09, 0.35, 0.8 - i * 0.09]} color={i % 2 ? '#81ada0' : '#abd0b7'} />)}
    <Block position={[0, 2.2, 0]} size={[0.05, 0.55, 0.05]} color="#eee0b4" />
  </group>;
  if (kind === 'torii') return <group>
    {[-0.7, 0.7].map((x) => <Block key={x} position={[x, 0.9, 0]} size={[0.18, 1.8, 0.2]} color="#c7735a" />)}
    <Block position={[0, 1.6, 0]} size={[1.9, 0.15, 0.25]} color="#c7735a" />
    <Block position={[0, 1.98, 0]} size={[2.2, 0.2, 0.35]} color="#65554a" />
  </group>;
  return <group>{[-0.65, 0, 0.65].map((x, i) => <group key={x}>
    <Block position={[x, (1 + i * 0.4) / 2, 0]} size={[0.45, 1 + i * 0.4, 0.5]} color={['#bac7b6', '#e2c88f', '#9fafb4'][i]} />
    {[0, 1, 2].map((j) => <Block key={j} position={[x, 0.25 + j * 0.3, 0.26]} size={[0.2, 0.09, 0.015]} color="#fff0bc" />)}
  </group>)}</group>;
}
function PhotoTexture({ photo, width, height }: { photo: Photo; width: number; height: number }) {
  const source = useTexture(photo.src);
  const texture = useMemo(() => { const clone = source.clone(); clone.colorSpace = THREE.SRGBColorSpace; clone.needsUpdate = true; return clone; }, [source]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={[0, 2.65, 0.145]}><planeGeometry args={[width, height]} /><meshBasicMaterial map={texture} toneMapped={false} /></mesh>;
}
function PhotoFrame({ photo, x, selected, onSelect }: { photo: Photo; x: number; selected: boolean; onSelect: () => void }) {
  const height = Math.min(3.1, 4.5 / (photo.width / photo.height)), width = height * photo.width / photo.height;
  return <group position={[x, 0, -0.9]} onClick={(event) => { if (event.delta > 5) return; event.stopPropagation(); onSelect(); }}>
    <Block position={[0, 2.65, 0]} size={[width + 0.28, height + 0.28, 0.24]} color={selected ? '#e3bc65' : '#c5a77a'} />
    <Block position={[0, 2.65, 0.126]} size={[width + 0.08, height + 0.08, 0.02]} color="#fff4d9" />
    <ModelBoundary fallback={null}><Suspense fallback={null}><PhotoTexture photo={photo} width={width} height={height} /></Suspense></ModelBoundary>
    {[-0.65, 0.65].map((leg) => <Block key={leg} position={[leg, 0.8, 0]} size={[0.1, 1.6, 0.15]} color="#99764f" />)}
  </group>;
}
function Binoculars() {
  return <group position={[0, 1.03, 0.27]}>
    {[-0.07, 0.07].map((x) => <group key={x} position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow><cylinderGeometry args={[0.065, 0.07, 0.2, 10]} /><meshStandardMaterial color="#685b45" /></mesh>
      <mesh position={[0, -0.105, 0]}><cylinderGeometry args={[0.05, 0.05, 0.015, 10]} /><meshStandardMaterial color="#a4d2ce" metalness={0.35} roughness={0.2} /></mesh>
    </group>)}
    <Block position={[0, 0, 0]} size={[0.12, 0.035, 0.04]} color="#685b45" />
  </group>;
}
function Walker({ character, keys, destination, bounds, obstacles, country, paused, player, onArrive, onNear, reduced }: {
  character: Character; keys: RefObject<Set<string>>; destination: Destination | null; bounds: AtlasBounds; obstacles: AtlasObstacle[];
  country: AtlasCountry | null; paused: boolean; player: RefObject<Point>; onArrive: (country?: AtlasCountry) => void;
  onNear: (country: AtlasCountry | null) => void; reduced: boolean;
}) {
  const actor = useRef<THREE.Group>(null), route = useRef<Point[]>([]), pending = useRef<Destination | null>(null);
  const previousNear = useRef<string | null>(null), forward = useRef(new THREE.Vector3());
  const motion = useRef<Motion>({ walking: false, phase: 0, gesture: null, time: 0 });
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    route.current = destination ? atlasRoute(player.current, destination.point, bounds, obstacles) ?? [] : [];
    pending.current = route.current.length ? destination : null;
    invalidate();
  }, [destination, bounds, obstacles, player, invalidate]);
  useFrame(({ camera }, elapsed) => {
    if (!actor.current || paused) return;
    const dt = Math.min(elapsed, 0.05), k = keys.current;
    const x = Number(k.has('d') || k.has('arrowright')) - Number(k.has('a') || k.has('arrowleft'));
    const z = Number(k.has('s') || k.has('arrowdown')) - Number(k.has('w') || k.has('arrowup'));
    const before = player.current;
    let next: Point;
    if (x || z) {
      route.current = []; pending.current = null;
      camera.getWorldDirection(forward.current);
      const d = cameraRelative(x, z, forward.current);
      next = atlasAdvance(before, { x: d.x * dt * 3.5, z: d.z * dt * 3.5 }, bounds, obstacles);
    } else next = followRoute(before, route.current, dt * (country ? 4.5 : 3.5));
    const dx = next.x - before.x, dz = next.z - before.z;
    const moving = Math.hypot(dx, dz) > 0.00001;
    motion.current.walking = moving;
    motion.current.viewing = !!country && !moving;
    if (moving) { actor.current.rotation.y = Math.atan2(dx, dz); motion.current.phase += dt; }
    else if (country) actor.current.rotation.y = Math.PI;
    player.current = next;
    actor.current.position.set(next.x, 0.12, next.z);
    if (pending.current && !route.current.length) { const arrived = pending.current; pending.current = null; onArrive(arrived.country); }
    const near = country ? null : countries.find((c) => Math.hypot(next.x - c.position.x, next.z - (c.position.z + 1.25)) < 1.2) ?? null;
    if (previousNear.current !== (near?.id ?? null)) { previousNear.current = near?.id ?? null; onNear(near); }
    if (moving || route.current.length) invalidate();
  });
  return <group ref={actor} position={[player.current.x, 0.12, player.current.z]} rotation={[0, country ? Math.PI : 0, 0]}>
    <ModelBoundary fallback={<TravellerPlaceholder character={character} />}><Suspense fallback={<TravellerPlaceholder character={character} />}><TravellerAvatar character={character} motion={motion} reduced={reduced} /></Suspense></ModelBoundary>
    {country && <Binoculars />}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}><circleGeometry args={[0.27, 24]} /><meshBasicMaterial color="#5b4e32" transparent opacity={0.14} depthWrite={false} /></mesh>
  </group>;
}
function AtlasCamera({ country, player, zoom, reset }: { country: AtlasCountry | null; player: RefObject<Point>; zoom: number; reset: number }) {
  const { get, size, invalidate } = useThree();
  useEffect(() => {
    const camera = get().camera;
    camera.position.set(country ? player.current.x : 12, country ? 4.6 : 15, country ? 11 : 18);
    camera.lookAt(country ? player.current.x : 0, country ? 1.8 : 0, 0);
    camera.zoom = (country ? Math.min(size.width / 6.8, size.height / 6.7) : Math.min(size.width / (mapRadius * 2.5), size.height / (mapRadius * 2.1))) * zoom;
    camera.updateProjectionMatrix(); invalidate();
  }, [country, get, size.width, size.height, zoom, reset, player, invalidate]);
  useFrame(({ camera }) => { if (country) { camera.position.x = player.current.x; camera.lookAt(player.current.x, 1.8, 0); } });
  return country ? null : <OrbitControls key={reset} makeDefault enablePan={false} enableDamping={false} minPolarAngle={0.35} maxPolarAngle={1.15} minZoom={12} maxZoom={90} target={[0,0,0]} />;
}

export default function PhotoAtlas({ character = 'sam', reduced = false }: { character?: Character; reduced?: boolean }) {
  const [country, setCountry] = useState<AtlasCountry | null>(null), [near, setNear] = useState<AtlasCountry | null>(null);
  const [destination, setDestination] = useState<Destination | null>(null), [index, setIndex] = useState(0), [note, setNote] = useState<Photo | null>(null);
  const [zoom, setZoom] = useState(1), [reset, setReset] = useState(0), [active, setActive] = useState(true);
  const keys = useRef(new Set<string>()), player = useRef<Point>({ x: 0, z: 2 }), wheelTime = useRef(0), swipe = useRef<number | null>(null);
  const noteDialog = useRef<HTMLDialogElement>(null);
  const bounds = useMemo<AtlasBounds>(() => country ? { halfWidth: Math.max(4, country.photos.length * 2.8), minZ: 0.8, maxZ: 4 } : { radius: mapRadius - 0.4 }, [country]);
  const obstacles = useMemo<AtlasObstacle[]>(() => country ? [] : countries.map((c) => ({ x: c.position.x, z: c.position.z - 0.4, radius: 1 })), [country]);
  function walkTo(point: Point, toCountry?: AtlasCountry) { setDestination((d) => ({ point, country: toCountry, sequence: (d?.sequence ?? 0) + 1 })); }
  function enter(next: AtlasCountry) {
    keys.current.clear(); player.current = { x: photoX(0, next.photos.length), z: 2.6 };
    setDestination(null); setNear(null); setIndex(0); setZoom(1); setCountry(next);
  }
  function back() { keys.current.clear(); player.current = { x: 0, z: 2 }; setCountry(null); setDestination(null); setNear(null); setZoom(1); }
  function choosePhoto(next: number) {
    if (!country) return;
    const i = Math.max(0, Math.min(country.photos.length - 1, next));
    setIndex(i); walkTo({ x: photoX(i, country.photos.length), z: 2.6 });
  }
  useEffect(() => {
    const clear = () => keys.current.clear();
    const visibility = () => { setActive(!document.hidden); clear(); };
    const down = (event: KeyboardEvent) => {
      if (event.defaultPrevented || note || !active) return;
      if ((event.target as HTMLElement).closest('input, textarea, select')) return;
      const key = event.key.toLowerCase();
      if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)) { event.preventDefault(); keys.current.add(key); }
      if (key === 'e' && near) enter(near);
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', clear); document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', visibility); };
  }, [near, note, active]);
  useEffect(() => { if (note) { keys.current.clear(); noteDialog.current?.showModal(); } }, [note]);
  const current = country?.photos[index];
  const fallback = <div className="atlas-fallback"><p>Choose a destination to explore its photographs.</p>{countries.map((c) => <button key={c.id} onClick={() => enter(c)}>{c.name} · {c.photos.length} photos</button>)}{country?.photos.map((p) => <button key={p.id} onClick={() => setNote(p)}>{p.title}</button>)}</div>;
  return <section className={`memory-atlas ${country ? 'in-country' : ''}`} aria-label="Walkable memory atlas">
    <header className="atlas-heading">
      {country ? <button onClick={back}><ArrowLeft size={16} /> Back to the atlas</button> : <span>THE DARKROOM / A LITTLE WORLD OF MEMORIES</span>}
      <h2>{country?.name ?? 'Every place, a little story.'}</h2>
      <p>{country ? `${country.cities.join(' · ')} · ${country.photos.length} photographs` : 'Pick a place. Wander in. Stay a little longer.'}</p>
    </header>
    <div className="atlas-canvas" onWheel={(event) => {
      if (!country || note || Math.abs(event.deltaY) + Math.abs(event.deltaX) < 8 || Date.now() - wheelTime.current < 500) return;
      wheelTime.current = Date.now(); choosePhoto(index + (event.deltaY + event.deltaX > 0 ? 1 : -1));
    }} onTouchStart={(event) => { swipe.current = event.touches.length === 1 ? event.touches[0].clientX : null; }} onTouchEnd={(event) => {
      if (country && swipe.current !== null && Math.abs(event.changedTouches[0].clientX - swipe.current) > 45) choosePhoto(index + (event.changedTouches[0].clientX < swipe.current ? 1 : -1)); swipe.current = null;
    }}>
      <ModelBoundary fallback={fallback}>
        <Canvas shadows dpr={[1, 1.5]} orthographic camera={{ position: [12, 15, 18], zoom: 36, near: 0.1, far: 200 }} frameloop={note || !active ? 'never' : 'always'} fallback={fallback}>
          <ambientLight intensity={1.5} /><hemisphereLight args={['#fff2cf', '#9cae8b', 1.2]} />
          <directionalLight position={[-4, 12, 8]} color="#fff0c8" intensity={2} castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-25} shadow-camera-right={25} shadow-camera-top={15} shadow-camera-bottom={-15} shadow-normalBias={0.05} />
          <group key={country?.id ?? 'map'}>
            <mesh position={[0, -0.3, 0]} receiveShadow onClick={(event) => { if (event.delta > 5 || note) return; walkTo({ x: event.point.x, z: event.point.z }); }}>
              {country ? <boxGeometry args={[Math.max(10, country.photos.length * 5.6 + 2), 0.6, 8.5]} /> : <cylinderGeometry args={[mapRadius, mapRadius - 0.3, 0.6, 12]} />}
              <meshStandardMaterial color={country ? '#ead8b1' : '#e6d9b5'} roughness={1} flatShading />
            </mesh>
            {!country && countries.map((c, i) => <group key={c.id}>
              <Block position={[c.position.x / 2, 0.015, (c.position.z + 1.25) / 2]} size={[0.7, 0.05, Math.hypot(c.position.x, c.position.z + 1.25)]} rotation={[0, Math.atan2(c.position.x, c.position.z + 1.25), 0]} color="#f8edcc" />
              <group position={[c.position.x, 0.04, c.position.z]}>
                <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[2.2, 9]} /><meshStandardMaterial color={c.color} roughness={1} /></mesh>
                <group position={[0,0,-0.4]}><Landmark kind={c.landmark} /></group>
                <Tree position={[-1.5,0,-0.5]} pink={c.landmark === 'torii'} scale={0.75} />
                <Tree position={[1.4,0,-0.7]} pink={c.landmark === 'torii'} scale={0.6} />
                <Html center position={[0,3,0]} zIndexRange={[5,0]}><button className="atlas-place" onClick={() => walkTo({ x: c.position.x, z: c.position.z + 1.25 }, c)}><span>{String(i+1).padStart(2,'0')}</span><strong>{c.name}</strong><small>{c.photos.length} memories ↗</small></button></Html>
              </group>
            </group>)}
            {country && <>
              <Block position={[0,0.025,2.5]} size={[Math.max(9,country.photos.length*5.6),0.045,1.2]} color="#fff0ce" />
              {country.photos.map((p,i) => <PhotoFrame key={p.id} photo={p} x={photoX(i,country.photos.length)} selected={i === index} onSelect={() => choosePhoto(i)} />)}
              {country.photos.map((p,i) => <Tree key={p.id} position={[photoX(i,country.photos.length)+2.7,0,-2]} pink={country.landmark === 'torii'} scale={0.9} />)}
              <group position={[photoX(0,country.photos.length)-3.8,0,-1]} scale={0.65}><Landmark kind={country.landmark} /></group>
            </>}
            <Walker character={character} keys={keys} destination={destination} bounds={bounds} obstacles={obstacles} country={country} paused={!!note || !active} player={player} reduced={reduced} onNear={setNear} onArrive={(c) => { setDestination(null); if (c) enter(c); }} />
          </group>
          <AtlasCamera country={country} player={player} zoom={zoom} reset={reset} />
        </Canvas>
      </ModelBoundary>
    </div>
    {!country && <div className="atlas-view-tools"><button aria-label="Zoom atlas in" onClick={() => setZoom((v) => Math.min(2,v+0.2))}><Plus size={17} /></button><button aria-label="Zoom atlas out" onClick={() => setZoom((v) => Math.max(0.6,v-0.2))}><Minus size={17} /></button><button aria-label="Reset atlas camera" onClick={() => { setZoom(1); setReset((v) => v+1); }}><RotateCcw size={17} /></button></div>}
    {near && !country && <button className="atlas-enter" onClick={() => enter(near)}>Enter {near.name} <ArrowRight size={16} /><kbd>E</kbd></button>}
    {country && current ? <div className="atlas-photo-caption" aria-live="polite"><span>{String(index+1).padStart(2,'0')} / {String(country.photos.length).padStart(2,'0')} · {current.location}</span><h3>{current.title}</h3><button onClick={() => setNote(current)}>Photo notes & credits ↗</button>{current.demo && <small>DEMO PHOTOGRAPH</small>}</div> : null}
    <nav className="atlas-dock" aria-label={country ? 'Browse country photographs' : 'Walk to a country'}>
      {country ? <><button disabled={index === 0} aria-label="Previous memory" onClick={() => choosePhoto(index-1)}><ArrowLeft size={18} /></button><span>Scroll through the memories</span><button disabled={index === country.photos.length-1} aria-label="Next memory" onClick={() => choosePhoto(index+1)}><ArrowRight size={18} /></button></> : countries.map((c) => <button key={c.id} onClick={() => walkTo({x:c.position.x,z:c.position.z+1.25}, c)}><Map size={13} />{c.name}</button>)}
    </nav>
    <div className="atlas-walk-controls" aria-label="Move your traveller">{[['w','↑'],['a','←'],['s','↓'],['d','→']].map(([key,label]) => <button key={key} aria-label={`Walk ${key === 'w' ? 'forward' : key === 'a' ? 'left' : key === 's' ? 'backward' : 'right'}`} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); keys.current.add(key); }} onPointerUp={() => keys.current.delete(key)} onPointerCancel={() => keys.current.delete(key)} onLostPointerCapture={() => keys.current.delete(key)}>{label}</button>)}</div>
    <p className="atlas-help">{country ? 'Scroll / swipe to wander · Your traveller looks through binoculars' : 'WASD / arrows to walk · Tap the ground or a destination'}</p>
    {note && <dialog ref={noteDialog} className="atlas-photo-note" aria-label={note.title} onCancel={(event) => { event.stopPropagation(); setNote(null); }}><button className="atlas-note-close" aria-label="Back to the photo garden" onClick={() => setNote(null)}><X size={20} /></button><img src={note.src} width={note.width} height={note.height} alt={note.alt} /><div><small>{note.location}{note.demo ? ' · DEMO PHOTOGRAPH' : ''}</small><h3>{note.title}</h3><p>{note.caption}</p>{note.sourceUrl && <a href={note.sourceUrl} target="_blank" rel="noreferrer">Photo: {note.credit ?? 'Source'} ↗</a>}</div></dialog>}
  </section>;
}
