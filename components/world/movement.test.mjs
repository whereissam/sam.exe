import { test } from 'bun:test';
import assert from 'node:assert/strict';
import {
  advance,
  walkable,
  cameraRelative,
  nearestDistrict,
  SPAWN,
} from './movement.ts';
test('spawn is reachable ground and starts outside an interaction zone', () => {
  assert.ok(walkable(SPAWN));
  assert.equal(nearestDistrict(SPAWN), null);
});
test('forward follows the camera and diagonal movement has no speed boost', () => {
  assert.deepEqual(cameraRelative(0, -1, { x: 1, z: 0 }), { x: 1, z: 0 });
  const diagonal = cameraRelative(1, -1, { x: 0, z: -1 });
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z) - 1) < 1e-9);
});
test('island edge and installation centers cannot be entered', () => {
  assert.equal(walkable({ x: 6.3, z: 0 }), false);
  assert.equal(walkable({ x: 0, z: 5 }), false);
  assert.deepEqual(advance({ x: 6.1, z: 0 }, { x: 0.2, z: 0 }), {
    x: 6.1,
    z: 0,
  });
});
test('diagonal collision keeps movement on the unobstructed axis', () => {
  const next = advance({ x: 1.5, z: 5 }, { x: -0.2, z: 0.2 });
  assert.deepEqual(next, { x: 1.5, z: 5.2 });
  assert.ok(walkable(next));
});
test('closest district wins when interaction zones overlap', () => {
  assert.equal(nearestDistrict({ x: 1.2, z: 3.4 })?.id, 'travel');
  assert.equal(nearestDistrict({ x: 0, z: 0 }), null);
});
