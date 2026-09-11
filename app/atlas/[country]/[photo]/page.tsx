/* oxlint-disable next/no-img-element -- Gallery images are locally resized WebP assets from the content importer, already sized in the markup. */
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  countryBySlug,
  countrySlugs,
  countries,
  journeyForPhoto,
  photoInCountry,
} from '@/components/stories/atlas-routes';

type Params = { params: Promise<{ country: string; photo: string }> };

export function generateStaticParams() {
  return countries.flatMap((country, index) =>
    country.photos.map((photo) => ({
      country: countrySlugs[index],
      photo: photo.id,
    })),
  );
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { country: slug, photo: id } = await params;
  const country = countryBySlug(slug);
  const photo = country && photoInCountry(country, decodeURIComponent(id));
  if (!photo) return { title: 'Photograph not found — SAM.EXE' };
  const title = `${photo.title} — ${country.name}`;
  const description = photo.caption ?? photo.alt;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: [
        {
          url: photo.src,
          width: photo.width,
          height: photo.height,
          alt: photo.alt,
        },
      ],
    },
  };
}

export default async function PhotoPage({ params }: Params) {
  const { country: slug, photo: rawId } = await params;
  const country = countryBySlug(slug);
  const photo = country && photoInCountry(country, decodeURIComponent(rawId));
  if (!country || !photo) notFound();
  const journey = journeyForPhoto(photo.id);
  const order = country.photos.findIndex((entry) => entry.id === photo.id);
  const previous = country.photos[order - 1];
  const next = country.photos[order + 1];
  return (
    <main className="atlas-page atlas-photo-page">
      <nav className="atlas-page-nav">
        <Link href={`/atlas/${slug}`}>← {country.name}</Link>
        <span>
          {order + 1} / {country.photos.length}
        </span>
      </nav>
      <figure>
        <img
          src={photo.src}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
        />
        <figcaption>
          <h1>{photo.title}</h1>
          <p className="atlas-photo-where">
            {[photo.location, country.name, photo.date]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {photo.caption && <p>{photo.caption}</p>}
          {photo.demo && (
            <p className="atlas-photo-demo">
              Demonstration photograph, not original work.
              {photo.credit && ` Credit: ${photo.credit}.`}{' '}
              {photo.sourceUrl && (
                <a href={photo.sourceUrl} rel="noreferrer nofollow noopener">
                  Source
                </a>
              )}
            </p>
          )}
          {journey && (
            <p className="atlas-photo-journey">
              From the chapter <strong>{journey.title}</strong> · {journey.city}
              , {journey.period}
            </p>
          )}
        </figcaption>
      </figure>
      <nav className="atlas-page-steps">
        {previous ? (
          <Link href={`/atlas/${slug}/${encodeURIComponent(previous.id)}`}>
            ← {previous.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/atlas/${slug}/${encodeURIComponent(next.id)}`}>
            {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
      <p className="atlas-page-more">
        <Link href="/">Walk the island</Link> ·{' '}
        <Link href={`/atlas/${slug}`}>All of {country.name}</Link>
      </p>
    </main>
  );
}
