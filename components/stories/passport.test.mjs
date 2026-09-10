import { test, expect } from 'bun:test';
import { readPassport } from './passport-data.ts';
test('restores valid progress while filtering unknown or duplicate stamps', () => {
  const data = readPassport(
    JSON.stringify({
      version: 1,
      visited: ['robotics', 'robotics', 'unknown'],
      collected: ['craft', 'bad'],
      character: 'companion',
      note: 'Hello next visit',
    }),
  );
  expect(data.visited).toEqual(['robotics']);
  expect(data.collected).toEqual(['craft']);
  expect(data.character).toBe('companion');
  expect(data.note).toBe('Hello next visit');
});
test('rejects incompatible records and bounds browser text', () => {
  expect(() => readPassport('{')).toThrow();
  expect(() => readPassport('{"version":9}')).toThrow();
  const p = readPassport(
    JSON.stringify({
      version: 1,
      nickname: 'a'.repeat(80),
      note: 'b'.repeat(2000),
    }),
  );
  expect(p.nickname.length).toBe(40);
  expect(p.note.length).toBe(1000);
});
