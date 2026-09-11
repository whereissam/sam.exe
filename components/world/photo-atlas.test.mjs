import { test, expect } from 'bun:test';
import {
  countriesFromPhotos,
  WORLD_MAP_BOUNDS,
  mapPoint,
  atlasFit,
  MAP_TILT,
  MAP_CHROME,
  placeFor,
  labelHeights,
  labelBase,
  LABEL_NEAR,
  LABEL_RUNG,
  LANDMARK_TOP,
  LANDMARK_SCALE,
  atlasRoute,
  atlasWalkable,
  atlasAdvance,
} from './photo-atlas.ts';
import places from './world-places.json';
import { followRoute } from './navigation.ts';
import { stories } from '../../content/stories.ts';

test('the atlas groups every catalog photograph by country without losing unassigned memories', () => {
  const countries = countriesFromPhotos(stories.photos, stories.journeys);
  expect(countries.map((c) => c.name)).toEqual([
    'Germany',
    'Taiwan',
    'United States',
    'Japan',
  ]);
  expect(
    countries
      .flatMap((c) => c.photos)
      .map((p) => p.id)
      .sort((a, b) => a.localeCompare(b)),
  ).toEqual(stories.photos.map((p) => p.id).sort());
  const photo = { ...stories.photos[0], id: 'a-new-frame', country: 'Iceland' };
  const explicit = countriesFromPhotos(
    [photo, { ...photo, id: 'unassigned', country: undefined }],
    [],
  );
  expect(explicit.map((c) => c.name)).toEqual([
    'Iceland',
    'Uncharted memories',
  ]);
});

test('the traveller reaches every destination from every other destination without crossing a landmark', () => {
  const countries = countriesFromPhotos(stories.photos, stories.journeys);
  const obstacles = countries.map((c) => ({
    x: c.position.x,
    z: c.position.z - 0.4,
    radius: 0.55,
  }));
  const bounds = WORLD_MAP_BOUNDS;
  const destinations = [
    { x: 0, z: 2 },
    ...countries.map((c) => ({ x: c.position.x, z: c.position.z + 1.25 })),
  ];
  for (const start of destinations)
    for (const goal of destinations) {
      const route = atlasRoute(start, goal, bounds, obstacles);
      expect(route).not.toBeNull();
      let position = start;
      for (let i = 0; i < 2000 && route.length; i++) {
        position = followRoute(position, route, 0.04);
        expect(atlasWalkable(position, bounds, obstacles)).toBe(true);
      }
      expect(Math.hypot(position.x - goal.x, position.z - goal.z)).toBeLessThan(
        0.001,
      );
    }
});

test('manual walking and tap routes respect atlas and photo garden edges', () => {
  const bounds = { halfWidth: 5.6, minZ: 0.8, maxZ: 4 };
  expect(atlasRoute({ x: 0, z: 2 }, { x: 0, z: -1 }, bounds, [])).toBeNull();
  expect(atlasRoute({ x: 0, z: 2 }, { x: NaN, z: 2 }, bounds, [])).toBeNull();
  expect(atlasAdvance({ x: 5.5, z: 2 }, { x: 1, z: 0.2 }, bounds, [])).toEqual({
    x: 5.5,
    z: 2.2,
  });
  expect(
    atlasRoute({ x: -2.8, z: 2.6 }, { x: 2.8, z: 2.6 }, bounds, []),
  ).toEqual([{ x: 2.8, z: 2.6 }]);
});

test('country destinations follow world geography rather than a circular layout', () => {
  const countries = countriesFromPhotos(stories.photos, stories.journeys);
  const get = (name) => countries.find((c) => c.name === name).position;
  expect(get('United States').x).toBeLessThan(0);
  expect(get('Germany').x).toBeGreaterThan(0);
  expect(get('Taiwan').x).toBeGreaterThan(get('Germany').x);
  expect(get('Japan').x).toBeGreaterThan(get('Taiwan').x);
  expect(get('Japan').z).toBeLessThan(get('Taiwan').z);
  expect(mapPoint(0, 0)).toEqual({ x: 0, z: -0 });
});

test('every country in the catalog lands on the map, not in the uncharted row', () => {
  const countries = countriesFromPhotos(stories.photos, stories.journeys);
  for (const country of countries) {
    const place = placeFor(country.name);
    expect(place).not.toBeNull();
    expect(country.position).toEqual(place);
    // The uncharted row sits along z = 9; a real country must never be parked there.
    expect(country.position.z).not.toBe(9);
  }
});

test('a catalog name resolves to its map alias without matching a different country', () => {
  // The catalog says "United States"; Natural Earth says "United States of America".
  expect(placeFor('United States')).toEqual(
    mapPoint(...places['United States of America']),
  );
  expect(placeFor('united states')).toEqual(placeFor('United States'));
  expect(placeFor('  Germany  ')).toEqual(mapPoint(...places.Germany));
  // A shared prefix must not swallow a neighbour: Niger is not Nigeria.
  expect(placeFor('Niger')).toEqual(mapPoint(...places.Niger));
  expect(placeFor('Niger')).not.toEqual(mapPoint(...places.Nigeria));
  // Congo must stay itself rather than collapsing into the DRC.
  expect(placeFor('Congo')).toEqual(mapPoint(...places.Congo));
});

test('an unknown or ambiguous name is never given an invented position', () => {
  expect(placeFor('Atlantis')).toBeNull();
  // "Korea" names two different places, so the map refuses to guess.
  expect(placeFor('Korea')).toBeNull();
  // "United" prefixes four unrelated countries; picking the first would be a lie.
  expect(placeFor('United')).toBeNull();
  expect(placeFor('')).toBeNull();
  const invented = countriesFromPhotos(
    [{ ...stories.photos[0], id: 'x', country: 'Atlantis' }],
    [],
  );
  expect(invented[0].position.z).toBe(9);
});

test('labels of neighbouring countries never sit at the same height', () => {
  const countries = countriesFromPhotos(stories.photos, stories.journeys);
  const heights = labelHeights(countries);
  expect(heights.length).toBe(countries.length);
  for (let a = 0; a < countries.length; a++)
    for (let b = a + 1; b < countries.length; b++) {
      const gap = Math.hypot(
        countries[a].position.x - countries[b].position.x,
        countries[a].position.z - countries[b].position.z,
      );
      if (gap < LABEL_NEAR)
        expect(Math.abs(heights[a] - heights[b])).toBeGreaterThanOrEqual(
          LABEL_RUNG * 0.8,
        );
    }
  // Taiwan and Japan are the close pair in this catalog; they must differ.
  const taiwan = countries.findIndex((c) => c.name === 'Taiwan');
  const japan = countries.findIndex((c) => c.name === 'Japan');
  expect(heights[taiwan]).not.toBe(heights[japan]);
});

test('a lone country stays low, and a crowd stacks one rung at a time', () => {
  const at = (x, z, landmark = 'gate') => ({ position: { x, z }, landmark });
  expect(labelHeights([at(0, 0)])).toEqual([labelBase('gate')]);
  // Far apart countries all sit at their own base; nothing is lifted for show.
  expect(labelHeights([at(-15, 0), at(0, 0), at(15, 0)])).toEqual([
    labelBase('gate'),
    labelBase('gate'),
    labelBase('gate'),
  ]);
  // A pile in one spot climbs, and every height is clearly separated.
  const crowd = labelHeights([at(2, 2), at(2, 2), at(2, 2), at(2, 2)]);
  expect(new Set(crowd).size).toBe(4);
  expect(Math.min(...crowd)).toBe(labelBase('gate'));
  for (let i = 1; i < crowd.length; i++)
    expect(crowd[i] - crowd[i - 1]).toBeGreaterThanOrEqual(LABEL_RUNG * 0.8);
});

test('a label always clears the roof of the landmark it names', () => {
  const countries = countriesFromPhotos(stories.photos, stories.journeys);
  const heights = labelHeights(countries);
  for (const [index, country] of countries.entries()) {
    const roof = LANDMARK_TOP[country.landmark] * LANDMARK_SCALE;
    expect(heights[index]).toBeGreaterThan(roof);
  }
  // Taipei 101 is far taller than the Brandenburg Gate, so its label must sit
  // higher; one shared height would bury a label inside a roof.
  expect(labelBase('tower')).toBeGreaterThan(labelBase('gate'));
  expect(labelBase('torii')).toBeGreaterThan(labelBase('gate'));
});

test('the map opens filling the view, not marooned in the middle of it', () => {
  const across = WORLD_MAP_BOUNDS.halfWidth * 2;
  const deep = (WORLD_MAP_BOUNDS.maxZ - WORLD_MAP_BOUNDS.minZ) * MAP_TILT;
  for (const [width, height] of [
    [390, 844],
    [768, 1024],
    [1280, 720],
    [1706, 862],
    [2560, 1440],
  ]) {
    const zoom = atlasFit(width, height);
    const drawnWidth = across * zoom;
    const drawnDepth = deep * zoom;
    // Wide enough to be worth opening...
    expect(drawnWidth / width).toBeGreaterThan(0.85);
    // ...but never wider or taller than the space it has.
    expect(drawnWidth).toBeLessThanOrEqual(width);
    expect(drawnDepth).toBeLessThanOrEqual(height - MAP_CHROME);
  }
});

test('the map fit measures the depth the camera actually shows', () => {
  // Viewed from above and behind, the map's depth foreshortens; treating it as
  // upright reserves room nothing occupies and shrinks the map for no reason.
  expect(MAP_TILT).toBeGreaterThan(0.5);
  expect(MAP_TILT).toBeLessThan(1);
  // A taller window buys more zoom until the width becomes the limit.
  expect(atlasFit(1706, 1200)).toBeGreaterThan(atlasFit(1706, 700));
  expect(atlasFit(3000, 900)).toBeGreaterThan(atlasFit(1200, 900));
  // Never returns something unusable for a tiny window.
  expect(atlasFit(320, 400)).toBeGreaterThan(0);
});
