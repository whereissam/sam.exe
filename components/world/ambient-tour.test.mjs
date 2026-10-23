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
    const wasSeating = model.seating;
    tour.step(1 / 60, model, allowed, night);
    model.step(1 / 60);
    for (const [id, walker] of Object.entries(model.walkers)) {
      assert.ok(walkable(walker.position, model.seating), `${id} left the island`);
      assert.ok(
        clearSegment(before[id], walker.position, model.seating || wasSeating),
        `${id} crossed an obstacle`,
      );
    }
  }
}

test('idle visitors walk to separate seats and remain together for tea', () => {
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
  tick(tour, model, 120);
  assert.equal(tour.phase, 'tea');
  assert.equal(tour.label, 'Tea for two');
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
  tick(tour, model, TOUR_IDLE_SECONDS + 8, true, false);
  assert.equal(tour.phase, 'tea');
});

test('a long tea break never starts another route and manual input still interrupts', () => {
  const model = new Exploration();
  const tour = new AmbientTour();
  tick(tour, model, TOUR_IDLE_SECONDS + 8);
  const positions = Object.values(model.walkers).map((w) => ({
    ...w.position,
  }));
  tick(tour, model, 600);
  assert.equal(tour.phase, 'tea');
  assert.equal(model.destination, null);
  assert.deepEqual(
    Object.values(model.walkers).map((w) => w.position),
    positions,
  );
  tick(tour, model, 1, false);
  assert.equal(tour.phase, 'idle');
});

test('manual travel survives interruption, and disabled autonomy stays idle', () => {
  const model = new Exploration();
  const tour = new AmbientTour();
  tick(tour, model, TOUR_IDLE_SECONDS + 8);
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
  tick(tour, model, TOUR_IDLE_SECONDS + 8);
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

test('daytime rest has time to settle before tea, and interruption returns to tea instead of touring', () => {
  const model = new Exploration();
  const tour = new AmbientTour();
  tick(tour, model, 30);
  assert.equal(
    tour.phase,
    'idle',
    'do not replace the laptop or book after only a few seconds',
  );
  tick(tour, model, TOUR_IDLE_SECONDS + 8);
  assert.equal(tour.phase, 'tea');
  tour.interrupt(model);
  tick(tour, model, 30);
  assert.equal(tour.phase, 'idle');
  tick(tour, model, TOUR_IDLE_SECONDS + 8);
  assert.equal(
    tour.phase,
    'tea',
    'resume the shared resting spot, not a random district',
  );
});

test('work happens only after both travellers reach their chairs, then clears for tea', () => {
  const model = new Exploration();
  const tour = new AmbientTour();
  for (let i = 0; i < 16 * 60; i++) {
    tour.step(1 / 60, model, true, false, true);
    model.step(1 / 60);
    if (tour.phase === 'work') {
      for (const [id, walker] of Object.entries(model.walkers))
        assert.ok(
          Math.hypot(
            walker.position.x - TEA_SEATS[id].x,
            walker.position.z - TEA_SEATS[id].z,
          ) < 0.08,
        );
    }
  }
  assert.equal(tour.phase, 'work');
  assert.equal(tour.label, 'Working together');
  for (let i = 0; i < 40 * 60; i++) {
    tour.step(1 / 60, model, true, false, true);
    model.step(1 / 60);
  }
  assert.equal(tour.phase, 'work');
  for (let i = 0; i < 30 * 60; i++) {
    tour.step(1 / 60, model, true, false, true);
    model.step(1 / 60);
  }
  assert.equal(tour.phase, 'tea');
  for (let i = 0; i < 120 * 60; i++) {
    tour.step(1 / 60, model, true, false, true);
    model.step(1 / 60);
  }
  assert.equal(tour.phase, 'tea');
});

test('the clock ends tea and evening exploration never starts another tea break', () => {
  const model = new Exploration();
  const tour = new AmbientTour();
  tick(tour, model, TOUR_IDLE_SECONDS + 8);
  assert.equal(tour.phase, 'tea');
  tour.step(1 / 60, model, true, false, false, false);
  assert.equal(tour.phase, 'idle');
  for (let i = 0; i < 180 * 60; i++) {
    tour.step(1 / 60, model, true, false, false, false);
    model.step(1 / 60);
    assert.notEqual(tour.phase, 'tea');
    assert.notEqual(tour.phase, 'gathering');
  }
  assert.ok(['walking', 'visiting'].includes(tour.phase));
});

test('working hours do not automatically become tea after one minute', () => {
  const model = new Exploration();
  const tour = new AmbientTour();
  for (let i = 0; i < 100 * 60; i++) {
    tour.step(1 / 60, model, true, false, true, false);
    model.step(1 / 60);
    assert.notEqual(tour.phase, 'tea');
  }
  assert.equal(tour.phase, 'work');
});
