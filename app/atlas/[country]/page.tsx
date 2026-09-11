/* oxlint-disable next/no-img-element -- Gallery images are locally resized WebP assets from the content importer, already sized in the markup. */
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  countries,
  countrySlugs,
  countryBySlug,
  journeyForPhoto,
} from '@/components/stories/atlas-routes';

type Params = { params: Promise<{ country: string }> };

export function generateStaticParams() {
  return countrySlugs.map((country) => ({ country }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const country = countryBySlug((await params).country);
  if (!country) return { title: 'Not in the atlas — SAM.EXE' };
  const count = country.photos.length;
  const title = `${country.name} — Memory Atlas`;
  const description = `${count} photograph${count === 1 ? '' : 's'} from ${country.name}${country.cities.length ? `: ${country.cities.join(', ')}` : ''}.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: country.photos[0] ? [{ url: country.photos[0].src }] : undefined,
    },
  };
}

export default async function CountryPage({ params }: Params) {
  const slug = (await params).country;
  const country = countryBySlug(slug);
  if (!country) notFound();
  return (
    <main className="atlas-page">
      <nav className="atlas-page-nav">
        <Link href="/">← The island</Link>
        <span>
          {countries.length} countries · {country.photos.length} here
        </span>
      </nav>
      <header>
        <p className="atlas-page-kicker">THE DARKROOM / MEMORY ATLAS</p>
        <h1>{country.name}</h1>
        {country.cities.length > 0 && <p>{country.cities.join(' · ')}</p>}
      </header>
      <ul className="atlas-page-grid">
        {country.photos.map((photo) => {
          const journey = journeyForPhoto(photo.id);
          return (
            <li key={photo.id}>
              <Link href={`/atlas/${slug}/${encodeURIComponent(photo.id)}`}>
                <img
                  src={photo.thumbnail}
                  alt={photo.alt}
                  width={photo.width}
                  height={photo.height}
                  loading="lazy"
                />
                <strong>{photo.title}</strong>
                <small>
                  {[photo.location, photo.date, journey?.title]
                    .filter(Boolean)
                    .join(' · ')}
                </small>
                {photo.demo && <em>Demonstration photograph</em>}
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="atlas-page-more">
        Other places:{' '}
        {countries
          .filter((other) => other.name !== country.name)
          .map((other, index) => (
            <span key={other.name}>
              {index > 0 && ' · '}
              <Link href={`/atlas/${countrySlugs[countries.indexOf(other)]}`}>
                {other.name}
              </Link>
            </span>
          ))}
      </p>
    </main>
  );
}
