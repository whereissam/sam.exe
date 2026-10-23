import { test, expect } from 'bun:test';
import { bodiesCollide, BODY_SEPARATION } from './character-collision';
import { Exploration } from './exploration';

const p = (x, z = 0) => ({x, z});
test('swept bodies block swapping sides and crossing paths with clear endpoints', () => {
  expect(bodiesCollide(p(-1), p(1), p(1), p(-1))).toBe(true);
  expect(bodiesCollide(p(-1), p(1), p(0,-1), p(0,1))).toBe(true);
  expect(bodiesCollide(p(-1), p(1), p(-1,1), p(1,1))).toBe(false);
});
test('contact permits tangential motion and separating existing overlaps', () => {
  expect(bodiesCollide(p(0), p(0,1), p(BODY_SEPARATION), p(BODY_SEPARATION,1))).toBe(false);
  expect(bodiesCollide(p(0), p(-.1), p(.3), p(.4))).toBe(false);
  expect(bodiesCollide(p(0), p(.1), p(.3), p(.2))).toBe(true);
  expect(bodiesCollide(p(0), p(1), p(.3), p(-1))).toBe(true);
});
test('continuous reversal and character switches never pass through the other body', () => {
  const model = new Exploration();
  for (let i = 0; i < 1800; i++) {
    if (i % 71 === 0) model.switchTo(model.active === 'sam' ? 'companion' : 'sam');
    const a = {...model.walkers.sam.position}, b = {...model.walkers.companion.position};
    const leader = model.walkers[model.active];
    const other = model.walkers[model.active === 'sam' ? 'companion' : 'sam'];
    model.step(i % 3 ? 1/60 : .5, {
      x: other.position.x-leader.position.x,
      z: other.position.z-leader.position.z,
    });
    expect(bodiesCollide(a, model.walkers.sam.position, b, model.walkers.companion.position)).toBe(false);
  }
});
