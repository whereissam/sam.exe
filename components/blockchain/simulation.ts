/**
 * A TxStreet-style model of a tiny network. Every transfer is a walker: it is
 * signed at the desk, checked by validators, waits in the mempool, and boards
 * the next block (highest fee first). Movement is pure data — `from`, `to`,
 * `start` and speed — so the renderer can place each walker for any clock time
 * without the logic ever reading back positions.
 */
export type XZ = [number, number];
export const SEATS = 4;
export const SLOTS = 5;
export const ENTRANCE: XZ = [-4.7, 3.4];
export const DESK: XZ = [-3.8, 0.75];
export const GATE: XZ = [1, -0.45];
/** The ledger table runs along the front edge, leaving the floor to walkers. */
export const LEDGER_Z = 3;
export const BAY: XZ = [4.35, LEDGER_Z];
export const MAX_WALKERS = 12;
export const LEDGER_X = 0.6;
export const SLOT_STEP = 0.85;
export const slotX = (i: number) => LEDGER_X + (i - 2) * SLOT_STEP;
/** Floor footprints walkers must never cross: [minX, maxX, minZ, maxZ]. */
export const FURNITURE = {
  desk: [-4.95, -2.65, -1.38, 0.18],
  ledger: [
    LEDGER_X - (SLOTS * SLOT_STEP + 0.4) / 2,
    LEDGER_X + (SLOTS * SLOT_STEP + 0.4) / 2,
    LEDGER_Z - 0.55,
    LEDGER_Z + 0.55,
  ],
} satisfies Record<string, [number, number, number, number]>;
export const queueSpot = (rank: number): XZ => [
  3.5 - (rank % 7) * 0.6,
  0.5 + Math.floor(rank / 7) * 0.6,
];
/** Higher fees walk faster, like TxStreet. */
export const speedOf = (fee: number) => 0.9 + fee * 0.3;

export type Phase = 'enter' | 'check' | 'wait' | 'board' | 'reject';
export type Tx = { id: number; amount: number; fee: number; big: boolean };
export type Walker = Tx & {
  funded: boolean;
  phase: Phase;
  from: XZ;
  to: XZ;
  start: number;
  /** When the current phase ends (arrival plus any dwell). */
  until: number;
  /** When a visitor last raised this walker's tip. */
  bumpedAt?: number;
};
export type Block = {
  height: number;
  txs: Tx[];
  previous: string;
  hash: string;
};
export type World = {
  walkers: Walker[];
  online: boolean[];
  crate: Tx[];
  crateSince: number;
  sealing: boolean;
  blocks: Block[];
  /** The untampered chain, kept by the other nodes while tampering is shown. */
  honest: Block[] | null;
  alteredAt: number | null;
  nextId: number;
  nextSpawn: number;
  received: number;
  /** Totals for the scoreboard. */
  sealed: number;
  caught: number;
  restoredAt: number | null;
  note: string;
};

export const initialWorld = (now = 0): World => ({
  walkers: [],
  online: [true, true, true],
  crate: [],
  crateSince: now,
  sealing: false,
  blocks: [],
  honest: null,
  alteredAt: null,
  nextId: 1,
  nextSpawn: now + 0.4,
  received: 0,
  sealed: 0,
  caught: 0,
  restoredAt: null,
  note: 'Each little person is a payment. Watch them get checked, wait their turn, and ride into the record book.',
});

const distance = (a: XZ, b: XZ) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const same = (a: XZ, b: XZ) => a[0] === b[0] && a[1] === b[1];
export const seatsUsed = (txs: Tx[]) =>
  txs.reduce((n, t) => n + (t.big ? 2 : 1), 0);
export const onlineCount = (w: World) => w.online.filter(Boolean).length;

/** Where a walker stands at clock time `now`, and whether it is moving. */
export function walkerPosition(w: Walker, now: number) {
  const travel = distance(w.from, w.to) / speedOf(w.fee);
  const k = travel === 0 ? 1 : Math.min(1, Math.max(0, (now - w.start) / travel));
  return {
    x: w.from[0] + (w.to[0] - w.from[0]) * k,
    z: w.from[1] + (w.to[1] - w.from[1]) * k,
    moving: k < 1,
  };
}
function move(w: Walker, to: XZ, now: number, dwell: number): Walker {
  const at = walkerPosition(w, now);
  const from: XZ = [at.x, at.z];
  return {
    ...w,
    from,
    to,
    start: now,
    until: now + distance(from, to) / speedOf(w.fee) + dwell,
  };
}
const byFee = (a: Walker, b: Walker) => b.fee - a.fee || a.id - b.id;

export function spawn(w: World, now: number, rand = Math.random): World {
  const fee = 1 + Math.floor(rand() * 5);
  const walker: Walker = {
    id: w.nextId,
    amount: 1 + Math.floor(rand() * 9),
    fee,
    big: rand() < 0.25,
    funded: rand() >= 0.15,
    phase: 'enter',
    from: ENTRANCE,
    to: ENTRANCE,
    start: now,
    until: now,
  };
  return {
    ...w,
    nextId: w.nextId + 1,
    walkers: [...w.walkers, move(walker, DESK, now, 0.5)],
  };
}

/** Advance every walker whose phase has ended, fill the crate, keep the queue sorted. */
export function tick(w: World, now: number, rand = Math.random): World {
  let world = w;
  if (
    !world.alteredAt &&
    now >= world.nextSpawn &&
    world.walkers.length < MAX_WALKERS
  )
    world = {
      ...spawn(world, now, rand),
      nextSpawn: now + 1.3 + rand() * 1.2,
    };
  let { crate, crateSince, note, caught } = world;
  const quorum = onlineCount(world) >= 2;
  const walkers: Walker[] = [];
  for (const walker of world.walkers) {
    if (walker.until > now || walker.phase === 'wait') {
      walkers.push(walker);
      continue;
    }
    if (walker.phase === 'enter') {
      const gate: XZ = [GATE[0] + ((walker.id % 3) - 1) * 0.3, GATE[1]];
      walkers.push({ ...move(walker, gate, now, 1), phase: 'check' });
    } else if (walker.phase === 'check') {
      if (!quorum) walkers.push({ ...walker, until: now + 0.5 });
      else if (walker.funded) walkers.push({ ...walker, phase: 'wait' });
      else {
        walkers.push({ ...move(walker, ENTRANCE, now, 0), phase: 'reject' });
        caught++;
        note = `Caught! Someone tried to pay ${walker.amount} coins they don’t have. The checkers sent them home.`;
      }
    } else if (walker.phase === 'board') {
      if (crate.length === 0) crateSince = now;
      crate = [
        ...crate,
        {
          id: walker.id,
          amount: walker.amount,
          fee: walker.fee,
          big: walker.big,
        },
      ];
    }
    // A rejected walker that reached the exit simply leaves.
  }
  const waiting = walkers.filter((x) => x.phase === 'wait').sort(byFee);
  const boarding = walkers.some((x) => x.phase === 'board');
  let boarder: Walker | undefined;
  if (!world.alteredAt && !world.sealing && !boarding)
    boarder = waiting.find(
      (x) => seatsUsed(crate) + (x.big ? 2 : 1) <= SEATS,
    );
  const rank = new Map(
    waiting.filter((x) => x !== boarder).map((x, i) => [x.id, i]),
  );
  const next = walkers.map((x) => {
    if (x === boarder) return { ...move(x, BAY, now, 0), phase: 'board' as const };
    const r = rank.get(x.id);
    if (r === undefined) return x;
    const spot = queueSpot(r);
    return same(spot, x.to) ? x : move(x, spot, now, 0);
  });
  let { blocks, honest, alteredAt, restoredAt } = world;
  if (alteredAt !== null && honest && now - alteredAt > 7) {
    blocks = honest;
    honest = null;
    alteredAt = null;
    restoredAt = now;
    caught++;
    note =
      'The other checkers still had the real record book, so the fake edit was thrown out. Back to normal!';
  }
  return {
    ...world,
    walkers: next,
    crate,
    crateSince,
    blocks,
    honest,
    alteredAt,
    restoredAt,
    caught,
    note,
  };
}

/** Seal when the block is full, or has waited a while with nobody who fits. */
export function readyToSeal(w: World, now: number) {
  if (w.sealing || w.alteredAt !== null || w.crate.length === 0) return false;
  if (onlineCount(w) < 2 || w.walkers.some((x) => x.phase === 'board'))
    return false;
  const free = SEATS - seatsUsed(w.crate);
  const fits = w.walkers.some(
    (x) => x.phase === 'wait' && (x.big ? 2 : 1) <= free,
  );
  return free === 0 || (now - w.crateSince > 6 && !fits);
}
export async function forgeBlock(w: World): Promise<Block> {
  const last = w.blocks.at(-1);
  const record = {
    height: (last?.height ?? 0) + 1,
    txs: w.crate,
    previous: last?.hash ?? 'GENESIS',
  };
  return { ...record, hash: await fingerprint(record) };
}
export function commitBlock(w: World, block: Block, now: number): World {
  // Tampering mid-seal, or a block that no longer extends the tip, is dropped.
  if (w.alteredAt !== null || block.previous !== (w.blocks.at(-1)?.hash ?? 'GENESIS'))
    return { ...w, sealing: false };
  return {
    ...w,
    sealing: false,
    crate: [],
    crateSince: now,
    blocks: [...w.blocks, block].slice(-SLOTS),
    received: w.received + block.txs.reduce((n, t) => n + t.amount, 0),
    sealed: w.sealed + 1,
    note: `Ride #${block.height} is full and sealed into the record book. ${block.txs.length} payment${block.txs.length === 1 ? '' : 's'} delivered!`,
  };
}

export function toggle(w: World, index: number): World {
  if (index < 0 || index > 2) return w;
  return { ...w, online: w.online.map((v, i) => (i === index ? !v : v)) };
}
/** Tip more to jump the queue. */
export function bump(w: World, id: number, now: number): World {
  return {
    ...w,
    walkers: w.walkers.map((x) =>
      x.id === id && x.phase === 'wait'
        ? { ...x, fee: Math.min(5, x.fee + 2), bumpedAt: now }
        : x,
    ),
  };
}
export function alter(w: World, index: number, now: number): World {
  const target = w.blocks[index];
  if (w.alteredAt !== null || !target) return w;
  return {
    ...w,
    honest: w.blocks,
    alteredAt: now,
    blocks: w.blocks.map((b, i) =>
      i === index
        ? {
            ...b,
            txs: b.txs.map((t, j) => (j === 0 ? { ...t, amount: t.amount + 1 } : t)),
          }
        : b,
    ),
  };
}

export async function fingerprint(block: Omit<Block, 'hash'>) {
  const bytes = new TextEncoder().encode(
    JSON.stringify([
      block.height,
      block.txs.map((t) => [t.id, t.amount, t.fee]),
      block.previous,
    ]),
  );
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}
/** Verifies each block's hash and its link to the one before it. */
export async function auditChain(blocks: Block[]) {
  let previous = blocks[0]?.previous ?? 'GENESIS';
  const results: boolean[] = [];
  let intact = true;
  for (const block of blocks) {
    intact =
      intact &&
      block.previous === previous &&
      block.hash === (await fingerprint(block));
    results.push(intact);
    previous = block.hash;
  }
  return results;
}
