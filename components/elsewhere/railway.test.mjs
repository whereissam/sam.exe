import { test, expect } from 'bun:test';
import {
  radius,
  stopAngle,
  stopYaw,
  railPoint,
  platformToWorld,
  worldToPlatform,
} from './railway';
test('each city has a distinct physical stop on the same closed railway', () => {
  for (const count of [4, 12]) {
    const stops = Array.from({ length: count + 1 }, (_, n) =>
      railPoint(stopAngle(n - 1, count), count),
    );
    expect(
      new Set(stops.map((p) => p.x.toFixed(4) + ':' + p.z.toFixed(4))).size,
    ).toBe(count + 1);
    for (const p of stops)
      expect(Math.hypot(p.x, p.z - radius(count) - 2.8)).toBeCloseTo(
        radius(count),
      );
    expect(railPoint(-Math.PI / 2, count).x).toBeCloseTo(
      railPoint(Math.PI * 1.5, count).x,
    );
  }
});
test('clicks, walking and arrival map correctly at every rotated platform', () => {
  for (let i = -1; i < 12; i++) {
    const angle = stopAngle(i, 12),
      origin = i < 0 ? 0 : 24;
    for (const local of [
      { x: origin, z: 2.8 },
      { x: origin + 2, z: -1.5 },
      { x: origin - 3, z: -1.5 },
    ]) {
      const world = platformToWorld(local, angle, 12, origin);
      const back = worldToPlatform(world, angle, 12, origin);
      expect(back.x).toBeCloseTo(local.x);
      expect(back.z).toBeCloseTo(local.z);
    }
    const yaw = stopYaw(angle);
    // Carriage's long axis remains tangent to the rail.
    expect(
      Math.cos(yaw) * Math.cos(angle) - Math.sin(yaw) * Math.sin(angle),
    ).toBeCloseTo(0);
  }
});
