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
