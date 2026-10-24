import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { OrthographicCamera, Vector3 } from 'three';
import { safeCityCamera, CITY_CAMERA_BOUNDS } from './city-camera';
import { districts } from './districts';
import { GARDEN_SPOTS, harborHeight, onHarborLand } from './island-layout';
import { CITY_RAILS, CITY_STAIRS } from './city-layout';
import { boxContains } from './solid-box';

test('district close-up, zoom-out, orbit and pan never clip the city depth', () => {
  const bounds = CITY_CAMERA_BOUNDS;
  for (const target of [{ x: 0, y: 2, z: -16 }, { x: 80, y: -10, z: 70 }, ...districts.map(d => ({ x: d.position[0], y: d.position[1] + 1, z: d.position[2] }))]) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      for (const elevation of [.05, .6, 1.4]) {
        // Reproduce the old short district camera offset, then orbit it.
        const pose = safeCityCamera({ x: target.x + Math.sin(angle) * Math.cos(elevation) * 14, y: target.y + Math.sin(elevation) * 14, z: target.z + Math.cos(angle) * Math.cos(elevation) * 14 }, target);
        const camera = new OrthographicCamera(-40, 40, 30, -30, .1, pose.far);
        camera.position.set(pose.x, pose.y, pose.z);
        camera.lookAt(target.x, target.y, target.z);
        camera.updateMatrixWorld();
        const center = new Vector3(bounds.x, bounds.y, bounds.z).applyMatrix4(camera.matrixWorldInverse);
        assert.ok(-center.z - bounds.radius > camera.near, 'near plane slices the city');
        assert.ok(-center.z + bounds.radius < camera.far, 'far plane slices the city');
        for (const zoom of [.5, 1, 4, 12]) {
          camera.zoom = zoom;
          camera.updateProjectionMatrix();
          assert.ok(-center.z - bounds.radius > camera.near);
        }
      }
    }
  }
});

test('flowerbed is level dry land clear of every staircase and rail', () => {
  const bed = GARDEN_SPOTS.flowers;
  for (let i = 0; i < 32; i++) {
    const p = { x: bed.x + Math.cos(i * Math.PI / 16) * bed.radius, z: bed.z + Math.sin(i * Math.PI / 16) * bed.radius };
    assert.ok(onHarborLand(p));
    assert.equal(harborHeight(p), harborHeight(bed));
    assert.ok(!CITY_RAILS.some(rail => boxContains(p, rail, .2)));
    for (const stair of CITY_STAIRS) {
      const dx = p.x, dz = p.z + 18;
      const across = dx * Math.cos(stair.angle) - dz * Math.sin(stair.angle);
      const along = dx * Math.sin(stair.angle) + dz * Math.cos(stair.angle);
      assert.ok(Math.abs(across) > stair.width / 2 || along < stair.inner || along > stair.outer);
    }
  }
});
