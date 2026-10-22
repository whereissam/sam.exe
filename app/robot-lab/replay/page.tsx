'use client';
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- Custom timeline has pointer capture, keyboard controls and slider semantics. */
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { constrainedFight } from '@/components/world/robot-contact';
import './replay.css';
const Scene = lazy(() => import('@/components/robot-lab/ContactReplay'));
const DURATION = 8.1;
const events = Array.from({ length: 6 }, (_, i) => ({
  time: i * 1.35 + 0.675,
  label: [
    'Left jab',
    'Right cross',
    'Left jab',
    'Front kick',
    'Right cross',
    'Left jab',
  ][i],
}));
export default function ReplayPage() {
  const [time, setTime] = useState(0.675),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1),
    [ghost, setGhost] = useState(true),
    [colliders, setColliders] = useState(false),
    [selected, setSelected] = useState<string | null>(null);
  const clock = useRef(0);
  const atEnd = time >= DURATION;
  useEffect(() => {
    if (!playing || atEnd) return;
    let frame = 0,
      last = performance.now();
    const tick = (now: number) => {
      if (document.hidden) {
        last = now;
        frame = requestAnimationFrame(tick);
        return;
      }
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock.current += delta;
      if (clock.current >= 1 / 30) {
        const elapsed = clock.current;
        clock.current = 0;
        setTime((t) => {
          const next = t + elapsed * speed;
          return Math.min(DURATION, next);
        });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, atEnd]);
  const result = constrainedFight(time);
  function seek(value: number) {
    setPlaying(false);
    setTime(Math.max(0, Math.min(DURATION, value)));
  }
  function exportReplay() {
    const frames = Array.from({ length: 244 }, (_, i) => {
      const t = Math.min(DURATION, i / 30),
        r = constrainedFight(t);
      return {
        time: t,
        requested: r.raw,
        resolved: r.frames,
        clearanceCorrection: r.correction,
        parts: r.parts,
      };
    });
    const blob = new Blob(
      [
        JSON.stringify(
          {
            kind: 'synthetic-kinematic-contact-demo',
            version: 1,
            units: 'metres / radians / seconds',
            frames,
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'robot-contact-replay.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <main className="contact-page">
      <header>
        <Link href="/robot-lab">← Robot lab</Link>
        <div>
          <small>03 / MOTION OBSERVATORY</small>
          <h1>Where motion meets contact.</h1>
        </div>
        <button onClick={exportReplay}>Export replay ↗</button>
      </header>
      <section
        className="contact-world"
        aria-label="Interactive 3D motion comparison"
      >
        <Suspense
          fallback={
            <div className="contact-loading">
              Preparing the articulated robots…
            </div>
          }
        >
          <Scene
            time={time}
            ghost={ghost}
            colliders={colliders}
            selected={selected}
            onSelect={setSelected}
          />
        </Suspense>
        <div className="contact-legend">
          <span>◯ Wireframe · requested</span>
          <span>● Solid · constrained</span>
        </div>
        <aside>
          <small>
            {result.correction > 0.001
              ? 'CONTACT CONSTRAINT ACTIVE'
              : 'CLEARANCE MAINTAINED'}
          </small>
          <strong>
            {(result.correction * 100).toFixed(1)} <span>cm</span>
          </strong>
          <p>Total separation added to prevent overlap.</p>
          <b>{selected ?? 'Tap a robot part'}</b>
          <p>
            {result.parts.length
              ? `${result.parts[0]} ↔ ${result.parts[1]}`
              : 'Inspect a body part, orbit, or scrub the motion.'}
          </p>
          <button aria-pressed={ghost} onClick={() => setGhost((v) => !v)}>
            Requested motion {ghost ? 'on' : 'off'}
          </button>
          <button
            aria-pressed={colliders}
            onClick={() => setColliders((v) => !v)}
          >
            Collision envelopes {colliders ? 'on' : 'off'}
          </button>
        </aside>
      </section>
      <footer>
        <div className="contact-play">
          <button
            onClick={() => {
              if (atEnd) {
                setTime(0);
                setPlaying(true);
              } else setPlaying((v) => !v);
            }}
          >
            {playing && !atEnd ? 'Ⅱ Pause' : '▶ Play'}
          </button>
          <button
            aria-label="Previous frame"
            onClick={() => seek(time - 1 / 30)}
          >
            ← Frame
          </button>
          <button aria-label="Next frame" onClick={() => seek(time + 1 / 30)}>
            Frame →
          </button>
          <button onClick={() => setSpeed((v) => (v === 1 ? 0.25 : 1))}>
            {speed}× speed
          </button>
          <output>
            {time.toFixed(2)} / {DURATION.toFixed(2)} s
          </output>
        </div>
        <div
          className="contact-timeline"
          role="slider"
          tabIndex={0}
          aria-label="Replay time"
          aria-valuemin={0}
          aria-valuemax={DURATION}
          aria-valuenow={time}
          onKeyDown={(e) => {
            if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
              e.preventDefault();
              seek(
                e.key === 'Home'
                  ? 0
                  : e.key === 'End'
                    ? DURATION
                    : time + (e.key === 'ArrowRight' ? 1 : -1) / 30,
              );
            }
          }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            const r = e.currentTarget.getBoundingClientRect();
            seek(((e.clientX - r.left) / r.width) * DURATION);
          }}
          onPointerMove={(e) => {
            if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
            const r = e.currentTarget.getBoundingClientRect();
            seek(((e.clientX - r.left) / r.width) * DURATION);
          }}
          onPointerUp={(e) =>
            e.currentTarget.releasePointerCapture(e.pointerId)
          }
        >
          <span style={{ width: `${(time / DURATION) * 100}%` }} />
          {events.map((e) => (
            <i key={e.time} style={{ left: `${(e.time / DURATION) * 100}%` }} />
          ))}
          <b style={{ left: `${(time / DURATION) * 100}%` }} />
        </div>
        <div className="contact-events">
          {events.map((e, i) => (
            <button
              key={e.time}
              aria-pressed={Math.abs(time - e.time) < 0.02}
              onClick={() => seek(e.time)}
            >
              <small>
                0{i + 1} · {e.time.toFixed(2)} s
              </small>
              {e.label}
            </button>
          ))}
        </div>
        <p>
          Synthetic motion · conservative kinematic envelopes. This compares
          requested and constrained animation, not recorded hardware telemetry
          or measured impact forces.
        </p>
      </footer>
    </main>
  );
}
