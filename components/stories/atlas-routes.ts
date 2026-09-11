import { stories, type Photo } from '@/content/stories';
import { countriesFromPhotos, type AtlasCountry } from '../world/photo-atlas';

/** URL-safe form of a country name: "United States" becomes "united-states". */
export function toSlug(name: string) {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const countries: AtlasCountry[] = countriesFromPhotos(
  stories.photos,
  stories.journeys,
);

/** Slugs are only useful if they stay unique. Two names can reduce to the same
 *  slug ("Congo" and "Congo."), and a collision would make one of them
 *  unreachable, so a repeat takes its position as a suffix. */
export function uniqueSlugs(names: string[]) {
  const used = new Map<string, number>();
  return names.map((name, index) => {
    const base = toSlug(name) || 'uncharted';
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${index}`;
  });
}
export const countrySlugs = uniqueSlugs(countries.map((c) => c.name));

export const countryBySlug = (slug: string) => {
  const index = countrySlugs.indexOf(slug);
  return index < 0 ? null : countries[index];
};
export const slugForCountry = (name: string) => {
  const index = countries.findIndex((country) => country.name === name);
  return index < 0 ? null : countrySlugs[index];
};

export const photoPath = (countryName: string, photoId: string) => {
  const slug = slugForCountry(countryName);
  return slug ? `/atlas/${slug}/${encodeURIComponent(photoId)}` : null;
};
export const countryPath = (countryName: string) => {
  const slug = slugForCountry(countryName);
  return slug ? `/atlas/${slug}` : null;
};

/** The journal entry a photograph belongs to, if any. */
export const journeyForPhoto = (photoId: string) =>
  stories.journeys.find((journey) => journey.photoIds.includes(photoId)) ??
  null;

export const photoInCountry = (
  country: AtlasCountry,
  photoId: string,
): Photo | null => country.photos.find((photo) => photo.id === photoId) ?? null;

/** The address for whatever the atlas is showing. */
export function atlasPath(
  countryName?: string | null,
  photoId?: string | null,
) {
  if (!countryName) return '/atlas';
  if (photoId) return photoPath(countryName, photoId) ?? '/atlas';
  return countryPath(countryName) ?? '/atlas';
}

/** The reverse: what the atlas should show for an address. Used when the
 *  visitor presses Back, so the scene follows the history they expect. */
export function atlasStateFromPath(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'atlas') return null;
  const country = parts[1] ? countryBySlug(decodeURIComponent(parts[1])) : null;
  const photo =
    country && parts[2]
      ? photoInCountry(country, decodeURIComponent(parts[2]))
      : null;
  return { country, photo };
}
