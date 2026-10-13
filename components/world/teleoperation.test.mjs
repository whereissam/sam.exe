import { test, expect } from 'bun:test';
import { robotActions, teleopPose } from './teleoperation';

test('all actions start and finish in the same neutral pose without invalid joint values', () => {
  const neutral = teleopPose('wave', 0);
  for (const action of robotActions) {
    expect(teleopPose(action, -1)).toEqual(neutral);
    for (let frame = 0; frame <= 100; frame++) {
      const pose = teleopPose(action, frame / 100);
      expect(Object.values(pose).every(Number.isFinite)).toBe(true);
    }
    for (const value of Object.values(teleopPose(action, 2))) expect(Math.abs(value)).toBeLessThan(1e-12);
  }
});
test('each selectable action has a distinct pose and left/right punches control the correct arm', () => {
  expect(new Set(robotActions.map(action => JSON.stringify(teleopPose(action, 0.5)))).size).toBe(robotActions.length);
  expect(teleopPose('jab', 0.5).leftArm).toBeLessThan(teleopPose('jab', 0.5).rightArm);
  expect(teleopPose('cross', 0.5).rightArm).toBeLessThan(teleopPose('cross', 0.5).leftArm);
  expect(teleopPose('squat', 0.5).height).toBeLessThan(0);
});
