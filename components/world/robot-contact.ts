import { Matrix4, Vector3, Euler, Quaternion } from 'three';
import { sparringFrame } from './sparring';
export type FightFrame = ReturnType<typeof sparringFrame>;
type V = [number, number, number];
export type BodyBox = {
  name: string;
  center: V;
  size: V;
  rotation: V;
  corners: Vector3[];
};
const transform = (p: V, r: V = [0, 0, 0]) =>
  new Matrix4().compose(
    new Vector3(...p),
    new Quaternion().setFromEuler(new Euler(...r)),
    new Vector3(1, 1, 1),
  );
/** Solid envelopes follow the same hierarchy and dimensions as TeleopBody.
 * Feet use a conservative stance envelope to include the planted-foot IK. */
export function robotBoxes(frame: FightFrame): BodyBox[] {
  const p = frame.pose,
    boxes: BodyBox[] = [];
  const root = transform(
    [frame.x, p.height - 0.065, frame.z],
    [0, frame.heading, 0],
  );
  const torso = root.clone().multiply(transform([0, 1.05, 0], [p.lean, 0, 0]));
  const add = (name: string, parent: Matrix4, at: V, size: V) => {
    const matrix = parent.clone().multiply(transform(at));
    const center = new Vector3().setFromMatrixPosition(matrix);
    const rotation = new Euler().setFromRotationMatrix(matrix);
    const corners = [-1, 1].flatMap((x) =>
      [-1, 1].flatMap((y) =>
        [-1, 1].map((z) =>
          new Vector3(
            (x * size[0]) / 2,
            (y * size[1]) / 2,
            (z * size[2]) / 2,
          ).applyMatrix4(matrix),
        ),
      ),
    );
    boxes.push({
      name,
      center: center.toArray() as V,
      size,
      rotation: [rotation.x, rotation.y, rotation.z],
      corners,
    });
  };
  add('torso', torso, [0, 0.34, 0.02], [0.55, 0.62, 0.38]);
  add('head', torso, [0, 0.97, 0.02], [0.43, 0.4, 0.41]);
  add('pelvis', torso, [0, 0, 0], [0.48, 0.15, 0.29]);
  for (const side of [-1, 1]) {
    const left = side === -1,
      name = left ? 'left' : 'right';
    const arm = torso
      .clone()
      .multiply(
        transform(
          [side * 0.38, 0.58, 0],
          [left ? p.leftArm : p.rightArm, 0, left ? p.leftRaise : p.rightRaise],
        ),
      );
    const elbow = arm
      .clone()
      .multiply(
        transform([0, -0.46, 0], [left ? p.leftElbow : p.rightElbow, 0, 0]),
      );
    add(`${name} shoulder`, arm, [0, 0, 0], [0.2, 0.2, 0.23]);
    add(`${name} upper arm`, arm, [0, -0.24, 0], [0.17, 0.38, 0.2]);
    add(`${name} elbow`, elbow, [0, 0, 0], [0.18, 0.14, 0.19]);
    add(`${name} forearm`, elbow, [0, -0.2, 0], [0.15, 0.33, 0.18]);
    add(`${name} fist`, elbow, [0, -0.41, 0.02], [0.2, 0.16, 0.21]);
    const hip = root
      .clone()
      .multiply(
        transform([side * 0.17, 1, 0], [left ? p.leftHip : p.rightHip, 0, 0]),
      );
    const knee = hip
      .clone()
      .multiply(transform([0, -0.47, 0], [left ? p.knee : p.rightKnee, 0, 0]));
    add(`${name} thigh`, hip, [0, -0.22, 0], [0.22, 0.42, 0.25]);
    add(`${name} shin`, knee, [0, -0.22, 0], [0.22, 0.48, 0.26]);
    const ankle = knee
      .clone()
      .multiply(
        transform(
          [0, -0.45, 0],
          [-(left ? p.leftHip + p.knee : p.rightHip + p.rightKnee), 0, 0],
        ),
      );
    add(`${name} foot`, ankle, [0, 0, 0.1], [0.25, 0.14, 0.42]);
  }
  add('stance', root, [0, 0.35, 0], [0.7, 0.7, 0.9]);
  return boxes;
}
const interval = (box: BodyBox, axis: Vector3) => {
  const values = box.corners.map((p) => p.dot(axis));
  return [Math.min(...values), Math.max(...values)];
};
/** Conservative kinematic contact constraints, not force/dynamics estimation. */
export function contactCorrection(a: FightFrame, b: FightFrame) {
  const axis = new Vector3(b.x - a.x, 0, b.z - a.z).normalize();
  const lateral = new Vector3(axis.z, 0, -axis.x),
    up = new Vector3(0, 1, 0);
  let correction = 0,
    parts: string[] = [];
  const boxesA = robotBoxes(a),
    boxesB = robotBoxes(b);
  for (const x of boxesA)
    for (const y of boxesB) {
      const overlaps = [lateral, up].every((dir) => {
        const u = interval(x, dir),
          v = interval(y, dir);
        return u[0] < v[1] + 0.015 && v[0] < u[1] + 0.015;
      });
      if (!overlaps) continue;
      const u = interval(x, axis),
        v = interval(y, axis);
      if (u[1] + 0.015 > v[0] && v[1] > u[0]) {
        const depth = u[1] + 0.015 - v[0];
        if (depth > correction) {
          correction = depth;
          parts = [x.name, y.name];
        }
      }
    }
  return { correction, parts, axis };
}
export function constrainedFight(time: number) {
  const raw = [sparringFrame(time, -1), sparringFrame(time, 1)] as const;
  const contact = contactCorrection(...raw);
  const frames = raw.map((f, i) => ({
    ...f,
    x: f.x + ((i ? 1 : -1) * contact.axis.x * contact.correction) / 2,
    z: f.z + ((i ? 1 : -1) * contact.axis.z * contact.correction) / 2,
  })) as [FightFrame, FightFrame];
  return { raw, frames, correction: contact.correction, parts: contact.parts };
}
