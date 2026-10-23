import { Object3D, Quaternion, Vector3 } from 'three';

const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};
const mix = (a: number[], b: number[], t: number) =>
  a.map((v, i) => v + (b[i] - v) * t);
export const TEA_CYCLE = 18;
/** Positions are in the seated actor's coordinates, before the avatar's .52 scale. */
export function teaPose(seconds: number) {
  const t = ((seconds % TEA_CYCLE) + TEA_CYCLE) % TEA_CYCLE;
  const lift = smooth((t - 2) / 2.5) * (1 - smooth((t - 6) / 2.5));
  const grip = smooth(t / 2) * (1 - smooth((t - 8.5) / 2));
  const cup = mix([0.125, 0.658, 0.32], [0.015, 0.79, 0.16], lift);
  const handle = [cup[0] + 0.055, cup[1], cup[2]];
  // Lift clear of the rim before reaching forward; reverse this path on release.
  // A straight lap-to-handle interpolation cuts through the solid tabletop.
  const lap = [0.12112258, 0.46075031, 0.1624707];
  const clearance = [0.18, 0.7, 0.14];
  const hand =
    grip < 0.5
      ? mix(lap, clearance, smooth(grip * 2))
      : mix(clearance, handle, smooth((grip - 0.5) * 2));
  return {
    lean: 0.05 * (1 - lift),
    cup,
    hand,
    grip,
    tilt: -0.16 * smooth((t - 4.5) / 0.5) * (1 - smooth((t - 5.5) / 0.5)),
    lift,
  };
}

/** Solve the shoulder and elbow against the SAME handle position as the cup. */
export function placeTeaHand(
  arm: Object3D,
  elbow: Object3D,
  hand: Object3D,
  target: number[],
  grip: number,
) {
  const shoulder = arm.position.clone();
  const goal = new Vector3(...target).multiplyScalar(1 / 0.52);
  // Targets are avatar-local; the upgraded arm lives below chest/shoulder bones.
  let rig = arm.parent;
  while (rig && !rig.userData.rig_version) rig = rig.parent;
  if (rig && arm.parent) {
    rig.updateWorldMatrix(true, true);
    arm.parent.worldToLocal(rig.localToWorld(goal));
  }
  const upper = elbow.position.length();
  const lower = hand.position.length();
  const direction = goal.clone().sub(shoulder);
  const distance = Math.min(direction.length(), upper + lower - 0.0001);
  direction.normalize();
  const along =
    (upper * upper - lower * lower + distance * distance) / (2 * distance);
  const bend = new Vector3(1, -0.45, 0);
  bend.addScaledVector(direction, -bend.dot(direction)).normalize();
  const elbowGoal = shoulder
    .clone()
    .addScaledVector(direction, along)
    .addScaledVector(
      bend,
      Math.sqrt(Math.max(0, upper * upper - along * along)),
    );
  arm.quaternion.setFromUnitVectors(
    elbow.position.clone().normalize(),
    elbowGoal.clone().sub(shoulder).normalize(),
  );
  elbow.quaternion.setFromUnitVectors(
    hand.position.clone().normalize(),
    goal
      .sub(elbowGoal)
      .applyQuaternion(arm.quaternion.clone().invert())
      .normalize(),
  );
  const wrist = new Quaternion().setFromAxisAngle(
    new Vector3(1, 0, 0),
    -1.37 * (1 - grip),
  );
  hand.quaternion
    .copy(arm.quaternion)
    .multiply(elbow.quaternion)
    .invert()
    .multiply(wrist);
}
