import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Box3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import manifest from './model-manifest.json';
import { districts } from './districts';
import { CITY_RAILS, CITY_HOMES, CITY_FOUNTAIN, CITY_PORTS } from './city-layout';
import { boxBlocksSegment } from './solid-box';
import { advance, clearSegment, walkable, SPAWN } from './movement';
import { planRoute } from './navigation';

// Validate the actual shipped assets, rather than merely repeating collider radii.
test('shipped exhibit meshes and their plinth corners are inside solid footprints', async () => {
  for (const d of districts) {
    const bytes = readFileSync(`public${manifest[d.id]}`);
    const asset = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    const bounds = new Box3().setFromObject(asset.scene);
    for (const x of [bounds.min.x, 0, bounds.max.x])
      for (const z of [bounds.min.z, 0, bounds.max.z])
        assert.equal(walkable({ x: d.position[0] + x, z: d.position[2] + z }), false, `${d.id}: visible mesh corner is walkable`);
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      assert.equal(walkable({ x: d.position[0] + Math.sin(angle) * 1.9, z: d.position[2] + Math.cos(angle) * 1.9 }), false);
    }
  }
});

test('stair rails block swept crossings even at their landings', () => {
  let checked = 0;
  for (const box of CITY_RAILS) {
    const localZ = box.halfDepth - .2;
    const center = { x: box.x + Math.sin(box.angle) * localZ, z: box.z + Math.cos(box.angle) * localZ };
    const a = { x: center.x - Math.cos(box.angle) * .8, z: center.z + Math.sin(box.angle) * .8 };
    const b = { x: center.x + Math.cos(box.angle) * .8, z: center.z - Math.sin(box.angle) * .8 };
    assert.ok(boxBlocksSegment(a, b, box, .2));
    if (!walkable(a) || !walkable(b)) continue;
    assert.equal(clearSegment(a, b), false);
    const result = advance(a, { x: b.x - a.x, z: b.z - a.z });
    assert.ok(clearSegment(a, result));
    assert.notDeepEqual(result, b);
    checked++;
  }
  assert.ok(checked >= 4, 'exercise real traversable land on both sides of a rail');
});

test('palazzo corners, balconies and fountain are solid', () => {
  for (const home of CITY_HOMES) {
    const halfWidth = (2 + (home.variant % 3) * .28) / 2 + .1;
    for (const x of [-halfWidth, halfWidth]) for (const z of [-1.1, 1.4]) {
      const p = { x: home.x + x * Math.cos(home.angle) + z * Math.sin(home.angle), z: home.z - x * Math.sin(home.angle) + z * Math.cos(home.angle) };
      assert.equal(walkable(p), false, 'rendered building corner is passable');
    }
  }
  assert.equal(walkable(CITY_FOUNTAIN), false);
});

test('every numbered port and the summit fountain remain reachable', () => {
  const goals = [
    ...CITY_PORTS.map(port => port.approach),
    { x: CITY_FOUNTAIN.x, z: CITY_FOUNTAIN.z + 2.6 },
  ];
  for (const goal of goals) {
    assert.ok(walkable(goal));
    const route = planRoute(SPAWN, goal);
    assert.ok(route, `no route to ${JSON.stringify(goal)}`);
    let previous = SPAWN;
    for (const next of route) {
      assert.ok(clearSegment(previous, next));
      previous = next;
    }
  }
});

test('each entrance shares its exhibit position, elevation and destination', () => {
  assert.equal(CITY_PORTS.length, districts.length);
  for (const district of districts) {
    const port = CITY_PORTS.find(p => p.id === district.id);
    assert.equal(port.district, district);
    assert.equal(port.number, district.number);
    assert.equal(port.x, district.position[0]);
    assert.equal(port.y, district.position[1]);
    assert.equal(port.z, district.position[2]);
    assert.ok(Math.hypot(port.approach.x - port.x, port.approach.z - port.z) < 3);
  }
});
