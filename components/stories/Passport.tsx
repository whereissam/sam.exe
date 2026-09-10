'use client';
import { useEffect, useRef, useState } from 'react';
import { districts } from '../world/districts';
import { PASSPORT_KEY, readPassport, type PassportData } from './passport-data';

export function usePassport() {
  const [visited, setVisited] = useState<string[]>([]),
    [collected, setCollected] = useState<string[]>([]);
  const [character, setCharacter] = useState<'sam' | 'companion'>('sam');
  const [nickname, setNickname] = useState(''),
    [note, setNote] = useState('');
  const [loaded, setLoaded] = useState(false),
    [status, setStatus] = useState('Loading your passport…');
  const [updatedAt, setUpdatedAt] = useState('');
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PASSPORT_KEY);
      if (raw) {
        const p = readPassport(raw);
        setVisited(p.visited);
        setCollected(p.collected);
        setCharacter(p.character);
        setNickname(p.nickname);
        setNote(p.note);
        setUpdatedAt(p.updatedAt);
      }
    } catch {
      setStatus(
        'Previous record could not be read. Download a copy to keep this visit.',
      );
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(
        PASSPORT_KEY,
        JSON.stringify({
          version: 1,
          visited,
          collected,
          character,
          nickname,
          note,
          updatedAt,
        }),
      );
      setUpdatedAt(updatedAt);
      setStatus('Saved in this browser');
    } catch {
      setStatus(
        'Browser storage is unavailable. Download your passport to keep it.',
      );
    }
  }, [loaded, visited, collected, character, nickname, note]);
  return {
    visited,
    setVisited,
    collected,
    setCollected,
    character,
    setCharacter,
    nickname,
    setNickname,
    note,
    setNote,
    loaded,
    status,
    updatedAt,
  };
}
export function Passport({
  passport,
  onClose,
}: {
  passport: ReturnType<typeof usePassport>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  function download() {
    const data: PassportData = {
      version: 1,
      visited: passport.visited,
      collected: passport.collected,
      character: passport.character,
      nickname: passport.nickname,
      note: passport.note,
      updatedAt: passport.updatedAt,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sam-exe-travel-passport.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <dialog
      ref={ref}
      className="visitor-passport"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="passport-paper">
        <button
          className="passport-close"
          aria-label="Close passport"
          onClick={onClose}
        >
          ×
        </button>
        <small>SAM.EXE / VISITOR EDITION</small>
        <h2>
          A little proof
          <br />
          you were here.
        </h2>
        <p>Your island passport. Explore, collect, and keep a little memory.</p>
        <label>
          Traveller name
          <input
            maxLength={40}
            value={passport.nickname}
            onChange={(e) => passport.setNickname(e.target.value)}
            placeholder="Curious traveller"
          />
        </label>
        <div className="passport-stamps">
          {districts.map((d) => (
            <div
              key={d.id}
              className={passport.visited.includes(d.id) ? 'stamped' : ''}
            >
              <span>{passport.visited.includes(d.id) ? '✦' : '○'}</span>
              <strong>{d.title}</strong>
              <small>
                {passport.visited.includes(d.id) ? 'EXPLORED' : 'UNEXPLORED'}
              </small>
            </div>
          ))}
        </div>
        <div className="passport-tally">
          {passport.visited.length}/6 districts{' '}
          <span>✦ {passport.collected.length}/3 sparks</span>
        </div>
        <label>
          A note for your next visit
          <textarea
            rows={4}
            maxLength={1000}
            value={passport.note}
            onChange={(e) => passport.setNote(e.target.value)}
            placeholder="What caught your curiosity? Where will you go next?"
          />
        </label>
        <small className="passport-save" role="status">
          {passport.status}
        </small>
        <button className="passport-download" onClick={download}>
          ↓ Download my passport
        </button>
        <p className="passport-privacy">
          Your passport stays in this browser and is never published. Clearing
          site data or using private browsing may erase it. Download a copy to
          keep it. Cross-device sync is not available yet.
        </p>
      </div>
    </dialog>
  );
}
