'use client';

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Box, RotateCcw, X } from 'lucide-react';
import Link from 'next/link';
import { roomObjectById, type RoomObjectId } from '@/components/room/room-data';

const RoomScene = lazy(() => import('@/components/room/RoomScene'));

export default function RoomPage() {
  const keys = useRef(new Set<string>());
  const [selected, setSelected] = useState<RoomObjectId | null>(null);
  const [nearby, setNearby] = useState<RoomObjectId | null>(null);
  const [simulation, setSimulation] = useState(false);
  const [desktopMode, setDesktopMode] = useState(false);
  const [reset, setReset] = useState(0);
  const [moving, setMoving] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const active = selected ? roomObjectById[selected] : null;

  const inspect = useCallback((id: RoomObjectId) => {
    keys.current.clear();
    setMoving(false);
    if (id === 'workstation') {
      setSelected(null);
      setDesktopMode(true);
    } else setSelected(id);
  }, []);

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [desktopMode]);

  useEffect(() => {
    function down(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (desktopMode) setDesktopMode(false);
        else setSelected(null);
        return;
      }
      if (event.key.toLowerCase() === 'e' && nearby) {
        inspect(nearby);
        return;
      }
      const key = event.key.toLowerCase();
      if (!['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) return;
      event.preventDefault();
      keys.current.add(key);
      setMoving(true);
    }
    function up(event: KeyboardEvent) {
      keys.current.delete(event.key.toLowerCase());
      setMoving(keys.current.size > 0);
    }
    function clear() {
      keys.current.clear();
      setMoving(false);
    }
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
    };
  }, [nearby, desktopMode, inspect]);

  function steer(key: string, pressed: boolean) {
    if (pressed) keys.current.add(key);
    else keys.current.delete(key);
    setMoving(keys.current.size > 0);
  }

  return (
    <main className={`room-world ${simulation ? 'is-simulating' : ''}`}>
      <section className="room-world-canvas" aria-label="Sam's interactive 3D workshop. Walk with WASD or the arrow keys, tap the floor to move, and inspect nearby objects.">
        <Suspense fallback={<div className="room-world-loading">OPENING SAM’S ROOM…</div>}>
          <RoomScene keys={keys} selected={selected} onSelect={inspect} onNearby={setNearby} simulation={simulation} desktopMode={desktopMode} onExitDesktop={() => setDesktopMode(false)} reset={reset} reducedMotion={reducedMotion} moving={moving} />
        </Suspense>
      </section>

      <header className="room-world-header">
        <Link href="/" className="room-world-back"><ArrowLeft size={16} /> ISLAND</Link>
        <div className="room-world-title"><strong>SAM’S ROOM</strong><span>DIGITAL → PHYSICAL</span></div>
        <div className="room-world-actions">
          <button className={simulation ? 'is-active' : ''} onClick={() => setSimulation((value) => !value)} aria-pressed={simulation}>
            <Box size={15} /> {simulation ? 'EXIT SIM' : 'SIM MODE'}
          </button>
          <button aria-label="Reset room and Sam" title="Reset room and Sam" onClick={() => { setDesktopMode(false); setSelected(null); setNearby(null); keys.current.clear(); setMoving(false); setReset((value) => value + 1); }}><RotateCcw size={16} /></button>
        </div>
      </header>

      {nearby && !selected && !desktopMode && (
        <button className="room-world-prompt" onClick={() => inspect(nearby)}>
          <kbd>E</kbd><span>{nearby === 'workstation' ? 'SIT' : 'INSPECT'}</span>{nearby === 'workstation' ? 'OPEN DESKTOP' : roomObjectById[nearby].label}
        </button>
      )}

      <aside className={`room-world-detail ${active ? 'is-open' : ''}`} aria-live="polite">
        {active && (
          <>
            <button className="room-detail-close" onClick={() => setSelected(null)} aria-label="Close object details"><X size={16} /></button>
            <span>{active.number} / {active.zone}</span>
            <h1>{active.name}</h1>
            <p>{active.note}</p>
            <small>{active.label}</small>
          </>
        )}
      </aside>

      <div className="room-world-controls">
        <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> WALK</span>
        <span>TAP FLOOR TO MOVE</span>
        <span>DRAG TO ORBIT · SCROLL TO ZOOM</span>
        <span><i /> {simulation ? 'SIMULATION ACTIVE' : 'ROOM ONLINE'}</span>
      </div>

      <div className="room-touch-pad" aria-label="Movement controls">
        {([['w', '↑'], ['a', '←'], ['s', '↓'], ['d', '→']] as const).map(([key, label]) => (
          <button key={key} className={`room-touch-${key}`} aria-label={`Move ${key}`} onPointerDown={() => steer(key, true)} onPointerUp={() => steer(key, false)} onPointerCancel={() => steer(key, false)} onPointerLeave={() => steer(key, false)}>{label}</button>
        ))}
      </div>
    </main>
  );
}
