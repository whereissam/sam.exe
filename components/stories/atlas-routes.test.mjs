import { test, expect } from 'bun:test';
import {
  toSlug,
  uniqueSlugs,
  countries,
  countrySlugs,
  countryBySlug,
  slugForCountry,
  photoPath,
  countryPath,
  journeyForPhoto,
  photoInCountry,
  atlasPath,
  atlasStateFromPath,
} from './atlas-routes.ts';
import { stories } from '../../content/stories.ts';

test('country names become clean, URL-safe slugs', () => {
  expect(toSlug('United States')).toBe('united-states');
  expect(toSlug('Germany')).toBe('germany');
  expect(toSlug("Côte d'Ivoire")).toBe('cote-d-ivoire');
  expect(toSlug('  Spaced  Out  ')).toBe('spaced-out');
  expect(toSlug('Uncharted memories')).toBe('uncharted-memories');
  // No leading, trailing or doubled separators to trip up a router.
  for (const slug of countrySlugs) {
    expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(slug).not.toBe('');
  }
});

test('every slug is unique, so no country becomes unreachable', () => {
  expect(new Set(countrySlugs).size).toBe(countrySlugs.length);
  expect(countrySlugs.length).toBe(countries.length);
  // Names that reduce to the same slug must still get separate addresses.
  const collided = uniqueSlugs(['Congo', 'Congo.', 'congo', 'Germany']);
  expect(new Set(collided).size).toBe(4);
  expect(collided[0]).toBe('congo');
  expect(collided[3]).toBe('germany');
  // A name with nothing URL-safe in it still yields a usable slug.
  expect(uniqueSlugs(['???', '!!!']).every(Boolean)).toBe(true);
  expect(new Set(uniqueSlugs(['???', '!!!'])).size).toBe(2);
});

test('a slug round-trips back to the country it names', () => {
  for (const [index, country] of countries.entries()) {
    const slug = countrySlugs[index];
    expect(slugForCountry(country.name)).toBe(slug);
    expect(countryBySlug(slug)?.name).toBe(country.name);
    expect(countryPath(country.name)).toBe(`/atlas/${slug}`);
  }
  expect(countryBySlug('nowhere')).toBeNull();
  expect(slugForCountry('Nowhere')).toBeNull();
  expect(countryPath('Nowhere')).toBeNull();
});

test('every photograph in the catalog has a reachable address', () => {
  const seen = new Set();
  for (const country of countries)
    for (const photo of country.photos) {
      const path = photoPath(country.name, photo.id);
      expect(path).not.toBeNull();
      expect(seen.has(path)).toBe(false);
      seen.add(path);
      // The route's own lookup must find the photo back from that address.
      const [, , slug, id] = path.split('/');
      const back = countryBySlug(slug);
      expect(back?.name).toBe(country.name);
      expect(photoInCountry(back, decodeURIComponent(id))?.id).toBe(photo.id);
    }
  expect(seen.size).toBe(stories.photos.length);
});

test('a photo id that is not in that country is refused, not guessed', () => {
  const [first, second] = countries;
  expect(photoInCountry(first, second.photos[0].id)).toBeNull();
  expect(photoInCountry(first, 'no-such-photo')).toBeNull();
});

test('journal lookup finds the chapter a photograph belongs to', () => {
  const journey = stories.journeys[0];
  expect(journeyForPhoto(journey.photoIds[0])?.id).toBe(journey.id);
  expect(journeyForPhoto('no-such-photo')).toBeNull();
});

test('the address follows what the atlas is showing', () => {
  const country = countries[0];
  const photo = country.photos[0];
  expect(atlasPath()).toBe('/atlas');
  expect(atlasPath(null)).toBe('/atlas');
  expect(atlasPath(country.name)).toBe(countryPath(country.name));
  expect(atlasPath(country.name, photo.id)).toBe(
    photoPath(country.name, photo.id),
  );
  // An unknown country must not invent an address.
  expect(atlasPath('Nowhere')).toBe('/atlas');
  expect(atlasPath('Nowhere', photo.id)).toBe('/atlas');
});

test('an address maps back to what the atlas should show', () => {
  const country = countries[0];
  const photo = country.photos[0];
  expect(atlasStateFromPath('/atlas')).toEqual({ country: null, photo: null });
  expect(atlasStateFromPath(atlasPath(country.name))).toEqual({
    country,
    photo: null,
  });
  expect(atlasStateFromPath(atlasPath(country.name, photo.id))).toEqual({
    country,
    photo,
  });
  // Anything outside the atlas is not the atlas's business.
  expect(atlasStateFromPath('/')).toBeNull();
  expect(atlasStateFromPath('/passport')).toBeNull();
  // Unknown pieces resolve to nothing rather than throwing.
  expect(atlasStateFromPath('/atlas/nowhere')).toEqual({
    country: null,
    photo: null,
  });
  expect(atlasStateFromPath(`${atlasPath(country.name)}/not-a-photo`)).toEqual({
    country,
    photo: null,
  });
});

test('every country and photo survives the address round trip', () => {
  for (const country of countries) {
    expect(atlasStateFromPath(atlasPath(country.name)).country.name).toBe(
      country.name,
    );
    for (const photo of country.photos) {
      const back = atlasStateFromPath(atlasPath(country.name, photo.id));
      expect(back.country.name).toBe(country.name);
      expect(back.photo.id).toBe(photo.id);
    }
  }
});
