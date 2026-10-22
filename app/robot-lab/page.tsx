'use client';
import { lazy, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  actionLabels,
  robotActions,
  type RobotAction,
  type CaptureGear,
} from '@/components/world/teleoperation';
import './robot-lab.css';
const LabScene = lazy(() => import('@/components/world/RobotLabRoom'));
export type LabCommand = { action: RobotAction; sequence: number };
export default function RobotLabPage() {
  const [operator, setOperator] = useState<CaptureGear>('pico');
  const [commands, setCommands] = useState<Record<CaptureGear, LabCommand>>({
    pico: { action: 'wave', sequence: 0 },
    noitom: { action: 'wave', sequence: 0 },
  });
  const [fight, setFight] = useState(true);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [view, setView] = useState<'room' | CaptureGear | 'ring'>('room');
  const [reset, setReset] = useState(0);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  function inspect(next: CaptureGear) {
    setOperator(next);
    setView(next);
  }
  return (
    <main className="robot-lab-page">
      <header className="robot-lab-header">
        <Link href="/">← Back to island</Link>
        <div>
          <strong>ROBOTICS LAB</strong>
          <small>HUMAN MOTION → ROBOT ACTION</small>
        </div>
        <button
          onClick={() => {
            setView('room');
            setReset((n) => n + 1);
          }}
        >
          Reset view
        </button>
      </header>
      <section
        className="robot-lab-world"
        aria-label="3D robot fight laboratory"
      >
        <Suspense
          fallback={<div className="lab-loading">Opening the robot lab…</div>}
        >
          <LabScene
            commands={commands}
            fight={fight}
            paused={paused}
            reduced={reduced}
            view={view}
            reset={reset}
            onInspect={inspect}
          />
        </Suspense>
        <nav className="lab-views" aria-label="Lab viewpoints">
          {(['room', 'pico', 'noitom', 'ring'] as const).map((id) => (
            <button
              key={id}
              aria-pressed={view === id}
              onClick={() => {
                setView(id);
                if (id === 'pico' || id === 'noitom') setOperator(id);
              }}
            >
              {id === 'room'
                ? 'Whole lab'
                : id === 'ring'
                  ? 'Fight ring'
                  : id.toUpperCase()}
            </button>
          ))}
        </nav>
        <p className="lab-orbit">
          Drag to orbit · Scroll to zoom · Click an operator to inspect
        </p>
      </section>
      <aside className="lab-controls">
        <small>01 / TELEOPERATION PLAYGROUND</small>
        <h1>
          Two humans.
          <br />
          Two robots. One ring.
        </h1>
        <p>
          The PICO operator controls the rust robot. The Noitom operator
          controls the jade robot. Try a movement and watch the human and their
          robot perform it together.
        </p>
        <fieldset>
          <legend>Choose who to control</legend>
          <div className="lab-pair-choice">
            {(['pico', 'noitom'] as const).map((id) => (
              <button
                key={id}
                aria-pressed={operator === id}
                onClick={() => setOperator(id)}
              >
                {id === 'pico' ? 'PICO → Rust' : 'Noitom → Jade'}
              </button>
            ))}
          </div>
        </fieldset>
        <p className="lab-gear-note">
          {operator === 'pico'
            ? 'PICO station · Headset and hand controllers capture the operator’s intent.'
            : 'Noitom station · Wearable mocap sensors capture the operator’s body movement.'}
        </p>
        <fieldset>
          <legend>Try an action</legend>
          <div className="lab-actions">
            {robotActions.map((action) => (
              <button
                key={action}
                onClick={() => {
                  setFight(false);
                  setPaused(false);
                  setCommands((previous) => ({
                    ...previous,
                    [operator]: {
                      action,
                      sequence: previous[operator].sequence + 1,
                    },
                  }));
                }}
              >
                {actionLabels[action]}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="lab-playback">
          <button
            aria-pressed={fight}
            onClick={() => {
              setFight((value) => !value);
              setPaused(false);
              setView('ring');
            }}
          >
            {fight ? 'Stop sparring' : 'Start sparring'}
          </button>
          <button
            disabled={reduced}
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={() => {
              setFight(false);
              setPaused(false);
              setCommands({
                pico: { action: 'wave', sequence: 0 },
                noitom: { action: 'wave', sequence: 0 },
              });
            }}
          >
            Reset poses
          </button>
        </div>
        <output aria-live="polite">
          {reduced
            ? 'Reduced motion · actions shown as still poses'
            : paused
              ? 'Motion paused'
              : fight
                ? 'Rigid-body sparring · assisted balance'
                : `${operator.toUpperCase()} selected · ${commands[operator].sequence ? actionLabels[commands[operator].action] : 'ready'}`}
        </output>
        <Link className="lab-next" href="/robot-lab/replay">
          <small>03 / MOTION OBSERVATORY</small>
          <b>Inspect a contact, frame by frame →</b>
          <span>
            Compare requested motion with the collision-constrained result in
            3D.
          </span>
        </Link>
        <Link className="lab-next" href="/robot-lab/urdf">
          <small>02 / URDF PLAYGROUND</small>
          <b>Grab a robot by its joints →</b>
          <span>
            A humanoid, an arm and a robot dog, each built live from its URDF
            file.
          </span>
        </Link>
        <p className="lab-footnote">
          Dynamic rigid bodies, motor-driven joints, boxing gloves and head
          guards. Balance assistance is simulated; this is not a live hardware
          connection.
        </p>
      </aside>
    </main>
  );
}
