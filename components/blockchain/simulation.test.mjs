import { test, expect } from 'bun:test';
import {
  initialWorld,
  spawn,
  tick,
  readyToSeal,
  forgeBlock,
  commitBlock,
  toggle,
  bump,
  alter,
  auditChain,
  walkerPosition,
  seatsUsed,
  BAY,
  DESK,
  ENTRANCE,
  FURNITURE,
  GATE,
  queueSpot,
  SEATS,
  SLOTS,
} from './simulation';

// rand() values in spawn order: fee, amount, big, funded.
const rolls = (...values) => {
  let i = 0;
  return () => values[i++ % values.length];
};
const walker = (fee, { big = false, funded = true } = {}) =>
  rolls((fee - 1) / 5, 0.3, big ? 0 : 0.9, funded ? 0.9 : 0);
/** Run the clock forward in small steps without spawning anyone new. */
function run(world, from, to) {
  let w = { ...world, nextSpawn: Infinity };
  for (let t = from; t <= to; t += 0.1) w = tick(w, t);
  return { ...w, nextSpawn: world.nextSpawn };
}
async function seal(world, now) {
  return commitBlock(world, await forgeBlock(world), now);
}

test('a walker moves from the entrance toward the desk at its fee speed', () => {
  const w = spawn(initialWorld(), 0, walker(5));
  const [x] = w.walkers;
  expect(x.phase).toBe('enter');
  expect(walkerPosition(x, 0)).toEqual({ x: ENTRANCE[0], z: ENTRANCE[1], moving: true });
  const end = walkerPosition(x, 100);
  expect([end.x, end.z, end.moving]).toEqual([DESK[0], DESK[1], false]);
  const slow = spawn(initialWorld(), 0, walker(1)).walkers[0];
  expect(slow.until).toBeGreaterThan(x.until);
});

test('funded walkers are checked into the mempool; unfunded ones are rejected and leave', () => {
  let w = spawn(initialWorld(), 0, walker(3));
  w = spawn(w, 0, walker(3, { funded: false }));
  w = run(w, 0, 8);
  w = run(w, 8, 30);
  expect(w.walkers).toHaveLength(0);
  expect(w.crate.map((t) => t.id)).toEqual([1]);
  expect(w.note).toContain('Caught');
  expect(w.caught).toBe(1);
});

test('checking stalls without two validators online and resumes with them', () => {
  let w = toggle(toggle(spawn(initialWorld(), 0, walker(4)), 0), 1);
  w = run(w, 0, 20);
  expect(w.walkers[0].phase).toBe('check');
  w = run(toggle(w, 1), 20, 40);
  expect(w.crate).toHaveLength(1);
});

test('highest fee boards first, a bumped fee jumps the queue, big transfers take two seats', () => {
  let w = initialWorld();
  w = { ...w, crate: [{ id: 99, amount: 1, fee: 1, big: false }], sealing: true };
  w = spawn(w, 0, walker(1));
  w = spawn(w, 0, walker(2, { big: true }));
  w = spawn(w, 0, walker(4));
  // While sealing nobody boards, so all three gather in the mempool.
  w = run(w, 0, 20);
  expect(w.walkers.every((x) => x.phase === 'wait')).toBe(true);
  w = bump(w, 1, 20); // fee 1 → 3
  expect(w.walkers.find((x) => x.id === 1).bumpedAt).toBe(20);
  w = run({ ...w, sealing: false }, 20, 60);
  expect(w.crate.map((t) => t.id)).toEqual([99, 3, 1]);
  expect(seatsUsed(w.crate)).toBe(3);
  // The big transfer no longer fits, so the block is ready once it has waited.
  expect(readyToSeal(w, 60)).toBe(true);
  expect(w.walkers.map((x) => x.id)).toEqual([2]);
});

test('sealed blocks chain by hash, keep a rolling window, and deliver tokens', async () => {
  let w = initialWorld();
  for (let i = 0; i < SLOTS + 2; i++) {
    w = { ...w, crate: Array.from({ length: SEATS }, (_, j) => ({ id: i * 10 + j, amount: 2, fee: 3, big: false })) };
    expect(readyToSeal(w, i)).toBe(true);
    w = await seal(w, i);
  }
  expect(w.blocks).toHaveLength(SLOTS);
  expect(w.blocks.map((b) => b.height)).toEqual([3, 4, 5, 6, 7]);
  expect(w.blocks[1].previous).toBe(w.blocks[0].hash);
  expect(w.received).toBe((SLOTS + 2) * SEATS * 2);
  expect(w.sealed).toBe(SLOTS + 2);
  expect(await auditChain(w.blocks)).toEqual([true, true, true, true, true]);
});

test('tampering breaks verification from that block on, then the honest copy returns', async () => {
  let w = initialWorld();
  for (let i = 0; i < 3; i++)
    w = await seal({ ...w, crate: [{ id: i, amount: 1, fee: 1, big: false }] }, i);
  const honest = w.blocks;
  w = alter(w, 1, 10);
  expect(await auditChain(w.blocks)).toEqual([true, false, false]);
  expect(alter(w, 0, 11)).toBe(w);
  expect(readyToSeal({ ...w, crate: honest[0].txs }, 11)).toBe(false);
  w = run(w, 10, 18);
  expect(w.blocks).toBe(honest);
  expect(w.alteredAt).toBe(null);
  expect([w.restoredAt !== null, w.caught]).toEqual([true, 1]);
});

test('every walking leg stays clear of the desk and the ledger table', () => {
  const gates = [-1, 0, 1].map((d) => [GATE[0] + d * 0.3, GATE[1]]);
  const spots = Array.from({ length: 12 }, (_, r) => queueSpot(r));
  const legs = [
    [ENTRANCE, DESK],
    ...gates.flatMap((g) => [[DESK, g], [g, ENTRANCE], ...spots.map((s) => [g, s])]),
    ...spots.flatMap((a) => [[a, BAY], ...spots.map((b) => [a, b])]),
  ];
  const pad = 0.15; // a walker's radius
  const crossings = legs.filter(([a, b]) =>
    Object.values(FURNITURE).some(([x0, x1, z0, z1]) =>
      Array.from({ length: 101 }, (_, i) => i / 100).some((t) => {
        const x = a[0] + (b[0] - a[0]) * t;
        const z = a[1] + (b[1] - a[1]) * t;
        return x > x0 - pad && x < x1 + pad && z > z0 - pad && z < z1 + pad;
      }),
    ),
  );
  expect(crossings).toEqual([]);
});
