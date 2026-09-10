'use client';
/* oxlint-disable next/no-img-element -- The content importer already sizes and compresses these local WebP images; preserve their intrinsic gallery dimensions. */
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Info, X, Grid2X2 } from 'lucide-react';
import { stories, type Photo } from '@/content/stories';

function PhotoViewer({
  photos,
  immersive = false,
  onExit,
  onBrowse,
}: {
  photos: Photo[];
  immersive?: boolean;
  onExit?: () => void;
  onBrowse?: (browsing: boolean) => void;
}) {
  const [index, setIndex] = useState<number | null>(immersive ? 0 : null);
  const Viewer = immersive ? 'section' : 'dialog';
  const dialog = useRef<HTMLDialogElement>(null);
  const filmstrip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    filmstrip.current
      ?.querySelector('[aria-current="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [index]);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const current = index === null ? null : photos[index];
  function open(i: number) {
    setIndex(i);
    setShowInfo(false);
    onBrowse?.(false);
    if (!immersive) dialog.current?.showModal();
  }
  function close() {
    if (immersive) {
      onExit?.();
      return;
    }
    dialog.current?.close();
    setIndex(null);
  }
  function step(direction: number) {
    setIndex((i) =>
      i === null ? null : (i + direction + photos.length) % photos.length,
    );
  }
  return (
    <>
      {(!immersive || index === null) && (
        <div className="photo-grid">
          {photos.map((p, i) => (
            <button
              key={p.id}
              onClick={() => open(i)}
              className={`photo-tile ${p.height > p.width ? 'is-portrait' : 'is-landscape'}`}
              aria-label={`View ${p.title}, ${p.location ?? 'photograph'}`}
            >
              <img
                src={p.thumbnail}
                width={p.width}
                height={p.height}
                alt={p.alt}
                loading="lazy"
                decoding="async"
              />
              <span>
                <strong>{p.title}</strong>
                <small>
                  {p.location}
                  {p.demo ? ' · DEMO' : ''}
                </small>
              </span>
            </button>
          ))}
        </div>
      )}
      <Viewer
        ref={immersive ? undefined : dialog}
        hidden={immersive && index === null}
        className={`photo-dialog ${immersive ? 'immersive-viewer' : ''} ${showInfo ? 'shows-info' : ''}`}
        aria-label="Photograph viewer"
        onCancel={(event) => {
          event.stopPropagation();
          setIndex(null);
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            step(1);
          }
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            step(-1);
          }
        }}
      >
        <div className="photo-viewer-heading">
          <span>THE DARKROOM</span>
          <small>{current?.location}</small>
        </div>
        {immersive && (
          <button
            className="photo-browse-toggle"
            aria-label="Browse all photographs"
            onClick={() => {
              setIndex(null);
              onBrowse?.(true);
            }}
          >
            <Grid2X2 size={18} />
            <span>All photos</span>
          </button>
        )}
        <button
          className="photo-info-toggle"
          aria-label="Photograph details"
          aria-pressed={showInfo}
          onClick={() => setShowInfo((value) => !value)}
        >
          <Info size={18} />
        </button>
        <button
          className="photo-close"
          aria-label="Close photograph"
          onClick={close}
        >
          <X size={20} />
        </button>
        {current && (
          <>
            <figure>
              <div
                className="photo-stage"
                onTouchStart={(event) => {
                  const touch = event.touches[0];
                  touchStart.current =
                    event.touches.length === 1
                      ? { x: touch.clientX, y: touch.clientY }
                      : null;
                }}
                onTouchEnd={(event) => {
                  if (!touchStart.current) return;
                  const touch = event.changedTouches[0];
                  const dx = touch.clientX - touchStart.current.x;
                  const dy = touch.clientY - touchStart.current.y;
                  touchStart.current = null;
                  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5)
                    step(dx < 0 ? 1 : -1);
                }}
                onTouchCancel={() => {
                  touchStart.current = null;
                }}
              >
                <img
                  key={current.id}
                  src={current.src}
                  width={current.width}
                  height={current.height}
                  alt={current.alt}
                  decoding="async"
                />
                <button
                  className="photo-arrow photo-arrow-prev"
                  aria-label="Previous photograph"
                  disabled={photos.length < 2}
                  onClick={() => step(-1)}
                >
                  <ArrowLeft size={22} />
                </button>
                <button
                  className="photo-arrow photo-arrow-next"
                  aria-label="Next photograph"
                  disabled={photos.length < 2}
                  onClick={() => step(1)}
                >
                  <ArrowRight size={22} />
                </button>
              </div>
              <figcaption>
                <h3>{current.title}</h3>
                {current.demo && (
                  <span className="demo-label">DEMO PHOTOGRAPH</span>
                )}
                {showInfo && (
                  <div className="photo-details">
                    <small>
                      {[current.location, current.date]
                        .filter(Boolean)
                        .join(' · ')}
                    </small>
                    {current.caption && <p>{current.caption}</p>}
                  </div>
                )}
                {current.sourceUrl && (
                  <a
                    className="photo-credit"
                    href={current.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Photo: {current.credit ?? 'Source'} ↗
                  </a>
                )}
              </figcaption>
            </figure>
            <div
              ref={filmstrip}
              className="photo-filmstrip"
              aria-label="Choose a photograph"
            >
              {photos.map((photo, photoIndex) => (
                <button
                  key={photo.id}
                  aria-label={`View ${photo.title}`}
                  aria-current={photoIndex === index ? 'true' : undefined}
                  onClick={() => setIndex(photoIndex)}
                >
                  <img src={photo.thumbnail} alt="" loading="lazy" />
                </button>
              ))}
            </div>
            <div className="photo-pagination">
              <button
                aria-label="Previous photograph"
                disabled={photos.length < 2}
                onClick={() => step(-1)}
              >
                ← Previous
              </button>
              <span>
                {index! + 1} / {photos.length}
              </span>
              <button
                aria-label="Next photograph"
                disabled={photos.length < 2}
                onClick={() => step(1)}
              >
                Next →
              </button>
            </div>
          </>
        )}
      </Viewer>
    </>
  );
}
export function Photography({ onClose }: { onClose: () => void }) {
  const [browsing, setBrowsing] = useState(false);
  const [series, setSeries] = useState('All');
  const categories = [
    'All',
    ...new Set(
      stories.photos.map((p) => p.series).filter((x): x is string => !!x),
    ),
  ];
  const photos =
    series === 'All'
      ? stories.photos
      : stories.photos.filter((p) => p.series === series);
  if (!stories.photos.length)
    return (
      <div className="story-empty">
        <span>THE CONTACT SHEET</span>
        <h3>The collection is taking shape.</h3>
        <p>Photographs and the stories behind them will appear here.</p>
      </div>
    );
  return (
    <section
      className={`photo-collection immersive-gallery ${browsing ? 'is-browsing' : 'is-viewing'}`}
      aria-label="Photography collection"
    >
      <div className="story-section-heading">
        <span>SELECTED FRAMES</span>
        <small>{stories.photos.length} photographs</small>
      </div>
      {stories.photos.some((p) => p.demo) && (
        <p className="demo-notice">
          Demo collection · Reference photographs, credited to their creators.
          Original work will follow.
        </p>
      )}
      {categories.length > 2 && (
        <div
          className="series-filters"
          aria-label="Filter photographs by series"
        >
          {categories.map((s) => (
            <button
              key={s}
              aria-pressed={series === s}
              onClick={() => {
                setSeries(s);
                setBrowsing(false);
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <PhotoViewer
        key={series}
        photos={photos}
        immersive
        onExit={onClose}
        onBrowse={setBrowsing}
      />
    </section>
  );
}
export function Travel() {
  const [active, setActive] = useState<string | null>(null);
  const selected = stories.journeys.find((j) => j.id === active);
  if (!stories.journeys.length)
    return (
      <div className="story-empty">
        <span>THE PERSONAL ATLAS</span>
        <h3>A place. A moment. A story.</h3>
        <p>
          Travel journals will connect the places I visit with photographs and
          everyday discoveries.
        </p>
      </div>
    );
  return (
    <section className="journey-collection" aria-label="Travel journals">
      <div className="story-section-heading">
        <span>NOTES FROM ELSEWHERE</span>
        <small>{stories.journeys.length} journeys</small>
      </div>
      {stories.journeys.some((j) => j.demo) && (
        <p className="demo-notice">
          SAMPLE JOURNALS · 示範內容
          <br />
          Photos and sample copy preview the layout, not personal travel
          history.
        </p>
      )}
      <div className="journey-stops">
        {stories.journeys.map((j, i) => (
          <button
            key={j.id}
            onClick={() => setActive(active === j.id ? null : j.id)}
            aria-expanded={active === j.id}
            aria-controls="journey-story"
          >
            <span>{String(i + 1).padStart(2, '0')}</span>
            <div>
              <strong>{j.city}</strong>
              <small>{[j.country, j.period].filter(Boolean).join(' · ')}</small>
            </div>
            <b>{active === j.id ? '−' : '+'}</b>
          </button>
        ))}
      </div>
      <article id="journey-story" className="journey-story" aria-live="polite">
        {selected && (
          <>
            <small>{selected.period}</small>
            <h3>{selected.title}</h3>
            {!selected.paragraphs.length && (
              <p className="journal-pending">
                Photographs and field notes for this city are on their way.
              </p>
            )}
            {selected.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            <PhotoViewer
              key={selected.id}
              photos={selected.photoIds
                .map((id) => stories.photos.find((p) => p.id === id))
                .filter((p): p is Photo => !!p)}
            />
          </>
        )}
      </article>
    </section>
  );
}
