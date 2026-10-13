import { test, expect } from 'bun:test';
import { sparringFrame, operatorHeading, captureFrame } from './sparring';

test('robots face one another throughout the fight and close the distance for strikes', () => {
  for (let t = 0; t < 20; t += 0.05) {
    const a = sparringFrame(t, -1), b = sparringFrame(t, 1);
    const dx = b.x - a.x, dz = b.z - a.z, distance = Math.hypot(dx, dz);
    expect((Math.sin(a.heading) * dx + Math.cos(a.heading) * dz) / distance).toBeCloseTo(1, 8);
    expect((Math.sin(b.heading) * -dx + Math.cos(b.heading) * -dz) / distance).toBeCloseTo(1, 8);
    expect(distance).toBeGreaterThan(1.2);
    expect(a.attacking).not.toBe(b.attacking);
  }
  const distance = t => Math.hypot(sparringFrame(t, -1).x - sparringFrame(t, 1).x, sparringFrame(t, -1).z - sparringFrame(t, 1).z);
  expect(distance(0.675)).toBeLessThan(distance(0));
});
test('operators look directly at their own robot, and both sides attack', () => {
  for (const side of [-1, 1]) {
    for (const t of [0, 0.675, 1.9, 4.6]) {
      const robot = sparringFrame(t, side);
      const heading = operatorHeading(side * 5.4, 1.3, robot.x, robot.z);
      const dx = robot.x - side * 5.4, dz = robot.z - 1.3;
      expect((Math.sin(heading) * dx + Math.cos(heading) * dz) / Math.hypot(dx, dz)).toBeCloseTo(1, 8);
    }
  }
  expect(sparringFrame(0.5, -1).attacking).toBe(true);
  expect(sparringFrame(1.9, 1).attacking).toBe(true);
});

test('capture-area translation and turning match the robot without leaving the circle', () => {
  for (const side of [-1, 1]) {
    for (let t = 0; t < 30; t += 0.02) {
      const robot = sparringFrame(t, side);
      const human = captureFrame(robot, side);
      const robotBase = -side * Math.PI / 2;
      const humanBase = operatorHeading(side * 5.4, 1.3, side * 0.98, -0.5);
      const local = (x, z, heading) => [Math.cos(heading) * x - Math.sin(heading) * z, Math.sin(heading) * x + Math.cos(heading) * z];
      const a = local(robot.x - side * 0.98, robot.z + 0.5, robotBase);
      const b = local(human.x, human.z, humanBase);
      expect(a[0]).toBeCloseTo(b[0], 8);
      expect(a[1]).toBeCloseTo(b[1], 8);
      expect(human.heading - humanBase).toBeCloseTo(robot.heading - robotBase, 8);
      // Reserve space for stance width and hands inside the 1.3 m guard.
      expect(Math.hypot(human.x, human.z)).toBeLessThan(0.45);
    }
  }
});
