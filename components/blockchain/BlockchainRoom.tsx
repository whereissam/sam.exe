'use client';
/* oxlint-disable react/react-compiler -- Walkers, crates and the camera are animated by mutating Three.js instances each frame, not React state. */
import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import {
  BoxGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
  SphereGeometry,
  type Group,
} from 'three';
import {
  BAY,
  GATE,
  LEDGER_X,
  LEDGER_Z,
  SLOTS,
  SLOT_STEP,
  SEATS,
  onlineCount,
  seatsUsed,
  slotX,
  walkerPosition,
  type Tx,
  type Walker,
  type World,
} from './simulation';

type Vec = [number, number, number];
export type Poke = 'power' | 'bump' | 'open' | 'tamper';
type Props = {
  world: World;
  audit: boolean[];
  /** Height of the open block, if any. */
  selected: number | null;
  /** Fingerprint of the open block's contents as they are now. */
  contentHash: string | null;
  tried: Poke[];
  paused: boolean;
  clock: () => number;
  onToggle: (index: number) => void;
  onBump: (id: number) => void;
  onBlock: (height: number | null) => void;
  onAlter: (index: number) => void;
};
/** Low fee → high fee, cool to warm. */
export const FEE_COLORS = [
  '#9fb4c0',
  '#8fb89a',
  '#d9c06a',
  '#e2995a',
  '#b86fa8',
];
const REJECT = '#c44b3a';

// Shared geometry and one material per colour keep ~200 meshes down to a
// handful of GPU buffers and shader programs.
const unitBox = new BoxGeometry(1, 1, 1);
const body = new CylinderGeometry(0.1, 0.13, 0.34, 10);
const head = new SphereGeometry(0.1, 12, 10);
const coin = new CylinderGeometry(0.075, 0.075, 0.035, 12);
const wheel = new CylinderGeometry(0.12, 0.12, 0.06, 14);
const materials = new Map<string, MeshStandardMaterial>();
function material(color: string, glow = false) {
  const key = `${color}:${glow}`;
  let found = materials.get(key);
  if (!found) {
    found = new MeshStandardMaterial({
      color,
      roughness: 0.65,
      emissive: color,
      emissiveIntensity: glow ? 0.3 : 0,
    });
    materials.set(key, found);
  }
  return found;
}
function Box({
  at,
  size,
  color,
  glow = false,
}: {
  at: Vec;
  size: Vec;
  color: string;
  glow?: boolean;
}) {
  return (
    <mesh
      position={at}
      scale={size}
      geometry={unitBox}
      material={material(color, glow)}
      castShadow={Math.max(...size) > 0.3}
      receiveShadow
      dispose={null}
    />
  );
}
function Tag({
  at,
  children,
  className = '',
}: {
  at: Vec;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Html center position={at} zIndexRange={[5, 0]}>
      <div className={`chain-tag ${className}`}>{children}</div>
    </Html>
  );
}
function Beacon({ at, label }: { at: Vec; label: string }) {
  return (
    <Html center position={at} zIndexRange={[6, 0]} pointerEvents="none">
      <div className="chain-beacon" aria-hidden="true">
        <span>{label}</span>▼
      </div>
    </Html>
  );
}
const letter = (i: number) => String.fromCharCode(65 + i);
const plural = (n: number, word: string) =>
  `${n} ${word}${n === 1 ? '' : 's'}`;

/** Pointer cursor + highlight for clickable objects. */
function useHover() {
  const [hovered, setHovered] = useState<string | null>(null);
  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : '';
  }, [hovered]);
  useEffect(() => () => void (document.body.style.cursor = ''), []);
  return {
    hovered,
    bind: (id: string, active = true) => ({
      onPointerOver: (e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        if (active) setHovered(id);
      },
      onPointerOut: () => setHovered((h) => (h === id ? null : h)),
    }),
  };
}
type Hover = ReturnType<typeof useHover>;

/** A comic-style bubble that floats over a figure or machine. */
function Bubble({ at, text, tone }: { at: Vec; text: string; tone: string }) {
  return (
    <Html center position={at} zIndexRange={[6, 0]} pointerEvents="none">
      <div className={`chain-bubble is-${tone}`} aria-hidden="true">
        {text}
      </div>
    </Html>
  );
}
/** What a figure is "saying" right now, if anything. */
function speech(w: Walker, now: number): [string, string] | null {
  if (w.bumpedAt !== undefined && now - w.bumpedAt < 1.6)
    return ['+tip!', 'gold'];
  if (w.phase === 'reject') return ['✗ no money!', 'bad'];
  if (w.phase === 'check' && w.until - now < 1) return ['?', 'plain'];
  if (w.phase === 'wait' && now - w.start < 1.2 && w.bumpedAt === undefined)
    return ['✓', 'ok'];
  if (w.phase === 'board') return ['my turn!', 'plain'];
  return null;
}

/** A payment, walking. The coins on its head are its tip: more coins, sooner ride. */
function Figure({
  walker,
  clock,
  hint,
  hover,
  onBump,
}: {
  walker: Walker;
  clock: () => number;
  hint: boolean;
  hover: Hover;
  onBump: (id: number) => void;
}) {
  const ref = useRef<Group>(null);
  const place = () => {
    const g = ref.current;
    if (!g) return;
    const now = clock();
    const p = walkerPosition(walker, now);
    g.position.set(
      p.x,
      p.moving ? Math.abs(Math.sin(now * 9)) * 0.06 : 0,
      p.z,
    );
    if (p.moving)
      g.rotation.y = Math.atan2(
        walker.to[0] - walker.from[0],
        walker.to[1] - walker.from[1],
      );
  };
  useLayoutEffect(place);
  useFrame(place);
  const id = `walker-${walker.id}`;
  const waiting = walker.phase === 'wait';
  const color =
    walker.phase === 'reject' ? REJECT : FEE_COLORS[walker.fee - 1];
  const lit = hover.hovered === id;
  const says = speech(walker, clock());
  const scale = walker.big ? 1.6 : 1.2;
  return (
    <group
      ref={ref}
      {...hover.bind(id, waiting)}
      onClick={(e) => {
        e.stopPropagation();
        if (waiting) onBump(walker.id);
      }}
    >
      <group scale={scale}>
        <mesh
          position={[0, 0.19, 0]}
          geometry={body}
          material={material(color, lit)}
          castShadow
          dispose={null}
        />
        <mesh
          position={[0, 0.46, 0]}
          geometry={head}
          material={material('#e8dcc0', lit)}
          castShadow
          dispose={null}
        />
        {Array.from({ length: walker.fee }, (_, i) => (
          <mesh
            key={i}
            position={[0, 0.58 + i * 0.04, 0]}
            geometry={coin}
            material={material('#e8c76f', true)}
            dispose={null}
          />
        ))}
      </group>
      {hint ? (
        <Beacon at={[0, 1.35, 0]} label="Click to tip them" />
      ) : says ? (
        <Bubble at={[0, 1.05 * scale, 0]} text={says[0]} tone={says[1]} />
      ) : (
        lit && (
          <Html center position={[0, 1.05 * scale, 0]} pointerEvents="none">
            <div className="chain-tip">
              Paying {plural(walker.amount, 'coin')} · tip {walker.fee}
              {waiting && walker.fee < 5 && <em>Click to tip more</em>}
            </div>
          </Html>
        )
      )}
    </group>
  );
}

/** Confetti that pops out of the cart when a ride is sealed. */
function Burst() {
  const ref = useRef<Group>(null);
  const born = useRef<number | null>(null);
  const [bits] = useState(() =>
    Array.from({ length: 14 }, (_, i) => ({
      v: [Math.cos(i * 2.4) * 1.4, 2.6 + (i % 4) * 0.5, Math.sin(i * 2.4) * 1.4] as Vec,
      color: FEE_COLORS[i % FEE_COLORS.length],
    })),
  );
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    born.current ??= clock.elapsedTime;
    const t = clock.elapsedTime - born.current;
    g.visible = t < 1.1;
    g.children.forEach((child, i) => {
      const [vx, vy, vz] = bits[i].v;
      child.position.set(vx * t, vy * t - 4.9 * t * t, vz * t);
      child.rotation.set(t * 6, t * 4, 0);
    });
  });
  return (
    <group ref={ref} position={[BAY[0], 1.4, BAY[1]]}>
      {bits.map((b, i) => (
        <mesh
          key={i}
          geometry={unitBox}
          scale={0.08}
          material={material(b.color, true)}
          dispose={null}
        />
      ))}
    </group>
  );
}
/** A hash drawn as coloured stripes, so "do these match?" needs no hex. */
function Stripes({ hash }: { hash: string }) {
  return (
    <span className="chain-stripes" title={hash}>
      {Array.from({ length: 10 }, (_, i) => (
        <i
          key={i}
          style={{
            background: `hsl(${(parseInt(hash.slice(i * 2, i * 2 + 2), 16) / 255) * 360} 45% 62%)`,
          }}
        />
      ))}
    </span>
  );
}

/** Seat cubes inside a block crate, coloured by each transfer's fee. */
function Seats({ txs }: { txs: Tx[] }) {
  const seats = txs.flatMap((t) => (t.big ? [t.fee, t.fee] : [t.fee]));
  return seats
    .slice(0, SEATS)
    .map((fee, i) => (
      <Box
        key={i}
        at={[(i % 2) * 0.3 - 0.15, 0.2, Math.floor(i / 2) * 0.3 - 0.15]}
        size={[0.26, 0.24, 0.26]}
        color={FEE_COLORS[fee - 1]}
      />
    ));
}
function Crate({
  txs,
  lid,
  color,
  glow = false,
}: {
  txs: Tx[];
  lid: boolean;
  color: string;
  glow?: boolean;
}) {
  return (
    <group>
      <Box
        at={[0, 0.03, 0]}
        size={[0.72, 0.06, 0.72]}
        color={color}
        glow={glow}
      />
      {[-0.34, 0.34].map((d) => (
        <group key={d}>
          <Box
            at={[d, 0.24, 0]}
            size={[0.04, 0.42, 0.72]}
            color={color}
            glow={glow}
          />
          <Box
            at={[0, 0.24, d]}
            size={[0.72, 0.42, 0.04]}
            color={color}
            glow={glow}
          />
        </group>
      ))}
      <Seats txs={txs} />
      {lid && (
        <Box
          at={[0, 0.47, 0]}
          size={[0.76, 0.05, 0.76]}
          color={color}
          glow={glow}
        />
      )}
    </group>
  );
}
/** A sealed block that slides from the loading bay to its ledger slot. */
function LedgerBlock({
  index,
  txs,
  height,
  broken,
  selected,
  hover,
  onOpen,
}: {
  index: number;
  txs: Tx[];
  height: number;
  broken: boolean;
  selected: boolean;
  hover: Hover;
  onOpen: () => void;
}) {
  const ref = useRef<Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    ref.current?.position.set(BAY[0], 0.94, BAY[1]);
  }, []);
  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    const dx = slotX(index) - g.position.x;
    const dz = LEDGER_Z - g.position.z;
    if (Math.abs(dx) + Math.abs(dz) < 0.002) return;
    const k = 1 - Math.exp(-delta * 4);
    g.position.x += dx * k;
    g.position.z += dz * k;
    invalidate();
  });
  const id = `block-${height}`;
  const lit = hover.hovered === id;
  return (
    <group
      ref={ref}
      {...hover.bind(id)}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
    >
      <Crate
        txs={txs}
        lid
        color={broken ? '#b77762' : selected ? '#d6b36b' : '#91aaa0'}
        glow={selected || lit}
      />
      <Html
        center
        position={[0, 0.78, 0]}
        zIndexRange={[4, 0]}
        pointerEvents="none"
      >
        <span className={`chain-height ${broken ? 'is-bad' : ''}`}>
          #{height}
        </span>
      </Html>
    </group>
  );
}

export function RoomObjects({
  world,
  audit,
  selected,
  contentHash,
  tried,
  clock,
  onToggle,
  onBump,
  onBlock,
  onAlter,
}: Props) {
  const hover = useHover();
  const { hovered, bind } = hover;
  const quorum = onlineCount(world) >= 2;
  const waiting = world.walkers
    .filter((w) => w.phase === 'wait')
    .sort((a, b) => b.fee - a.fee || a.id - b.id);
  const checking = world.walkers.some((w) => w.phase === 'check');
  const index = world.blocks.findIndex((b) => b.height === selected);
  const block = world.blocks[index];
  const latest = world.blocks.at(-1);
  const now = clock();
  const alarm = world.alteredAt !== null;
  const fixed = world.restoredAt !== null && now - world.restoredAt < 2.5;
  // One hint at a time, pointing at the next thing worth poking.
  const hint = !tried.includes('power')
    ? 'power'
    : !tried.includes('bump') && waiting.length > 1
      ? 'bump'
      : !tried.includes('open') && latest && selected === null
        ? 'open'
        : null;
  // The last in line is the one that benefits most from paying more.
  const bumpTarget = waiting.at(-1)?.id;
  return (
    <group>
      {hint === 'power' && (
        <Beacon at={[1, 2.6, -1.65]} label="Click to unplug" />
      )}
      {hint === 'open' && (
        <Beacon
          at={[slotX(world.blocks.length - 1), 2.25, LEDGER_Z]}
          label="Click to peek inside"
        />
      )}
      {latest && <Burst key={latest.height} />}
      {/* Room shell */}
      <Box at={[0, -0.2, 0]} size={[11, 0.4, 8]} color="#c3aa84" />
      <Box at={[0, 0.015, 0]} size={[10.7, 0.03, 7.7]} color="#e3d3ae" />
      <Box at={[0, 1.5, -3.9]} size={[11, 3, 0.16]} color="#c1b3ae" />
      <Box at={[-5.4, 0.75, 0]} size={[0.16, 1.5, 8]} color="#c1b3ae" />
      {[-3.5, 0, 3.5].map((x) => (
        <group key={x}>
          <Box at={[x, 1.9, -3.78]} size={[2.5, 1.55, 0.05]} color="#807780" />
          <Box at={[x, 1.9, -3.74]} size={[2.25, 1.3, 0.04]} color="#aaa7a0" />
          <Box at={[x, 1.9, -3.7]} size={[0.045, 1.3, 0.03]} color="#d9c9ab" />
        </group>
      ))}
      {/* Entrance mat, mempool rug and the validators' checkpoint line */}
      <Box at={[-4.7, 0.035, 3.4]} size={[0.9, 0.012, 0.7]} color="#b8a07c" />
      <Box at={[1.7, 0.035, 0.8]} size={[4.6, 0.012, 1.4]} color="#d6c59c" />
      <Box
        at={[GATE[0], 0.04, GATE[1]]}
        size={[1.4, 0.014, 0.08]}
        color={quorum ? '#9a857b' : REJECT}
      />

      {/* 01 · Wallet desk */}
      <group position={[-3.8, 0, -0.6]}>
        <Box at={[0, 0.65, 0]} size={[2.3, 0.16, 1.55]} color="#98734f" />
        {[-0.9, 0.9].flatMap((x) =>
          [-0.5, 0.5].map((z) => (
            <Box
              key={`${x}:${z}`}
              at={[x, 0.31, z]}
              size={[0.12, 0.62, 0.12]}
              color="#775d48"
            />
          )),
        )}
        <group rotation={[-0.2, 0, 0]} position={[0, 1.2, -0.35]}>
          <Box at={[0, 0, 0]} size={[1.6, 0.85, 0.12]} color="#6d7170" />
          <Box at={[0, 0.02, 0.07]} size={[1.42, 0.65, 0.02]} color="#324c49" />
          <Box
            at={[-0.24, 0.1, 0.09]}
            size={[0.65, 0.055, 0.015]}
            color="#c3d5b1"
          />
          <Box
            at={[-0.34, -0.05, 0.09]}
            size={[0.45, 0.035, 0.015]}
            color="#d6bc85"
          />
        </group>
        <Box at={[0, 0.76, 0.2]} size={[1.35, 0.04, 0.42]} color="#777a75" />
        <Tag at={[-0.3, 3.05, -0.3]}>
          <span className="chain-tag-title">01 · Payments start here</span>
          <span className="chain-tag-balance">
            Delivered so far <strong>{world.received}</strong> coins
          </span>
        </Tag>
      </group>

      {/* 02 · Validators: click a server to switch it off or on. */}
      <group position={[1, 0, -1.65]}>
        {world.online.map((online, i) => {
          const id = `server-${i}`;
          return (
            <group
              key={i}
              position={[(i - 1) * 1.65, 0, 0]}
              {...bind(id)}
              onClick={(e) => {
                e.stopPropagation();
                onToggle(i);
              }}
            >
              <Box
                at={[0, 0.12, 0]}
                size={[1.25, 0.24, 1.25]}
                color="#a48f78"
              />
              <Box
                at={[0, 1, 0]}
                size={[0.92, 1.55, 0.83]}
                color={online ? '#88758d' : '#95918c'}
                glow={hovered === id}
              />
              <Box
                at={[0, 1, 0.43]}
                size={[0.76, 1.32, 0.035]}
                color="#544e5c"
              />
              {[0, 1, 2, 3].map((n) => (
                <group key={n}>
                  <Box
                    at={[-0.07, 0.52 + n * 0.31, 0.46]}
                    size={[0.46, 0.17, 0.03]}
                    color="#8f8591"
                  />
                  <Box
                    at={[0.25, 0.52 + n * 0.31, 0.48]}
                    size={[0.06, 0.06, 0.025]}
                    color={
                      !online ? '#665e5b' : checking ? '#e8c76f' : '#b7d5a1'
                    }
                    glow={online}
                  />
                </group>
              ))}
              <Tag at={[0, 2.05, 0]}>
                <button
                  className={`chain-chip ${online ? 'is-ok' : 'is-off'}`}
                  aria-label={`Checker ${letter(i)} is ${online ? 'awake' : 'unplugged'}. Click to ${online ? 'unplug' : 'plug in'}`}
                  onClick={() => onToggle(i)}
                >
                  {letter(i)} · {online ? 'awake' : 'zzz'}
                </button>
              </Tag>
              {online && alarm && (
                <Bubble at={[0, 2.6, 0]} text="✗ that’s not what I have!" tone="bad" />
              )}
              {online && fixed && (
                <Bubble at={[0, 2.6, 0]} text="↺ fixed it" tone="ok" />
              )}
            </group>
          );
        })}
        <Tag at={[3.6, 1.1, 0.3]} className={quorum ? '' : 'is-next'}>
          <span className="chain-tag-title">02 · Checkers</span>
          <span>“Do you really have the money?”</span>
          <span>2 of 3 must say yes · {onlineCount(world)} awake</span>
          {!quorum && (
            <span className="chain-invalid">Not enough checkers awake!</span>
          )}
        </Tag>
      </group>

      {/* 03 · Mempool label */}
      <Tag at={[5.05, 0.05, 0.55]}>
        <span className="chain-tag-title">
          03 · Waiting room · {waiting.length}
        </span>
        <span>More coins on head = rides sooner</span>
      </Tag>

      {/* 04 · Loading bay: the next block fills here. */}
      <group position={[BAY[0], 0, BAY[1]]}>
        <Box at={[0, 0.44, 0]} size={[0.95, 0.88, 0.95]} color="#a48967" />
        {[-0.3, 0.3].flatMap((x) =>
          [-0.48, 0.48].map((z) => (
            <mesh
              key={`${x}:${z}`}
              position={[x, 0.95, z]}
              rotation={[Math.PI / 2, 0, 0]}
              geometry={wheel}
              material={material('#5a5150')}
              dispose={null}
            />
          )),
        )}
        <group position={[0, 0.88, 0]}>
          <Crate
            txs={world.crate}
            lid={world.sealing}
            color={world.sealing ? '#d6b36b' : '#c7b38f'}
            glow={world.sealing}
          />
        </group>
        <Tag at={[0, 0.05, 1.05]}>
          <span className="chain-tag-title">04 · Next ride</span>
          <span>
            {world.sealing
              ? 'Full! Sealing…'
              : `${seatsUsed(world.crate)}/${SEATS} seats taken`}
          </span>
        </Tag>
      </group>

      {/* 05 · Ledger */}
      <Box
        at={[LEDGER_X, 0.44, LEDGER_Z]}
        size={[SLOTS * SLOT_STEP + 0.4, 0.88, 1]}
        color="#a48967"
      />
      <Box
        at={[LEDGER_X, 0.9, LEDGER_Z]}
        size={[SLOTS * SLOT_STEP + 0.55, 0.08, 1.1]}
        color="#d5bf96"
      />
      {Array.from({ length: 4 }, (_, i) => (
        <Box
          key={i}
          at={[slotX(i) + SLOT_STEP / 2, 1.05, LEDGER_Z]}
          size={[0.16, 0.045, 0.045]}
          color={
            world.blocks[i + 1] && audit[i + 1] === false
              ? '#b77762'
              : '#827261'
          }
        />
      ))}
      {world.blocks.map((b, i) => (
        <LedgerBlock
          key={b.height}
          index={i}
          txs={b.txs}
          height={b.height}
          broken={audit[i] === false}
          selected={selected === b.height}
          hover={hover}
          onOpen={() => onBlock(selected === b.height ? null : b.height)}
        />
      ))}
      <Tag at={[LEDGER_X, -0.05, 4.05]}>
        <span className="chain-tag-title">05 · The record book</span>
        {world.blocks.length > 0 ? (
          <span className="chain-tag-row">
            {world.blocks.map((b, i) => (
              <button
                key={b.height}
                aria-pressed={selected === b.height}
                aria-label={`Open block ${b.height}`}
                onClick={() => onBlock(selected === b.height ? null : b.height)}
              >
                #{b.height}
                {audit[i] === false ? '×' : ''}
              </button>
            ))}
          </span>
        ) : (
          <span>Waiting for the first ride</span>
        )}
      </Tag>
      {block && (
        <Tag at={[-3, 0, 5]} className="chain-record">
          <span className="chain-tag-title">
            Ride #{block.height}
            <button
              className="chain-close"
              aria-label="Close block"
              onClick={() => onBlock(null)}
            >
              ×
            </button>
          </span>
          <ul className="chain-txs">
            {block.txs.map((t) => (
              <li key={t.id}>
                <i style={{ background: FEE_COLORS[t.fee - 1] }} />
                Paid {plural(t.amount, 'coin')} · tip {t.fee}
              </li>
            ))}
          </ul>
          <dl className="chain-seal">
            <dt>Seal</dt>
            <dd>
              <Stripes hash={block.hash} />
            </dd>
            <dt>Inside now</dt>
            <dd>{contentHash && <Stripes hash={contentHash} />}</dd>
          </dl>
          <span className={audit[index] === false ? 'chain-invalid' : 'chain-valid'}>
            {audit[index] === false
              ? contentHash === block.hash
                ? '✗ The ride before it was changed'
                : '✗ Doesn’t match: someone edited this!'
              : '✓ Seal matches what’s inside'}
          </span>
          <button
            className={tried.includes('tamper') ? '' : 'chain-go'}
            disabled={world.alteredAt !== null}
            onClick={() => onAlter(index)}
          >
            Try to cheat: change {block.txs[0].amount} → {block.txs[0].amount + 1} coins
          </button>
        </Tag>
      )}

      {world.walkers.map((w) => (
        <Figure
          key={w.id}
          walker={w}
          clock={clock}
          hint={hint === 'bump' && w.id === bumpTarget}
          hover={hover}
          onBump={onBump}
        />
      ))}

      {/* The garden plant grows with every token it receives. */}
      <group
        position={[-4.25, 0, -2.6]}
        scale={1 + Math.min(world.received, 90) / 150}
      >
        <mesh position={[0, 0.26, 0]}>
          <cylinderGeometry args={[0.35, 0.25, 0.52, 12]} />
          <meshStandardMaterial color="#ab8262" />
        </mesh>
        {[-0.2, 0.15, 0].map((x, i) => (
          <mesh
            key={i}
            position={[x, 0.75 + i * 0.16, 0]}
            scale={[0.4, 0.65, 0.35]}
          >
            <icosahedronGeometry args={[0.55, 0]} />
            <meshStandardMaterial color="#87966c" />
          </mesh>
        ))}
      </group>
    </group>
  );
}
function FitRoom() {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    camera.zoom = Math.min(78, size.width / 13.5, size.height / 8.5);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, invalidate]);
  return null;
}
export default function BlockchainRoom(props: Props) {
  return (
    <Canvas
      shadows
      frameloop={props.paused ? 'demand' : 'always'}
      dpr={[1, 1.5]}
      orthographic
      camera={{ position: [10, 11, 15], zoom: 55, near: 0.1, far: 80 }}
      gl={{ antialias: true, powerPreference: 'low-power' }}
    >
      <color attach="background" args={['#a7b5aa']} />
      <ambientLight intensity={1.8} />
      <directionalLight
        position={[-5, 10, 5]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-bias={-0.001}
      />
      <Suspense fallback={null}>
        <RoomObjects {...props} />
      </Suspense>
      <FitRoom />
      <OrbitControls
        target={[0, 0.5, 0]}
        minZoom={16}
        maxZoom={110}
        minPolarAngle={0.35}
        maxPolarAngle={1.25}
        enablePan={false}
      />
    </Canvas>
  );
}
