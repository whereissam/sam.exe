import { test } from 'bun:test';
import assert from 'node:assert/strict';
import {
  Rest,
  REST_DELAY,
  isNightHour,
  lieAxis,
  readLighting,
  routineAtHour,
  sleepHeading,
} from './daily-routine.ts';
import { Exploration } from './exploration.ts';
import { districts } from './districts.ts';

const still = {
  walking: false,
  gesturing: false,
  travelling: false,
  steering: false,
  viewing: false,
};
/** The activity Companions reports each frame, derived from the same model it draws. */
const activityOf = (model, extra = {}) => ({
  walking: model.walkers.sam.walking || model.walkers.companion.walking,
  gesturing: false,
  travelling: model.destination !== null,
  steering: false,
  viewing: false,
  ...extra,
});
const settle = (rest, activity = still) => {
  for (let i = 0; i < REST_DELAY * 60 + 1; i++) rest.step(1 / 60, activity);
  return rest.resting;
};

test('daily routines change at local-time boundaries and night mode always allows a nap', () => {
  assert.deepEqual([6, 7, 21, 22].map(isNightHour), [true, false, false, true]);
  assert.deepEqual(
    [7, 10, 11, 16, 17, 20, 21, 23].map((h) => routineAtHour(h, false)),
    [
      'stretch',
      'stretch',
      'work',
      'work',
      'wander',
      'wander',
      'relax',
      'relax',
    ],
  );
  for (let h = 0; h < 24; h++) assert.equal(routineAtHour(h, true), 'sleep');
});

test('the routine pose only appears after the full delay of stillness', () => {
  const rest = new Rest();
  for (let i = 0; i < REST_DELAY * 60 - 1; i++) {
    assert.equal(rest.step(1 / 60, still), false);
    assert.equal(rest.poseFor('sleep'), undefined);
  }
  assert.equal(settle(rest), true);
  assert.equal(rest.poseFor('sleep'), 'sleep');
  assert.equal(rest.poseFor('work'), 'work');
});

test('walking always interrupts sleep, for every step of a long tour', () => {
  const rest = new Rest();
  const model = new Exploration();
  assert.equal(settle(rest, activityOf(model)), true);
  assert.equal(rest.poseFor('sleep'), 'sleep');
  let steps = 0;
  // Derived from the island layout rather than hard-coded, so moving a
  // district cannot quietly turn this into a test that walks nowhere.
  for (const goal of districts.map((d) => ({
    x: d.position[0],
    z: d.position[2] + 1.65,
  }))) {
    assert.equal(model.goTo(goal), true);
    // Movement alone has to keep them up, with no pending destination to lean on.
    while (model.destination || model.walkers.companion.walking) {
      model.step(1 / 60);
      const activity = activityOf(model, { travelling: false });
      assert.equal(rest.step(1 / 60, activity), false, 'nodded off mid-walk');
      assert.equal(rest.poseFor('sleep'), undefined);
      assert.ok(++steps < 4000, 'the tour never ended');
    }
  }
  assert.ok(
    steps > REST_DELAY * 60,
    'the tour was shorter than the rest delay, so it proved nothing',
  );
  assert.equal(settle(rest, activityOf(model)), true);
});

test('a stalled frame cannot skip the delay, and manual walking wakes them just as fast', () => {
  const rest = new Rest();
  assert.equal(rest.step(30, still), false);
  assert.equal(rest.step(Number.NaN, still), false);
  assert.equal(rest.step(-5, still), false);
  assert.equal(settle(rest), true);
  const model = new Exploration();
  model.step(1 / 60, { x: 1, z: 0 });
  assert.equal(model.destination, null, 'manual walking has no destination');
  assert.ok(model.walkers.sam.walking);
  assert.equal(rest.step(1 / 60, activityOf(model)), false);
  assert.equal(rest.seconds, 0);
});

test('gestures, tap routes, and held keys each clear the routine on their own', () => {
  for (const stir of ['gesturing', 'travelling', 'steering', 'viewing']) {
    const rest = new Rest();
    assert.equal(settle(rest), true);
    assert.equal(rest.step(1 / 60, { ...still, [stir]: true }), false);
    assert.equal(rest.poseFor('sleep'), undefined);
  }
  const rest = new Rest();
  assert.equal(settle(rest), true);
  rest.interrupt();
  assert.equal(rest.resting, false);
  assert.equal(rest.poseFor('sleep'), undefined);
});

test('a traveller at the photo garden keeps watching instead of nodding off', () => {
  // In a country the atlas walker is always either moving or holding the
  // binoculars up, so the hour's routine never interrupts the photographs.
  const rest = new Rest();
  const inCountry = (moving) => ({
    ...still,
    walking: moving,
    viewing: !moving,
  });
  for (let i = 0; i < REST_DELAY * 60 * 3; i++)
    assert.equal(rest.step(1 / 60, inCountry(i % 120 < 40)), false);
  assert.equal(rest.poseFor('sleep'), undefined);
  // Back on the atlas map there is nothing to watch, so they settle as usual.
  assert.equal(settle(rest), true);
  assert.equal(rest.poseFor('sleep'), 'sleep');
});

test('two sleepers lie side by side, never through each other', () => {
  const pairs = [
    [
      { x: 0, z: 0 },
      { x: 0.85, z: 0 },
    ],
    [
      { x: 0, z: 0 },
      { x: 0, z: 0.85 },
    ],
    [
      { x: 1.2, z: -3 },
      { x: 0.6, z: -3.6 },
    ],
    [
      { x: -2, z: 4 },
      { x: -2.7, z: 3.5 },
    ],
    [
      { x: 5, z: 5 },
      { x: 4.4, z: 5.6 },
    ],
  ];
  for (const [a, b] of pairs) {
    const heading = sleepHeading(a, b);
    assert.notEqual(heading, null);
    // Both bodies share the heading, so they are parallel.
    const axis = lieAxis(heading);
    const dx = b.x - a.x,
      dz = b.z - a.z;
    const gap = Math.hypot(dx, dz);
    // The line between them must run across the bodies, not along them:
    // a zero dot product is exactly "side by side".
    const along = (axis.x * dx + axis.z * dz) / gap;
    assert.ok(
      Math.abs(along) < 1e-9,
      `bodies lie along their separation (${along}), so they overlap`,
    );
    // With the separation perpendicular, the gap between the two bodies is the
    // full distance between them rather than being eaten by their length.
    assert.ok(gap > 0.5, 'the pair stood too close to lie down cleanly');
  }
});

test('sleepers standing on the same spot keep the heading they had', () => {
  assert.equal(sleepHeading({ x: 1, z: 1 }, { x: 1, z: 1 }), null);
  assert.equal(sleepHeading({ x: 1, z: 1 }, { x: 1.02, z: 1.01 }), null);
});

test('a remembered lighting choice survives a reload, and junk does not', () => {
  assert.equal(readLighting('night'), 'night');
  assert.equal(readLighting('day'), 'day');
  // Nothing stored means follow the visitor's local hour.
  assert.equal(readLighting(null), null);
  for (const junk of ['', 'NIGHT', 'true', '1', '{}', 'dark'])
    assert.equal(readLighting(junk), null, `accepted ${junk}`);
});
