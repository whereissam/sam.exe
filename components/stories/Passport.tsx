'use client';
import { useEffect, useRef, useState } from 'react';
import { districts } from '../world/districts';
import {
  PASSPORT_KEY,
  describePassport,
  readPassport,
  type PassportData,
} from './passport-data';

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
  function restore(data: PassportData) {
    setVisited(data.visited);
    setCollected(data.collected);
    setCharacter(data.character);
    setNickname(data.nickname);
    setNote(data.note);
  }
  function clear() {
    setVisited([]);
    setCollected([]);
    setCharacter('sam');
    setNickname('');
    setNote('');
    try {
      localStorage.removeItem(PASSPORT_KEY);
    } catch {
      // The save effect reports unavailable storage; nothing to undo here.
    }
  }
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
    clear,
    restore,
  };
}
/** Shows what an imported file holds before it replaces the current visit. */
function RestorePreview({
  data,
  passport,
  onDone,
}: {
  data: PassportData;
  passport: ReturnType<typeof usePassport>;
  onDone: () => void;
}) {
  const summary = describePassport(data);
  const current = describePassport({
    version: 1,
    visited: passport.visited,
    collected: passport.collected,
    character: passport.character,
    nickname: passport.nickname,
    note: passport.note,
    updatedAt: passport.updatedAt,
  });
  return (
    <section className="passport-preview" aria-label="Restore preview">
      <strong>This file holds</strong>
      <ul>
        <li>
          {summary.stamps} of {summary.totalStamps} stamps
          <span> · now {current.stamps}</span>
        </li>
        <li>
          {summary.sparks} of {summary.totalSparks} sparks
          <span> · now {current.sparks}</span>
        </li>
        <li>
          Walking as {summary.character === 'sam' ? 'Sam' : 'the companion'}
        </li>
        {summary.nickname && <li>Signed “{summary.nickname}”</li>}
        {summary.hasNote && <li>Includes a private note</li>}
        {summary.savedAt && (
          <li>Saved {summary.savedAt.toLocaleDateString()}</li>
        )}
      </ul>
      <p>Restoring replaces the progress in this browser.</p>
      <div className="passport-preview-actions">
        <button
          className="passport-erase"
          onClick={() => {
            passport.restore(data);
            onDone();
          }}
        >
          Replace my passport
        </button>
        <button onClick={onDone}>Cancel</button>
      </div>
    </section>
  );
}

export function Passport({
  passport,
  onClose,
}: {
  passport: ReturnType<typeof usePassport>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState<PassportData | null>(null);
  const [importError, setImportError] = useState('');
  async function chooseFile(input: HTMLInputElement) {
    const picked = input.files?.[0];
    input.value = '';
    if (!picked) return;
    setImportError('');
    setPending(null);
    try {
      setPending(readPassport(await picked.text()));
    } catch {
      setImportError(
        'That file is not a SAM.EXE passport, or it was saved by a newer version.',
      );
    }
  }
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
        <div className="passport-actions">
          <button className="passport-download" onClick={download}>
            ↓ Download my passport
          </button>
          <button
            className="passport-restore"
            onClick={() => file.current?.click()}
          >
            ↥ Restore from a file
          </button>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            className="passport-file"
            aria-label="Choose a passport file to restore"
            onChange={(event) => void chooseFile(event.currentTarget)}
          />
          {confirming ? (
            <span className="passport-confirm" role="alert">
              Erase this passport for good?
              <button
                className="passport-erase"
                onClick={() => {
                  passport.clear();
                  setConfirming(false);
                }}
              >
                Yes, erase it
              </button>
              <button onClick={() => setConfirming(false)}>Keep it</button>
            </span>
          ) : (
            <button
              className="passport-clear"
              onClick={() => setConfirming(true)}
            >
              Clear my passport
            </button>
          )}
        </div>
        {importError && (
          <p className="passport-import-error" role="alert">
            {importError}
          </p>
        )}
        {pending && (
          <RestorePreview
            data={pending}
            passport={passport}
            onDone={() => setPending(null)}
          />
        )}
        <p className="passport-privacy">
          Your passport stays in this browser and is never published. Clearing
          site data or using private browsing may erase it. Download a copy to
          keep it. Cross-device sync is not available yet.
        </p>
      </div>
    </dialog>
  );
}
