import { test, expect } from 'bun:test';
import {
  initialTrip,
  interact,
  arrive,
  actionPoint,
  route,
  walkable,
  distance,
} from './journey';
const act = (s, a) => interact(s, a, actionPoint(s, a), 4);
test('cannot remotely collect objects or board without luggage and the correct ticket', () => {
  let s = initialTrip();
  expect(interact(s, 'bag', { x: 0, z: 0 }, 4).bag).toBe(false);
  expect(act(s, 'board').phase).toBe('walking');
  s = act(s, 'ticket');
  expect(act(s, 'board').phase).toBe('walking');
  s = act(s, 'bag');
  s = act(s, 'city:2');
  expect(s.ticket).toBeNull();
  expect(act(s, 'board').phase).toBe('walking');
  s = act(s, 'ticket');
  expect(act(s, 'board').phase).toBe('riding');
});
test('a complete outward and return trip requires explicit alighting and keeps the collected stamp', () => {
  let s = initialTrip();
  s = act(s, 'bag');
  s = act(s, 'ticket');
  s = act(s, 'board');
  expect(act(s, 'stamp')).toBe(s);
  s = arrive(s);
  expect(s.area).toBe('city');
  expect(s.phase).toBe('onboard');
  expect(act(s, 'stamp')).toBe(s);
  s = act(s, 'alight');
  s = act(s, 'stamp');
  expect(s.stamps).toEqual([0]);
  s = act(s, 'stamp');
  expect(s.stamps).toEqual([0]);
  s = act(s, 'postcard');
  expect(s.postcard).toBe(true);
  s = act(s, 'board');
  expect(s.postcard).toBe(false);
  s = arrive(s);
  s = act(s, 'alight');
  expect(s.area).toBe('station');
  expect(s.phase).toBe('walking');
  expect(s.stamps).toEqual([0]);
});
test('all required objects have reachable interaction positions without crossing furniture or tracks', () => {
  for (const area of ['station', 'city']) {
    const s = { ...initialTrip(), area };
    const start = { x: area === 'station' ? -4 : 24, z: 1 };
    for (const action of area === 'station'
      ? ['bag', 'city:0', 'ticket', 'board']
      : ['stamp', 'postcard', 'board']) {
      const target = actionPoint(s, action),
        path = route(area, start, target);
      expect(path.length).toBeGreaterThan(0);
      let previous = start;
      for (const step of path) {
        expect(walkable(area, step)).toBe(true);
        expect(distance(previous, step)).toBeLessThanOrEqual(0.501);
        previous = step;
      }
      expect(distance(previous, target)).toBeLessThan(0.3);
    }
  }
  expect(route('station', { x: 0, z: 0 }, { x: 0, z: 2.8 })).toEqual([]);
  expect(walkable('station', { x: -4, z: -2.4 })).toBe(false);
});

test('routes reject off-platform starts and stale coordinates from another station', () => {
  expect(route('station', { x: 24, z: 1.3 }, { x: 0, z: 1 })).toEqual([]);
  expect(route('city', { x: 0, z: 1.3 }, { x: 24, z: 1 })).toEqual([]);
  expect(route('station', { x: 0, z: 1 }, { x: 8, z: 1 })).toEqual([]);
});
