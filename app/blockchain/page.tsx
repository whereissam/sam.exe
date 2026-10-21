'use client';
import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import type { Poke } from '@/components/blockchain/BlockchainRoom';
import {
  initialWorld,
  tick,
  readyToSeal,
  forgeBlock,
  commitBlock,
  toggle,
  bump,
  alter,
  auditChain,
  fingerprint,
  onlineCount,
  type World,
} from '@/components/blockchain/simulation';
import './blockchain.css';
const BlockchainRoom = lazy(
  () => import('@/components/blockchain/BlockchainRoom'),
);
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
      <p className="chain-loading">
        The workshop needs WebGL, which this browser couldn’t start. Try another
        browser or turn on hardware acceleration.
      </p>
    ) : (
      this.props.children
    );
  }
}
const JOURNEY = [
  'A payment walks in',
  'Checkers make sure the money is real',
  'It waits; bigger tips go first',
  'It rides into the record book',
  'Sealed there for good',
];
const POKES: [Poke, string][] = [
  ['power', 'Unplug a checker'],
  ['bump', 'Tip someone to the front'],
  ['open', 'Peek inside a ride'],
  ['tamper', 'Try to cheat the book'],
];
const FEES = ['#9fb4c0', '#8fb89a', '#d9c06a', '#e2995a', '#b86fa8'];
const letter = (i: number) => String.fromCharCode(65 + i);

/** Seconds since load, frozen while paused, shared by logic and renderer. */
function createClock() {
  let offset = 0;
  let frozenAt: number | null = null;
  const real = () => performance.now() / 1000;
  return {
    now: () => (frozenAt ?? real()) - offset,
    pause() {
      frozenAt ??= real();
    },
    resume() {
      if (frozenAt === null) return;
      offset += real() - frozenAt;
      frozenAt = null;
    },
  };
}

export default function BlockchainPage() {
  const [clock] = useState(createClock);
  const [world, setWorld] = useState(() => initialWorld(clock.now()));
  const current = useRef(world);
  const [audit, setAudit] = useState<boolean[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [contentHash, setContentHash] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [tried, setTried] = useState<Poke[]>([]);
  /** Every change goes through here so the interval always sees the latest world. */
  function update(change: (w: World) => World) {
    current.current = change(current.current);
    setWorld(current.current);
  }
  const tryIt = (poke: Poke) =>
    setTried((t) => (t.includes(poke) ? t : [...t, poke]));
  // A visitor's own action stays on screen a while before narration resumes.
  const [poke, setPoke] = useState<{ text: string; until: number } | null>(
    null,
  );
  const note = (text: string) => setPoke({ text, until: clock.now() + 6 });

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      const now = clock.now();
      update((w) => tick(w, now));
      const w = current.current;
      if (!readyToSeal(w, now)) return;
      update((x) => ({ ...x, sealing: true }));
      forgeBlock(w)
        .then((block) => update((x) => commitBlock(x, block, clock.now())))
        .catch(() => {
          setPaused(true);
          setPoke({
            text: 'This browser couldn’t compute block hashes. Open the page over HTTPS or localhost.',
            until: Infinity,
          });
        });
    }, 150);
    return () => clearInterval(timer);
  }, [paused, clock]);

  // Re-verify whenever the chain changes; stale results are discarded.
  useEffect(() => {
    let live = true;
    void auditChain(world.blocks).then((result) => live && setAudit(result));
    return () => {
      live = false;
    };
  }, [world.blocks]);

  // Fingerprint the open ride's contents as they are now, for the seal check.
  const opened = world.blocks.find((b) => b.height === selected);
  useEffect(() => {
    if (!opened) return;
    let live = true;
    void fingerprint(opened).then((hash) => live && setContentHash(hash));
    return () => {
      live = false;
    };
  }, [opened]);

  function power(index: number) {
    const online = world.online[index];
    const left = onlineCount(world) + (online ? -1 : 1);
    update((w) => toggle(w, index));
    tryIt('power');
    note(
      online
        ? left >= 2
          ? `You unplugged checker ${letter(index)}. Two are still awake, so they can still agree. Everything keeps moving.`
          : `Only one checker left, and one can’t outvote anybody. The line is stuck! Plug one back in.`
        : `Checker ${letter(index)} is awake again.`,
    );
  }
  function pay(id: number) {
    update((w) => bump(w, id, clock.now()));
    tryIt('bump');
    note(
      'You slipped them a bigger tip. Watch them cut to the front of the waiting room!',
    );
  }
  function open(height: number | null) {
    setSelected(height);
    if (height === null) return;
    tryIt('open');
    note(
      `This is ride #${height}. Its stripes are a seal made from everything inside, plus the ride before it. Now try to cheat.`,
    );
  }
  function tamper(index: number) {
    const later = world.blocks.length - 1 - index;
    update((w) => alter(w, index, clock.now()));
    tryIt('tamper');
    note(
      `Busted! You changed one number and the seal’s stripes stopped matching${later > 0 ? `. Every ride after it broke too, because each seal includes the one before` : ''}. The checkers stop and compare their copies…`,
    );
  }
  function playPause() {
    if (paused) clock.resume();
    else clock.pause();
    setPaused(!paused);
  }
  function reset() {
    current.current = initialWorld(clock.now());
    setWorld(current.current);
    setSelected(null);
  }
  const stalled = onlineCount(world) < 2;
  const alarm = world.alteredAt !== null;
  return (
    <main className="chain-page">
      <header className="chain-header">
        <Link href="/">← Island</Link>
        <div>
          <span>03 / MONEY WITHOUT A BANK</span>
          <h1>The trust workshop</h1>
        </div>
        <button onClick={reset}>Reset ↺</button>
      </header>
      <section
        className={`chain-world ${alarm ? 'is-alarm' : ''}`}
        aria-label="Interactive blockchain workshop"
      >
        <dl className="chain-score">
          <div>
            <dt>Rides sealed</dt>
            <dd>{world.sealed}</dd>
          </div>
          <div>
            <dt>Cheats stopped</dt>
            <dd>{world.caught}</dd>
          </div>
        </dl>
        <div className="chain-room-note">
          <p>
            Watch it move.
            <br />
            Try to cheat it.
          </p>
          <span className="chain-note-label">
            {paused ? 'Paused' : '● Live'} · Each little person is a payment
          </span>
          <ol className="chain-steps">
            {JOURNEY.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <span className="chain-note-label">Coins on head = tip</span>
          <span className="chain-fees" aria-label="Tip colours, small to big">
            small
            {FEES.map((c) => (
              <i key={c} style={{ background: c }} />
            ))}
            big
          </span>
          <span className="chain-note-label">Try it</span>
          <ul className="chain-pokes">
            {POKES.map(([id, label]) => (
              <li key={id} className={tried.includes(id) ? 'is-done' : ''}>
                {label}
              </li>
            ))}
          </ul>
        </div>
        <SceneBoundary>
          <Suspense
            fallback={<p className="chain-loading">Opening the workshop…</p>}
          >
            <BlockchainRoom
              world={world}
              audit={audit}
              selected={selected}
              contentHash={opened ? contentHash : null}
              tried={tried}
              paused={paused}
              clock={clock.now}
              onToggle={power}
              onBump={pay}
              onBlock={open}
              onAlter={tamper}
            />
          </Suspense>
        </SceneBoundary>
        <div className="chain-hud">
          <div className="chain-status-row">
            <button
              className="chain-play"
              aria-label={paused ? 'Play' : 'Pause'}
              onClick={playPause}
            >
              {paused ? '▶' : '❚❚'}
            </button>
            <output className="chain-status" aria-live="polite">
              {stalled
                ? 'Stuck! Two of three checkers must agree, and only one is awake. Click a machine to plug it back in.'
                : poke && poke.until > clock.now()
                  ? poke.text
                  : world.note}
            </output>
          </div>
          <div className="chain-hud-meta">
            <span>Drag to spin · Scroll to zoom · Click anything</span>
            <span>Local simulation · No real funds</span>
          </div>
        </div>
      </section>
      <p className="chain-footnote">
        A hands-on model of records and agreement, inspired by TxStreet. It
        isn’t a live blockchain or any specific consensus protocol, and nothing
        leaves this page.
        <Link href="/robot-lab">Visit the robotics lab ↗</Link>
      </p>
    </main>
  );
}
