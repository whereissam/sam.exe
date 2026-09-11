/* oxlint-disable next/no-img-element -- Gallery images are locally resized WebP assets from the content importer, already sized in the markup. */
import Link from 'next/link';
import type { Metadata } from 'next';
import { stories } from '@/content/stories';
import { countries, countrySlugs } from '@/components/stories/atlas-routes';

export const metadata: Metadata = {
  title: 'Memory Atlas — SAM.EXE',
  description: `A walkable world map of ${stories.photos.length} photographs from ${countries.length} countries.`,
  openGraph: {
    title: 'Memory Atlas — SAM.EXE',
    description: `A walkable world map of ${stories.photos.length} photographs from ${countries.length} countries.`,
    images: countries[0]?.photos[0]
      ? [{ url: countries[0].photos[0].src }]
      : undefined,
  },
};

export default function AtlasPage() {
  return (
    <main className="atlas-page">
      <nav className="atlas-page-nav">
        <Link href="/">← The island</Link>
        <span>
          {stories.photos.length} photographs · {countries.length} countries
        </span>
      </nav>
      <header>
        <p className="atlas-page-kicker">THE DARKROOM / MEMORY ATLAS</p>
        <h1>A world of little memories.</h1>
        <p>
          Every place behind the photographs. Walk the map inside the island, or
          browse the countries here.
        </p>
      </header>
      <ul className="atlas-page-grid">
        {countries.map((country, index) => {
          const cover = country.photos[0];
          return (
            <li key={country.name}>
              <Link href={`/atlas/${countrySlugs[index]}`}>
                {cover && (
                  <img
                    src={cover.thumbnail}
                    alt={cover.alt}
                    width={cover.width}
                    height={cover.height}
                    loading="lazy"
                  />
                )}
                <strong>{country.name}</strong>
                <small>
                  {country.photos.length} memories
                  {country.cities.length > 0 &&
                    ` · ${country.cities.join(', ')}`}
                </small>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
