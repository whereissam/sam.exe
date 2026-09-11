import { test } from 'bun:test';
import assert from 'node:assert/strict';
import {
  clampLevel,
  fittedZoom,
  stepFromPinch,
  stepsFromWheel,
  zoomForLevel,
  FITTED_LEVEL,
  WHEEL_PER_LEVEL,
  ZOOM_LEVELS,
  ZOOM_MAX,
  ZOOM_MIN,
} from './camera-zoom.ts';

/** The scene's own fit function, imported so the test cannot drift from it. */
const fittedFor = fittedZoom;
const viewports = [
  [320, 568],
  [844, 390],
  [360, 640],
  [390, 844],
  [768, 1024],
  [1280, 720],
  [1440, 900],
  [2560, 1440],
  // A 4K display caps the fit at 75, where the top rungs press on the ceiling.
  [3840, 2160],
];

test('the ladder climbs, never wraps, and the fitted level sits in the middle', () => {
  assert.ok(ZOOM_LEVELS.every((v, i) => i === 0 || v > ZOOM_LEVELS[i - 1]));
  assert.equal(ZOOM_LEVELS[FITTED_LEVEL], 1);
  assert.equal(clampLevel(-5), 0);
  assert.equal(clampLevel(ZOOM_LEVELS.length + 5), ZOOM_LEVELS.length - 1);
  assert.equal(clampLevel(1.4), 1);
  assert.equal(clampLevel(Number.NaN), FITTED_LEVEL);
});

test('every viewport gets a usable ladder that stays inside the zoom range', () => {
  for (const [width, height] of viewports) {
    const fitted = fittedFor(width, height);
    const zooms = ZOOM_LEVELS.map((_, i) => zoomForLevel(fitted, i));
    for (const zoom of zooms) {
      assert.ok(zoom >= ZOOM_MIN, `${width}x${height} fell below the minimum`);
      assert.ok(zoom <= ZOOM_MAX, `${width}x${height} rose above the maximum`);
    }
    // Clamping must not collapse neighbouring levels into the same zoom, or a
    // press of the button would appear to do nothing.
    for (let i = 1; i < zooms.length; i++)
      assert.ok(
        zooms[i] > zooms[i - 1],
        `${width}x${height} level ${i} did not change the zoom`,
      );
    assert.equal(zoomForLevel(fitted, FITTED_LEVEL), fitted);
  }
});

test('stepping from either end stays put instead of jumping to the far end', () => {
  const top = ZOOM_LEVELS.length - 1;
  assert.equal(clampLevel(clampLevel(0) - 1), 0);
  assert.equal(clampLevel(clampLevel(top) + 1), top);
  const fitted = fittedFor(1440, 900);
  assert.equal(zoomForLevel(fitted, -3), zoomForLevel(fitted, 0));
  assert.equal(zoomForLevel(fitted, top + 3), zoomForLevel(fitted, top));
});

test('a wheel advances one level per notch and keeps the leftover travel', () => {
  assert.deepEqual(stepsFromWheel(0), { steps: 0, rest: 0 });
  // A slow trackpad: many small deltas add up to exactly one level, no more.
  let rest = 0;
  let total = 0;
  for (let i = 0; i < 12; i++) {
    const out = stepsFromWheel(rest + WHEEL_PER_LEVEL / 12);
    rest = out.rest;
    total += out.steps;
  }
  assert.equal(
    total,
    -1,
    'twelve tenths of a notch should be exactly one level',
  );
  // Scrolling down zooms out, up zooms in.
  assert.equal(stepsFromWheel(WHEEL_PER_LEVEL).steps, -1);
  assert.equal(stepsFromWheel(-WHEEL_PER_LEVEL).steps, 1);
  // A violent flick cannot skip past the ladder's end.
  const { steps } = stepsFromWheel(WHEEL_PER_LEVEL * 40);
  assert.equal(clampLevel(FITTED_LEVEL + steps), 0);
  assert.deepEqual(stepsFromWheel(Number.NaN), { steps: 0, rest: 0 });
});

test('a pinch only reports a level once it has spread or closed far enough', () => {
  assert.equal(stepFromPinch(1), 0);
  assert.equal(stepFromPinch(1.1), 0, 'a small drift must not change level');
  assert.equal(stepFromPinch(1.3), 1);
  assert.equal(stepFromPinch(0.7), -1);
  assert.equal(stepFromPinch(0), 0);
  assert.equal(stepFromPinch(Number.NaN), 0);
});

test('the closest level gets near enough to read an inlaid floor sign', () => {
  // A district floor sign is 2.9 world units wide, drawn from a 1024px texture.
  const SIGN_UNITS = 2.9;
  const ISLAND_UNITS = 28;
  const top = ZOOM_LEVELS.length - 1;
  for (const [width, height] of viewports) {
    const zoom = zoomForLevel(fittedFor(width, height), top);
    // Measured against the viewport, not in absolute pixels: a sign that is a
    // fifth of the screen wide is legible on a phone and a large monitor alike.
    const share = (SIGN_UNITS * zoom) / width;
    assert.ok(
      share >= 0.2,
      `${width}x${height}: a floor sign is only ${Math.round(share * 100)}% of the screen at the closest level`,
    );
    // Closest must actually pass "the whole island fits", or it is not a zoom in.
    assert.ok(
      ISLAND_UNITS * zoom > width,
      `${width}x${height}: the closest level still shows the whole island`,
    );
  }
});

test('the ladder still spans from wider than the island to close up', () => {
  const fitted = fittedFor(1440, 900);
  const widest = zoomForLevel(fitted, 0);
  const closest = zoomForLevel(fitted, ZOOM_LEVELS.length - 1);
  assert.ok(widest < fitted, 'the first level should pull back from the fit');
  assert.ok(
    closest / widest > 5,
    'the ladder should cover a wide range, not a few near-identical steps',
  );
});

test('the expanded archipelago fits inside narrow and short viewports', () => {
  for (const [width, height] of viewports) {
    const zoom = fittedZoom(width, height);
    assert.ok(
      49 * zoom <= width + 0.001,
      `${width}x${height}: islands clipped horizontally`,
    );
    assert.ok(
      37 * zoom <= height - Math.min(160, height * 0.2) + 0.001,
      `${width}x${height}: islands clipped vertically`,
    );
  }
});
