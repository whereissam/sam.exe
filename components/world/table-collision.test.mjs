import { test, expect } from 'bun:test';
import { TEA_TABLE, TEA_SEATS } from './island-layout';
import { advance, clearSegment, walkable } from './movement';
import { planRoute } from './navigation';

test('walking toward the table from every direction stops the body outside the tabletop', () => {
  for (let i = 0; i < 32; i++) {
    const a = (i * Math.PI) / 16;
    let p = {
      x: TEA_TABLE.x + Math.cos(a) * 1.5,
      z: TEA_TABLE.z + Math.sin(a) * 1.5,
    };
    if (!walkable(p)) continue;
    for (let frame = 0; frame < 100; frame++) {
      p = advance(p, { x: -Math.cos(a) * 0.03, z: -Math.sin(a) * 0.03 });
      expect(
        Math.hypot(p.x - TEA_TABLE.x, p.z - TEA_TABLE.z),
      ).toBeGreaterThanOrEqual(0.93);
    }
  }
});
test('both seats remain reachable and routes between them go around the table', () => {
  const route = planRoute(TEA_SEATS.sam, TEA_SEATS.companion);
  expect(route).not.toBeNull();
  let p = TEA_SEATS.sam;
  for (const q of route) {
    expect(clearSegment(p, q)).toBe(true);
    p = q;
  }
  expect(clearSegment(TEA_SEATS.sam, TEA_SEATS.companion)).toBe(false);
});
