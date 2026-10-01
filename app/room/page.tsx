'use client';

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Box, RotateCcw, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { roomObjectById, type RoomObjectId } from '@/components/room/room-data';
import { roomViews, type RoomView } from '@/components/room/room-views';
import { shelfBooks } from '@/components/room/books';

const RoomScene = lazy(() => import('@/components/room/RoomScene'));
const RoomBookshelf = lazy(() => import('@/components/room/RoomBookshelf'));
const RoomRobotArena = lazy(() => import('@/components/room/RoomRobotArena'));

export default function RoomPage() {
  const router = useRouter();
  const keys = useRef(new Set<string>());
  const sceneSurface = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState<RoomObjectId | null>(null);
  const [nearby, setNearby] = useState<RoomObjectId | null>(null);
  const [simulation, setSimulation] = useState(false);
  const [desktopMode, setDesktopMode] = useState(false);
  const [reset, setReset] = useState(0);
  const [moving, setMoving] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [view, setView] = useState<RoomView>('overview');
  const [bookIndex, setBookIndex] = useState(0);
  const [bookFocused, setBookFocused] = useState(false);
  const [bookTurn, setBookTurn] = useState(0);
  const active = selected && selected !== 'bed' && selected !== 'learning' && selected !== 'robot' ? roomObjectById[selected] : null;

  const inspect = useCallback((id: RoomObjectId) => {
    keys.current.clear();
    setMoving(false);
    if (id === 'exit') { router.push('/'); return; }
    if (id === 'workstation') {
      setSelected(null);
      setDesktopMode(true);
    } else {
      setSelected(id);
      if (id === 'learning' || id === 'robot') setView(id === 'learning' ? 'shelf' : 'arena');
    }
  }, [router]);

  const approach = useCallback((id: RoomObjectId | null) => {
    setNearby(id);
  }, []);

  function returnToRoom() {
    setSelected(null); setDesktopMode(false); setView('overview'); setBookFocused(false);
    keys.current.clear(); setMoving(false);
  }
  function changeView(next: RoomView) {
    keys.current.clear(); setMoving(false); setDesktopMode(false); setBookFocused(false);
    setSelected(next === 'shelf' ? 'learning' : next === 'arena' ? 'robot' : null);
    setView(next);
  }
  const selectBook = useCallback((next: number) => {
    setBookIndex(Math.max(0, Math.min(shelfBooks.length - 1, next))); setBookTurn(0);
  }, []);

  useEffect(() => {
    if (view !== 'shelf' || bookFocused) return;
    const surface = sceneSurface.current;
    let accumulated = 0, lastChange = 0;
    function browse(event: WheelEvent) {
      event.preventDefault(); event.stopPropagation();
      accumulated += (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * (event.deltaMode === 1 ? 16 : 1);
      if (Math.abs(accumulated) < 35 || performance.now() - lastChange < 280) return;
      const step = Math.sign(accumulated);
      setBookIndex(value => Math.max(0, Math.min(shelfBooks.length - 1, value + step)));
      setBookTurn(0); accumulated = 0; lastChange = performance.now();
    }
    surface?.addEventListener('wheel', browse, { passive: false, capture: true });
    return () => surface?.removeEventListener('wheel', browse, { capture: true });
  }, [view, bookFocused]);

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
      if (event.defaultPrevented || (event.target as HTMLElement).closest('input, textarea, select')) return;
      if (event.key === 'Escape') {
        if (bookFocused) { setBookFocused(false); return; }
        if (desktopMode) setDesktopMode(false);
        else { setSelected(null); setView('overview'); }
        return;
      }
      if (selected === 'learning') {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); selectBook(bookIndex + (event.key === 'ArrowRight' ? 1 : -1)); }
        return;
      }
      if (selected === 'robot') return;
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
  }, [nearby, desktopMode, selected, inspect, bookFocused, bookIndex, selectBook]);

  function steer(key: string, pressed: boolean) {
    if (pressed) keys.current.add(key);
    else keys.current.delete(key);
    setMoving(keys.current.size > 0);
  }

  return (
    <main className={`room-world ${simulation ? 'is-simulating' : ''} ${view !== 'overview' || desktopMode ? 'is-exploring' : ''} ${bookFocused ? 'has-book-details' : ''}`}>
      <section ref={sceneSurface} className="room-world-canvas" aria-label="Sam's interactive 3D workshop. Walk with WASD or the arrow keys, tap the floor to move, and inspect nearby objects.">
        <Suspense fallback={<div className="room-world-loading">OPENING SAM’S ROOM…</div>}>
          <RoomScene keys={keys} selected={selected} nearby={nearby} onSelect={inspect} onWake={() => setSelected(null)} onNearby={approach} simulation={simulation} desktopMode={desktopMode} onExitDesktop={returnToRoom} reset={reset} reducedMotion={reducedMotion} moving={moving} view={view} bookIndex={bookIndex} bookFocused={bookFocused} bookTurn={bookTurn} onBookSelect={value => { selectBook(value); setBookFocused(true); inspect('learning'); }} />
        </Suspense>
      </section>

      <header className="room-world-header">
        {view !== 'overview' || desktopMode ? <button className="room-world-back" onClick={returnToRoom}><ArrowLeft size={16} /> BACK TO ROOM</button> : <Link href="/" className="room-world-back"><ArrowLeft size={16} /> BACK TO ISLAND</Link>}
        <div className="room-world-title"><strong>SAM’S ROOM</strong><span>DIGITAL → PHYSICAL</span></div>
        <div className="room-world-actions">
          <button className={simulation ? 'is-active' : ''} onClick={() => setSimulation((value) => !value)} aria-pressed={simulation}>
            <Box size={15} /> {simulation ? 'EXIT SIM' : 'SIM MODE'}
          </button>
          <button aria-label="Reset room and Sam" title="Reset room and Sam" onClick={() => { returnToRoom(); setNearby(null); setReset((value) => value + 1); }}><RotateCcw size={16} /></button>
        </div>
      </header>

      {nearby && !selected && !desktopMode && view === 'overview' && (
        <button className="room-world-prompt" onClick={() => inspect(nearby)}>
          <kbd>E</kbd><span>{nearby === 'exit' ? 'EXIT' : nearby === 'workstation' ? 'SIT' : nearby === 'bed' ? 'SLEEP' : nearby === 'learning' ? 'BROWSE' : 'INSPECT'}</span>{nearby === 'workstation' ? 'OPEN DESKTOP' : roomObjectById[nearby].label}
        </button>
      )}

      {selected === 'bed' && <button className="room-world-prompt" onClick={() => setSelected(null)}><kbd>ESC</kbd><span>WAKE UP</span>MOVE TO GET OUT OF BED</button>}
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

      {selected === 'learning' && <Suspense fallback={null}><RoomBookshelf index={bookIndex} focused={bookFocused} onSelect={selectBook} onFocus={setBookFocused} onTurn={() => setBookTurn(value => value + Math.PI / 2)} /></Suspense>}
      {selected === 'robot' && <Suspense fallback={null}><RoomRobotArena /></Suspense>}
      {view === 'exit' && <button className="room-world-prompt room-door-action" onClick={() => inspect('exit')}>STEP OUTSIDE ↗ BACK TO ISLAND</button>}

      {!desktopMode && <nav className="room-viewpoints" aria-label="Camera viewpoints">{roomViews.map(item => <button key={item.id} aria-pressed={view === item.id} onClick={() => changeView(item.id)}>{item.label}</button>)}</nav>}

      <div className="room-world-controls">
        <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> WALK</span>
        <span>{view === 'overview' ? 'TAP FLOOR TO MOVE' : 'DRAG TO EXPLORE THIS VIEW'}</span>
        <span>{view === 'shelf' ? bookFocused ? 'DRAG THE BOOK TO TURN IT' : 'DRAG TO ORBIT · SCROLL TO BROWSE BOOKS' : 'DRAG TO ORBIT · SCROLL TO ZOOM'}</span>
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
