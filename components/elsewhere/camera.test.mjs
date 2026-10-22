import { test, expect } from 'bun:test';
import { OrthographicCamera, Vector3 } from 'three';
import { railwayCamera, stationCameraOffset } from './camera';
import { radius } from './railway';

test('overview and following keep all platforms between the clipping planes, including 12 cities', () => {
  for (const count of [4, 12]) {
    const { distance, near, far } = railwayCamera(count);
    const r = radius(count);
    for (const polar of [0.6, 1.15]) {
      for (const following of [false, true]) {
        const target = new Vector3(following ? r + 8 : 0, 0, r + 2.8);
        const camera = new OrthographicCamera(-900, 900, 420, -420, near, far);
        camera.zoom = 840 / (r * 2 + 22);
        camera.position
          .copy(target)
          .add(
            new Vector3(0, Math.cos(polar), Math.sin(polar)).multiplyScalar(
              distance,
            ),
          );
        camera.lookAt(target);
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
        for (let i = 0; i < 72; i++) {
          const angle = (i / 72) * Math.PI * 2;
          for (const y of [-0.5, 4]) {
            const projected = new Vector3(
              (r + 9) * Math.cos(angle),
              y,
              r + 2.8 + (r + 9) * Math.sin(angle),
            ).project(camera);
            expect(projected.z).toBeGreaterThan(-1);
            expect(projected.z).toBeLessThan(1);
            if (!following) {
              expect(Math.abs(projected.x)).toBeLessThan(1);
              expect(Math.abs(projected.y)).toBeLessThan(1);
            }
          }
        }
      }
    }
  }
});

test('the overview fits portrait and landscape phone canvases after reserving controls', () => {
  for (const [width, height] of [
    [320, 300],
    [375, 420],
    [430, 540],
    [740, 160],
  ]) {
    const count = 4,
      r = radius(count),
      { distance, near, far } = railwayCamera(count);
    const camera = new OrthographicCamera(
      -width / 2,
      width / 2,
      height / 2,
      -height / 2,
      near,
      far,
    );
    camera.zoom = Math.min(width, height) / (r * 2 + 22);
    const target = new Vector3(0, 0, r + 2.8);
    camera.position
      .copy(target)
      .add(new Vector3(0.4, 0.7, 0.8).normalize().multiplyScalar(distance));
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const point = new Vector3(
        (r + 9) * Math.cos(a),
        4,
        r + 2.8 + (r + 9) * Math.sin(a),
      ).project(camera);
      expect(Math.abs(point.x)).toBeLessThan(1);
      expect(Math.abs(point.y)).toBeLessThan(1);
      expect(Math.abs(point.z)).toBeLessThan(1);
    }
  }
});

test('find-me restores an elevated camera facing the traveller from every platform', () => {
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const offset = stationCameraOffset(4, yaw);
    const distance = railwayCamera(4).distance;
    expect(offset.y / distance).toBeGreaterThan(0.5);
    expect(Math.hypot(offset.x, offset.y, offset.z)).toBeCloseTo(distance);
    const camera = new OrthographicCamera(-10, 10, 10, -10, 0.1, 300);
    const character = new Vector3(20, 0.7, 30);
    camera.position
      .copy(character)
      .add(new Vector3(offset.x, offset.y, offset.z));
    camera.lookAt(character);
    camera.updateMatrixWorld();
    const screen = character.clone().project(camera);
    expect(screen.x).toBeCloseTo(0);
    expect(screen.y).toBeCloseTo(0);
  }
});

test('mobile opening view includes both travellers and the entire departure platform without panning', () => {
  for (const [width, height] of [
    [320, 390],
    [390, 480],
    [500, 500],
  ]) {
    const framing = railwayCamera(4),
      offset = stationCameraOffset(4);
    const camera = new OrthographicCamera(
      -width / 2,
      width / 2,
      height / 2,
      -height / 2,
      framing.near,
      framing.far,
    );
    camera.zoom = Math.max(
      10,
      Math.min(width / 18.5, Math.max(140, height - 120) / 9),
    );
    const focus = new Vector3(0, 0.7, -0.4);
    camera.position.copy(focus).add(new Vector3(offset.x, offset.y, offset.z));
    camera.lookAt(focus);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    for (const x of [-6, 6])
      for (const z of [-7.4, 3.2])
        for (const y of [0, 3.6]) {
          const screen = new Vector3(x, y, z).project(camera);
          expect(Math.abs(screen.x)).toBeLessThan(1);
          expect(Math.abs(screen.y)).toBeLessThan(1);
        }
  }
});
