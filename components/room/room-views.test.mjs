import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { roomViews, roomViewPose } from './room-views';

test('each viewpoint has a finite, distinct camera pose on desktop and phones', () => {
  for (const [width, height] of [[1440, 900], [390, 844], [320, 568], [844, 390]]) {
    const targets = new Set();
    for (const { id } of roomViews) {
      const pose = roomViewPose(id, width, height);
      assert.ok([...pose.position, ...pose.target, pose.zoom].every(Number.isFinite));
      assert.ok(pose.zoom >= 18);
      assert.notDeepEqual(pose.position, pose.target);
      targets.add(JSON.stringify(pose.target));
    }
    assert.equal(targets.size, roomViews.length);
  }
});

test('portrait bookshelf framing follows the selected book', () => {
  const first = roomViewPose('shelf', 390, 844, 0);
  const last = roomViewPose('shelf', 390, 844, 3);
  assert.notEqual(first.target[2], last.target[2]);
  assert.equal(first.zoom, last.zoom);
});

test('focused book framing reserves space beside or below the model for notes', () => {
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    const shelf = roomViewPose('shelf', width, height, 2, false);
    const focused = roomViewPose('shelf', width, height, 2, true);
    assert.notDeepEqual(shelf.target, focused.target);
  }
});
