import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { teaPose, placeTeaHand, TEA_CYCLE } from './tea-motion';
import manifest from './character-manifest.json';

test('cup stays on its saucer during reach and release, and returns exactly each cycle', () => {
  const rest = teaPose(0).cup;
  for (const time of [0, 1, 2, 8.5, 9, 10.5, 17.9, 18])
    assert.deepEqual(teaPose(time).cup, rest);
  assert.ok(teaPose(5).cup[1] > rest[1] + 0.12);
  assert.equal(teaPose(5).grip, 1);
  assert.deepEqual(teaPose(0), teaPose(TEA_CYCLE));
});

test('both exported hands reach the cup handle throughout the actual drinking cycle', async () => {
  for (const url of Object.values(manifest)) {
    const bytes = await readFile(
      new URL('../../public' + url, import.meta.url),
    );
    const { scene } = await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      '',
    );
    scene.scale.setScalar(0.52);
    const arm = scene.getObjectByName('ArmR'),
      elbow = scene.getObjectByName('ElbowR'),
      hand = scene.getObjectByName('HandR');
    for (let t = 0; t < TEA_CYCLE; t += 1 / 24) {
      const pose = teaPose(t);
      scene.position.z = pose.lean;
      placeTeaHand(
        arm,
        elbow,
        hand,
        [pose.hand[0], pose.hand[1], pose.hand[2] - pose.lean],
        pose.grip,
      );
      scene.updateMatrixWorld(true);
      const actual = hand.getWorldPosition(new Vector3());
      assert.ok(
        actual.distanceTo(new Vector3(...pose.hand)) < 0.0001,
        `hand misses target at ${t}`,
      );
      if (pose.lift > 0) {
        assert.equal(pose.grip, 1, 'never move the cup without a grip');
        assert.ok(
          actual.distanceTo(
            new Vector3(pose.cup[0] + 0.055, pose.cup[1], pose.cup[2]),
          ) < 0.0001,
        );
      }
    }
  }
});

// Exercise the exported skin, not just the wrist target: sleeves and fingers have volume.
test('neither character’s arm surfaces cross the tabletop during reach, sip or release', async () => {
  for (const url of Object.values(manifest)) {
    const bytes = await readFile(
      new URL('../../public' + url, import.meta.url),
    );
    const { scene } = await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      '',
    );
    scene.scale.setScalar(0.52);
    const meshes = [];
    scene.traverse((mesh) => {
      if (!mesh.isSkinnedMesh) return;
      const indices = mesh.geometry.attributes.skinIndex;
      const weights = mesh.geometry.attributes.skinWeight;
      const vertices = [];
      for (let i = 0; i < indices.count; i++) {
        if (
          [0, 1, 2, 3].some(
            (k) =>
              weights.getComponent(i, k) > 0.1 &&
              /Arm|Elbow|Hand/.test(
                mesh.skeleton.bones[indices.getComponent(i, k)].name,
              ),
          )
        )
          vertices.push(i);
      }
      if (vertices.length) meshes.push({ mesh, vertices });
    });
    const point = new Vector3();
    for (let frame = 0; frame <= TEA_CYCLE * 60; frame++) {
      const t = frame / 60;
      for (const side of ['L', 'R']) {
        scene
          .getObjectByName('Arm' + side)
          .rotation.set(-0.12, 0, side === 'L' ? 0.52 : -0.52);
        scene.getObjectByName('Elbow' + side).rotation.x = -0.6;
        scene.getObjectByName('Hand' + side).rotation.x = -0.65;
      }
      const pose = teaPose(t);
      scene.position.z = pose.lean;
      placeTeaHand(
        scene.getObjectByName('ArmR'),
        scene.getObjectByName('ElbowR'),
        scene.getObjectByName('HandR'),
        [pose.hand[0], pose.hand[1], pose.hand[2] - pose.lean],
        pose.grip,
      );
      scene.updateMatrixWorld(true);
      for (const { mesh, vertices } of meshes) {
        mesh.skeleton.update();
        for (const i of vertices) {
          mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
          // Table: radius .7, center height .52, thickness .055. Seated root: -.06.
          const insideTop = point.x ** 2 + (point.z - 0.95) ** 2 < 0.7 ** 2;
          assert.ok(
            !(insideTop && point.y > 0.5525 && point.y < 0.6075),
            `${url}: ${mesh.name} vertex ${i} intersects tabletop at ${t}s`,
          );
        }
      }
    }
  }
});
