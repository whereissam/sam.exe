import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { AmbientTour, TOUR_IDLE_SECONDS, tourStops } from './ambient-tour';
import { Exploration } from './exploration';
import { TEA_SEATS } from './island-layout';
import { clearSegment, walkable } from './movement';

function tick(tour, model, seconds, allowed = true, night = false) {
  for (let frame = 0; frame < seconds * 60; frame++) {
    const before = Object.fromEntries(
      Object.entries(model.walkers).map(([id, w]) => [id, { ...w.position }]),
    );
    tour.step(1 / 60, model, allowed, night);
    model.step(1 / 60);
    for (const [id, walker] of Object.entries(model.walkers)) {
      assert.ok(walkable(walker.position), `${id} left the island`);
      assert.ok(
        clearSegment(before[id], walker.position),
        `${id} crossed an obstacle`,
      );
    }
  }
}

test('idle visitors walk to separate seats, share tea, then explore', () => {
  const model = new Exploration();
  const tour = new AmbientTour();
  tick(tour, model, TOUR_IDLE_SECONDS - 1);
  assert.equal(tour.active, false);
  tick(tour, model, 8);
  assert.equal(tour.phase, 'tea');
  for (const [id, walker] of Object.entries(model.walkers))
    assert.ok(
      Math.hypot(
        walker.position.x - TEA_SEATS[id].x,
        walker.position.z - TEA_SEATS[id].z,
      ) < 0.08,
    );
  tick(tour, model, 24);
  assert.ok(['walking', 'visiting'].includes(tour.phase));
  assert.match(tour.label, /Robotics Lab/);
});

test('night visitors reach separate seats before resting and stay seated', () => {
  const model = new Exploration();
  const tour = new AmbientTour();
  tick(tour, model, 4, true, true);
  assert.equal(tour.phase, 'idle', 'never lie down where they are standing');
  tick(tour, model, 12, true, true);
  assert.equal(tour.phase, 'sleep');
  for (const [id, walker] of Object.entries(model.walkers)) {
    assert.ok(
      Math.hypot(
        walker.position.x - TEA_SEATS[id].x,
        walker.position.z - TEA_SEATS[id].z,
      ) < 0.08,
    );
  }
  tick(tour, model, 90, true, true);
  assert.equal(tour.phase, 'sleep', 'night rest must not turn into a tea tour');
  const positions = Object.values(model.walkers).map(
    (walker) => walker.position,
  );
  assert.ok(
    Math.hypot(
      positions[0].x - positions[1].x,
      positions[0].z - positions[1].z,
    ) > 1.6,
  );
  tick(tour, model, 1, false, true);
  assert.equal(tour.active, false, 'manual control wakes seated visitors');
});

test('morning wakes the visitors and resumes their daytime routine', () => {
  const model = new Exploration();
  const tour = new AmbientTour();
  tick(tour, model, 16, true, true);
  assert.equal(tour.phase, 'sleep');
  tick(tour, model, 1, true, false);
  assert.equal(tour.phase, 'idle');
  tick(tour, model, 12, true, false);
  assert.equal(tour.phase, 'tea');
});

test('an uninterrupted day visits every district and returns for tea safely', () => {
  const model = new Exploration();
  const tour = new AmbientTour();
  const visited = new Set();
  let breaks = 0;
  let previous = '';
  for (let second = 0; second < 600; second++) {
    tick(tour, model, 1);
    if (tour.phase === 'visiting') visited.add(tourStops[tour.stop].title);
    if (tour.phase === 'tea' && previous !== 'tea') breaks++;
    previous = tour.phase;
    if (visited.size === tourStops.length && breaks >= 3) break;
  }
  assert.equal(visited.size, tourStops.length);
  assert.ok(breaks >= 3);
});

test('manual travel survives interruption, and disabled autonomy stays idle', () => {
  const model = new Exploration();
  const tour = new AmbientTour();
  tick(tour, model, 16);
  tour.interrupt(model);
  const destination = tourStops[0].goal;
  assert.ok(model.goTo(destination));
  tick(tour, model, 1, false);
  assert.deepEqual(model.destination, destination);
  assert.equal(tour.active, false);
  tick(tour, model, 60, false);
  assert.equal(tour.active, false);
  assert.deepEqual(model.walkers.sam.position, destination);
});

test('switching the leader still assigns each traveller their own tea seat', () => {
  const model = new Exploration();
  model.switchTo('companion');
  const tour = new AmbientTour();
  tick(tour, model, 16);
  assert.equal(tour.phase, 'tea');
  for (const [id, walker] of Object.entries(model.walkers))
    assert.ok(
      Math.hypot(
        walker.position.x - TEA_SEATS[id].x,
        walker.position.z - TEA_SEATS[id].z,
      ) < 0.08,
    );
  tour.interrupt(model);
  assert.equal(model.destination, null);
  assert.equal(tour.active, false);
});
