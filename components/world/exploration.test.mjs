import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { Exploration } from './exploration.ts';
import { GARDEN_SPOTS } from './island-layout';
import { districts } from './districts';
import { planRoute } from './navigation.ts';
import { clearSegment, walkable, SPAWN } from './movement.ts';

function simulate(model, steps = 2000, direction = { x: 0, z: 0 }) {
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
  const [x, , z] = districts[3].position;
  const start = { x: x - 2, z },
    goal = { x: x + 2, z };
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
  model.walkers.companion.position = { x: start.x, z: start.z - 0.85 };
  assert.equal(model.goTo(goal), true);
  assert.equal(simulate(model), false);
  assert.deepEqual(model.walkers.sam.position, goal);
  assert.equal(model.destination, null);
});
test('a tour around all sides keeps both travellers moving safely and eventually idle', () => {
  const model = new Exploration();
  for (const goal of [
    ...districts.map((d) => ({ x: d.position[0], z: d.position[2] + 1.65 })),
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
  assert.equal(
    model.goTo({
      x: districts[3].position[0],
      z: districts[3].position[2] + 1.65,
    }),
    true,
  );
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
  assert.equal(
    model.goTo({
      x: districts[3].position[0],
      z: districts[3].position[2] + 1.65,
    }),
    true,
  );
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
    { x: districts[5].position[0], z: districts[5].position[2] },
    { x: 100, z: 0 },
    { x: NaN, z: 0 },
  ])
    assert.equal(model.goTo(goal), false);
  model.step(10, { x: 1, z: 0 });
  assert.ok(model.walkers.sam.position.x <= 0.12 + 1e-6);
  simulate(model, 500, { x: 1, z: 0 });
  assert.equal(simulate(model, 500), false);
});

test('the expanded garden and every relocated district can be toured without crossing scenery', () => {
  const model = new Exploration();
  const goals = [
    ...districts.map((d) => ({ x: d.position[0], z: d.position[2] + 1.65 })),
    ...Object.values(GARDEN_SPOTS).map((p) => ({ x: p.x, z: p.z + 0.9 })),
    SPAWN,
  ];
  for (const goal of goals) {
    assert.equal(model.goTo(goal), true);
    assert.equal(simulate(model), false);
    assert.deepEqual(model.walkers.sam.position, goal);
  }
});
