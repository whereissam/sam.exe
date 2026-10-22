import { test, expect } from 'bun:test';
import { partnerDestination } from './partner';
import { initialTrip, actionPoint, walkable, distance, route } from './journey';
test('partner waits beside each interaction without sharing the leader position or standing in furniture', () => {
  for (const area of ['station', 'city']) {
    const trip = { ...initialTrip(), area };
    for (const action of area === 'station'
      ? ['bag', 'ticket', 'board', 'city:0']
      : ['stamp', 'postcard', 'board']) {
      const leader = actionPoint(trip, action),
        partner = partnerDestination(area, leader);
      expect(walkable(area, partner)).toBe(true);
      expect(distance(leader, partner)).toBeGreaterThanOrEqual(0.65);
      expect(
        route(area, { x: area === 'station' ? -3 : 25, z: 1 }, partner).length,
      ).toBeGreaterThan(0);
    }
  }
});
