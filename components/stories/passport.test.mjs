import { test, expect } from 'bun:test';
import { describePassport, readPassport, SPARK_IDS } from './passport-data.ts';
import { districts } from '../world/districts.ts';
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

test('a restore preview counts what the file holds against the whole journey', () => {
  const full = describePassport(
    readPassport(
      JSON.stringify({
        version: 1,
        visited: districts.map((d) => d.id),
        collected: SPARK_IDS,
        character: 'companion',
        nickname: 'Sam',
        note: '  a note  ',
        updatedAt: '2026-09-10T08:00:00.000Z',
      }),
    ),
  );
  expect(full.stamps).toBe(districts.length);
  expect(full.totalStamps).toBe(districts.length);
  expect(full.sparks).toBe(SPARK_IDS.length);
  expect(full.totalSparks).toBe(SPARK_IDS.length);
  expect(full.character).toBe('companion');
  expect(full.nickname).toBe('Sam');
  expect(full.hasNote).toBe(true);
  expect(full.savedAt?.toISOString()).toBe('2026-09-10T08:00:00.000Z');
});

test('a preview of an empty, blank-noted, or undated file stays presentable', () => {
  const empty = describePassport(readPassport('{"version":1}'));
  expect(empty.stamps).toBe(0);
  expect(empty.sparks).toBe(0);
  expect(empty.character).toBe('sam');
  expect(empty.nickname).toBe('');
  expect(empty.hasNote).toBe(false);
  expect(empty.savedAt).toBeNull();
  // Whitespace is not a note, and a corrupt date must not render "Invalid Date".
  const blank = describePassport(
    readPassport('{"version":1,"note":"   ","updatedAt":"not-a-date"}'),
  );
  expect(blank.hasNote).toBe(false);
  expect(blank.savedAt).toBeNull();
});

test('a downloaded passport survives a round trip through restore', () => {
  const original = readPassport(
    JSON.stringify({
      version: 1,
      visited: [districts[0].id, districts[2].id],
      collected: [SPARK_IDS[1]],
      character: 'companion',
      nickname: 'Traveller',
      note: 'Come back for the darkroom',
      updatedAt: '2026-09-10T08:00:00.000Z',
    }),
  );
  // What download() writes to disk is the same shape readPassport accepts.
  const reread = readPassport(JSON.stringify(original));
  expect(reread).toEqual(original);
  expect(describePassport(reread)).toEqual(describePassport(original));
});

test('a file from an unknown or hostile source cannot smuggle in stamps', () => {
  const sneaky = readPassport(
    JSON.stringify({
      version: 1,
      visited: ['robotics', '__proto__', 'not-a-district'],
      collected: ['craft', 'constructor'],
      character: 'admin',
    }),
  );
  expect(sneaky.visited).toEqual(['robotics']);
  expect(sneaky.collected).toEqual(['craft']);
  expect(sneaky.character).toBe('sam');
  expect(describePassport(sneaky).stamps).toBe(1);
});
