/** One small goal per robot, and the little show it puts on once you reach it. */
import type { Joints, RobotId } from './urdf-robots';

export const MISSIONS: Record<RobotId, { task: string; win: string }> = {
  humanoid: {
    task: 'Lift its right hand above its head',
    win: 'A pose is just 23 joint angles. Send these numbers to a real G1 and it would strike the same pose.',
  },
  arm: {
    task: 'Pick up the orange block with the gripper',
    win: 'Bending joints to put a hand on a spot is called inverse kinematics. Real arms work it out a thousand times a second.',
  },
  quadruped: {
    task: 'Make it lift a front paw',
    win: 'Each leg is only three joints. Walking is those twelve numbers on a loop, like this.',
  },
};
/** How long the reward show runs, in seconds. */
export const SHOW_SECONDS = 4;

/** Joint targets for the reward show `t` seconds in, layered over the pose the visitor made. */
export function showPose(id: RobotId, t: number, pose: Joints): Joints {
  const s = Math.sin;
  if (id === 'humanoid') {
    // Keep the raised arm, wave the forearm.
    return { ...pose, right_elbow_joint: -1 + 0.55 * s(t * 8), right_wrist_roll_joint: 0.3 * s(t * 8) };
  }
  if (id === 'arm') {
    // Lift the block, then turn to show it off.
    const lift = Math.min(1, t / 1.2);
    const pan = pose.shoulder_pan_joint ?? 0;
    return {
      ...pose,
      shoulder_lift_joint: (pose.shoulder_lift_joint ?? 0) * (1 - lift) + 0.15 * lift,
      elbow_joint: (pose.elbow_joint ?? 0) * (1 - lift) + 0.9 * lift,
      wrist_pitch_joint: 0.9,
      shoulder_pan_joint: t > 1.2 ? pan + 0.9 * s((t - 1.2) * 1.6) : pan,
    };
  }
  // A trot on the spot: diagonal legs move together.
  const trot: Joints = {};
  for (const [leg, offset] of [['FL', 0], ['RR', 0], ['FR', Math.PI], ['RL', Math.PI]] as const) {
    const p = t * Math.PI * 2 * 1.6 + offset;
    trot[`${leg}_hip_joint`] = 0;
    trot[`${leg}_thigh_joint`] = 0.8 + 0.3 * s(p);
    trot[`${leg}_calf_joint`] = -1.55 - 0.35 * Math.max(0, s(p + Math.PI / 2));
  }
  return { ...pose, ...trot };
}
