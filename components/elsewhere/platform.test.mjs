import { test, expect } from 'bun:test';
import { platformEdge } from './platform';
import { radius } from './railway';
test('all curved platform edges clear rails and sleepers with a continuous gap', () => {
  for (const count of [4, 12]) {
    const r = radius(count);
    for (let x = -6; x <= 6; x += 0.1) {
      const edge = platformEdge(x, count);
      expect(Math.hypot(x, edge - r - 2.8)).toBeCloseTo(r + 1.05);
      expect(Math.hypot(x, edge - r - 2.8) - (r + 0.85)).toBeGreaterThan(0.19);
    }
    expect(platformEdge(0, count)).toBeGreaterThan(1.3 + 0.3);
    // Straight locomotive and carriage remain inside the curved platform edge.
    for (const x of [-3.2, -2.35, 0, 1.55])
      expect(2.8 - 0.6 - platformEdge(x, count)).toBeGreaterThan(0);
  }
});
