import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { Exploration } from './exploration.ts';
import { planRoute } from './navigation.ts';
import { clearSegment, walkable, SPAWN } from './movement.ts';

function simulate(model, steps = 1200, direction = { x: 0, z: 0 }) {
  let awake = true;
  for (let i = 0; i < steps; i++) {
    const before = Object.fromEntries(
      Object.entries(model.walkers).map(([id, w]) => [id, { ...w.position }]),
    );
    awake = model.step(1 / 60, direction);
    for (const [id, w] of Object.entries(model.walkers)) {
      assert.ok(walkable(w.position), `${id} left walkable ground`);
      assert.ok(
        clearSegment(before[id], w.position),
        `${id} crossed an installation`,
      );
      assert.ok(
        Math.hypot(w.position.x - before[id].x, w.position.z - before[id].z) <=
          2.65 / 60 + 1e-6,
        `${id} teleported`,
      );
    }
  }
  return awake;
}
test('tap routes go around buildings instead of timing out at their front', () => {
  const start = { x: 3.5, z: 0.8 },
    goal = { x: 3.5, z: 5.0 };
  assert.equal(clearSegment(start, goal), false);
  const route = planRoute(start, goal);
  assert.ok(route && route.length > 1);
  let last = start;
  for (const next of route) {
    assert.ok(clearSegment(last, next));
    last = next;
  }
  assert.deepEqual(last, goal);
  const model = new Exploration();
  model.walkers.sam.position = start;
  model.walkers.companion.position = { x: 2.6, z: 0.8 };
  assert.equal(model.goTo(goal), true);
  assert.equal(simulate(model), false);
  assert.deepEqual(model.walkers.sam.position, goal);
  assert.equal(model.destination, null);
});
test('a tour around all sides keeps both travellers moving safely and eventually idle', () => {
  const model = new Exploration();
  for (const goal of [
    { x: 3.5, z: 5.0 },
    { x: 5.6, z: 0 },
    { x: 1.4, z: -4 },
    { x: -5.5, z: 0 },
    { x: -2, z: 4 },
    SPAWN,
  ]) {
    assert.equal(model.goTo(goal), true);
    assert.equal(simulate(model), false);
    assert.deepEqual(model.walkers.sam.position, goal);
    const a = model.walkers.sam.position,
      b = model.walkers.companion.position;
    assert.ok(
      Math.hypot(a.x - b.x, a.z - b.z) < 1.1,
      'companion did not catch up',
    );
  }
});
test('switching cancels the old destination without teleporting or retaining a looping trail', () => {
  const model = new Exploration();
  model.goTo({ x: 3.5, z: 5.0 });
  simulate(model, 90);
  for (let i = 0; i < 12; i++) {
    const before = JSON.stringify(model.walkers);
    model.switchTo(i % 2 ? 'sam' : 'companion');
    assert.equal(JSON.stringify(model.walkers), before);
    assert.equal(model.destination, null);
    assert.equal(simulate(model, 240), false);
  }
});
test('keyboard input cancels tap navigation, and reset retains the chosen traveller', () => {
  const model = new Exploration();
  model.goTo({ x: 5.6, z: 0 });
  simulate(model, 1, { x: -1, z: 0 });
  assert.equal(model.destination, null);
  assert.ok(model.walkers.sam.position.x < 0);
  model.reset('companion');
  assert.equal(model.active, 'companion');
  assert.deepEqual(model.walkers.sam.position, SPAWN);
  assert.equal(simulate(model, 10), false);
});
test('invalid destinations, large frame gaps, and blocked manual movement settle safely', () => {
  const model = new Exploration();
  for (const goal of [
    { x: 0, z: 5 },
    { x: 100, z: 0 },
    { x: NaN, z: 0 },
  ])
    assert.equal(model.goTo(goal), false);
  model.step(10, { x: 1, z: 0 });
  assert.ok(model.walkers.sam.position.x <= 0.12 + 1e-6);
  simulate(model, 500, { x: 1, z: 0 });
  assert.equal(simulate(model, 500), false);
});
