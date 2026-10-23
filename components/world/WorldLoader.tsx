'use client';
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- A segmented 3D visual needs a custom ARIA progressbar instead of a native platform progress track. */
import { useEffect, useState, type CSSProperties } from 'react';

export type WorldLoadProgress = { loaded: number; total: number; active: boolean };

/** Paints before Three.js arrives; no canvas, fonts, images or extra downloads. */
export function WorldLoader({ done = false, progress }: {
  done?: boolean;
  progress?: WorldLoadProgress;
}) {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => setDismissed(true), 400);
    return () => clearTimeout(timer);
  }, [done]);
  if (dismissed && done) return null;
  const hasAssets = !!progress?.total;
  const fraction = done ? 1 : hasAssets ? Math.min(.95, progress.loaded / progress.total) : 0;
  const stage = done ? 3 : !progress ? 0 : progress.active ? 1 : 2;
  const messages = ['Finding our little corner of the sea', 'Unpacking places, people & possibilities', 'Turning on the lights', 'Your little world is ready'];
  return (
    <div className={`world-loader ${done ? 'is-done' : ''}`}>
      <div className="world-loader-art" aria-hidden="true">
        <svg viewBox="0 0 400 230" fill="none">
          <ellipse className="loader-ripple" cx="200" cy="189" rx="147" ry="29" stroke="currentColor" strokeWidth="1" />
          <ellipse cx="200" cy="187" rx="115" ry="21" fill="#608b7f" opacity=".14" />
          <g className="loader-island">
            <path d="M87 141 197 103 313 139 313 160 204 204 87 162Z" fill="#b8a16d" />
            <path d="m87 141 117 41 109-43-116-36Z" fill="#ead9a5" />
            <path d="m204 182 109-43v21l-109 44Z" fill="#c9b37d" />
            <path d="m139 155 59-22 64 21-59 23Z" fill="#f4e7bd" />
            <path d="m194 175 0 17 25 9 1-17" fill="#dbbb7d" />
            <path d="m194 175 26 9m-26-4 26 9m-26-4 26 9" stroke="#a78753" strokeWidth="2" />
          </g>
          <g className="loader-house loader-piece">
            <path d="m151 97 46-17 41 15v50l-43 16-44-16Z" fill="#f7e7ba" />
            <path d="m195 111 43-16v50l-43 16Z" fill="#d6be86" />
            <path d="m142 99 29-40 48 17 27 22-49 19Z" fill="#c98e69" />
            <path d="m171 59 26 58 49-19-27-22Z" fill="#ad7157" />
            <path d="m166 115 15 5v17l-15-5Z" fill="#72998b" />
            <path d="m209 122 14-5v28l-14 5Z" fill="#608c80" />
          </g>
          <g className="loader-tree loader-piece">
            <path d="M119 127v25" stroke="#a28456" strokeWidth="6" />
            <path d="m99 113 7-20 22-5 16 17-7 21-24 7Z" fill="#9cae79" />
            <path d="m106 93 17 18-10 22-14-20Z" fill="#b7c28e" />
            <path d="m123 111 21-6-7 21-24 7Z" fill="#899c69" />
          </g>
          <g className="loader-beacon loader-piece">
            <path d="m260 109 14-5 11 5v43l-13 5-12-5Z" fill="#f7e7ba" />
            <path d="m272 115 13-6v43l-13 5Z" fill="#d6be86" />
            <path d="m256 109 16-21 17 21-17 7Z" fill="#72998b" />
            <path d="m265 123 7 3v10l-7-3Z" fill="#d2a063" />
          </g>
          <g className="loader-cloud"><path d="M260 48h41c10 0 10-14 0-14h-3c-1-19-29-21-32-3-14-2-19 17-6 17Z" fill="#f6edd3" /></g>
          <g className="loader-spark" stroke="#b38a52" strokeWidth="2"><path d="M105 52v14m-7-7h14M314 80v10m-5-5h10" /></g>
        </svg>
      </div>
      <div className="world-loader-copy">
        <span className="world-loader-kicker">SAM.EXE · A WORLD IN THE MAKING</span>
        <h2>Small world.<br /><em>Big curiosities.</em></h2>
        <div className={`loader-blocks ${!hasAssets && !done ? 'is-indeterminate' : ''}`}
          role="progressbar" aria-label="Loading the island"
          aria-valuemin={0} aria-valuemax={100}
          aria-valuenow={hasAssets || done ? Math.round(fraction * 100) : undefined}
          aria-valuetext={done ? 'Ready' : hasAssets ? `${progress.loaded} of ${progress.total} scene assets loaded` : 'Starting the 3D engine'}>
          {Array.from({ length: 12 }, (_, i) => <i key={i}
            className={i / 12 < fraction ? 'is-filled' : ''}
            style={{ '--block': i } as CSSProperties} />)}
        </div>
        <output className="world-loader-status">{messages[stage]}<span className="loader-dots" aria-hidden="true">…</span></output>
        <div className="loader-stages" aria-hidden="true">
          {['Make room', 'Build a world', 'Welcome home'].map((label, i) => (
            <span key={label} className={stage >= i ? 'is-current' : ''}><b>{i + 1}</b>{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
