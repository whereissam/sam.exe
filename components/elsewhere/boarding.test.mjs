import { test, expect } from 'bun:test';
import { boardingPose } from './boarding';
test('both travellers cross the side wall only through the doorway', () => {
  for (const companion of [false, true])
    for (const alighting of [false, true]) {
      for (let i = 0; i <= 1000; i++) {
        const p = boardingPose(i / 1000, companion, alighting);
        if (p.z > 1.9 && p.z < 2.55) expect(Math.abs(p.x)).toBeLessThan(0.01);
        if (p.z >= 2.23) expect(p.y).toBeCloseTo(0.525);
      }
    }
});
test('travellers use separate aisle positions and take turns at the door', () => {
  for (const alighting of [false, true]) {
    for (let i = 0; i <= 1000; i++) {
      const a = boardingPose(i / 1000, false, alighting);
      const b = boardingPose(i / 1000, true, alighting);
      expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(0.6);
    }
  }
  expect(boardingPose(1, true).x).toBeCloseTo(0.85);
  expect(boardingPose(1, false).x).toBeCloseTo(-0.85);
});
