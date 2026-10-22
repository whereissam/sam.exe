import { teleopPose, type RobotAction } from './teleoperation';

const BEAT = 1.35;
const attacks: RobotAction[] = ['jab', 'cross', 'jab', 'kick', 'cross', 'jab'];
export function sparringFrame(time: number, side: -1 | 1) {
  const beat = Math.floor(time / BEAT);
  const progress = (time % BEAT) / BEAT;
  const attackingSide = beat % 2 === 0 ? -1 : 1;
  const attacking = side === attackingSide;
  // Every third exchange the defender is late to the guard, so the strike lands.
  const caught = !attacking && beat % 3 === 1;
  const action = attacking ? attacks[beat % attacks.length] : 'block';
  // A caught defender stands straight with the hands dropping, rather than blocking.
  const pose = teleopPose(action, caught ? 0 : progress);
  const weight = Math.sin(progress * Math.PI) ** 2;
  // Maintain a guard between strikes, instead of dropping both arms to the hips. It fades
  // at the peak of each exchange, where a blocking defender's block pose takes over.
  const guard = 1 - weight;
  pose.leftArm += -0.48 * guard;
  pose.rightArm += -0.48 * guard;
  pose.leftElbow += -1.45 * guard;
  pose.rightElbow += -1.45 * guard;
  if (attacking && action !== 'kick') {
    if (action === 'jab') {
      pose.rightArm = -0.48;
      pose.rightElbow = -1.45;
    } else {
      pose.leftArm = -0.48;
      pose.leftElbow = -1.45;
    }
  }
  pose.lean += (attacking ? 0.08 : -0.1) * weight;
  // The attacker steps right in; the defender gives only a little ground, so strikes reach.
  const radius = 0.75 - weight * (attacking ? 0.35 : 0.08);
  const angle = Math.sin(time * 0.3) * 0.22;
  const x = side * radius * Math.cos(angle);
  const z = -0.5 + side * radius * Math.sin(angle);
  // Turn the shoulders into the punch: the shoulders sit wide of the centre line, so a
  // straight arm would pass beside the opponent. ~0.42 rad lines the fist up with them.
  const twist = !attacking ? 0 : action === 'jab' ? 0.42 : action === 'cross' ? -0.42 : -0.2;
  const heading = Math.atan2(-side * Math.cos(angle), -side * Math.sin(angle)) + twist * weight;
  return { pose, x, z, heading, attacking, action, weight, caught };
}
export function operatorHeading(
  operatorX: number,
  operatorZ: number,
  robotX: number,
  robotZ: number,
) {
  return Math.atan2(robotX - operatorX, robotZ - operatorZ);
}

/** The operator's pose on their capture platform: they stay planted in the middle and
 * turn with their robot. Their legs don't step, so sliding them around would look like ice. */
export function captureFrame(
  frame: { x: number; z: number; heading: number },
  side: -1 | 1,
) {
  const facing = operatorHeading(side * 5.4, 1.3, side * 0.98, -0.5);
  const rotation = facing - (-side * Math.PI) / 2;
  return { x: 0, z: 0, heading: frame.heading + rotation };
}

/** One command stream for the operator displays and physical joint motors.
 * Only the fixed physics clock advances it, including after async loading.
 */
export function createSparringCommands() {
  return { frames: [sparringFrame(0, -1), sparringFrame(0, 1)] };
}
export type SparringCommands = ReturnType<typeof createSparringCommands>;
