'use client';
/* oxlint-disable react/react-compiler -- Animation mutates Three objects, while React owns discrete journey state. */
import { Suspense, useEffect, useMemo, useRef, type ComponentRef } from 'react';
import { useState } from 'react';
import { TravelTicket } from './TravelTicket';
import { DepartureBoard } from './DepartureBoard';
import { Landscape, CityQuarter, Depot } from './Scenery';
import { platformEdge } from './platform';
import { operationDuration, operationLabel, ticketPose } from './operation';
import { partnerDestination } from './partner';
import { boardingPose } from './boarding';
import { planJourney } from './itinerary';
import { railwayCamera, stationCameraOffset } from './camera';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Billboard,
  OrbitControls,
  PerspectiveCamera,
  RoundedBox,
} from '@react-three/drei';
import * as THREE from 'three';
import {
  TravellerAvatar,
  type Motion,
  type Character,
} from '@/components/world/Companions';
import type { Journey } from '@/content/stories';
import {
  actionPoint,
  prerequisite,
  distance,
  origin,
  route,
  walkable,
  type Action,
  type Point,
  type Trip,
} from './journey';
import {
  radius,
  stopAngle,
  railPoint,
  stopYaw,
  platformToWorld,
  worldToPlatform,
} from './railway';
import { createHold } from './hold';
type Vec = [number, number, number];
type Props = {
  character: Character;
  travelRequest: { city: number | 'home'; sequence: number } | null;
  trip: Trip;
  journeys: Journey[];
  holding: boolean;
  overview: boolean;
  firstPerson: boolean;
  cameraReset: number;
  cancelJourney: number;
  onAutoChange: (active: boolean) => void;
  onStage: (stage: string) => void;
  onProgress: (progress: number) => void;
  onAction: (action: Action, at: Point) => void;
  onArrive: () => void;
  onNearby: (action: Action | null) => void;
};
function Block({ at, size, color }: { at: Vec; size: Vec; color: string }) {
  return (
    <RoundedBox
      position={at}
      args={size}
      radius={Math.min(...size) * 0.12}
      smoothness={1}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={color} roughness={0.75} />
    </RoundedBox>
  );
}
function Sign({
  text,
  at,
  width = 2,
  angle = 0,
  dark = false,
  overlay = false,
  height = (width * 160) / 768,
}: {
  text: string;
  at: Vec;
  width?: number;
  angle?: number;
  dark?: boolean;
  overlay?: boolean;
  height?: number;
}) {
  const gl = useThree((state) => state.gl);
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = Math.max(32, Math.round((canvas.width * height) / width));
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = dark ? '#29473f' : '#f1e6c4';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = dark ? '#f7edcf' : '#29473f';
    let fontSize = canvas.height * 0.66;
    ctx.font = `600 ${fontSize}px sans-serif`;
    const measured = ctx.measureText(text).width;
    fontSize *= Math.min(1, (canvas.width * 0.9) / Math.max(1, measured));
    ctx.font = `600 ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    return map;
  }, [text, dark, width, height, gl]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh
      position={at}
      rotation={[angle, 0, 0]}
      renderOrder={overlay ? 100 : 0}
    >
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture}
        toneMapped={false}
        depthTest={!overlay}
        depthWrite={!overlay}
      />
    </mesh>
  );
}
function Bench({ at }: { at: Vec }) {
  return (
    <group position={at}>
      {[-0.72, 0.72].map((x) => (
        <group key={x}>
          {[-0.22, 0.22].map((z) => (
            <Block
              key={z}
              at={[x, 0.25, z]}
              size={[0.085, 0.5, 0.085]}
              color="#456457"
            />
          ))}
          <Block at={[x, 0.49, 0]} size={[0.11, 0.09, 0.6]} color="#456457" />
          <Block
            at={[x, 0.8, -0.24]}
            size={[0.085, 0.65, 0.085]}
            color="#456457"
          />
          <Block
            at={[x, 0.68, 0.22]}
            size={[0.065, 0.32, 0.065]}
            color="#456457"
          />
          <Block at={[x, 0.85, 0]} size={[0.11, 0.06, 0.62]} color="#b7996c" />
        </group>
      ))}
      <Block at={[0, 0.3, -0.2]} size={[1.5, 0.07, 0.07]} color="#456457" />
      {[-0.2, 0, 0.2].map((z) => (
        <Block
          key={z}
          at={[0, 0.55, z]}
          size={[1.8, 0.09, 0.17]}
          color="#b7996c"
        />
      ))}
      {[0.83, 1.02].map((y) => (
        <group key={y}>
          <Block at={[0, y, -0.24]} size={[1.8, 0.15, 0.07]} color="#b7996c" />
          {[-0.72, 0.72].map((x) => (
            <Block
              key={x}
              at={[x, y, -0.199]}
              size={[0.025, 0.025, 0.012]}
              color="#7d704d"
            />
          ))}
        </group>
      ))}
    </group>
  );
}
function CityModel({ city }: { city: string }) {
  return (
    <group position={[0, 0.2, -4.6]} scale={1.2}>
      <Block at={[0, 0, 0]} size={[3.4, 0.12, 1.7]} color="#c3b48d" />
      {city === 'Berlin' ? (
        <>
          {[-1.2, -0.72, -0.24, 0.24, 0.72, 1.2].map((x) => (
            <Block
              key={x}
              at={[x, 0.66, 0]}
              size={[0.2, 1.2, 0.48]}
              color="#dfd2b4"
            />
          ))}
          <Block at={[0, 1.32, 0]} size={[3.1, 0.22, 0.7]} color="#d7c69e" />
          <Block at={[0, 1.55, 0]} size={[1.5, 0.24, 0.6]} color="#889f8d" />
        </>
      ) : city === 'Tokyo' ? (
        <>
          {[-1, 1].map((x) => (
            <Block
              key={x}
              at={[x, 0.9, 0]}
              size={[0.16, 1.8, 0.18]}
              color="#ac6753"
            />
          ))}
          <Block at={[0, 1.45, 0]} size={[2.5, 0.12, 0.16]} color="#ac6753" />
          <Block at={[0, 1.85, 0]} size={[3, 0.15, 0.3]} color="#4d675e" />
          <Block at={[0, 1.65, 0]} size={[2.7, 0.1, 0.22]} color="#c48e69" />
        </>
      ) : (
        <>
          {[-1, 0, 1].map((x, i) => (
            <group key={x}>
              <Block
                at={[x, (i === 1 ? 2 : 1) / 2, 0]}
                size={[0.65, i === 1 ? 2 : 1, 0.65]}
                color={i === 1 ? '#789e92' : '#c1baa0'}
              />
              {Array.from({ length: i === 1 ? 6 : 3 }, (_, j) => (
                <Block
                  key={j}
                  at={[x, 0.3 + j * 0.27, 0.34]}
                  size={[0.5, 0.07, 0.02]}
                  color="#e7d6ad"
                />
              ))}
            </group>
          ))}
          <Block at={[0, 2.25, 0]} size={[0.08, 0.5, 0.08]} color="#bca878" />
          {city === 'Taipei' &&
            [0, 1, 2, 3, 4].map((i) => (
              <Block
                key={i}
                at={[0, 0.6 + i * 0.3, 0]}
                size={[0.8, 0.08, 0.8]}
                color="#6b8c80"
              />
            ))}
        </>
      )}
    </group>
  );
}
function Suitcase() {
  return (
    <group>
      <Block at={[0, 0, 0]} size={[0.36, 0.42, 0.22]} color="#a57951" />
      <Block at={[0, 0, 0.115]} size={[0.32, 0.37, 0.018]} color="#bd956c" />
      {[-0.105, 0.105].map((x) => (
        <group key={x}>
          <Block at={[x, 0, 0.13]} size={[0.026, 0.4, 0.018]} color="#e1c797" />
          <Block
            at={[x, 0.08, 0.145]}
            size={[0.042, 0.045, 0.014]}
            color="#977840"
          />
          <Block
            at={[x, -0.23, 0]}
            size={[0.055, 0.055, 0.1]}
            color="#394b43"
          />
          <Block
            at={[x * 0.6, 0.235, 0]}
            size={[0.025, 0.07, 0.03]}
            color="#43584b"
          />
        </group>
      ))}
      <Block at={[0, 0.27, 0]} size={[0.15, 0.03, 0.04]} color="#43584b" />
      <Block
        at={[0.08, 0.15, 0.15]}
        size={[0.08, 0.1, 0.012]}
        color="#efe0b7"
      />
      <Sign
        text="S / 01"
        at={[0.08, 0.15, 0.158]}
        width={0.075}
        height={0.035}
      />
    </group>
  );
}
function LuggageRack({ collected }: { collected: boolean }) {
  return (
    <group position={[-4.65, 0, -2.4]}>
      <Block at={[0, 0.08, 0]} size={[1.8, 0.16, 1]} color="#46675b" />
      {[-0.81, 0.81].map((x) => (
        <group key={x}>
          <Block
            at={[x, 0.72, -0.37]}
            size={[0.075, 1.35, 0.075]}
            color="#a58a57"
          />
          <Block
            at={[x, 0.37, 0.38]}
            size={[0.075, 0.65, 0.075]}
            color="#a58a57"
          />
        </group>
      ))}
      <Block at={[0, 0.4, 0]} size={[1.7, 0.1, 0.88]} color="#b69b71" />
      {[-0.65, -0.32, 0, 0.32, 0.65].map((x) => (
        <Block
          key={x}
          at={[x, 0.462, 0]}
          size={[0.025, 0.018, 0.82]}
          color="#d5c299"
        />
      ))}
      <Block at={[0, 0.98, -0.4]} size={[1.7, 0.56, 0.07]} color="#436356" />
      <Sign
        text="LUGGAGE"
        at={[0, 1.09, -0.355]}
        width={1.45}
        height={0.19}
        dark
      />
      <Sign
        text="CASE 01"
        at={[0, 0.87, -0.355]}
        width={1.42}
        height={0.15}
        dark
      />
      <Block at={[0, 0.15, 0.51]} size={[1.5, 0.2, 0.04]} color="#d9c59b" />
      <Sign
        text={collected ? 'COLLECTED' : 'PICK UP HERE'}
        at={[0, 0.15, 0.535]}
        width={1.4}
        height={0.17}
      />
      <Block
        at={[-0.57, 0.63, -0.05]}
        size={[0.3, 0.33, 0.38]}
        color="#738a79"
      />
      <Block
        at={[0.6, 0.59, -0.05]}
        size={[0.25, 0.25, 0.34]}
        color="#a198ad"
      />
    </group>
  );
}
function TicketKiosk({
  city,
  collected,
}: {
  city: string;
  collected: boolean;
}) {
  return (
    <group position={[1, 0, -2]}>
      <Block at={[0, 0.08, 0]} size={[1.02, 0.16, 0.86]} color="#39574c" />
      <Block at={[0, 0.79, -0.04]} size={[0.94, 1.4, 0.68]} color="#b89268" />
      <Block at={[0, 1.5, -0.02]} size={[1.05, 0.1, 0.79]} color="#46675b" />
      <Block at={[0, 1.14, 0.315]} size={[0.79, 0.56, 0.045]} color="#304d43" />
      <Sign
        text="TICKETS"
        at={[0, 1.34, 0.344]}
        width={0.71}
        height={0.1}
        dark
      />
      <Sign
        text={city.toUpperCase()}
        at={[0, 1.16, 0.344]}
        width={0.69}
        height={0.15}
      />
      <Sign
        text="2 PASSENGERS"
        at={[0, 0.99, 0.344]}
        width={0.68}
        height={0.09}
        dark
      />
      <Block
        at={[-0.19, 0.8, 0.34]}
        size={[0.36, 0.045, 0.035]}
        color="#37564a"
      />
      <Sign text="PRINT" at={[-0.19, 0.85, 0.35]} width={0.3} height={0.08} />
      <Block
        at={[0.28, 0.83, 0.34]}
        size={[0.035, 0.17, 0.025]}
        color="#354a40"
      />
      <Block at={[0, 0.62, 0.327]} size={[0.59, 0.16, 0.04]} color="#30473e" />
      <Block at={[0, 0.56, 0.42]} size={[0.67, 0.035, 0.25]} color="#c8b78e" />
      {[-0.32, 0.32].map((x) => (
        <Block
          key={x}
          at={[x, 0.6, 0.42]}
          size={[0.025, 0.09, 0.25]}
          color="#a78e63"
        />
      ))}
      <Sign
        text={collected ? 'COLLECTED' : 'TAKE TICKET'}
        at={[0, 0.38, 0.31]}
        width={0.73}
        height={0.13}
      />
      <Block at={[0, 0.2, 0.31]} size={[0.7, 0.012, 0.018]} color="#927a54" />
    </group>
  );
}
function Carriage({ open }: { open: boolean }) {
  return (
    <group>
      <group position={[-2.35, 0, 0]}>
        <Block at={[0, 0.4, 0]} size={[1.7, 0.24, 1.05]} color="#3e6255" />
        <mesh
          position={[-0.15, 0.85, 0]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[0.39, 0.39, 1.15, 16]} />
          <meshStandardMaterial color="#54796b" />
        </mesh>
        <Block at={[0.52, 1.1, 0]} size={[0.55, 1.2, 0.95]} color="#c9b383" />
        <Block at={[0.52, 1.76, 0]} size={[0.8, 0.12, 1.15]} color="#3f6257" />
        <Block at={[-0.45, 1.4, 0]} size={[0.18, 0.55, 0.18]} color="#485b50" />
        <mesh position={[-0.77, 0.9, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.25, 0.25, 0.05, 16]} />
          <meshStandardMaterial color="#d9b873" />
        </mesh>
        {[-0.5, 0.5].flatMap((x) =>
          [-0.54, 0.54].map((z) => (
            <mesh
              key={x + ':' + z}
              position={[x, 0.23, z]}
              rotation={[Math.PI / 2, 0, 0]}
              castShadow
            >
              <cylinderGeometry args={[0.23, 0.23, 0.12, 12]} />
              <meshStandardMaterial color="#3d5249" />
            </mesh>
          )),
        )}
      </group>
      <Block at={[0, 0.4, 0]} size={[3.1, 0.25, 1.1]} color="#416b62" />
      <Block at={[0, 0.8, -0.55]} size={[3, 0.65, 0.08]} color="#d9c9a0" />
      {[-1.48, 1.48].map((x) => (
        <group key={x}>
          <Block at={[x, 1, 0]} size={[0.1, 1.1, 1.1]} color="#719589" />
          <Block at={[x, 1.6, 0]} size={[0.15, 0.12, 1.2]} color="#476a5e" />
        </group>
      ))}
      {[-1, 1].map((x) => (
        <group key={x}>
          <Block at={[x, 0.9, 0.54]} size={[0.8, 0.7, 0.08]} color="#d9c9a0" />
          <Block
            at={[x, 1.4, -0.56]}
            size={[0.65, 0.35, 0.04]}
            color="#9cbbb0"
          />
          <Block
            at={[x, 0.7, -0.38]}
            size={[0.65, 0.1, 0.24]}
            color="#a894a4"
          />
        </group>
      ))}
      <Block
        at={[open ? 0.8 : 0, 0.95, 0.57]}
        size={[0.72, 0.8, 0.06]}
        color="#6c9285"
      />
      <Block at={[0, 0.25, 0.75]} size={[0.8, 0.1, 0.45]} color="#ccb98d" />
      {[-1, 1].map((x) =>
        [-0.55, 0.55].map((z) => (
          <mesh
            key={`${x}:${z}`}
            position={[x, 0.2, z]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.2, 0.2, 0.15, 16]} />
            <meshStandardMaterial color="#3c5049" />
          </mesh>
        )),
      )}
      <Sign text="ELSEWHERE" at={[0, 0.4, 0.57]} width={1.3} />
    </group>
  );
}
function Platform({ x, count }: { x: number; count: number }) {
  const shapes = useMemo(() => {
    const outline = new THREE.Shape();
    outline.moveTo(-6, 4.3);
    outline.lineTo(6, 4.3);
    for (let i = 0; i <= 64; i++) {
      const px = 6 - (i * 12) / 64;
      outline.lineTo(px, -platformEdge(px, count));
    }
    outline.closePath();
    const line = new THREE.Shape();
    for (let i = 0; i <= 64; i++) {
      const px = -5.8 + (i * 11.6) / 64;
      const z = -platformEdge(px, count) + 0.22;
      if (i === 0) line.moveTo(px, z);
      else line.lineTo(px, z);
    }
    for (let i = 64; i >= 0; i--) {
      const px = -5.8 + (i * 11.6) / 64;
      line.lineTo(px, -platformEdge(px, count) + 0.34);
    }
    line.closePath();
    return { outline, line };
  }, [count]);
  return (
    <group position={[x, 0, 0]}>
      <mesh
        position={[0, -0.44, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <extrudeGeometry
          args={[shapes.outline, { depth: 0.44, bevelEnabled: false }]}
        />
        <meshStandardMaterial color="#b6a58a" />
      </mesh>
      <mesh
        position={[0, 0.045, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <shapeGeometry args={[shapes.outline]} />
        <meshStandardMaterial color="#ded5b9" />
      </mesh>
      <mesh position={[0, 0.065, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <shapeGeometry args={[shapes.line]} />
        <meshStandardMaterial color="#c5a56c" />
      </mesh>
      {[-5.5, 5.5].map((px) => (
        <group key={px}>
          <Block at={[px, 1.1, 1]} size={[0.07, 2.2, 0.07]} color="#607e71" />
          <mesh position={[px, 2.2, 1]}>
            <sphereGeometry args={[0.17, 12, 8]} />
            <meshStandardMaterial
              color="#f3deb1"
              emissive="#f3deb1"
              emissiveIntensity={0.3}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
function RingRail({ count }: { count: number }) {
  const r = radius(count);
  return (
    <group position={[0, 0, r + 2.8]}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.16, 0]}
        receiveShadow
      >
        <ringGeometry args={[r - 0.85, r + 0.85, 160]} />
        <meshStandardMaterial color="#a6ad96" />
      </mesh>
      {[-0.55, 0.55].map((offset) => (
        <mesh
          key={offset}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.01, 0]}
        >
          <torusGeometry args={[r + offset, 0.035, 6, 160]} />
          <meshStandardMaterial color="#718478" roughness={0.65} />
        </mesh>
      ))}
      {Array.from({ length: Math.ceil(r * 10) }, (_, i) => {
        const angle = (i / Math.ceil(r * 10)) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[r * Math.cos(angle), -0.06, r * Math.sin(angle)]}
            rotation={[0, -angle, 0]}
            receiveShadow
          >
            <boxGeometry args={[1.5, 0.08, 0.14]} />
            <meshStandardMaterial color="#9c8b70" />
          </mesh>
        );
      })}
    </group>
  );
}
function World(props: Props) {
  const { trip } = props;
  const count = props.journeys.length;
  const angle =
    trip.area === 'station' ? -Math.PI / 2 : stopAngle(trip.city, count);
  const platformYaw = stopYaw(angle);
  const activeStop = railPoint(angle, count);
  const travelAngle = useRef(angle);
  const zooming = useRef(true);
  const openingView = useRef(true);
  const freeCamera = useRef(false);
  const itinerary = useRef<Action[]>([]);
  const operation = useRef<{ action: Action; time: number } | null>(null);
  const stage = useRef('');
  const paper = useRef<THREE.Group>(null);
  const luggage = useRef<THREE.Group>(null);
  const ticketButton = useRef<THREE.Group>(null);
  useEffect(() => {
    zooming.current = true;
    freeCamera.current = false;
    if (props.cameraReset || props.overview || props.firstPerson)
      openingView.current = false;
  }, [props.overview, props.cameraReset, props.firstPerson]);

  const [boardPage, setBoardPage] = useState(Math.floor(trip.city / 4));
  const pageCount = Math.max(1, Math.ceil(props.journeys.length / 4));
  useEffect(() => {
    setBoardPage(Math.floor(trip.city / 4));
  }, [trip.city]);
  const actor = useRef<THREE.Group>(null),
    partner = useRef<THREE.Group>(null),
    train = useRef<THREE.Group>(null),
    controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const motion = useRef<Motion>({
    walking: false,
    phase: 0,
    gesture: null,
    time: 0,
  });
  const partnerMotion = useRef<Motion>({
    walking: false,
    phase: 0,
    gesture: null,
    time: 0,
  });
  const partnerPosition = useRef(new THREE.Vector3(-3, 0.06, 1));
  const partnerPath = useRef<Point[]>([]);
  const partnerGoal = useRef<Point>({ x: -3, z: 1 });
  const hold = useRef(createHold());
  const space = useRef(false);
  const progress = useRef(0);
  const position = useRef(new THREE.Vector3(-4, 0.06, 1));
  const path = useRef<Point[]>([]),
    pending = useRef<Action | null>(null),
    keys = useRef(new Set<string>()),
    nearest = useRef<Action | null>(null),
    elapsed = useRef(0),
    arrived = useRef(false);
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    itinerary.current = [];
    operation.current = null;
    latest.current.onStage('');
    path.current = [];
    pending.current = null;
    latest.current.onAutoChange(false);
    invalidate();
  }, [props.cancelJourney, invalidate]);
  const latest = useRef(props);
  latest.current = props;
  const fit = Math.max(
    10,
    Math.min(
      size.width / (size.width < 700 ? 18.5 : 15),
      Math.max(140, size.height - 120) / 9,
    ),
  );
  useEffect(() => {
    zooming.current = true;
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.zoom = 1;
      camera.updateProjectionMatrix();
      invalidate();
      return;
    }
    camera.zoom = fit;
    const framing = railwayCamera(count);
    const currentTrip = latest.current.trip;
    const currentAngle =
      currentTrip.area === 'station'
        ? -Math.PI / 2
        : stopAngle(currentTrip.city, count);
    const world =
      currentTrip.phase === 'riding'
        ? railPoint(travelAngle.current, count)
        : platformToWorld(
            position.current,
            currentAngle,
            count,
            origin(currentTrip.area),
          );
    const focus = props.overview
      ? new THREE.Vector3(0, 0, radius(count) + 2.8)
      : openingView.current
        ? new THREE.Vector3(0, 0.7, -0.4)
        : new THREE.Vector3(world.x, 0.7, world.z - 0.5);
    const offset = stationCameraOffset(
      count,
      props.overview ? 0 : stopYaw(currentAngle),
    );
    camera.position
      .copy(focus)
      .add(new THREE.Vector3(offset.x, offset.y, offset.z));
    camera.lookAt(focus);
    controls.current?.target.copy(focus);
    camera.near = framing.near;
    camera.far = framing.far;
    camera.updateProjectionMatrix();
    controls.current?.update();
    invalidate();
  }, [
    camera,
    fit,
    count,
    invalidate,
    props.cameraReset,
    props.firstPerson,
    props.overview,
  ]);
  function commit(action: Action) {
    latest.current.onAction(action, {
      x: position.current.x,
      z: position.current.z,
    });
  }
  function perform(action: Action) {
    if (prerequisite(latest.current.trip, action)) {
      commit(action);
      return;
    }
    if (operation.current) return;
    operation.current = { action, time: 0 };
    invalidate();
  }
  function walkTo(target: Point, action: Action | null = null) {
    if (trip.phase !== 'walking') return;
    openingView.current = false;
    operation.current = null;
    hold.current.cancel();
    const planned = route(
      trip.area,
      { x: position.current.x, z: position.current.z },
      target,
    );
    if (!planned.length && distance(position.current, target) > 0.55) return;
    path.current = planned;
    pending.current = action;
    invalidate();
  }
  function startJourney(destination: number | 'home') {
    const steps = planJourney(trip, destination, count);
    if (!steps.length) return;
    openingView.current = false;
    itinerary.current = steps;
    operation.current = null;
    path.current = [];
    pending.current = null;
    keys.current.clear();
    hold.current.cancel();
    props.onAutoChange(true);
    invalidate();
  }
  function activate(action: Action) {
    if (action.startsWith('city:')) {
      startJourney(Number(action.slice(5)));
      return;
    }
    if (trip.phase !== 'walking') return;
    itinerary.current = [];
    props.onAutoChange(false);
    walkTo(actionPoint(trip, action), action);
  }
  const journeyRef = useRef(startJourney);
  journeyRef.current = startJourney;
  useEffect(() => {
    if (props.travelRequest) journeyRef.current(props.travelRequest.city);
  }, [props.travelRequest]);
  useEffect(() => {
    invalidate();
  }, [props.holding, props.overview, props.cameraReset, invalidate]);
  useEffect(() => {
    hold.current.cancel();
    if (trip.phase === 'riding') {
      elapsed.current = 0;
      arrived.current = false;
      path.current = [];
      pending.current = null;
      keys.current.clear();
    }
    if (trip.phase === 'walking' && Math.abs(position.current.z - 2.8) < 0.2)
      path.current = [{ x: origin(trip.area), z: 1.3 }];
    invalidate();
  }, [trip.phase, trip.area, invalidate]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        e.target.closest(
          'input,textarea,dialog,[contenteditable],a,button:not(.station-hold)',
        )
      )
        return;
      if (latest.current.trip.postcard) return;
      if (
        nearest.current?.startsWith('city:') &&
        (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
      ) {
        e.preventDefault();
        if (!e.repeat) {
          const current = latest.current.trip.city;
          const count = latest.current.journeys.length;
          if (count)
            latest.current.onAction(
              `city:${(current + (e.key === 'ArrowRight' ? 1 : -1) + count) % count}`,
              { x: position.current.x, z: position.current.z },
            );
        }
        return;
      }
      if (
        [
          'w',
          'a',
          's',
          'd',
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
        ].includes(e.key)
      ) {
        e.preventDefault();
        if (
          latest.current.trip.phase !== 'walking' ||
          !walkable(latest.current.trip.area, position.current)
        )
          return;
        hold.current.cancel();
        itinerary.current = [];
        latest.current.onAutoChange(false);
        operation.current = null;
        openingView.current = false;
        keys.current.add(e.key);
        path.current = [];
        pending.current = null;
        invalidate();
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat && !nearest.current?.startsWith('city:'))
          space.current = true;
        invalidate();
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.current.delete(e.key);
      if (e.code === 'Space') {
        space.current = false;
        invalidate();
      }
    };
    const clear = () => {
      keys.current.clear();
      space.current = false;
      hold.current.cancel();
      invalidate();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', clear);
    };
  }, [invalidate]);
  useFrame((_, rawDelta) => {
    // makeDefault switches cameras in an effect. Never write an eye-level pose
    // into the orthographic camera during that transition.
    if (props.firstPerson !== camera instanceof THREE.PerspectiveCamera) {
      invalidate();
      return;
    }
    const delta = Math.min(rawDelta, 0.04);
    const p = position.current;
    if (trip.phase === 'walking' && !walkable(trip.area, p)) {
      p.set(origin(trip.area), 0.06, 1.3);
      path.current = [];
      pending.current = null;
    }
    if (
      trip.phase === 'walking' &&
      !walkable(trip.area, partnerPosition.current)
    ) {
      partnerPosition.current.set(origin(trip.area) + 1, 0.06, 1.3);
      partnerPath.current = [];
      partnerGoal.current = { x: origin(trip.area) + 1, z: 1.3 };
    }
    const before = p.clone();
    let moving = false;
    if (trip.phase === 'riding') {
      elapsed.current += delta;
      let destination =
        trip.destination === null
          ? Math.PI * 1.5
          : stopAngle(trip.destination, count);
      if (destination <= angle) destination += Math.PI * 2;
      const duration = Math.max(4, ((destination - angle) * radius(count)) / 5);
      const t = Math.min(1, Math.max(0, elapsed.current - 0.5) / duration);
      const eased = t * t * (3 - 2 * t);
      travelAngle.current = angle + (destination - angle) * eased;
      const point = railPoint(travelAngle.current, count);
      if (train.current) {
        train.current.position.set(point.x, 0, point.z);
        train.current.rotation.y = stopYaw(travelAngle.current) + Math.PI;
      }
      moving = true;
      if (t === 1 && !arrived.current) {
        arrived.current = true;
        latest.current.onArrive();
      }
    } else if (trip.phase === 'onboard') {
      p.set(origin(trip.area), 0.5, 2.8);
      if (train.current) {
        train.current.position.set(activeStop.x, 0, activeStop.z);
        train.current.rotation.y = platformYaw + Math.PI;
      }
    } else {
      if (train.current) {
        train.current.position.set(activeStop.x, 0, activeStop.z);
        train.current.rotation.y = platformYaw + Math.PI;
      }
      const dx =
        Number(keys.current.has('d') || keys.current.has('ArrowRight')) -
        Number(keys.current.has('a') || keys.current.has('ArrowLeft'));
      const dz =
        Number(keys.current.has('s') || keys.current.has('ArrowDown')) -
        Number(keys.current.has('w') || keys.current.has('ArrowUp'));
      if (dx || dz) {
        const length = Math.hypot(dx, dz),
          step = delta * 2.6;
        const next = {
          x: p.x + (dx / length) * step,
          z: p.z + (dz / length) * step,
        };
        if (walkable(trip.area, { x: next.x, z: p.z })) p.x = next.x;
        if (walkable(trip.area, { x: p.x, z: next.z })) p.z = next.z;
        moving = true;
      } else if (path.current.length) {
        const next = path.current[0];
        if (!walkable(trip.area, next)) {
          path.current = [];
          invalidate();
          return;
        }
        const v = new THREE.Vector3(next.x, 0.06, next.z).sub(p);
        const length = v.length();
        if (length < delta * 2.6) {
          p.set(next.x, 0.06, next.z);
          path.current.shift();
        } else p.addScaledVector(v, (delta * 2.6) / length);
        moving = true;
      }
      if (
        !path.current.length &&
        pending.current?.startsWith('city:') &&
        distance(p, actionPoint(trip, pending.current)) < 0.95
      ) {
        const selectedCity = pending.current;
        pending.current = null;
        perform(selectedCity);
      }
      const choices: Action[] =
        trip.area === 'station'
          ? [
              ...(!trip.bag ? ['bag' as const] : []),
              `city:${trip.city}` as Action,
              'ticket',
              'board',
            ]
          : ['stamp', 'postcard', 'board'];
      const selected = pending.current;
      const action =
        selected &&
        !(selected === 'bag' && trip.bag) &&
        distance(p, actionPoint(trip, selected)) < 0.95
          ? selected
          : (choices.find((a) => distance(p, actionPoint(trip, a)) < 0.95) ??
            null);
      if (action !== nearest.current) {
        nearest.current = action;
        latest.current.onNearby(action);
      }
    }
    const nextAction = itinerary.current[0];
    if (nextAction && !trip.postcard && !operation.current) {
      if (trip.phase === 'onboard' && nextAction === 'alight') {
        itinerary.current.shift();
        perform('alight');
        moving = true;
      } else if (
        trip.phase === 'walking' &&
        nextAction !== 'alight' &&
        !path.current.length
      ) {
        const target = actionPoint(trip, nextAction);
        if (distance(p, target) < 0.6) {
          itinerary.current.shift();
          perform(nextAction);
          moving = true;
        } else {
          walkTo(target);
          if (!path.current.length) {
            itinerary.current = [];
            latest.current.onAutoChange(false);
          }
          moving = true;
        }
      }
    }
    let operationProgress = 0;
    let activeOperation = operation.current?.action ?? null;
    if (operation.current) {
      const boardingAction =
        operation.current.action === 'board' ||
        operation.current.action.startsWith('ride:');
      const waitingForPartner =
        boardingAction &&
        operation.current.time === 0 &&
        distance(partnerPosition.current, {
          x: origin(trip.area) + 1,
          z: 1.3,
        }) > 0.08;
      if (!waitingForPartner) operation.current.time += delta;
      operationProgress = Math.min(
        1,
        operation.current.time / operationDuration(operation.current.action),
      );
      const label = waitingForPartner
        ? '等旅伴到車門，一起上車…'
        : operationLabel(operation.current.action, operationProgress);
      if (label !== stage.current) {
        stage.current = label;
        latest.current.onStage(label);
      }
      moving = true;
      if (operationProgress === 1) {
        const completed = operation.current.action;
        operation.current = null;
        if (completed === 'alight') {
          p.set(origin(trip.area) - 1, 0.06, 1.3);
          partnerPosition.current.set(origin(trip.area) + 1, 0.06, 1.3);
          partnerPath.current = [];
        }
        commit(completed);
        activeOperation = null;
        if (!itinerary.current.length) latest.current.onAutoChange(false);
      }
    } else if (stage.current) {
      stage.current = '';
      latest.current.onStage('');
    }
    if (paper.current) {
      const pose = ticketPose(operationProgress);
      paper.current.visible = activeOperation === 'ticket' && pose.visible;
      paper.current.position.set(1, 0.61, -1.72 + 0.28 * pose.printed);
      paper.current.scale.set(1, 1, Math.max(0.02, pose.printed));
      if (pose.collected > 0)
        paper.current.position.lerp(
          new THREE.Vector3(p.x - 0.18, 0.85, p.z - 0.25),
          pose.collected,
        );
    }
    if (ticketButton.current)
      ticketButton.current.position.z =
        -1.62 -
        (activeOperation === 'ticket' && operationProgress < 0.22
          ? Math.sin((operationProgress / 0.22) * Math.PI) * 0.025
          : 0);
    if (luggage.current) {
      luggage.current.position.set(-4.65, 0.76, -2.35);
      if (activeOperation === 'bag') {
        const lift = THREE.MathUtils.smoothstep(operationProgress, 0.2, 0.5);
        const carry = THREE.MathUtils.smoothstep(operationProgress, 0.5, 1);
        luggage.current.position.y += 0.23 * lift;
        luggage.current.position.lerp(
          new THREE.Vector3(p.x + 0.22, 0.65, p.z - 0.15),
          carry,
        );
        luggage.current.rotation.y = Math.PI * 0.5 * lift * (1 - carry);
        luggage.current.rotation.z = -0.12 * Math.sin(Math.PI * carry);
      }
    }
    motion.current.reach =
      activeOperation === 'ticket' || activeOperation === 'bag'
        ? Math.sin(Math.PI * operationProgress)
        : 0;
    if (actor.current) {
      const previousActorPosition = actor.current.position.clone();
      actor.current.visible = !props.firstPerson;
      const world =
        trip.phase === 'riding'
          ? railPoint(travelAngle.current, count)
          : platformToWorld(p, angle, count, origin(trip.area));
      actor.current.position.set(
        world.x,
        trip.phase === 'riding' ? 0.5 : p.y,
        world.z,
      );
      if (trip.phase === 'riding' || trip.phase === 'onboard') {
        const at = platformToWorld(
          { x: origin(trip.area) - 0.85, z: 2.65 },
          trip.phase === 'riding' ? travelAngle.current : angle,
          count,
          origin(trip.area),
        );
        actor.current.position.set(at.x, 0.525, at.z);
      }
      const movement = p.clone().sub(before);
      let facing = actor.current.rotation.y;
      if (trip.phase === 'riding') facing = -travelAngle.current;
      else if (trip.phase === 'onboard') facing = Math.PI + platformYaw;
      else if (movement.length() > 0.001)
        facing = Math.atan2(movement.x, movement.z) + platformYaw;
      else if ((activeOperation || nearest.current) && !path.current.length) {
        const facingAction = activeOperation ?? nearest.current!;
        const point = actionPoint(trip, facingAction);
        const z =
          facingAction === 'board' || facingAction.startsWith('ride:')
            ? 2.8
            : point.z - 1.3;
        facing = Math.atan2(point.x - p.x, z - p.z) + platformYaw;
      }
      const turn = Math.atan2(
        Math.sin(facing - actor.current.rotation.y),
        Math.cos(facing - actor.current.rotation.y),
      );
      actor.current.rotation.y += turn * (1 - Math.exp(-delta * 10));
      if (Math.abs(turn) > 0.005) moving = true;
      motion.current.walking =
        trip.phase === 'walking' && movement.length() > 0.001;
      if (
        activeOperation === 'board' ||
        activeOperation?.startsWith('ride:') ||
        activeOperation === 'alight'
      ) {
        const pose = boardingPose(
          operationProgress,
          false,
          activeOperation === 'alight',
        );
        const world = platformToWorld(
          { x: origin(trip.area) + pose.x, z: pose.z },
          angle,
          count,
          origin(trip.area),
        );
        const change = new THREE.Vector3(world.x, pose.y, world.z).sub(
          previousActorPosition,
        );
        actor.current.position.set(world.x, pose.y, world.z);
        if (change.length() > 0.001)
          actor.current.rotation.y = Math.atan2(change.x, change.z);
        motion.current.walking =
          operationProgress > 0 && operationProgress < 0.5;
      }
      if (motion.current.walking) motion.current.phase += delta;
    }
    if (partner.current) {
      const previous = partner.current.position.clone();
      const inTrain = trip.phase === 'riding' || trip.phase === 'onboard';
      const boarding =
        activeOperation === 'board' || activeOperation?.startsWith('ride:');
      const alighting = activeOperation === 'alight';
      const trainAngle = trip.phase === 'riding' ? travelAngle.current : angle;
      const seatPoint = platformToWorld(
        { x: origin(trip.area) + 0.85, z: 2.65 },
        trainAngle,
        count,
        origin(trip.area),
      );
      const seat = new THREE.Vector3(seatPoint.x, 0.525, seatPoint.z);
      if (alighting || (boarding && operationProgress > 0)) {
        const pose = boardingPose(operationProgress, true, alighting);
        const world = platformToWorld(
          { x: origin(trip.area) + pose.x, z: pose.z },
          angle,
          count,
          origin(trip.area),
        );
        partner.current.position.set(world.x, pose.y, world.z);
      } else if (inTrain) partner.current.position.copy(seat);
      else {
        const goal = boarding
          ? { x: origin(trip.area) + 1, z: 1.3 }
          : partnerDestination(trip.area, p);
        if (distance(goal, partnerGoal.current) > 0.05) {
          partnerGoal.current = goal;
          partnerPath.current = route(trip.area, partnerPosition.current, goal);
          if (boarding) partnerPath.current.push(goal);
        }
        const next = partnerPath.current[0];
        if (next && !walkable(trip.area, next)) {
          partnerPath.current = [];
          partnerGoal.current = { x: origin(trip.area), z: -3 };
        }
        if (next && walkable(trip.area, next)) {
          const direction = new THREE.Vector3(next.x, 0.06, next.z).sub(
            partnerPosition.current,
          );
          const length = direction.length();
          if (length < delta * 2.8) {
            partnerPosition.current.set(next.x, 0.06, next.z);
            partnerPath.current.shift();
          } else
            partnerPosition.current.addScaledVector(
              direction,
              (delta * 2.8) / length,
            );
          moving = true;
        }
        const world = platformToWorld(
          partnerPosition.current,
          angle,
          count,
          origin(trip.area),
        );
        partner.current.position.set(world.x, 0.06, world.z);
      }
      const movement = partner.current.position.clone().sub(previous);
      partnerMotion.current.walking =
        (!inTrain || alighting) && movement.length() > 0.001;
      let facing = partner.current.rotation.y;
      if (inTrain && !alighting)
        facing = trip.phase === 'riding' ? -trainAngle : Math.PI + platformYaw;
      else if (movement.length() > 0.001)
        facing = Math.atan2(movement.x, movement.z);
      else if (actor.current) facing = actor.current.rotation.y;
      const turn = Math.atan2(
        Math.sin(facing - partner.current.rotation.y),
        Math.cos(facing - partner.current.rotation.y),
      );
      partner.current.rotation.y += turn * (1 - Math.exp(-delta * 9));
      if (Math.abs(turn) > 0.005 || partnerMotion.current.walking)
        moving = true;
      if (partnerMotion.current.walking) partnerMotion.current.phase += delta;
    }
    const interaction =
      itinerary.current.length ||
      operation.current ||
      trip.postcard ||
      path.current.length ||
      keys.current.size ||
      p.distanceTo(before) > 0.001
        ? null
        : trip.phase === 'onboard'
          ? 'alight'
          : trip.phase === 'walking'
            ? nearest.current
            : null;
    const result = hold.current.update(
      space.current || props.holding,
      interaction?.startsWith('city:') ? null : interaction,
      delta,
      !!interaction && !!prerequisite(trip, interaction),
    );
    const percent = Math.round(result.progress * 100);
    if (percent !== progress.current) {
      progress.current = percent;
      latest.current.onProgress(percent);
    }
    if ((result.fired || result.rejected) && interaction) perform(interaction);
    if (result.progress > 0 && result.progress < 1) moving = true;
    const worldPosition = actor.current?.position ?? p;
    if (props.firstPerson && actor.current) {
      // Eye-level camera uses the same heading as the actual traveller.
      const heading = actor.current.rotation.y;
      camera.position
        .copy(worldPosition)
        .add(
          new THREE.Vector3(
            -Math.sin(heading) * 0.22,
            1.4,
            -Math.cos(heading) * 0.22,
          ),
        );
      if (activeOperation === 'ticket' || activeOperation === 'bag') {
        const focus =
          activeOperation === 'ticket'
            ? new THREE.Vector3(1, 0.85, -1.6)
            : new THREE.Vector3(-4.65, 1.15, -2.4);
        camera.lookAt(focus);
      } else
        camera.lookAt(
          camera.position.x + Math.sin(heading) * 5,
          camera.position.y - 0.18,
          camera.position.z + Math.cos(heading) * 5,
        );
      if (moving) invalidate();
      return;
    }
    const target = props.overview
      ? new THREE.Vector3(0, 0, radius(count) + 2.8)
      : openingView.current
        ? new THREE.Vector3(0, 0.7, -0.4)
        : new THREE.Vector3(worldPosition.x, 0.7, worldPosition.z - 0.5);
    const wantedZoom = props.overview
      ? Math.min(size.width, size.height) / (radius(count) * 2 + 22)
      : fit;
    if (
      !freeCamera.current &&
      zooming.current &&
      Math.abs(camera.zoom - wantedZoom) > 0.02
    ) {
      camera.zoom += (wantedZoom - camera.zoom) * (1 - Math.exp(-delta * 5));
      camera.updateProjectionMatrix();
      moving = true;
    } else zooming.current = false;
    if (controls.current && !freeCamera.current) {
      const shift = target
        .sub(controls.current.target)
        .multiplyScalar(1 - Math.exp(-delta * 5));
      if (shift.length() > 0.002) {
        camera.position.add(shift);
        controls.current.target.add(shift);
        controls.current.update();
        moving = true;
      }
    }
    if (moving) invalidate();
  });
  const clickable = (action: Action) => ({
    onClick: (e: { delta: number; stopPropagation: () => void }) => {
      if (e.delta > 5) return;
      e.stopPropagation();
      activate(action);
    },
  });
  return (
    <>
      <group
        onClick={(event) => {
          event.stopPropagation();
          if (event.delta <= 5 && trip.area !== 'station') startJourney('home');
        }}
      >
        <Platform x={0} count={count} />
        <Depot />
        <Billboard position={[0, 4.6, -3.3]}>
          <Sign
            text="ELSEWHERE · HOME"
            at={[0, 0, 0]}
            width={3.4}
            height={0.48}
            dark={trip.area === 'station'}
          />
        </Billboard>
      </group>
      <Landscape count={count} city={trip.city} />
      <RingRail count={count} />
      <mesh
        rotation={[-Math.PI / 2, 0, platformYaw]}
        position={[
          platformToWorld(
            { x: origin(trip.area), z: -0.8 },
            angle,
            count,
            origin(trip.area),
          ).x,
          0.055,
          platformToWorld(
            { x: origin(trip.area), z: -0.8 },
            angle,
            count,
            origin(trip.area),
          ).z,
        ]}
        onClick={(e) => {
          if (e.delta > 5) return;
          e.stopPropagation();
          itinerary.current = [];
          latest.current.onAutoChange(false);
          walkTo(worldToPlatform(e.point, angle, count, origin(trip.area)));
        }}
      >
        <planeGeometry args={[12, 6.8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <group {...clickable('bag')}>
        <LuggageRack collected={trip.bag} />
        {!trip.bag && (
          <group ref={luggage} position={[-4.65, 0.76, -2.35]} scale={1.25}>
            <Suitcase />
          </group>
        )}
      </group>
      <DepartureBoard
        cities={props.journeys}
        selected={trip.city}
        page={boardPage}
        onSelect={(index) => activate(`city:${index}`)}
        onPage={(direction) => {
          if (trip.phase === 'walking' && trip.area === 'station')
            setBoardPage((page) => (page + direction + pageCount) % pageCount);
        }}
      />
      <group {...clickable('ticket')}>
        <TicketKiosk
          city={props.journeys[trip.city]?.city ?? 'Choose a city'}
          collected={trip.ticket === trip.city}
        />
        <group ref={ticketButton} position={[0.81, 0.8, -1.62]}>
          <Block at={[0, 0, 0]} size={[0.32, 0.035, 0.055]} color="#dfc586" />
        </group>
        <group ref={paper} visible={false} position={[1, 0.68, -1.6]}>
          <TravelTicket
            city={props.journeys[trip.city]?.city ?? ''}
            country={props.journeys[trip.city]?.country ?? ''}
          />
        </group>
      </group>
      <Bench at={[4, 0, -1.4]} />
      <Sign
        text="ELSEWHERE STATION"
        at={[0, 0.065, -3.7]}
        width={3.6}
        angle={-Math.PI / 2}
      />
      {props.journeys.map((journey, cityIndex) => {
        const cityAngle = stopAngle(cityIndex, count),
          stop = railPoint(cityAngle, count);
        const active = trip.area === 'city' && trip.city === cityIndex;
        const cityAction = (action: Action) =>
          active
            ? clickable(action)
            : {
                onClick: (e: {
                  delta: number;
                  stopPropagation: () => void;
                }) => {
                  e.stopPropagation();
                  if (e.delta <= 5) activate(`city:${cityIndex}`);
                },
              };
        return (
          <group
            key={journey.id}
            {...(!active ? cityAction('board') : {})}
            position={[stop.x, 0, stop.z]}
            rotation={[0, stopYaw(cityAngle), 0]}
          >
            <group position={[0, 0, -2.8]}>
              <Platform x={0} count={count} />
              <CityQuarter
                count={count}
                city={journey.city}
                selected={trip.city === cityIndex}
              />
              <Billboard position={[0, 4.6, -3.3]}>
                <Sign
                  text={`${trip.city === cityIndex ? '→ ' : ''}${journey.city.toUpperCase()}`}
                  at={[0, 0, 0]}
                  width={3.4}
                  height={0.48}
                  dark={trip.city === cityIndex}
                />
              </Billboard>
              <CityModel city={journey.city} />
              <group {...cityAction('postcard')}>
                <Block
                  at={[-3, 0.75, -2.8]}
                  size={[2.6, 1.5, 1]}
                  color="#a694a8"
                />
                <Sign
                  text="POSTCARDS & STORIES"
                  at={[-3, 1.25, -2.28]}
                  width={2.4}
                />
                {[-3.7, -3, -2.3].map((x) => (
                  <Block
                    key={x}
                    at={[x, 0.65, -2.27]}
                    size={[0.45, 0.35, 0.04]}
                    color="#eadabb"
                  />
                ))}
              </group>
              <group {...cityAction('stamp')}>
                <Block
                  at={[2, 0.65, -2.8]}
                  size={[2.4, 1.3, 1]}
                  color="#759585"
                />
                <Sign
                  text={
                    trip.stamps.includes(cityIndex)
                      ? 'PASSPORT STAMPED ✓'
                      : 'STAMP YOUR PASSPORT'
                  }
                  at={[2, 0.9, -2.28]}
                  width={2.1}
                />
                <Block
                  at={[2, 1.38, -2.6]}
                  size={[0.7, 0.05, 0.45]}
                  color="#f1dfb4"
                />
                <Block
                  at={[2.6, 1.5, -2.65]}
                  size={[0.2, 0.28, 0.2]}
                  color="#ae8063"
                />
              </group>
              <Bench at={[-3.7, 0, 0.2]} />
              <Sign
                text={journey.city.toUpperCase()}
                at={[0, 0.065, -1.8]}
                width={2.7}
                angle={-Math.PI / 2}
              />
              <group {...cityAction('board')}>
                <mesh position={[0, 0.08, 1.3]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.35, 0.42, 32]} />
                  <meshBasicMaterial color="#688e7b" />
                </mesh>
              </group>
            </group>
          </group>
        );
      })}
      <group {...clickable('board')}>
        <mesh position={[0, 0.08, 1.3]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.35, 0.42, 32]} />
          <meshBasicMaterial color="#688e7b" />
        </mesh>
      </group>
      <group
        ref={train}
        position={[activeStop.x, 0, activeStop.z]}
        rotation={[0, platformYaw + Math.PI, 0]}
        onClick={(e) => {
          if (e.delta > 5) return;
          e.stopPropagation();
          if (trip.phase === 'walking') activate('board');
        }}
      >
        <Carriage open={trip.phase !== 'riding'} />
      </group>
      <group ref={partner} position={[-3, 0.06, 1]}>
        <Suspense fallback={null}>
          <TravellerAvatar
            character={props.character === 'sam' ? 'companion' : 'sam'}
            motion={partnerMotion}
            reduced={false}
          />
        </Suspense>
      </group>
      <group ref={actor} position={[-4, 0.06, 1]}>
        <Billboard position={[0, 1.95, 0]}>
          <Sign
            text="YOU ARE HERE"
            at={[0, 0, 0]}
            width={1.5}
            height={0.27}
            overlay
          />
        </Billboard>
        <Suspense fallback={null}>
          <TravellerAvatar
            character={props.character}
            motion={motion}
            reduced={false}
            rightHandItem={
              trip.bag ? (
                <group position={[0, -0.3, 0]} scale={1.25}>
                  <Suitcase />
                </group>
              ) : undefined
            }
          />
        </Suspense>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
          <ringGeometry args={[0.28, 0.32, 24]} />
          <meshBasicMaterial color="#f5e5b6" />
        </mesh>
      </group>
      {!props.firstPerson && (
        <OrbitControls
          ref={controls}
          target={[-4, 0.7, 0.5]}
          enablePan
          screenSpacePanning
          onStart={() => {
            freeCamera.current = true;
            zooming.current = false;
          }}
          touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
          minZoom={
            (Math.min(size.width, size.height) / (radius(count) * 2 + 22)) * 0.8
          }
          maxZoom={fit * 1.7}
          minPolarAngle={0.6}
          maxPolarAngle={1.15}
        />
      )}
    </>
  );
}
export default function StationScene(props: Props) {
  const [touchDevice, setTouchDevice] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(pointer: coarse)');
    const update = () => setTouchDevice(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return (
    <Canvas
      orthographic
      camera={{ position: [3, 10, 13], zoom: 55, near: 0.1, far: 240 }}
      frameloop="demand"
      dpr={touchDevice ? 1 : [1, 1.25]}
      shadows="soft"
      gl={{ antialias: true, powerPreference: 'low-power' }}
    >
      <color attach="background" args={['#b9c8bd']} />
      <ambientLight intensity={1.8} />
      <directionalLight
        position={[5, 14, 7]}
        intensity={2}
        castShadow
        shadow-mapSize={touchDevice ? [1024, 1024] : [2048, 2048]}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-near={0.5}
        shadow-camera-far={120}
        shadow-bias={-0.00004}
        shadow-normalBias={0.02}
        target-position={[0, 0, 16]}
      />
      {props.firstPerson && (
        <PerspectiveCamera makeDefault fov={72} near={0.05} far={400} />
      )}
      <World {...props} />
    </Canvas>
  );
}
