'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  Folder,
  Maximize2,
  Minimize2,
  Music2,
  Pause,
  Play,
  StickyNote,
  X,
} from 'lucide-react';

type App = 'home' | 'projects' | 'music' | 'notes' | 'atlas';

function MusicPlayer() {
  const [playing, setPlaying] = useState(false);
  const audio = useRef<{ context: AudioContext; timer: ReturnType<typeof setInterval>; step: number } | null>(null);

  useEffect(() => () => {
    if (!audio.current) return;
    clearInterval(audio.current.timer);
    void audio.current.context.close();
  }, []);

  function stop() {
    if (audio.current) {
      clearInterval(audio.current.timer);
      void audio.current.context.close();
      audio.current = null;
    }
    setPlaying(false);
  }

  function start() {
    const context = new AudioContext();
    const state = { context, timer: 0 as unknown as ReturnType<typeof setInterval>, step: 0 };
    const notes = [220, 277.18, 329.63, 415.3, 329.63, 277.18, 246.94, 329.63];
    const tick = () => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      oscillator.type = state.step % 4 === 0 ? 'triangle' : 'sine';
      oscillator.frequency.value = notes[state.step++ % notes.length];
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.035, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.44);
    };
    tick();
    state.timer = setInterval(tick, 480);
    audio.current = state;
    setPlaying(true);
  }

  return (
    <div className="desk-music-app">
      <div className="desk-album"><span>NW</span><i /><i /><i /></div>
      <div className="desk-track">
        <span>GENERATIVE TAPE / 001</span>
        <h2>Night Windows</h2>
        <p>A tiny browser-made loop for late builds.</p>
        <div className="desk-wave">{Array.from({ length: 34 }, (_, i) => <i key={i} style={{ height: `${18 + ((i * 17) % 46)}%` }} />)}</div>
        <button onClick={playing ? stop : start}>{playing ? <Pause size={17} /> : <Play size={17} />} {playing ? 'PAUSE' : 'PLAY LOOP'}</button>
      </div>
    </div>
  );
}

export default function RoomDesktop({ onClose }: { onClose: () => void }) {
  const [app, setApp] = useState<App>('home');
  const [time, setTime] = useState('');
  const [maximized, setMaximized] = useState(false);
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    update();
    const timer = setInterval(update, 30_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className={`room-desktop room-desktop-embedded ${maximized ? 'is-maximized' : ''}`} aria-label="Sam's workstation desktop">
      {!maximized && (
        <header className="desk-topbar">
          <button onClick={() => app === 'home' ? onClose() : setApp('home')} aria-label={app === 'home' ? 'Leave workstation' : 'Desktop home'}><ArrowLeft size={16} /></button>
          <strong>SAM/OS</strong><span>LOCAL WORKSPACE</span>
          <time>{time}</time>
          <button onClick={() => setMaximized(true)} aria-label="Maximize inside monitor" title="Maximize inside monitor"><Maximize2 size={16} /></button>
          <button onClick={onClose} aria-label="Leave workstation"><X size={16} /></button>
        </header>
      )}
      {maximized && (
        <div className="desk-monitor-controls">
          <button onClick={() => setMaximized(false)} aria-label="Restore SAM/OS controls" title="Restore SAM/OS controls"><Minimize2 size={16} /></button>
          <button onClick={onClose} aria-label="Leave workstation"><X size={16} /></button>
        </div>
      )}

      {app === 'home' && (
        <div className="desk-home">
          <div className="desk-home-copy"><span>GOOD EVENING, SAM</span><h1>What are we<br />building next?</h1><p>Digital experiments, physical systems,<br />and the notes between them.</p></div>
          <nav className="desk-apps" aria-label="Desktop apps">
            <button onClick={() => setApp('projects')}><Folder /><span>PROJECTS</span><small>04 files</small></button>
            <button onClick={() => setApp('music')}><Music2 /><span>MUSIC</span><small>Night tape</small></button>
            <button onClick={() => setApp('notes')}><StickyNote /><span>NOTES</span><small>03 diagrams</small></button>
            <button onClick={() => setApp('atlas')}><Maximize2 /><span>ATLAS</span><small>Live preview</small></button>
          </nav>
        </div>
      )}

      {app === 'projects' && (
        <div className="desk-window desk-projects">
          <div><span>SELECTED WORK</span><h1>Small worlds.<br />Real systems.</h1></div>
          <div className="desk-project-list">
            {[['01', 'SAM.EXE', 'An explorable personal world', '/'], ['02', 'Memory Atlas', 'Photography mapped into place', '/atlas'], ['03', 'Robot Room', 'Simulation meets physical control', null]].map(([n, title, copy, href]) => (
              <article key={n}><span>{n}</span><div><h2>{title}</h2><p>{copy}</p></div>{href && <a href={href}><ExternalLink size={15} /><span>OPEN</span></a>}</article>
            ))}
          </div>
        </div>
      )}
      {app === 'music' && <div className="desk-window"><MusicPlayer /></div>}
      {app === 'notes' && (
        <div className="desk-window desk-notes">
          <div className="desk-notes-intro"><span>WORKING NOTES / NOT FINAL</span><h1>Things become real in stages.</h1><p>Three loops behind the room.</p></div>
          <div className="desk-note-lines">
            {[
              ['01', 'AGENCY', 'HUMAN', 'AI', 'ROBOT'],
              ['02', 'EMBODIMENT', 'SIMULATION', 'CONTROL', 'REAL WORLD'],
              ['03', 'SHIPPING', 'IDEA', 'CODE', 'PRODUCT'],
            ].map(([number, label, first, second, third]) => (
              <article key={number}>
                <small>{number} / {label}</small>
                <div><p>{first}</p><b>→</b><p>{second}</p><b>→</b><p>{third}</p></div>
              </article>
            ))}
          </div>
        </div>
      )}
      {app === 'atlas' && (
        <div className="desk-window desk-browser">
          <div className="desk-browser-bar"><i /><i /><i /><span>sam.local/atlas</span></div>
          <iframe src="/atlas" title="Memory Atlas live preview" />
        </div>
      )}
    </section>
  );
}
