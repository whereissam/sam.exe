'use client';
/* oxlint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- Escape already closes these dialogs through onCancel, so the click handler only adds backdrop dismissal for pointer users. */
import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ArrowUpRight,
  RotateCcw,
  Sun,
  Moon,
  X,
  MoveUpRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SoundToggle } from '@/components/audio/SoundToggle';
import { mountSound, playSound } from '@/components/audio/sound';
import { districts, type District } from '@/components/world/districts';
import { Passport, usePassport } from '@/components/stories/Passport';
import { isBackdropClick } from '@/components/ui/backdrop-click';
import {
  isNightHour,
  routineAtHour,
  routineLabels,
  readLighting,
  LIGHTING_KEY,
  type Lighting,
} from '@/components/world/daily-routine';
import type { Action, Gesture } from '@/components/world/Companions';
const PerformancePanel = lazy(
  () => import('@/components/performance/PerformancePanel'),
);
const PhotoAtlas = lazy(() => import('@/components/stories/PhotoAtlas'));
const Travel = lazy(() =>
  import('@/components/stories/Stories').then((m) => ({ default: m.Travel })),
);
const World = lazy(() => import('@/components/world/World'));
const Projects = lazy(() => import('@/components/stories/Projects'));
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="scene-fallback">
        Your browser couldn't start the 3D world.
        <br />
        You can still explore every district below.
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function Home() {
  const router = useRouter();
  useEffect(mountSound, []);
  const passport = usePassport();
  const {
    visited,
    setVisited,
    collected,
    setCollected,
    character,
    setCharacter,
  } = passport;
  const [inspecting, setInspecting] = useState(false);
  const [zoomCommand, setZoomCommand] = useState({ direction: 0, sequence: 0 });
  function zoom(direction: number) {
    setZoomCommand((value) => ({ direction, sequence: value.sequence + 1 }));
  }
  const [passportOpen, setPassportOpen] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  function perform(kind: Gesture) {
    playSound(kind);
    setAction((a) => ({ kind, sequence: (a?.sequence ?? 0) + 1 }));
    setNotice(
      kind === 'celebrate'
        ? 'A little celebration, together.'
        : kind === 'wave'
          ? 'Hello, fellow traveller!'
          : 'A small leap of curiosity.',
    );
  }
  const [ready, setReady] = useState(false),
    [perf, setPerf] = useState(false),
    [notice, setNotice] = useState<string | null>(null),
    [benchmarking, setBenchmarking] = useState(false),
    [mobile, setMobile] = useState(true),
    [touch, setTouch] = useState(false),
    [active, setActive] = useState(true),
    [moving, setMoving] = useState(false),
    [selected, setSelected] = useState<District | null>(null),
    [near, setNear] = useState<District | null>(null),
    [night, setNight] = useState(false),
    [reset, setReset] = useState(0),
    [reduced, setReduced] = useState(false);
  const [localTime, setLocalTime] = useState<Date | null>(null);
  // Holds the visitor's remembered choice, or null to follow their local hour.
  const lighting = useRef<Lighting | null>(null);
  const routine = routineAtHour(localTime?.getHours() ?? 12);
  useEffect(() => {
    // Restore a remembered choice first, so the clock below does not overrule it.
    try {
      lighting.current = readLighting(localStorage.getItem(LIGHTING_KEY));
    } catch {
      // Storage can be unavailable; falling back to the clock is fine.
    }
    const tick = () => {
      const now = new Date();
      setLocalTime(now);
      setNight(
        lighting.current
          ? lighting.current === 'night'
          : isNightHour(now.getHours()),
      );
    };
    tick();
    const timer = setInterval(tick, 60000);
    return () => clearInterval(timer);
  }, []);
  const keys = useRef(new Set<string>());
  const close = useRef<HTMLButtonElement>(null);
  const detailDialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [notice]);
  function collectSpark(id: string) {
    if (!collected.includes(id)) playSound('discover');
    if (collected.includes(id)) return;
    setCollected((v) => (v.includes(id) ? v : [...v, id]));
    setNotice(
      collected.length === 2
        ? 'All three sparks found. The island is a little brighter.'
        : `${id.charAt(0).toUpperCase() + id.slice(1)} discovered · ${collected.length + 1}/3 sparks`,
    );
  }
  function select(d: District) {
    playSound('open');
    previousFocus.current = document.activeElement as HTMLElement;
    setSelected(d);
    setVisited((v) => (v.includes(d.id) ? v : [...v, d.id]));
    keys.current.clear();
    setMoving(false);
  }
  useEffect(() => {
    if (!perf || !ready) return;
    let timer: ReturnType<typeof setTimeout>;
    const run = () => {
      clearTimeout(timer);
      setBenchmarking(true);
      timer = setTimeout(() => setBenchmarking(false), 8000);
    };
    window.addEventListener('sam-benchmark-start', run);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('sam-benchmark-start', run);
    };
  }, [perf, ready]);
  function dismiss() {
    // Background controls are inert until the native modal is closed.
    detailDialog.current?.close();
    setSelected(null);
    previousFocus.current?.focus();
  }
  useEffect(() => {
    setPerf(new URLSearchParams(location.search).get('perf') === '1');
    const compact = matchMedia('(max-width: 700px), (pointer: coarse)');
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    const constrained =
      compact.matches ||
      !!connection?.saveData ||
      ['slow-2g', '2g'].includes(connection?.effectiveType ?? '');
    setMobile(constrained);
    // A hover-less pointer never sees the world labels, so they stay put instead.
    setTouch(matchMedia('(hover: none)').matches);
    // A hover-less pointer never sees the world labels, so they stay put instead.
    setTouch(matchMedia('(hover: none)').matches);
    setReady(
      !connection?.saveData &&
        !['slow-2g', '2g'].includes(connection?.effectiveType ?? ''),
    );
    const visibility = () => {
      setActive(!document.hidden);
      keys.current.clear();
      setMoving(false);
    };
    document.addEventListener('visibilitychange', visibility);
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => {
      media.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  useEffect(() => {
    if (selected) {
      detailDialog.current?.showModal();
      close.current?.focus();
    }
  }, [selected]);
  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.defaultPrevented || (e.target as HTMLElement).closest('dialog'))
        return;
      if (e.key === 'Escape') {
        setSelected(null);
        previousFocus.current?.focus();
        return;
      }
      if (
        selected ||
        passportOpen ||
        !ready ||
        (e.target as HTMLElement).closest('dialog')
      )
        return;
      if (
        ['INPUT', 'TEXTAREA', 'BUTTON'].includes(
          (e.target as HTMLElement).tagName,
        )
      )
        return;
      const key = e.key.toLowerCase();
      if (
        [
          'w',
          'a',
          's',
          'd',
          'arrowup',
          'arrowdown',
          'arrowleft',
          'arrowright',
        ].includes(key)
      ) {
        e.preventDefault();
        keys.current.add(key);
        setMoving(true);
      }
      if (key === 'e' && near) select(near);
      // The island now owns these actions, so keep a keyboard path to each one.
      if (key === 'q') setCharacter((c) => (c === 'sam' ? 'companion' : 'sam'));
      if (key === 'p') {
        keys.current.clear();
        setMoving(false);
        setPassportOpen(true);
      }
      const emote = { 1: 'wave', 2: 'jump', 3: 'celebrate' } as const;
      if (key in emote) perform(emote[key as unknown as keyof typeof emote]);
    }
    const up = (e: KeyboardEvent) => {
      keys.current.delete(e.key.toLowerCase());
      setMoving(keys.current.size > 0);
    };
    const clear = () => {
      keys.current.clear();
      setMoving(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
    };
  }, [near, selected, ready, passportOpen]);
  return (
    <main
      className={`world-page ${night ? 'night' : ''} ${ready ? 'has-world' : 'lite-mode'} ${selected ? 'has-detail' : ''} ${inspecting ? 'is-inspecting' : ''}`}
    >
      <header className="masthead">
        <Link href="/" className="brand">
          sam<span>✳</span>exe<sup>WORLD V.01</sup>
        </Link>
        <div className="header-note">
          <i /> An independent mind. An open world.
        </div>
        <button className="about-link" onClick={() => select(districts[3])}>
          The next chapter <ArrowUpRight size={16} />
        </button>
      </header>
      <section className="intro">
        <div className="eyebrow">
          <span /> A SMALL WORLD OF BIG CURIOSITIES
        </div>
        <h1>
          Always building.
          <br />
          Still exploring<span>_</span>
        </h1>
        <p>
          Frontend. Blockchain. AI. Robotics.
          <br />
          A camera. A passport. One curious mind.
        </p>
        <div className="intro-caption">
          <span>↘</span> Pick a place. See what’s inside.
        </div>
      </section>
      {inspecting && (
        <p className="inspection-hint">
          Drag to orbit · Scroll or pinch to zoom · Right-drag or two-finger
          drag to pan
        </p>
      )}
      <div className="coordinates">
        PERSONAL UNIVERSE / VOL. 001<span>25° 02′ N &nbsp; 121° 33′ E</span>
      </div>
      <section
        className="scene"
        aria-label="Interactive 3D floating island. Drag to orbit, scroll to zoom, or choose a district below."
      >
        <SceneBoundary>
          {!ready && (
            <div className="lightweight-entry">
              <span className="entry-kicker">YOUR WORLD, AT YOUR PACE</span>
              <h2>
                Six places.
                <br />A thousand possibilities.
              </h2>
              <p>
                Explore the chapters below, or step into the interactive island.
              </p>
              <button
                className="enter-world"
                onClick={() => {
                  performance.mark('sam-enter-3d');
                  setReady(true);
                }}
              >
                Enter the 3D world <ArrowUpRight size={18} />
              </button>
              <small>Optional · loads on tap · works best on Wi-Fi</small>
            </div>
          )}
          {ready && (
            <Suspense
              fallback={
                <div className="scene-fallback">
                  Assembling a small universe…
                </div>
              }
            >
              <World
                onSelect={select}
                onNear={setNear}
                keys={keys}
                paused={!!selected || passportOpen || !active}
                character={character}
                onSwitch={setCharacter}
                onAction={perform}
                onPassport={() => {
                  keys.current.clear();
                  setMoving(false);
                  setPassportOpen(true);
                }}
                onEnterRoom={() => router.push('/room')}
                visitedCount={visited.length}
                action={action}
                lowPower={mobile}
                moving={moving || benchmarking}
                benchmarking={benchmarking}
                perf={perf}
                collected={collected}
                onCollect={collectSpark}
                onPulse={() =>
                  setNotice('Beacon activated. A little hello to the universe.')
                }
                reset={reset}
                zoomCommand={zoomCommand}
                night={night}
                routine={routine}
                reduced={reduced}
                touch={touch}
              />
            </Suspense>
          )}
        </SceneBoundary>
      </section>
      {ready && (
        <div
          className="world-a11y-actions"
          role="group"
          aria-label="Traveller actions"
        >
          <button
            onClick={() =>
              setCharacter((c) => (c === 'sam' ? 'companion' : 'sam'))
            }
          >
            Switch to {character === 'sam' ? 'companion' : 'Sam'}
          </button>
          <button onClick={() => perform('wave')}>Wave</button>
          <button onClick={() => perform('jump')}>Jump</button>
          <button onClick={() => perform('celebrate')}>Celebrate</button>
          <button
            onClick={() => {
              keys.current.clear();
              setMoving(false);
              setPassportOpen(true);
            }}
          >
            Open my passport
          </button>
        </div>
      )}
      {ready && localTime && (
        <div
          className="routine-note"
          title="Your local time sets their daily routine. Moving or performing an action wakes them up."
        >
          <span>
            {localTime.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            LOCAL
          </span>
          <small>{routineLabels[routine]}</small>
        </div>
      )}
      {passportOpen && (
        <Passport passport={passport} onClose={() => setPassportOpen(false)} />
      )}
      {ready && (
        <div className="scene-tools" aria-label="View controls">
          <button aria-label="Zoom in" title="Zoom in" onClick={() => zoom(1)}>
            <Plus size={18} />
          </button>
          <button
            aria-label="Zoom out"
            title="Zoom out"
            onClick={() => zoom(-1)}
          >
            <Minus size={18} />
          </button>
          <button
            aria-label={
              inspecting
                ? 'Show navigation'
                : 'Hide navigation for a closer look'
            }
            title={
              inspecting
                ? 'Show navigation'
                : 'Hide navigation for a closer look'
            }
            aria-pressed={inspecting}
            onClick={() => setInspecting((value) => !value)}
          >
            {inspecting ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button
            aria-label={
              night ? 'Switch to sunset lighting' : 'Switch to night lighting'
            }
            title="Change lighting"
            onClick={() => {
              const next: Lighting = night ? 'day' : 'night';
              lighting.current = next;
              setNight(next === 'night');
              try {
                localStorage.setItem(LIGHTING_KEY, next);
              } catch {
                // A visitor with storage blocked keeps the choice for this visit only.
              }
            }}
          >
            {night ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <SoundToggle />
          <button
            aria-label="Reset camera and explorer"
            title="Reset view"
            onClick={() => {
              keys.current.clear();
              setMoving(false);
              setNear(null);
              setReset((v) => v + 1);
            }}
          >
            <RotateCcw size={17} />
          </button>
          <button
            aria-label="Exit 3D and free graphics memory"
            title="Exit 3D"
            onClick={() => {
              setReady(false);
              setInspecting(false);
              setNear(null);
              keys.current.clear();
              setMoving(false);
            }}
          >
            <X size={17} />
          </button>
        </div>
      )}
      <div className="island-caption">
        <span>THE CURIOSITY ISLAND</span>
        <small>Somewhere between code & possibility</small>
      </div>
      {near && !selected && (
        <button className="interact" onClick={() => select(near)}>
          <kbd>E</kbd> Explore {near.title} <ArrowUpRight size={15} />
        </button>
      )}
      {ready && (
        <div className="spark-progress">
          <span>✦ {collected.length}/3 SPARKS</span>
          <small>
            {collected.length === 3
              ? 'A little more curious.'
              : 'Find the three golden lights'}
          </small>
          {collected.length === 3 && (
            <button
              onClick={() => {
                setCollected([]);
                setNotice('A new little adventure.');
              }}
              aria-label="Reset collected sparks"
            >
              Explore again ↺
            </button>
          )}
        </div>
      )}
      <div
        className={`world-notice ${notice ? 'is-visible' : ''}`}
        role="status"
        aria-live="polite"
      >
        {notice}
      </div>
      <nav className="district-nav" aria-label="Explore districts">
        <div className="nav-heading">
          <span>CHOOSE YOUR COORDINATES</span>
          <small>
            {String(visited.length).padStart(2, '0')} /{' '}
            {String(districts.length).padStart(2, '0')} EXPLORED
          </small>
        </div>
        <div className="district-list">
          {districts.map((d) => (
            <button
              key={d.id}
              onClick={() => select(d)}
              style={{ '--district': d.color } as React.CSSProperties}
            >
              <span className="district-number">
                {visited.includes(d.id) ? '✓' : d.number}
              </span>
              <div>
                <small>{d.tag}</small>
                <strong>{d.title}</strong>
              </div>
              <MoveUpRight size={19} />
            </button>
          ))}
        </div>
      </nav>
      <footer>
        <div className="controls">
          <span>
            <kbd>W</kbd>
            <kbd>A</kbd>
            <kbd>S</kbd>
            <kbd>D</kbd> move
          </span>
          <span>Tap ground to walk</span>
          <span>Tap a traveller to swap or act</span>
          <span>Tap the signpost for your passport</span>
          <span>
            <kbd>Q</kbd> swap · <kbd>1</kbd>
            <kbd>2</kbd>
            <kbd>3</kbd> actions · <kbd>P</kbd> passport
          </span>
          <span>Drag to orbit</span>
          <span>Scroll / pinch to zoom</span>
          <span>Right-drag to pan</span>
        </div>
        <span className="footer-note">
          Built with curiosity. Rendered in real time.
        </span>
        <span className="status">
          <i /> WORLD ONLINE
        </span>
      </footer>
      {ready && (
        <div className="touch-controls" aria-label="Movement controls">
          {[
            ['w', ArrowUp],
            ['a', ArrowLeft],
            ['s', ArrowDown],
            ['d', ArrowRight],
          ].map(([key, Icon]) => {
            const Direction = Icon as typeof ArrowUp;
            return (
              <button
                key={key as string}
                aria-label={`Move ${key === 'w' ? 'forward' : key === 's' ? 'backward' : key === 'a' ? 'left' : 'right'}`}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  keys.current.add(key as string);
                  setMoving(true);
                }}
                onPointerUp={() => {
                  keys.current.delete(key as string);
                  setMoving(keys.current.size > 0);
                }}
                onPointerCancel={() => {
                  keys.current.delete(key as string);
                  setMoving(keys.current.size > 0);
                }}
                onLostPointerCapture={() => {
                  keys.current.delete(key as string);
                  setMoving(keys.current.size > 0);
                }}
              >
                <Direction size={18} />
              </button>
            );
          })}
        </div>
      )}
      {selected && (
        <dialog
          ref={detailDialog}
          onCancel={(event) => {
            event.preventDefault();
            dismiss();
          }}
          onClick={(event) => {
            if (isBackdropClick(event)) dismiss();
          }}
          className={`detail-panel ${['photography', 'travel', 'frontend'].includes(selected.id) ? 'story-panel' : ''} ${selected.id === 'photography' ? 'atlas-panel' : ''}`}
          aria-label={selected.title}
        >
          <button
            ref={close}
            className="close-panel"
            aria-label="Close district details"
            onClick={dismiss}
          >
            <X size={20} />
          </button>
          <div className="detail-index" style={{ color: selected.color }}>
            {selected.number} / EXPLORING
          </div>
          <small>{selected.tag}</small>
          <h2>{selected.title}</h2>
          <p className="detail-description">{selected.description}</p>
          <div className="tech-tags">
            {selected.technologies.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <div className="detail-note">
            <span>FIELD NOTES</span>
            <p>{selected.note}</p>
          </div>
          {selected.id === 'photography' && (
            <Suspense fallback={<p>Opening the memory atlas…</p>}>
              <PhotoAtlas
                character={character}
                reduced={reduced}
                lowPower={mobile}
                routine={routine}
                night={night}
              />
            </Suspense>
          )}
          {selected.id === 'travel' && (
            <Suspense fallback={<p>Opening the travel journal…</p>}>
              <Travel />
            </Suspense>
          )}
          {selected.id === 'frontend' && (
            <Suspense fallback={<p>Opening the project arcade…</p>}>
              <Projects
                onExplore={() => {
                  dismiss();
                  setReady(true);
                }}
              />
            </Suspense>
          )}
          {!['frontend', 'photography'].includes(selected.id) && (
            <div className="work-note">
              This district is a starting point. Project case studies are coming
              as the world grows.
            </div>
          )}
        </dialog>
      )}
      {perf && (
        <Suspense fallback={null}>
          <PerformancePanel />
        </Suspense>
      )}
    </main>
  );
}
