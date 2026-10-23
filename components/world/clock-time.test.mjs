import { test, expect } from 'bun:test';
import { clockHandAngles } from './clock-time';

test('clock uses local time and advances the hour hand between hours', () => {
  const angles = clockHandAngles(new Date(2026, 0, 1, 15, 30, 0));
  expect(angles.hour).toBeCloseTo(-3.5 * Math.PI / 6);
  expect(angles.minute).toBeCloseTo(-Math.PI);
  expect(angles.second).toBeCloseTo(0);
});

test('seconds advance the minute hand and noon wraps to twelve', () => {
  const angles = clockHandAngles(new Date(2026, 0, 1, 0, 0, 30));
  expect(angles.second).toBeCloseTo(-Math.PI);
  expect(angles.minute).toBeCloseTo(-Math.PI / 60);
  expect(clockHandAngles(new Date(2026, 0, 1, 12, 0, 0)).hour).toBeCloseTo(0);
});
