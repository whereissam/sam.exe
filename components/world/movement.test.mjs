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
  const next = advance({ x: 1.65, z }, { x: -0.2, z: 0.2 });
  assert.deepEqual(next, { x: 1.65, z: z + 0.2 });
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
  assert.equal(walkable({ x: 6, z: 6 }), false);
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
        harborHeight(point(bridge.start.radius + 0.00001)) - bridge.startHeight,
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
    assert.ok(Math.abs(middle - (bridge.startHeight + bridge.end.y) / 2) < 0.0001);
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

 test('robot fight exhibit blocks its wider footprint and remains approachable', () => {
  const lab = districts.find(d => d.id === 'robotics');
  assert.equal(walkable({ x: lab.position[0] + 2.2, z: lab.position[2] }), false);
  const approach = { x: lab.position[0], z: lab.position[2] + 2.7 };
  assert.ok(walkable(approach));
  assert.equal(nearestDistrict(approach)?.id, 'robotics');
});

test('passport sign blocks the body from every direction, including a swept crossing', async () => {
  const { PASSPORT_POST } = await import('./island-layout');
  const { clearSegment, WALK_CLEARANCE, recoverWalkable } = await import('./movement');
  assert.equal(walkable(PASSPORT_POST), false);
  let tested = 0;
  for (let i = 0; i < 48; i++) {
    const angle = i*Math.PI*2/48;
    const start = {x: PASSPORT_POST.x + Math.cos(angle)*.8, z: PASSPORT_POST.z + Math.sin(angle)*.8};
    if (!walkable(start)) continue;
    const end = advance(start, {x: PASSPORT_POST.x-start.x, z: PASSPORT_POST.z-start.z});
    assert.ok(Math.hypot(end.x-PASSPORT_POST.x, end.z-PASSPORT_POST.z) >= PASSPORT_POST.radius+WALK_CLEARANCE);
    assert.equal(clearSegment(start, {x: 2*PASSPORT_POST.x-start.x, z: 2*PASSPORT_POST.z-start.z}), false);
    tested++;
  }
  assert.ok(tested > 10);
  assert.ok(walkable(recoverWalkable(PASSPORT_POST)));
});

test('every harbor entrance has a reachable threshold and solid walls', async () => {
  const { HARBOR_ENTRANCES, entrancePoint } = await import('./island-layout');
  const { planRoute, followRoute } = await import('./navigation');
  for (const entrance of HARBOR_ENTRANCES) {
    assert.ok(walkable(entrance), entrance.id);
    const route = planRoute(SPAWN, entrance);
    assert.ok(route, `${entrance.id} must be reachable from arrival`);
    let position = { ...SPAWN };
    for (let i = 0; i < 500; i++) position = followRoute(position, route, .04);
    assert.ok(Math.hypot(position.x - entrance.x, position.z - entrance.z) < .1);
    for (const side of [-1, 1]) {
      assert.equal(walkable(entrancePoint(entrance, side * .62, 0)), false);
      assert.equal(walkable(entrancePoint(entrance, side * .62, -.43)), false);
    }
    assert.equal(walkable(entrancePoint(entrance, 0, -.85)), false);
  }
});

test('ordinary movement cannot enter chairs or use the seated table clearance', async () => {
  const { TEA_CHAIRS, TEA_TABLE, TEA_SEATS } = await import('./island-layout');
  const { clearSegment } = await import('./movement');
  const { planRoute, followRoute } = await import('./navigation');
  for (const chair of TEA_CHAIRS) {
    assert.equal(walkable(chair), false);
    assert.equal(planRoute(SPAWN, chair), null);
    const start = {x: chair.x, z: chair.z+.7};
    let position = start;
    for (let i=0; i<180; i++) position = advance(position, {x:0,z:-.04});
    assert.ok(Math.hypot(position.x-chair.x,position.z-chair.z) >= chair.radius+.2-1e-7);
    // A route retained from an older scene must not bypass newly added solids.
    assert.deepEqual(followRoute(start, [{x:chair.x,z:chair.z-.7}], 2), start);
  }
  assert.equal(walkable({x:TEA_TABLE.x,z:TEA_TABLE.z+.8}), false);
  assert.ok(planRoute(SPAWN, TEA_SEATS.sam, true));
  assert.equal(clearSegment(SPAWN, TEA_TABLE), false);
});


test('harbor stair treads raise the traveller to the bridge landing', async () => {
  const { HARBOR_STEPS, HARBOR_RADIUS } = await import('./island-layout');
  const bridge = harborBridges[0];
  const length = Math.hypot(bridge.end.x, bridge.end.z);
  const point = (along) => ({ x: bridge.end.x * along / length, z: bridge.end.z * along / length });
  for (const step of HARBOR_STEPS) {
    const p = point((step.from + step.to) / 2);
    assert.ok(walkable(p));
    assert.equal(harborHeight(p), step.height);
  }
  assert.equal(harborHeight(point(4.5)), 0);
  assert.ok(Math.abs(harborHeight(point(HARBOR_RADIUS - .001)) - harborHeight(point(HARBOR_RADIUS + .001))) < .001);
});
