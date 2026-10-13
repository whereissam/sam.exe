import { test, expect } from 'bun:test';
import { linkedRooms, otherRooms, surpriseRoom } from './room-links';

test('every room has reciprocal direct links to all other rooms', () => {
  for (const room of linkedRooms) {
    const destinations = otherRooms(room.id);
    expect(destinations).toHaveLength(linkedRooms.length - 1);
    expect(destinations.some(destination => destination.id === room.id)).toBe(false);
    for (const destination of destinations) expect(otherRooms(destination.id).some(back => back.id === room.id)).toBe(true);
  }
});
test('random doors reach every other room and never choose the current room', () => {
  for (const room of linkedRooms) {
    const reached = new Set();
    for (const random of [0, 0.25, 0.5, 0.75, 0.999999]) {
      const destination = surpriseRoom(room.id, random);
      expect(destination.id).not.toBe(room.id);
      expect(destination.href).toStartWith('/');
      reached.add(destination.id);
    }
    expect(reached.size).toBe(linkedRooms.length - 1);
  }
});
