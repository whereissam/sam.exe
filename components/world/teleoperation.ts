export const robotActions = ['wave', 'jab', 'cross', 'block', 'kick', 'squat', 'bow', 'victory'] as const;
export type RobotAction = typeof robotActions[number];
export type CaptureGear = 'pico' | 'noitom';
export const actionLabels: Record<RobotAction, string> = {
  wave: 'Wave', jab: 'Left jab', cross: 'Right cross', block: 'Block', kick: 'Front kick', squat: 'Squat', bow: 'Bow', victory: 'Victory',
};
export const ACTION_SECONDS = 2.4;
export function teleopPose(action: RobotAction, progress: number) {
  const t = Math.max(0, Math.min(1, progress));
  const weight = Math.sin(Math.PI * t) ** 2;
  const p = { leftArm: 0, rightArm: 0, leftElbow: 0, rightElbow: 0, leftRaise: 0, rightRaise: 0, leftHip: 0, rightHip: 0, knee: 0, rightKnee: 0, lean: 0, height: 0 };
  if (t === 0 || t === 1) return p;
  switch (action) {
    case 'wave': p.rightRaise = 2.65 * weight; p.rightElbow = (-0.6 + Math.sin(t * Math.PI * 8) * 0.35) * weight; break;
    case 'jab': p.leftArm = -Math.PI / 2 * weight; p.rightArm = -0.5 * weight; p.rightElbow = -1.6 * weight; break;
    case 'cross': p.rightArm = -Math.PI / 2 * weight; p.leftArm = -0.5 * weight; p.leftElbow = -1.6 * weight; p.lean = 0.1 * weight; break;
    case 'block': p.leftArm = p.rightArm = -0.65 * weight; p.leftElbow = p.rightElbow = -1.9 * weight; break;
    case 'kick': p.rightHip = -1.4 * weight; p.rightKnee = 0.3 * weight; p.leftArm = -0.7 * weight; p.rightArm = -0.5 * weight; p.lean = -0.12 * weight; break;
    case 'squat': p.leftHip = p.rightHip = -0.85 * weight; p.knee = p.rightKnee = 1.7 * weight; p.height = -0.31 * weight; p.leftArm = p.rightArm = -1.25 * weight; break;
    case 'bow': p.lean = 0.7 * weight; break;
    case 'victory': p.leftRaise = -2.55 * weight; p.rightRaise = 2.55 * weight; break;
  }
  return p;
}
