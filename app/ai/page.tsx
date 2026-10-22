'use client';
import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useState,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import {
  createShift,
  enqueueCargo,
  prioritizeCargo,
  runAgent,
  advanceAgent,
  toggleWall,
  canPlaceWall,
  destinations,
  GRID_SIZE,
  key,
  same,
  cargoColors,
  type Destination,
  type Cell,
} from '@/components/ai/agent';
import RoomLoading from '@/components/ai/RoomLoading';
import './ai.css';
const ObservatoryRoom = lazy(() => import('@/components/ai/ObservatoryRoom'));
const subscribeMotion = (callback: () => void) => {
  const query = matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
};
const getReduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
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
      <p className="ai-loading">
        The 3D view is unavailable. Open Field notes for the accessible room
        map.
      </p>
    ) : (
      this.props.children
    );
  }
}
export default function AIPage() {
  const [state, setState] = useState(createShift);
  const [viewReset, setViewReset] = useState(0);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [controls, setControls] = useState(false);
  const controlsButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const reduced = useSyncExternalStore(
    subscribeMotion,
    getReduced,
    () => false,
  );
  useEffect(() => {
    if (!controls) return;
    closeButton.current?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setControls(false);
        controlsButton.current?.focus();
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [controls]);
  useEffect(() => {
    if (state.status !== 'running') return;
    const timer = setInterval(
      () => setState((previous) => advanceAgent(previous)),
      650,
    );
    return () => clearInterval(timer);
  }, [state.status]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden)
        setState((previous) =>
          previous.status === 'running'
            ? { ...previous, status: 'paused' }
            : previous,
        );
    };
    document.addEventListener('visibilitychange', pause);
    return () => document.removeEventListener('visibilitychange', pause);
  }, []);
  function play() {
    setState((previous) =>
      previous.status === 'running'
        ? { ...previous, status: 'paused' }
        : runAgent(previous),
    );
  }
  function add(destination: Destination) {
    setState((previous) => enqueueCargo(previous, destination));
  }
  function prioritize(id: string) {
    setState((previous) => prioritizeCargo(previous, id));
  }
  function edit(cell: Cell) {
    setState((previous) => toggleWall(previous, cell));
  }
  function reset() {
    setState(createShift());
    setEditing(false);
  }
  const current = state.jobs[state.jobIndex];
  const pending =
    state.status === 'done' ? [] : state.jobs.slice(state.jobIndex);
  const stage =
    state.status === 'done'
      ? 'All cargo delivered'
      : state.status === 'blocked'
        ? 'Waiting for a clear route'
        : `${state.carrying ? 'Delivering' : 'Collecting'} #${current.id} · ${current.label}`;
  return (
    <main className="ai-page">
      <nav className="ai-navigation" aria-label="Observatory navigation">
        <Link href="/">← Island</Link>
        <span className="ai-room-identity">
          FIELD STATION / 04 <small>Physical intelligence, in miniature</small>
        </span>
        <button
          ref={controlsButton}
          aria-expanded={controls}
          aria-controls="ai-controls"
          onClick={() => setControls((value) => !value)}
        >
          Field notes
        </button>
      </nav>
      <section
        className="ai-world"
        aria-label="Interactive 3D logistics field station"
      >
        <SceneBoundary>
          <Suspense fallback={<RoomLoading />}>
            <ObservatoryRoom
              state={state}
              editing={editing}
              reduced={reduced}
              viewReset={viewReset}
              onReady={setReady}
              onCell={edit}
              onPlay={play}
              onDestination={add}
              onPrioritize={prioritize}
              onToggleEditing={() => setEditing((value) => !value)}
              onInspect={() => setControls(true)}
            />
          </Suspense>
        </SceneBoundary>
        <div className="ai-scene-bottom">
          <span>
            {editing
              ? 'Tap a clear tile to place a crate. Tap a crate to remove it.'
              : 'Tap a parcel to prioritize · Tap a station to interact · Drag to orbit'}
          </span>
        </div>
      </section>
      {ready && (
        <aside className="ai-mission-dock" aria-label="Dispatch desk">
          <div className="ai-dock-intro">
            <span className="ai-kicker">
              DISPATCH DESK · {state.delivered.length} / {state.jobs.length}{' '}
              DELIVERED
            </span>
            <strong>{stage}</strong>
          </div>
          <fieldset
            className="ai-destination-options"
            aria-label="Check in more cargo"
          >
            {destinations.map((d) => (
              <button key={d.id} onClick={() => add(d.id)}>
                +{' '}
                {d.id === 'garden'
                  ? 'Seeds'
                  : d.id === 'desk'
                    ? 'Samples'
                    : 'Parts'}
              </button>
            ))}
          </fieldset>
          <div className="ai-cargo-queue" aria-label="Cargo queue">
            {pending.length ? (
              pending.map((job, i) => (
                <button
                  key={job.id}
                  aria-label={`${job.label} ${job.id}, ${i === 0 ? 'current task' : 'prioritize'}`}
                  aria-pressed={i === 0}
                  onClick={() => prioritize(job.id)}
                >
                  <span style={{ background: cargoColors[job.destination] }} />#
                  {job.id} {job.label}
                  <small>
                    {i === 0
                      ? state.carrying
                        ? 'IN TRANSIT'
                        : 'UP NEXT'
                      : 'PRIORITIZE ↗'}
                  </small>
                </button>
              ))
            ) : (
              <span>
                Shift complete. Add cargo above to keep the station working.
              </span>
            )}
          </div>
          <div className="ai-dock-actions">
            <button
              className="ai-primary"
              disabled={state.status === 'blocked' || state.status === 'done'}
              onClick={play}
            >
              {state.status === 'running'
                ? 'Ⅱ Pause'
                : state.status === 'paused'
                  ? '▶ Resume shift'
                  : '▶ Start shift'}
            </button>
            <button
              aria-pressed={editing}
              onClick={() => setEditing((value) => !value)}
            >
              {editing ? '✓ Finish layout' : '+ Place crates'}
            </button>
            <button onClick={() => setViewReset((value) => value + 1)}>
              ⌖ Reset view
            </button>
            <button onClick={reset}>↺ New shift</button>
          </div>
          <output className="ai-dock-status" aria-live="polite">
            {state.journal[0]}
          </output>
        </aside>
      )}
      {controls && (
        <section
          id="ai-controls"
          className="ai-controls"
          aria-label="Field notes and accessible controls"
        >
          <div className="ai-controls-heading">
            <h1>Field station notebook</h1>
            <button
              ref={closeButton}
              aria-label="Close notebook"
              onClick={() => {
                setControls(false);
                controlsButton.current?.focus();
              }}
            >
              ×
            </button>
          </div>
          <p className="ai-notebook-copy">
            A tiny dispatch lab. Six parcels start the shift. Pick a parcel to
            move it forward in the queue; a delivery already in transit finishes
            first.
          </p>
          <div className="ai-playback">
            <button
              onClick={play}
              disabled={state.status === 'done' || state.status === 'blocked'}
            >
              {state.status === 'running' ? 'Pause' : 'Run shift'}
            </button>
            <button
              disabled={
                state.status === 'running' ||
                state.status === 'done' ||
                state.status === 'blocked'
              }
              onClick={() => setState((previous) => advanceAgent(previous))}
            >
              One step
            </button>
            <button onClick={reset}>New shift</button>
          </div>
          <h2>Three working stations</h2>
          <p className="ai-notebook-copy">
            Seeds grow in the greenhouse. Samples rotate in the scanner. Parts
            collect in the supply chest. After a delivery, tap that station to
            operate it. Results remain while the next parcel travels.
          </p>
          <fieldset className="ai-destination-options" aria-label="Add cargo">
            {destinations.map((d) => (
              <button key={d.id} onClick={() => add(d.id)}>
                + {d.name}
              </button>
            ))}
          </fieldset>
          <dl className="ai-metrics">
            <div>
              <dt>Delivered</dt>
              <dd>{state.delivered.length}</dd>
            </div>
            <div>
              <dt>Steps</dt>
              <dd>{state.steps}</dd>
            </div>
            <div>
              <dt>Replans</dt>
              <dd>{state.replans}</dd>
            </div>
          </dl>
          <div className="ai-live">
            <h2>Decision log</h2>
            <ol>
              {state.journal.map((message, i) => (
                <li key={`${i}:${message}`}>{message}</li>
              ))}
            </ol>
          </div>
          <details className="ai-map">
            <summary>Accessible floor map</summary>
            <p>
              Each button adds or removes a crate. Cargo and delivery tiles are
              protected.
            </p>
            <div className="ai-map-grid" aria-label="Room tiles">
              {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
                const cell = { x: i % GRID_SIZE, z: Math.floor(i / GRID_SIZE) },
                  wall = state.walls.includes(key(cell)),
                  robot = same(cell, state.position),
                  cargo = pending.find((job) => same(job.pickup, cell));
                return (
                  <button
                    key={key(cell)}
                    disabled={!canPlaceWall(state, cell)}
                    aria-pressed={wall}
                    aria-label={`Row ${cell.z + 1}, column ${cell.x + 1}: ${robot ? 'robot' : cargo ? cargo.label : wall ? 'remove crate' : 'add crate'}`}
                    className={robot ? 'has-robot' : wall ? 'has-wall' : ''}
                    onClick={() => edit(cell)}
                  >
                    {robot ? 'R' : wall ? '■' : cargo ? 'P' : '·'}
                  </button>
                );
              })}
            </div>
          </details>
          <footer className="ai-footer">
            <p>
              Inspired by physical AI and simulation-based robotics. This is a
              local, deterministic route planner with a dispatch queue, not a
              trained robot or live language model.
            </p>
            <a
              href="https://blogs.nvidia.com/blog/gtc-2026-virtual-worlds-physical-ai/"
              target="_blank"
              rel="noreferrer"
            >
              Read the inspiration ↗
            </a>
            <Link href="/robot-lab">Robot lab ↗</Link>
          </footer>
        </section>
      )}
    </main>
  );
}
