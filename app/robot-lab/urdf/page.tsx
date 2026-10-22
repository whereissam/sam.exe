'use client';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { ChevronLeft, ChevronRight, Dices, Eye, RotateCcw } from 'lucide-react';
import { MISSIONS } from '@/components/robot-lab/missions';
import { ROBOTS, ROBOT_IDS, type Joints, type RobotId } from '@/components/robot-lab/urdf-robots';
import type { Command } from '@/components/robot-lab/UrdfPlayground';
import '../robot-lab.css';
import './urdf.css';

const UrdfPlayground = lazy(() => import('@/components/robot-lab/UrdfPlayground'));

/** Light XML colouring: tag names, attribute names and quoted values. */
function Xml({ line }: { line: string }) {
  const parts = line.split(/(<\/?[\w?]+|\/?>|[\w:]+=|"[^"]*")/g).filter(Boolean);
  return <>{parts.map((part, i) => {
    const kind = part.startsWith('<') || part.endsWith('>') ? 'tag' : part.endsWith('=') ? 'key' : part.startsWith('"') ? 'value' : undefined;
    return kind ? <span key={i} className={kind}>{part}</span> : part;
  })}</>;
}

export default function UrdfPage() {
  const [id, setId] = useState<RobotId>('humanoid');
  const [xray, setXray] = useState(false);
  const [command, setCommand] = useState<Command>({ kind: 'rest', sequence: 0 });
  const [focus, setFocus] = useState<string | null>(null);
  const [live, setLive] = useState(0);
  const [done, setDone] = useState<Record<RobotId, boolean>>({ humanoid: false, arm: false, quadruped: false });
  const [fallen, setFallen] = useState<Record<RobotId, boolean>>({ humanoid: false, arm: false, quadruped: false });
  const [reduced, setReduced] = useState(false);
  const values = useRef<Joints>({});
  const robot = ROBOTS[id];
  const lines = useMemo(() => robot.urdf.split('\n'), [robot]);
  // Only the touched joint's own <joint> element, not the whole file.
  const snippet = useMemo(() => {
    const start = focus ? robot.blocks[focus]?.[0] : undefined;
    if (start === undefined) return null;
    const end = lines.indexOf('  </joint>', start);
    return lines.slice(start, end + 1).map(line => line.slice(2));
  }, [focus, robot, lines]);
  const prismatic = snippet?.[0].includes('prismatic') ?? false;
  const reading = prismatic ? `${(live * 1000).toFixed(0)} mm` : `${Math.round((live * 180) / Math.PI)}°`;
  const jointName = focus?.replace(/_joint$/, '').replaceAll('_', ' ');

  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  // Sample the focused joint's live value while it is being touched.
  useEffect(() => {
    if (!focus) return;
    const timer = setInterval(() => setLive(values.current[focus] ?? 0), 80);
    return () => clearInterval(timer);
  }, [focus]);
  const onMission = useCallback((robotId: RobotId, complete: boolean) => setDone(previous => ({ ...previous, [robotId]: complete })), []);
  const onFall = useCallback((robotId: RobotId, down: boolean) => setFallen(previous => ({ ...previous, [robotId]: down })), []);
  const select = useCallback((next: RobotId) => { setId(next); setFocus(null); }, []);
  const step = (by: number) => select(ROBOT_IDS[(ROBOT_IDS.indexOf(id) + by + ROBOT_IDS.length) % ROBOT_IDS.length]);
  const send = (kind: Command['kind']) => setCommand(previous => ({ kind, sequence: previous.sequence + 1 }));
  const mission = MISSIONS[id];

  return <main className="robot-lab-page urdf-page">
    <header className="robot-lab-header"><Link href="/robot-lab">← Robot lab</Link><div><strong>URDF PLAYGROUND</strong><small>THREE.JS · URDF-LOADER</small></div><span /></header>
    <section className="robot-lab-world" aria-label="3D URDF robots on a turntable">
      <Suspense fallback={<div className="lab-loading">Reading the URDF…</div>}>
        <UrdfPlayground active={id} xray={xray} command={command} reduced={reduced} values={values} onFocus={setFocus} onMission={onMission} onFall={onFall} onSelect={select} />
      </Suspense>
      <div className={`urdf-mission${fallen[id] ? ' fell' : done[id] ? ' done' : ''}`} aria-live="polite">
        <small>{fallen[id] ? 'Timber!' : done[id] ? 'Mission complete' : 'Mission'}</small>
        <b>{fallen[id] ? 'It fell over. Real robots run a balance controller hundreds of times a second to stop exactly this. Tap reset to stand it back up.' : done[id] ? mission.win : mission.task}</b>
      </div>
      <div className="urdf-tools" role="toolbar" aria-label="Robot tools">
        <Toggle className="urdf-tool" pressed={xray} onPressedChange={setXray} aria-label="See inside"><Eye /><span>See inside</span></Toggle>
        <Button className="urdf-tool" onClick={() => send('shuffle')} aria-label="Surprise me"><Dices /><span>Surprise me</span></Button>
        <Button className="urdf-tool" onClick={() => send('rest')} aria-label="Reset"><RotateCcw /><span>Reset</span></Button>
      </div>
      {focus && <div className="urdf-chip" aria-hidden="true"><b>{jointName}</b>{reading}</div>}
      <nav className="urdf-picker" aria-label="Choose a robot">
        <Button className="urdf-arrow" onClick={() => step(-1)} aria-label="Previous robot"><ChevronLeft /></Button>
        <div className="urdf-picker-name" aria-live="polite">
          <b>{robot.label}</b>
          <span>{ROBOT_IDS.map(robotId => <i key={robotId} className={robotId === id ? 'on' : done[robotId] ? 'won' : undefined} />)}</span>
        </div>
        <Button className="urdf-arrow" onClick={() => step(1)} aria-label="Next robot"><ChevronRight /></Button>
      </nav>
    </section>
    <aside className="lab-controls urdf-panel">
      <small>02 / URDF PLAYGROUND</small><h1>Go ahead, <br />grab it.</h1>
      <p className="urdf-intro">These robots aren’t animations. Each one is built live from a blueprint file, the same kind real robots use, so every part bends exactly where and how far the real joint would.</p>
      <div className={`urdf-peek${snippet ? ' on' : ''}`} aria-live="polite">
        {snippet && focus ? <>
          <div className="urdf-peek-bar"><b>{jointName}</b><span>{reading}</span></div>
          {snippet.map((line, i) => <code key={i}><Xml line={line} /></code>)}
          <p>The lines in {robot.id}.urdf that define this joint.</p>
        </> : <p>Touch any part of the robot to see the line of its blueprint that makes it move.</p>}
      </div>
    </aside>
  </main>;
}
