import { test, expect } from 'bun:test';
import { Footwork } from './footwork';
import { sparringFrame } from './sparring';

test('walking alternates lifted feet while the support foot stays fixed in world space', () => {
  const gait = new Footwork();
  let lifted = new Set();
  for (let frame = 0; frame < 360; frame++) {
    const t = frame / 60;
    const before = gait.feet?.map(p => ({ ...p }));
    gait.step(1 / 60, { x: t * 0.3, z: 0, heading: Math.PI / 2 });
    const feet = gait.feet;
    expect(feet.filter(p => p.y > 0.051).length).toBeLessThanOrEqual(1);
    if (gait.swing) {
      lifted.add(gait.swing.foot);
      const support = 1 - gait.swing.foot;
      if (before) expect(feet[support]).toEqual(before[support]);
    }
  }
  expect(lifted.size).toBe(2);
});
test('pause freezes an active step and stationary feet do not shuffle', () => {
  const gait = new Footwork();
  gait.step(1 / 60, { x: 0, z: 0, heading: 0 });
  const home = structuredClone(gait.feet);
  for (let i = 0; i < 60; i++) gait.step(1 / 60, { x: 0, z: 0, heading: 0 });
  expect(gait.feet).toEqual(home);
  const root = { x: 0, z: 0.2, heading: 0 };
  gait.step(1 / 60, root);
  const paused = structuredClone(gait.feet);
  for (let i = 0; i < 60; i++) gait.step(0, root);
  expect(gait.feet).toEqual(paused);
});
test('sparring generates grounded steps for both robots throughout advances and retreats', () => {
  for (const side of [-1, 1]) {
    const gait = new Footwork();
    let lifts = 0;
    for (let i = 0; i < 1200; i++) {
      const spar = sparringFrame(i / 60, side);
      const pose = gait.step(1 / 60, spar);
      expect(Object.values(pose).every(p => Object.values(p).every(Number.isFinite))).toBe(true);
      if (pose.left.y > 0.08 || pose.right.y > 0.08) lifts++;
      expect(Math.min(pose.left.y, pose.right.y)).toBeCloseTo(0.05, 6);
    }
    expect(lifts).toBeGreaterThan(100);
  }
});
