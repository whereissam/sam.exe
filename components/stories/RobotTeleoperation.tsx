'use client';
import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { TeleoperationPair } from '../world/TeleoperationPair';
import { actionLabels, robotActions, type CaptureGear, type RobotAction } from '../world/teleoperation';
import './robot-teleoperation.css';

export default function RobotTeleoperation({ reduced }: { reduced: boolean }) {
  const [gear, setGear] = useState<CaptureGear>('pico');
  const [action, setAction] = useState<RobotAction>('wave');
  const [sequence, setSequence] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  function perform(next: RobotAction) {
    setAction(next); setSequence(n => n + 1); setPlaying(true); setStarted(true); setComplete(false);
  }
  return <section className="teleop" aria-label="Interactive human to robot demo">
    <div className="teleop-heading"><span>TRY TELEOPERATION</span><span>Human → Robot</span></div>
    <fieldset className="teleop-gear"><legend>Choose the human’s capture gear</legend>
      {(['pico', 'noitom'] as const).map(id => <button type="button" key={id} aria-pressed={gear === id} onClick={() => setGear(id)}>{id === 'pico' ? 'PICO · headset + controllers' : 'Noitom · mocap suit'}</button>)}
    </fieldset>
    <div className="teleop-stage" aria-label={`3D human wearing ${gear === 'pico' ? 'PICO' : 'Noitom'} gear and a robot mirroring ${started ? actionLabels[action] : 'a neutral pose'}`}>
      <Canvas shadows camera={{ position: [5.5, 3.8, 8], fov: 39 }} dpr={[1, 1.5]} fallback={<p>3D requires WebGL. The human’s captured movements are mapped to the robot’s joints.</p>}>
        <color attach="background" args={['#bfcfc1']} />
        <ambientLight intensity={1.6} />
        <directionalLight position={[-3, 7, 5]} intensity={2.4} castShadow shadow-mapSize={[1024, 1024]} />
        <Suspense fallback={null}><TeleoperationPair gear={gear} action={action} sequence={sequence} playing={playing} reduced={reduced && started} onComplete={() => { setPlaying(false); setComplete(true); }} /></Suspense>
        <mesh position={[0, -0.26, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[200, 200]} /><meshStandardMaterial color="#bfcfc1" /></mesh>
        <OrbitControls target={[0, 0.85, 0]} enablePan={false} minDistance={5} maxDistance={14} minPolarAngle={0.3} maxPolarAngle={Math.PI / 2.1} />
      </Canvas>
      <span className="teleop-orbit">Drag to orbit · Scroll to zoom</span>
    </div>
    <p className="teleop-caption">Move the human. The robot follows.<br /><small>Illustrated motion presets · {gear === 'pico' ? 'PICO capture setup' : 'Noitom capture setup'} · Browser simulation</small></p>
    <fieldset className="teleop-actions"><legend>Try a movement</legend>
      {robotActions.map(id => <button type="button" key={id} aria-pressed={started && action === id} onClick={() => perform(id)}>{actionLabels[id]}</button>)}
    </fieldset>
    <div className="teleop-playback">
      <button type="button" disabled={!started || complete || reduced} onClick={() => setPlaying(value => !value)}>{playing ? 'Pause' : 'Resume'}</button>
      <button type="button" disabled={!started} onClick={() => perform(action)}>Replay</button>
      <button type="button" onClick={() => { setSequence(n => n + 1); setPlaying(false); setStarted(false); setComplete(false); }}>Reset pose</button>
      <output aria-live="polite">{!started ? 'Choose an action' : reduced ? `${actionLabels[action]} · still pose` : complete ? `${actionLabels[action]} · complete` : `${actionLabels[action]} · ${playing ? 'mirroring' : 'paused'}`}</output>
    </div>
    <p className="teleop-explainer">The person wears PICO equipment or a Noitom motion-capture suit. Their captured movement is translated into robot joint motion—the idea behind my humanoid research and robot fight events.</p>
  </section>;
}
