import { test, expect } from 'bun:test';
import { operationDuration, operationLabel, ticketPose } from './operation';
test('ticket prints before pickup and is absent when collected', () => {
  expect(operationDuration('ticket')).toBeGreaterThan(3);
  expect(ticketPose(0).visible).toBe(false);
  expect(ticketPose(0.5)).toMatchObject({ visible: true, collected: 0 });
  expect(operationLabel('ticket', 0.5)).toContain('列印');
  expect(ticketPose(0.8).collected).toBeGreaterThan(0);
  expect(operationLabel('ticket', 0.8)).toContain('拿起');
  expect(ticketPose(1)).toMatchObject({ visible: false, collected: 1 });
});
test('luggage and boarding allow time for physical actions', () => {
  expect(operationDuration('bag')).toBeGreaterThan(2);
  expect(operationDuration('board')).toBeGreaterThan(1);
  expect(operationDuration('ride:2')).toBe(operationDuration('board'));
});
