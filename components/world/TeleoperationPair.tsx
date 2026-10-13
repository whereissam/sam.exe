'use client';
/* oxlint-disable react/react-compiler -- Three.js joints are animated through refs. */
import { useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, type Group } from 'three';
import type { FootPose, FootPoint } from './footwork';
import { GroundLabel } from './GroundLabel';
import { ACTION_SECONDS, robotActions, teleopPose, type CaptureGear, type RobotAction } from './teleoperation';

type Vec = [number, number, number];
function Part({ at, size, color }: { at: Vec; size: Vec; color: string }) {
  return <mesh position={at} castShadow receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={0.75} /></mesh>;
}
function plantLeg(hip: Group, knee: Group, ankle: Group, target: FootPoint, bodyHeight: number) {
  const direction = new Vector3(target.x - hip.position.x, target.y - bodyHeight - hip.position.y, target.z);
  const distance = Math.min(0.919, Math.max(0.1, direction.length()));
  direction.normalize();
  const upper = 0.47, lower = 0.45;
  const along = (upper * upper - lower * lower + distance * distance) / (2 * distance);
  const bend = new Vector3(0, 0, 1).addScaledVector(direction, -direction.z).normalize();
  const upperVector = direction.clone().multiplyScalar(along).addScaledVector(bend, Math.sqrt(Math.max(0, upper * upper - along * along)));
  const lowerVector = direction.clone().multiplyScalar(distance).sub(upperVector);
  hip.quaternion.setFromUnitVectors(new Vector3(0, -1, 0), upperVector.normalize());
  lowerVector.applyQuaternion(hip.quaternion.clone().invert()).normalize();
  knee.quaternion.setFromUnitVectors(new Vector3(0, -1, 0), lowerVector);
  ankle.quaternion.copy(hip.quaternion).multiply(knee.quaternion).invert();
}

export function TeleopBody({ robot, gear, pose, robotColor, feet }: { robot: boolean; gear: CaptureGear; robotColor?: string; feet?: RefObject<FootPose | null>; pose: RefObject<ReturnType<typeof teleopPose>> }) {
  const root = useRef<Group>(null), torso = useRef<Group>(null);
  const la = useRef<Group>(null), ra = useRef<Group>(null), le = useRef<Group>(null), re = useRef<Group>(null);
  const lh = useRef<Group>(null), rh = useRef<Group>(null), lk = useRef<Group>(null), rk = useRef<Group>(null);
  const leftAnkle = useRef<Group>(null), rightAnkle = useRef<Group>(null);
  const shell = robot ? '#e6dfc8' : '#424f48';
  const accent = robot ? (robotColor ?? '#71968b') : '#c69858';
  useFrame(() => {
    const p = pose.current;
    if (root.current) root.current.position.y = p.height;
    if (torso.current) torso.current.rotation.x = p.lean;
    if (la.current) la.current.rotation.set(p.leftArm, 0, p.leftRaise);
    if (ra.current) ra.current.rotation.set(p.rightArm, 0, p.rightRaise);
    if (le.current) le.current.rotation.x = p.leftElbow;
    if (re.current) re.current.rotation.x = p.rightElbow;
    if (lh.current) lh.current.rotation.set(p.leftHip, 0, 0);
    if (rh.current) rh.current.rotation.set(p.rightHip, 0, 0);
    if (lk.current) lk.current.rotation.set(p.knee, 0, 0);
    if (rk.current) rk.current.rotation.set(p.rightKnee, 0, 0);
    leftAnkle.current?.rotation.set(-p.leftHip - p.knee, 0, 0);
    rightAnkle.current?.rotation.set(-p.rightHip - p.rightKnee, 0, 0);
    if (feet?.current && root.current) {
      root.current.position.y = p.height - 0.065;
      if (lh.current && lk.current && leftAnkle.current) plantLeg(lh.current, lk.current, leftAnkle.current, feet.current.left, root.current.position.y);
      // Keep the striking leg free; its support leg remains planted.
      if (rh.current && rk.current && rightAnkle.current && p.rightHip > -0.1) plantLeg(rh.current, rk.current, rightAnkle.current, feet.current.right, root.current.position.y);
    }
  });
  return <group ref={root}>
    <group ref={torso} position={[0, 1.05, 0]}>
      <Part at={[0, 0.34, 0]} size={[0.55, 0.62, 0.32]} color={shell} />
      <Part at={[0, 0.36, 0.17]} size={[robot ? 0.37 : 0.1, robot ? 0.2 : 0.1, 0.04]} color={accent} />
      <Part at={[0, 0, 0]} size={[0.48, 0.15, 0.29]} color="#35443f" />
      <Part at={[0, 0.73, 0]} size={[0.13, 0.14, 0.14]} color={robot ? '#35443f' : '#cfa780'} />
      <Part at={[0, 0.97, 0]} size={[0.43, 0.4, 0.37]} color={robot ? shell : '#cfa780'} />
      {robot ? <Part at={[0, 1, 0.195]} size={[0.34, 0.11, 0.04]} color="#35443f" /> : gear === 'pico' ? <>
        <Part at={[0, 1, 0.21]} size={[0.48, 0.19, 0.19]} color="#eee5cf" />
        <Part at={[0, 1, 0.31]} size={[0.38, 0.12, 0.015]} color="#35443f" />
        <Part at={[0, 1.18, 0]} size={[0.065, 0.05, 0.4]} color="#35443f" />
      </> : <>
        <Part at={[0, 1.17, 0]} size={[0.44, 0.07, 0.38]} color="#35443f" />
        <Part at={[0, 1.21, 0]} size={[0.1, 0.045, 0.1]} color={accent} />
      </>}
      {([-1, 1] as const).map(side => <group key={side} ref={side === -1 ? la : ra} position={[side * 0.38, 0.58, 0]}>
        <Part at={[0, 0, 0]} size={[0.2, 0.2, 0.23]} color={accent} />
        <Part at={[0, -0.24, 0]} size={[0.17, 0.38, 0.2]} color={shell} />
        <group ref={side === -1 ? le : re} position={[0, -0.46, 0]}>
          <Part at={[0, 0, 0]} size={[0.18, 0.14, 0.19]} color={accent} />
          <Part at={[0, -0.2, 0]} size={[0.15, 0.33, 0.18]} color={shell} />
          <Part at={[0, -0.41, 0.02]} size={[0.2, 0.16, 0.21]} color={robot ? accent : '#cfa780'} />
          {!robot && gear === 'pico' && <Part at={[0, -0.41, 0.16]} size={[0.08, 0.2, 0.09]} color="#eee5cf" />}
          {!robot && gear === 'noitom' && <Part at={[0, -0.28, 0.1]} size={[0.09, 0.07, 0.04]} color={accent} />}
        </group>
      </group>)}
    </group>
    {([-1, 1] as const).map(side => <group key={side} ref={side === -1 ? lh : rh} position={[side * 0.17, 1, 0]}>
      <Part at={[0, -0.22, 0]} size={[0.22, 0.42, 0.25]} color={shell} />
      <group ref={side === -1 ? lk : rk} position={[0, -0.47, 0]}>
        <Part at={[0, 0, 0]} size={[0.22, 0.13, 0.26]} color={accent} />
        <Part at={[0, -0.22, 0]} size={[0.18, 0.35, 0.21]} color={shell} />
        <group ref={side === -1 ? leftAnkle : rightAnkle} position={[0, -0.45, 0]}><Part at={[0, 0, 0.1]} size={[0.25, 0.14, 0.42]} color={robot ? shell : '#b1a58a'} /></group>
        {!robot && gear === 'noitom' && <Part at={[0, -0.33, 0.12]} size={[0.09, 0.07, 0.04]} color={accent} />}
      </group>
    </group>)}
  </group>;
}
export function TeleoperationPair({ gear = 'pico', action = 'wave', sequence = 0, playing = true, reduced = false, auto = false, onComplete }: { gear?: CaptureGear; action?: RobotAction; sequence?: number; playing?: boolean; reduced?: boolean; auto?: boolean; onComplete?: () => void }) {
  const pose = useRef(teleopPose(action, 0));
  const timer = useRef({ sequence: -1, elapsed: 0, completed: false });
  useFrame((_, dt) => {
    if (timer.current.sequence !== sequence) timer.current = { sequence, elapsed: 0, completed: false };
    if (playing && !reduced) timer.current.elapsed += Math.min(dt, 0.05);
    const time = timer.current.elapsed;
    const current = auto ? robotActions[Math.floor(time / 3.2) % robotActions.length] : action;
    const progress = reduced ? 0.5 : auto ? Math.min(1, (time % 3.2) / ACTION_SECONDS) : Math.min(1, time / ACTION_SECONDS);
    pose.current = teleopPose(current, progress);
    if (!auto && !reduced && progress === 1 && !timer.current.completed) { timer.current.completed = true; onComplete?.(); }
  });
  return <group>
    {[-1.55, 1.55].map((x, i) => <group key={x} position={[x, 0, 0]}>
      <Part at={[0, -0.13, 0]} size={[2.1, 0.22, 2]} color={i ? '#79958a' : '#b69867'} />
      <TeleopBody robot={i === 1} gear={gear} pose={pose} />
      <GroundLabel title={i ? 'ROBOT / MIRRORED MOTION' : gear === 'pico' ? 'HUMAN / PICO' : 'HUMAN / NOITOM'} position={[0, 0.006, 0.79]} width={1.95} />
    </group>)}
    <Part at={[0, 0.025, 0]} size={[0.8, 0.025, 0.035]} color="#b69867" />
    <mesh position={[0.4, 0.04, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.1, 0.2, 3]} /><meshStandardMaterial color="#b69867" /></mesh>
  </group>;
}
