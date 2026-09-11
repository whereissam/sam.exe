import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { districts } from './districts';
import {
  islandObstacles,
  CLOCK_Z,
  SCENERY_SPREAD,
  harborIslands,
  harborBridges,
  harborHeight,
  landCoversSegment,
} from './island-layout';
import {
  advance,
  walkable,
  cameraRelative,
  nearestDistrict,
  SPAWN,
  ISLAND_RADIUS,
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
test('island edge, installations, pond, windmill and campfire cannot be entered', () => {
  assert.equal(walkable({ x: ISLAND_RADIUS + 0.1, z: 0 }), false);
  for (const obstacle of islandObstacles)
    assert.equal(walkable({ x: obstacle.x, z: obstacle.z }), false);
  const travel = harborIslands.at(-1);
  const edge = { x: 0, z: travel.z + travel.radius - 0.1 };
  assert.ok(walkable(edge));
  assert.deepEqual(advance(edge, { x: 0, z: 0.2 }), edge);
});
test('diagonal collision keeps movement on the unobstructed axis', () => {
  const z = districts.find((d) => d.id === 'travel').position[2];
  const next = advance({ x: 1.5, z }, { x: -0.2, z: 0.2 });
  assert.deepEqual(next, { x: 1.5, z: z + 0.2 });
  assert.ok(walkable(next));
});
test('only nearby districts prompt the traveller', () => {
  assert.equal(
    nearestDistrict({ x: 1.2, z: districts[5].position[2] + 0.8 })?.id,
    'travel',
  );
  assert.equal(nearestDistrict({ x: 0, z: 0 }), null);
});

test('canals cannot be crossed by walking or a straight shortcut', () => {
  assert.equal(walkable({ x: 4, z: 4 }), false);
  assert.equal(landCoversSegment({ x: 2, z: 2 }, { x: 6.8, z: 7.2 }), false);
});
test('island heights and every bridge ramp join continuously', () => {
  for (const island of harborIslands)
    assert.equal(harborHeight(island), island.y);
  for (const bridge of harborBridges) {
    const dx = bridge.end.x - bridge.start.x,
      dz = bridge.end.z - bridge.start.z,
      length = Math.hypot(dx, dz);
    const point = (distance) => ({
      x: bridge.start.x + (dx * distance) / length,
      z: bridge.start.z + (dz * distance) / length,
    });
    assert.ok(
      Math.abs(
        harborHeight(point(bridge.start.radius + 0.00001)) - bridge.start.y,
      ) < 0.0001,
    );
    assert.ok(
      Math.abs(
        harborHeight(point(length - bridge.end.radius - 0.00001)) -
          bridge.end.y,
      ) < 0.0001,
    );
    const middle = harborHeight(
      point((bridge.start.radius + length - bridge.end.radius) / 2),
    );
    assert.ok(Math.abs(middle - (bridge.start.y + bridge.end.y) / 2) < 0.0001);
  }
});

test('buildings and scenery cannot be walked into from any angle', () => {
  // A canal house sits on each district island, plus the central clock tower.
  const buildings = [
    { name: 'clock tower', x: 0, z: CLOCK_Z },
    ...districts.map((d) => ({
      name: `${d.id} house`,
      x: d.position[0],
      z: d.position[2] - 2 * SCENERY_SPREAD,
    })),
  ];
  for (const building of buildings) {
    // Sample the whole 1.35-unit square footprint, corners included. A circle
    // through the faces alone leaves the corners open, which let the traveller
    // stand inside the tower.
    for (let ix = -0.6; ix <= 0.6001; ix += 0.15)
      for (let iz = -0.6; iz <= 0.6001; iz += 0.15)
        assert.equal(
          walkable({ x: building.x + ix, z: building.z + iz }),
          false,
          `${building.name} is enterable at ${ix.toFixed(2)}, ${iz.toFixed(2)}`,
        );
    // Walking diagonally at the corner must not pass through.
    let p = { x: building.x - 1.6, z: building.z - 1.6 };
    for (let i = 0; i < 200; i++) p = advance(p, { x: 0.02, z: 0.02 });
    assert.ok(
      p.x <= building.x + 0.6,
      `walked through ${building.name} diagonally`,
    );
  }
});
