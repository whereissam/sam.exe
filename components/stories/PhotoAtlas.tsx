'use client';
import { SoundToggle } from '../audio/SoundToggle';
import { playSound } from '../audio/sound';
/* oxlint-disable react/react-compiler -- The frame loop updates an explicitly mutable shared position ref for the Three.js camera and traveller. */
/* oxlint-disable next/no-img-element -- Gallery images are locally resized WebP assets from the content importer. */
/* oxlint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- Escape already closes these dialogs through onCancel, so the click handler only adds backdrop dismissal for pointer users. */
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type RefObject,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, useTexture } from '@react-three/drei';
import {
  ArrowLeft,
  ArrowRight,
  Map,
  Minus,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react';
import * as THREE from 'three';
import { stories, type Photo } from '@/content/stories';
import { ModelBoundary } from '../world/DistrictModel';
import { isBackdropClick } from '../ui/backdrop-click';
import {
  atlasPath,
  atlasStateFromPath,
  countryPath,
  photoPath,
} from './atlas-routes';
import {
  TravellerAvatar,
  TravellerPlaceholder,
  TravellerRoutineProps,
  type Character,
  type Motion,
} from '../world/Companions';
import {
  CountryLandmark as Landmark,
  CountryBackdrop,
  landmarkNames,
} from '../world/CountryArchitecture';
import { WorldMap } from '../world/WorldMap';
import { GroundLabel } from '../world/GroundLabel';
import { Rest, type DailyRoutine } from '../world/daily-routine';
import { cameraRelative, type Point } from '../world/movement';
import { followRoute } from '../world/navigation';
import {
  WORLD_MAP_BOUNDS,
  MAP_CAMERA,
  atlasFit,
  labelHeights,
  LANDMARK_SCALE,
  atlasAdvance,
  atlasRoute,
  countriesFromPhotos,
  type AtlasBounds,
  type AtlasCountry,
  type AtlasObstacle,
} from '../world/photo-atlas';

const countries = countriesFromPhotos(stories.photos, stories.journeys);
const labelY = labelHeights(countries);
/** How much larger the traveller stands when the whole world is in view. */
const MAP_FIGURE_SCALE = 2.8;
/** How far the view may be pushed from the middle of the world map. */
const PAN_LIMIT = { x: WORLD_MAP_BOUNDS.halfWidth, z: WORLD_MAP_BOUNDS.maxZ };
const photoX = (index: number, count: number) =>
  (index - (count - 1) / 2) * 5.6;
type Destination = { point: Point; country?: AtlasCountry; sequence: number };
type Vec = [number, number, number];

function Block({
  position,
  size,
  color,
  rotation = [0, 0, 0],
}: {
  position: Vec;
  size: Vec;
  color: string;
  rotation?: Vec;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}
function Tree({
  position,
  pink = false,
  scale = 1,
}: {
  position: Vec;
  pink?: boolean;
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <Block position={[0, 0.55, 0]} size={[0.16, 1.1, 0.16]} color="#9b7954" />
      <mesh position={[0, 1.3, 0]} castShadow>
        <icosahedronGeometry args={[0.66, 1]} />
        <meshStandardMaterial
          color={pink ? '#e3b4bd' : '#9ab77b'}
          flatShading
        />
      </mesh>
      <mesh position={[0.25, 1.6, 0]} castShadow>
        <icosahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial
          color={pink ? '#f0ccd0' : '#bfd19a'}
          flatShading
        />
      </mesh>
    </group>
  );
}
function PhotoTexture({
  photo,
  width,
  height,
}: {
  photo: Photo;
  width: number;
  height: number;
}) {
  const source = useTexture(photo.src);
  const texture = useMemo(() => {
    const clone = source.clone();
    clone.colorSpace = THREE.SRGBColorSpace;
    clone.needsUpdate = true;
    return clone;
  }, [source]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[0, 2.65, 0.145]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}
function PhotoFrame({
  photo,
  x,
  selected,
  onSelect,
}: {
  photo: Photo;
  x: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const height = Math.min(3.1, 4.5 / (photo.width / photo.height)),
    width = (height * photo.width) / photo.height;
  return (
    <group
      position={[x, 0, -0.9]}
      onClick={(event) => {
        if (event.delta > 5) return;
        event.stopPropagation();
        onSelect();
      }}
    >
      <Block
        position={[0, 2.65, 0]}
        size={[width + 0.28, height + 0.28, 0.24]}
        color={selected ? '#e3bc65' : '#c5a77a'}
      />
      <Block
        position={[0, 2.65, 0.126]}
        size={[width + 0.08, height + 0.08, 0.02]}
        color="#fff4d9"
      />
      <ModelBoundary fallback={null}>
        <Suspense fallback={null}>
          <PhotoTexture photo={photo} width={width} height={height} />
        </Suspense>
      </ModelBoundary>
      {[-0.65, 0.65].map((leg) => (
        <Block
          key={leg}
          position={[leg, 0.8, 0]}
          size={[0.1, 1.6, 0.15]}
          color="#99764f"
        />
      ))}
    </group>
  );
}
function Binoculars({ motion }: { motion: RefObject<Motion> }) {
  const glasses = useRef<THREE.Group>(null);
  useFrame(() => {
    if (glasses.current) glasses.current.visible = !motion.current.walking;
  });
  return (
    <group ref={glasses} position={[0, 1.03, 0.27]}>
      {[-0.07, 0.07].map((x) => (
        <group key={x} position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.065, 0.07, 0.2, 10]} />
            <meshStandardMaterial color="#685b45" />
          </mesh>
          <mesh position={[0, -0.105, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.015, 10]} />
            <meshStandardMaterial
              color="#a4d2ce"
              metalness={0.35}
              roughness={0.2}
            />
          </mesh>
        </group>
      ))}
      <Block position={[0, 0, 0]} size={[0.12, 0.035, 0.04]} color="#685b45" />
    </group>
  );
}
function Walker({
  character,
  keys,
  destination,
  bounds,
  obstacles,
  country,
  paused,
  player,
  onArrive,
  onNear,
  onPhotoNear,
  reduced,
  routine,
}: {
  character: Character;
  keys: RefObject<Set<string>>;
  destination: Destination | null;
  bounds: AtlasBounds;
  obstacles: AtlasObstacle[];
  country: AtlasCountry | null;
  paused: boolean;
  player: RefObject<Point>;
  onArrive: (country?: AtlasCountry) => void;
  onNear: (country: AtlasCountry | null) => void;
  onPhotoNear: (index: number) => void;
  reduced: boolean;
  routine: DailyRoutine;
}) {
  const actor = useRef<THREE.Group>(null),
    route = useRef<Point[]>([]),
    pending = useRef<Destination | null>(null);
  const previousNear = useRef<string | null>(null),
    forward = useRef(new THREE.Vector3());
  const motion = useRef<Motion>({
    walking: false,
    phase: 0,
    gesture: null,
    time: 0,
  });
  const rest = useRef(new Rest());
  const [resting, setResting] = useState(false);
  const restingRef = useRef(false);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    rest.current.interrupt();
    route.current = destination
      ? (atlasRoute(player.current, destination.point, bounds, obstacles) ?? [])
      : [];
    pending.current = route.current.length ? destination : null;
    invalidate();
  }, [destination, bounds, obstacles, player, invalidate]);
  useFrame(({ camera }, elapsed) => {
    if (!actor.current || paused) return;
    const dt = Math.min(elapsed, 0.05),
      k = keys.current;
    const x =
      Number(k.has('d') || k.has('arrowright')) -
      Number(k.has('a') || k.has('arrowleft'));
    const z =
      Number(k.has('s') || k.has('arrowdown')) -
      Number(k.has('w') || k.has('arrowup'));
    const before = player.current;
    let next: Point;
    if (x || z) {
      route.current = [];
      pending.current = null;
      camera.getWorldDirection(forward.current);
      const d = cameraRelative(x, z, forward.current);
      next = atlasAdvance(
        before,
        { x: d.x * dt * 3.5, z: d.z * dt * 3.5 },
        bounds,
        obstacles,
      );
    } else
      next = followRoute(before, route.current, dt * (country ? 4.5 : 3.5));
    const dx = next.x - before.x,
      dz = next.z - before.z;
    const moving = Math.hypot(dx, dz) > 0.00001;
    motion.current.walking = moving;
    motion.current.viewing = !!country && !moving;
    if (moving) {
      playSound('step');
      actor.current.rotation.y = Math.atan2(dx, dz);
      motion.current.phase += dt;
    } else if (country) actor.current.rotation.y = Math.PI;
    player.current = next;
    if (country && (x || z))
      onPhotoNear(
        Math.max(
          0,
          Math.min(
            country.photos.length - 1,
            Math.round(next.x / 5.6 + (country.photos.length - 1) / 2),
          ),
        ),
      );
    actor.current.position.set(next.x, 0.12, next.z);
    if (pending.current && !route.current.length) {
      const arrived = pending.current;
      pending.current = null;
      onArrive(arrived.country);
    }
    const isResting = rest.current.step(dt, {
      walking: moving,
      gesturing: false,
      travelling: !!pending.current || route.current.length > 0,
      steering: !!(x || z),
      viewing: !!motion.current.viewing,
    });
    const nextRoutine = rest.current.poseFor(routine);
    if (motion.current.routine !== nextRoutine) invalidate();
    motion.current.routine = nextRoutine;
    if (restingRef.current !== isResting) {
      restingRef.current = isResting;
      setResting(isResting);
    }
    const near = country
      ? null
      : (countries.find(
          (c) =>
            Math.hypot(next.x - c.position.x, next.z - (c.position.z + 1.25)) <
            1.2,
        ) ?? null);
    if (previousNear.current !== (near?.id ?? null)) {
      previousNear.current = near?.id ?? null;
      onNear(near);
    }
    if (moving || route.current.length) invalidate();
  });
  return (
    <group
      ref={actor}
      position={[player.current.x, 0.12, player.current.z]}
      rotation={[0, country ? Math.PI : 0, 0]}
      // The world map is 43 units across, so a traveller at photo-garden scale
      // is a speck on it. On the map they stand as a tabletop figurine instead.
      scale={country ? 1 : MAP_FIGURE_SCALE}
    >
      <ModelBoundary fallback={<TravellerPlaceholder character={character} />}>
        <Suspense fallback={<TravellerPlaceholder character={character} />}>
          <TravellerAvatar
            character={character}
            motion={motion}
            reduced={reduced}
          />
        </Suspense>
      </ModelBoundary>
      {country && <Binoculars motion={motion} />}
      {resting && <TravellerRoutineProps routine={routine} />}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[0.27, 24]} />
        <meshBasicMaterial
          color="#5b4e32"
          transparent
          opacity={0.14}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
function AtlasCamera({
  country,
  player,
  zoom,
  reset,
}: {
  country: AtlasCountry | null;
  player: RefObject<Point>;
  zoom: number;
  reset: number;
}) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { get, size, invalidate } = useThree();
  /** Panning is what lets a zoomed-in visitor reach the edges of the map, but
   *  it must not drift off into empty space, so the point being looked at is
   *  kept inside the map and the camera moves with it. */
  const keepOnMap = useCallback(() => {
    const orbit = controls.current;
    if (!orbit) return;
    const { target, object } = orbit;
    const x = Math.max(-PAN_LIMIT.x, Math.min(PAN_LIMIT.x, target.x));
    const z = Math.max(-PAN_LIMIT.z, Math.min(PAN_LIMIT.z, target.z));
    if (x === target.x && z === target.z) return;
    object.position.x += x - target.x;
    object.position.z += z - target.z;
    target.x = x;
    target.z = z;
  }, []);
  useEffect(() => {
    const camera = get().camera;
    camera.position.set(
      country ? player.current.x : 0,
      country ? 4.6 : MAP_CAMERA.height,
      country ? 11 : MAP_CAMERA.back,
    );
    camera.lookAt(country ? player.current.x : 0, country ? 1.2 : 0, 0);
    camera.zoom =
      (country
        ? Math.min(size.width / 9.8, (size.height - 105) / 6.7)
        : atlasFit(size.width, size.height)) * zoom;
    camera.updateProjectionMatrix();
    invalidate();
  }, [country, get, size.width, size.height, zoom, reset, player, invalidate]);
  useFrame(({ camera }) => {
    if (country) {
      camera.position.x = player.current.x;
      camera.lookAt(player.current.x, 1.2, 0);
    }
  });
  return country ? null : (
    <OrbitControls
      key={reset}
      ref={controls}
      makeDefault
      enablePan
      screenSpacePanning
      onChange={keepOnMap}
      enableDamping={false}
      minPolarAngle={0.35}
      maxPolarAngle={1.15}
      minZoom={4}
      maxZoom={90}
      target={[0, 0, 0]}
      mouseButtons={{
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      }}
      touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE }}
    />
  );
}

export default function PhotoAtlas({
  character = 'sam',
  reduced = false,
  lowPower = false,
  routine = 'work',
  night = false,
}: {
  character?: Character;
  reduced?: boolean;
  lowPower?: boolean;
  routine?: DailyRoutine;
  night?: boolean;
}) {
  const [country, setCountry] = useState<AtlasCountry | null>(null),
    [near, setNear] = useState<AtlasCountry | null>(null);
  const [destination, setDestination] = useState<Destination | null>(null),
    [index, setIndex] = useState(0),
    [note, setNote] = useState<Photo | null>(null);
  const [zoom, setZoom] = useState(1),
    [reset, setReset] = useState(0),
    [active, setActive] = useState(true);
  const keys = useRef(new Set<string>()),
    player = useRef<Point>({ x: 0, z: 2 }),
    wheelTime = useRef(0),
    swipe = useRef<number | null>(null);
  const noteDialog = useRef<HTMLDialogElement>(null);
  const bounds = useMemo<AtlasBounds>(
    () =>
      country
        ? {
            halfWidth: Math.max(4, country.photos.length * 2.8),
            minZ: 0.8,
            maxZ: 4,
          }
        : WORLD_MAP_BOUNDS,
    [country],
  );
  const obstacles = useMemo<AtlasObstacle[]>(
    () =>
      country
        ? []
        : countries.map((c) => ({
            x: c.position.x,
            z: c.position.z - 0.4,
            radius: 0.55,
          })),
    [country],
  );
  function walkTo(point: Point, toCountry?: AtlasCountry) {
    setDestination((d) => ({
      point,
      country: toCountry,
      sequence: (d?.sequence ?? 0) + 1,
    }));
  }
  function enter(next: AtlasCountry) {
    playSound('open');
    keys.current.clear();
    player.current = { x: photoX(0, next.photos.length), z: 2.6 };
    setDestination(null);
    setNear(null);
    setIndex(0);
    setZoom(1);
    setCountry(next);
  }
  function back() {
    playSound('open');
    keys.current.clear();
    player.current = { x: 0, z: 2 };
    setCountry(null);
    setDestination(null);
    setNear(null);
    setZoom(1);
  }
  function choosePhoto(next: number) {
    if (!country) return;
    const i = Math.max(0, Math.min(country.photos.length - 1, next));
    if (i !== index) playSound('photo');
    setIndex(i);
    walkTo({ x: photoX(i, country.photos.length), z: 2.6 });
  }
  useEffect(() => {
    const clear = () => keys.current.clear();
    const visibility = () => {
      setActive(!document.hidden);
      clear();
    };
    const down = (event: KeyboardEvent) => {
      if (event.defaultPrevented || note || !active) return;
      if ((event.target as HTMLElement).closest('input, textarea, select'))
        return;
      const key = event.key.toLowerCase();
      if (
        [
          'w',
          'a',
          's',
          'd',
          'arrowup',
          'arrowdown',
          'arrowleft',
          'arrowright',
        ].includes(key)
      ) {
        event.preventDefault();
        keys.current.add(key);
      }
      if (key === 'e' && near) enter(near);
    };
    const up = (event: KeyboardEvent) =>
      keys.current.delete(event.key.toLowerCase());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [near, note, active]);
  useEffect(() => {
    if (!note) return;
    const trigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const dialog = noteDialog.current;
    keys.current.clear();
    dialog?.showModal();
    return () => {
      dialog?.close();
      trigger?.focus();
    };
  }, [note]);
  /** Keep the address in step with the scene.
   *
   *  These are pushed shallowly rather than navigated, so the 3D world stays
   *  alive while the URL still names what you are looking at. The same routes
   *  exist server-side, so the address is shareable and Back behaves. */
  const entryPath = useRef('');
  useEffect(() => {
    entryPath.current = location.pathname + location.search;
    return () => {
      if (location.pathname.startsWith('/atlas'))
        history.replaceState(null, '', entryPath.current || '/');
    };
  }, []);
  useEffect(() => {
    const path = atlasPath(country?.name, note?.id);
    if (location.pathname !== path)
      history.pushState({ atlas: path }, '', path);
  }, [country, note]);
  useEffect(() => {
    const onPop = () => {
      const state = atlasStateFromPath(location.pathname);
      if (!state) return;
      setNote(state.photo);
      setCountry((shown) =>
        state.country?.name === shown?.name ? shown : state.country,
      );
      if (!state.country) {
        keys.current.clear();
        player.current = { x: 0, z: 2 };
        setDestination(null);
        setNear(null);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const current = country?.photos[index];
  const fallback = (
    <div className="atlas-fallback">
      <p>Choose a destination to explore its photographs.</p>
      {countries.map((c) => (
        <button key={c.id} onClick={() => enter(c)}>
          {c.name} · {c.photos.length} photos
        </button>
      ))}
      {country?.photos.map((p) => (
        <button key={p.id} onClick={() => setNote(p)}>
          {p.title}
        </button>
      ))}
    </div>
  );
  return (
    <section
      className={`memory-atlas ${country ? 'in-country' : ''} ${night ? 'night' : ''}`}
      aria-label="Walkable memory atlas"
    >
      <SoundToggle className="atlas-sound" />
      <header className="atlas-heading">
        {country ? (
          <button onClick={back}>
            <ArrowLeft size={16} /> Back to the atlas
          </button>
        ) : (
          <span>THE DARKROOM / A LITTLE WORLD OF MEMORIES</span>
        )}
        <h2>{country?.name ?? 'A world of little memories.'}</h2>
        <p>
          {country
            ? `${landmarkNames[country.landmark]} · ${country.photos.length} photographs`
            : 'Walk the world map. Find the places behind the photographs.'}
        </p>
      </header>
      <div
        className="atlas-canvas"
        onWheel={(event) => {
          if (
            !country ||
            note ||
            Math.abs(event.deltaY) + Math.abs(event.deltaX) < 8 ||
            Date.now() - wheelTime.current < 500
          )
            return;
          wheelTime.current = Date.now();
          choosePhoto(index + (event.deltaY + event.deltaX > 0 ? 1 : -1));
        }}
        onTouchStart={(event) => {
          swipe.current =
            event.touches.length === 1 ? event.touches[0].clientX : null;
        }}
        onTouchEnd={(event) => {
          if (
            country &&
            swipe.current !== null &&
            Math.abs(event.changedTouches[0].clientX - swipe.current) > 45
          )
            choosePhoto(
              index +
                (event.changedTouches[0].clientX < swipe.current ? 1 : -1),
            );
          swipe.current = null;
        }}
      >
        <ModelBoundary fallback={fallback}>
          <Canvas
            shadows={!lowPower}
            dpr={lowPower ? 1 : [1, 1.5]}
            orthographic
            camera={{ position: [12, 15, 18], zoom: 36, near: 0.1, far: 200 }}
            frameloop={note || !active ? 'never' : 'always'}
            fallback={fallback}
          >
            <ambientLight intensity={night ? 0.62 : 1.5} />
            <hemisphereLight
              args={
                night
                  ? ['#9fb0d8', '#3c4258', 0.75]
                  : ['#fff2cf', '#9cae8b', 1.2]
              }
            />
            <directionalLight
              position={[-4, 12, 8]}
              color={night ? '#cfdaff' : '#fff0c8'}
              intensity={night ? 0.9 : 2}
              castShadow
              shadow-mapSize={[1024, 1024]}
              shadow-camera-left={-25}
              shadow-camera-right={25}
              shadow-camera-top={15}
              shadow-camera-bottom={-15}
              shadow-normalBias={0.05}
            />
            <group key={country?.id ?? 'map'}>
              <mesh
                position={[0, -0.3, 0]}
                receiveShadow
                onClick={(event) => {
                  if (event.delta > 5 || note) return;
                  walkTo({ x: event.point.x, z: event.point.z });
                }}
              >
                {country ? (
                  <boxGeometry
                    args={[
                      Math.max(10, country.photos.length * 5.6 + 2),
                      0.6,
                      8.5,
                    ]}
                  />
                ) : (
                  <boxGeometry args={[44, 0.6, 23]} />
                )}
                <meshStandardMaterial
                  color={
                    country
                      ? night
                        ? '#494334'
                        : '#ead8b1'
                      : night
                        ? '#506d73'
                        : '#c0d9cf'
                  }
                  roughness={1}
                  flatShading
                />
              </mesh>
              {!country && (
                <>
                  <WorldMap night={night} />
                  <GroundLabel
                    title="MEMORY ATLAS  /  NORTH ↑"
                    position={[-12, 0.02, 9]}
                    width={7}
                    dark={night}
                  />
                  {countries.map((c, i) => (
                    <group
                      key={c.id}
                      position={[c.position.x, 0.16, c.position.z]}
                    >
                      <group scale={LANDMARK_SCALE} position={[0, 0, -0.4]}>
                        <Landmark kind={c.landmark} />
                      </group>
                      <mesh
                        position={[0, 0.03, 0]}
                        rotation={[-Math.PI / 2, 0, 0]}
                      >
                        <circleGeometry args={[0.48, 20]} />
                        <meshStandardMaterial color={c.color} />
                      </mesh>
                      <Html
                        center
                        position={[0, labelY[i], 0]}
                        zIndexRange={[5, 0]}
                      >
                        <button
                          className="atlas-place"
                          aria-label={`${c.name}, ${c.photos.length} memories`}
                          onClick={() =>
                            walkTo(
                              { x: c.position.x, z: c.position.z + 1.25 },
                              c,
                            )
                          }
                        >
                          <span>{String(i + 1).padStart(2, '0')}</span>
                          <strong>{c.name}</strong>
                          <small>{c.photos.length} memories ↗</small>
                        </button>
                      </Html>
                    </group>
                  ))}
                </>
              )}
              {country && (
                <>
                  <Block
                    position={[0, 0.025, 2.5]}
                    size={[
                      Math.max(9, country.photos.length * 5.6),
                      0.045,
                      1.2,
                    ]}
                    color={night ? '#5c5540' : '#fff0ce'}
                  />
                  {country.photos.map((p, i) => (
                    <PhotoFrame
                      key={p.id}
                      photo={p}
                      x={photoX(i, country.photos.length)}
                      selected={i === index}
                      onSelect={() => choosePhoto(i)}
                    />
                  ))}
                  {country.photos.map((p, i) => (
                    <Tree
                      key={p.id}
                      position={[photoX(i, country.photos.length) + 2.7, 0, -2]}
                      pink={country.landmark === 'torii'}
                      scale={0.9}
                    />
                  ))}
                  <CountryBackdrop
                    kind={country.landmark}
                    player={player}
                    originX={photoX(0, country.photos.length)}
                  />
                </>
              )}
              <Walker
                character={character}
                keys={keys}
                destination={destination}
                bounds={bounds}
                obstacles={obstacles}
                country={country}
                paused={!!note || !active}
                player={player}
                reduced={reduced}
                routine={routine}
                onNear={setNear}
                onPhotoNear={setIndex}
                onArrive={(c) => {
                  setDestination(null);
                  if (c) enter(c);
                }}
              />
            </group>
            <AtlasCamera
              country={country}
              player={player}
              zoom={zoom}
              reset={reset}
            />
          </Canvas>
        </ModelBoundary>
      </div>
      {!country && (
        <div className="atlas-view-tools">
          <button
            aria-label="Zoom atlas in"
            onClick={() => setZoom((v) => Math.min(2, v + 0.2))}
          >
            <Plus size={17} />
          </button>
          <button
            aria-label="Zoom atlas out"
            onClick={() => setZoom((v) => Math.max(0.6, v - 0.2))}
          >
            <Minus size={17} />
          </button>
          <button
            aria-label="Reset atlas camera"
            onClick={() => {
              setZoom(1);
              setReset((v) => v + 1);
            }}
          >
            <RotateCcw size={17} />
          </button>
        </div>
      )}
      {near && !country && (
        <button className="atlas-enter" onClick={() => enter(near)}>
          Enter {near.name} <ArrowRight size={16} />
          <kbd>E</kbd>
        </button>
      )}
      {country && current ? (
        <div className="atlas-photo-caption" aria-live="polite">
          <span>
            {String(index + 1).padStart(2, '0')} /{' '}
            {String(country.photos.length).padStart(2, '0')} ·{' '}
            {current.location}
          </span>
          <h3>{current.title}</h3>
          <button onClick={() => setNote(current)}>
            Photo notes & credits ↗
          </button>
          {current.demo && <small>DEMO PHOTOGRAPH</small>}
        </div>
      ) : null}
      <nav
        className="atlas-dock"
        aria-label={
          country ? 'Browse country photographs' : 'Walk to a country'
        }
      >
        {country ? (
          <>
            <button
              disabled={index === 0}
              aria-label="Previous memory"
              onClick={() => choosePhoto(index - 1)}
            >
              <ArrowLeft size={18} />
            </button>
            <span>Scroll through the memories</span>
            <button
              disabled={index === country.photos.length - 1}
              aria-label="Next memory"
              onClick={() => choosePhoto(index + 1)}
            >
              <ArrowRight size={18} />
            </button>
          </>
        ) : (
          countries.map((c) => (
            <button
              key={c.id}
              onClick={() =>
                walkTo({ x: c.position.x, z: c.position.z + 1.25 }, c)
              }
            >
              <Map size={13} />
              {c.name}
            </button>
          ))
        )}
      </nav>
      <p className="atlas-page-link">
        <a href={country ? (countryPath(country.name) ?? '/atlas') : '/atlas'}>
          {country
            ? `Open ${country.name} as a page`
            : 'Open the atlas as a page'}{' '}
          ↗
        </a>
      </p>
      <p className="atlas-help">
        {country
          ? 'Scroll / swipe to wander · Your traveller looks through binoculars'
          : 'WASD / arrows to walk · Tap the ground or a destination · Drag to move the map · Right-drag to turn it'}
      </p>
      {note && (
        <dialog
          ref={noteDialog}
          className="atlas-photo-note"
          aria-label={note.title}
          onCancel={(event) => {
            event.stopPropagation();
            setNote(null);
          }}
          onClick={(event) => {
            if (isBackdropClick(event)) setNote(null);
          }}
        >
          <button
            className="atlas-note-close"
            aria-label="Back to the photo garden"
            onClick={() => setNote(null)}
          >
            <X size={20} />
          </button>
          <img
            src={note.src}
            width={note.width}
            height={note.height}
            alt={note.alt}
          />
          <div>
            <small>
              {note.location}
              {note.demo ? ' · DEMO PHOTOGRAPH' : ''}
            </small>
            <h3>{note.title}</h3>
            <p>{note.caption}</p>
            {note.sourceUrl && (
              <a href={note.sourceUrl} target="_blank" rel="noreferrer">
                Photo: {note.credit ?? 'Source'} ↗
              </a>
            )}
            {country && photoPath(country.name, note.id) && (
              <a
                className="atlas-note-page"
                href={photoPath(country.name, note.id)!}
              >
                Open this photograph&apos;s own page ↗
              </a>
            )}
          </div>
        </dialog>
      )}
    </section>
  );
}
