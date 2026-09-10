'use client';
import { useState } from 'react';
import { projects } from '@/content/projects';

export default function Projects({ onExplore }: { onExplore: () => void }) {
  const [filter, setFilter] = useState('All');
  const categories = ['All', ...new Set(projects.map((p) => p.category))];
  const visible = projects.filter(
    (p) => filter === 'All' || p.category === filter,
  );
  return (
    <section className="project-gallery" aria-label="Web app projects">
      <div className="project-gallery-heading">
        <span>SELECTED BUILDS</span>
        <small>{projects.length.toString().padStart(2, '0')} EXHIBITS</small>
      </div>
      {categories.length > 2 && (
        <div className="series-filters" aria-label="Filter projects">
          {categories.map((category) => (
            <button
              key={category}
              aria-pressed={filter === category}
              onClick={() => setFilter(category)}
            >
              {category}
            </button>
          ))}
        </div>
      )}
      {visible.map((p, i) => (
        <article className="project-exhibit" key={p.id}>
          <figure>
            <img
              src={p.cover}
              alt={p.coverAlt}
              loading="lazy"
              decoding="async"
              width={1000}
              height={778}
            />
            <figcaption>{p.coverCaption}</figcaption>
          </figure>
          <div className="project-exhibit-copy">
            <small>
              {String(i + 1).padStart(2, '0')} / {p.category}
            </small>
            <h3>{p.name}</h3>
            <p>{p.summary}</p>
            <ul className="project-stack" aria-label="Built with">
              {p.stack.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <details>
              <summary>
                Behind the build <span>+</span>
              </summary>
              <h4>The idea</h4>
              <p>{p.challenge}</p>
              <h4>How it works</h4>
              <p>{p.implementation}</p>
            </details>
            <div className="project-links">
              {p.currentWorld && (
                <button onClick={onExplore}>Explore this world ↗</button>
              )}
              {p.liveUrl && (
                <a href={p.liveUrl} target="_blank" rel="noopener noreferrer">
                  Open app ↗
                </a>
              )}
              {p.sourceUrl && (
                <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer">
                  Source code ↗
                </a>
              )}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
