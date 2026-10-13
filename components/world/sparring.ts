import { teleopPose, type RobotAction } from './teleoperation';

const BEAT = 1.35;
const attacks: RobotAction[] = ['jab', 'cross', 'jab', 'kick', 'cross', 'jab'];
export function sparringFrame(time: number, side: -1 | 1) {
  const beat = Math.floor(time / BEAT);
  const progress = (time % BEAT) / BEAT;
  const attackingSide = beat % 2 === 0 ? -1 : 1;
  const attacking = side === attackingSide;
  const action = attacking ? attacks[beat % attacks.length] : 'block';
  const pose = teleopPose(action, progress);
  const weight = Math.sin(progress * Math.PI) ** 2;
  // Maintain a guard between strikes, instead of dropping both arms to the hips.
  pose.leftArm += -0.48 * (1 - weight);
  pose.rightArm += -0.48 * (1 - weight);
  pose.leftElbow += -1.45 * (1 - weight);
  pose.rightElbow += -1.45 * (1 - weight);
  if (attacking && action !== 'kick') {
    if (action === 'jab') { pose.rightArm = -0.48; pose.rightElbow = -1.45; }
    else { pose.leftArm = -0.48; pose.leftElbow = -1.45; }
  }
  pose.lean += (attacking ? 0.08 : -0.1) * weight;
  const radius = 0.98 - weight * (attacking ? 0.37 : 0.3);
  const angle = Math.sin(time * 0.3) * 0.22;
  const x = side * radius * Math.cos(angle);
  const z = -0.5 + side * radius * Math.sin(angle);
  const heading = Math.atan2(-side * Math.cos(angle), -side * Math.sin(angle));
  return { pose, x, z, heading, attacking, action, weight };
}
export function operatorHeading(operatorX: number, operatorZ: number, robotX: number, robotZ: number) {
  return Math.atan2(robotX - operatorX, robotZ - operatorZ);
}

/** Same captured translation and turn, expressed in the operator station's frame. */
export function captureFrame(frame: { x: number; z: number; heading: number }, side: -1 | 1) {
  const facing = operatorHeading(side * 5.4, 1.3, side * 0.98, -0.5);
  const rotation = facing - (-side * Math.PI / 2);
  const dx = frame.x - side * 0.98, dz = frame.z + 0.5;
  return {
    x: Math.cos(rotation) * dx + Math.sin(rotation) * dz,
    z: -Math.sin(rotation) * dx + Math.cos(rotation) * dz,
    heading: frame.heading + rotation,
  };
}
