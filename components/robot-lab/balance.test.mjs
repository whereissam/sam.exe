import { test, expect } from 'bun:test';
import { convexHull, support } from './balance';

const square = [[0, 0], [1, 0], [1, 1], [0, 1], [0.5, 0.5]];
test('the support polygon is the convex hull of the contacts', () => {
  expect(convexHull(square).length).toBe(4);
});
test('a centre of mass over the feet is balanced', () => {
  expect(support([0.5, 0.5], square, 0.03).balanced).toBe(true);
});
test('just past the edge is forgiven, further out tips over the nearest edge', () => {
  expect(support([1.02, 0.5], square, 0.03).balanced).toBe(true);
  const tip = support([1.4, 0.5], square, 0.03);
  expect(tip.balanced).toBe(false);
  expect(tip.pivot).toEqual([1, 0.5]);
});
test('a single foot or a line of contacts tips unless the mass is right over it', () => {
  expect(support([0.5, 0.2], [[0, 0], [1, 0]], 0.03).balanced).toBe(false);
  expect(support([0.5, 0.01], [[0, 0], [1, 0]], 0.03).balanced).toBe(true);
  const one = support([0.3, 0], [[0, 0]], 0.03);
  expect(one.balanced).toBe(false);
  expect(one.pivot).toEqual([0, 0]);
});
test('nothing touching the floor is treated as resting', () => {
  expect(support([0, 0], [], 0.03).balanced).toBe(true);
});
