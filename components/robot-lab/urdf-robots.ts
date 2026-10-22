/**
 * Three robots written as real URDF documents. Each is built only from
 * primitive geometry, so it loads instantly with no mesh downloads, and each
 * uses the joint names of a real robot family so the files read like the real thing.
 * Limits are tighter than the real robots' so limbs stop before passing through the body,
 * since nothing here checks for self-collision.
 */
type Vec = [number, number, number];
type Material = 'shell' | 'ink' | 'rust' | 'jade';
type Shape = { box: Vec } | { cylinder: [radius: number, length: number] } | { sphere: number };
type Visual = { shape: Shape; at?: Vec; rpy?: Vec; material?: Material };
type Link = { name: string; visuals: Visual[] };
type Joint = {
  name: string;
  parent: string;
  child: Link;
  at: Vec;
  type?: 'revolute' | 'prismatic' | 'fixed';
  axis?: Vec;
  limit?: [lower: number, upper: number];
  mimic?: string;
};
export type Joints = Record<string, number>;
export type RobotFile = {
  id: RobotId;
  label: string;
  urdf: string;
  /** Line range in `urdf` of each joint block together with the link it moves. */
  blocks: Record<string, [start: number, end: number]>;
  rest: Joints;
  /** Bolted to the floor rather than standing on its feet. */
  fixedBase: boolean;
};
export type RobotId = 'humanoid' | 'arm' | 'quadruped';

// The lab's cream, ink, rust and jade.
const MATERIALS: Record<Material, string> = { shell: '#efe6cf', ink: '#35443f', rust: '#b46d4e', jade: '#648f82' };
const X: Vec = [1, 0, 0], Y: Vec = [0, 1, 0], Z: Vec = [0, 0, 1];
const num = (values: number[]) => values.map(n => +n.toFixed(4)).join(' ');
const rgba = (hex: string) => [1, 3, 5].map(i => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3)).join(' ') + ' 1';

function geometry(shape: Shape) {
  if ('box' in shape) return `<box size="${num(shape.box)}"/>`;
  if ('cylinder' in shape) return `<cylinder radius="${shape.cylinder[0]}" length="${shape.cylinder[1]}"/>`;
  return `<sphere radius="${shape.sphere}"/>`;
}
function linkLines({ name, visuals }: Link) {
  return [
    `  <link name="${name}">`,
    ...visuals.map(({ shape, at = [0, 0, 0], rpy = [0, 0, 0], material = 'shell' }) =>
      `    <visual><origin xyz="${num(at)}" rpy="${num(rpy)}"/><geometry>${geometry(shape)}</geometry><material name="${material}"/></visual>`),
    '  </link>',
  ];
}
function jointLines({ name, parent, child, at, type = 'revolute', axis, limit, mimic }: Joint) {
  return [
    `  <joint name="${name}" type="${type}">`,
    `    <parent link="${parent}"/>`,
    `    <child link="${child.name}"/>`,
    `    <origin xyz="${num(at)}" rpy="0 0 0"/>`,
    ...(axis ? [`    <axis xyz="${num(axis)}"/>`] : []),
    ...(limit ? [`    <limit lower="${limit[0]}" upper="${limit[1]}" effort="80" velocity="10"/>`] : []),
    ...(mimic ? [`    <mimic joint="${mimic}" multiplier="1"/>`] : []),
    '  </joint>',
  ];
}
/** Writes the file in tree order: each joint, then the link it moves. */
function write(id: RobotId, label: string, root: Link, joints: Joint[], rest: Joints, fixedBase = false): RobotFile {
  const lines = [
    '<?xml version="1.0"?>',
    `<robot name="${id}">`,
    ...Object.entries(MATERIALS).map(([name, hex]) => `  <material name="${name}"><color rgba="${rgba(hex)}"/></material>`),
    ...linkLines(root),
  ];
  const blocks: RobotFile['blocks'] = {};
  for (const joint of joints) {
    const start = lines.length;
    lines.push(...jointLines(joint), ...linkLines(joint.child));
    if (joint.type !== 'fixed') blocks[joint.name] = [start, lines.length - 1];
  }
  lines.push('</robot>');
  return { id, label, urdf: lines.join('\n'), blocks, rest, fixedBase };
}

const knuckle = (radius: number, material: Material = 'ink'): Visual => ({ shape: { sphere: radius }, material });
const limb = (length: number, radius: number, material: Material = 'shell'): Visual => ({ shape: { cylinder: [radius, length] }, at: [0, 0, -length / 2], material });
const upright = (length: number, radius: number, material: Material = 'shell'): Visual => ({ shape: { cylinder: [radius, length] }, at: [0, 0, length / 2], material });

function humanoid() {
  const joints: Joint[] = [
    { name: 'waist_yaw_joint', parent: 'pelvis', at: [0, 0, 0.05], axis: Z, limit: [-1.5, 1.5], child: { name: 'torso_link', visuals: [
      { shape: { cylinder: [0.07, 0.08] }, at: [0, 0, 0.02], material: 'ink' },
      { shape: { box: [0.18, 0.3, 0.3] }, at: [0, 0, 0.2] },
      { shape: { box: [0.02, 0.16, 0.12] }, at: [0.095, 0, 0.24], material: 'rust' },
      { shape: { box: [0.1, 0.22, 0.2] }, at: [-0.12, 0, 0.2], material: 'ink' },
    ] } },
    { name: 'head_joint', parent: 'torso_link', at: [0, 0, 0.47], type: 'fixed', child: { name: 'head_link', visuals: [
      { shape: { sphere: 0.095 } }, { shape: { box: [0.04, 0.15, 0.06] }, at: [0.075, 0, 0.005], material: 'ink' },
    ] } },
  ];
  for (const side of ['left', 'right'] as const) {
    const s = side === 'left' ? 1 : -1, p = `${side}_`;
    joints.push(
      // Pitch comes last in each chain, so grabbing a thigh or upper arm swings it rather than twisting it.
      { name: `${p}hip_roll_joint`, parent: 'pelvis', at: [0, 0.09 * s, -0.06], axis: X, limit: s > 0 ? [-0.15, 1.2] : [-1.2, 0.15], child: { name: `${p}hip_roll_link`, visuals: [{ shape: { box: [0.08, 0.07, 0.07] }, material: 'ink' }] } },
      { name: `${p}hip_yaw_joint`, parent: `${p}hip_roll_link`, at: [0, 0, 0], axis: Z, limit: [-0.8, 0.8], child: { name: `${p}hip_yaw_link`, visuals: [knuckle(0.05)] } },
      { name: `${p}hip_pitch_joint`, parent: `${p}hip_yaw_link`, at: [0, 0, 0], axis: Y, limit: [-2.5, 0.9], child: { name: `${p}thigh_link`, visuals: [limb(0.32, 0.055)] } },
      { name: `${p}knee_joint`, parent: `${p}thigh_link`, at: [0, 0, -0.32], axis: Y, limit: [-0.08, 2.88], child: { name: `${p}shin_link`, visuals: [knuckle(0.05), limb(0.34, 0.045), { shape: { box: [0.05, 0.06, 0.12] }, at: [0.04, 0, -0.1], material: 'rust' }] } },
      { name: `${p}ankle_pitch_joint`, parent: `${p}shin_link`, at: [0, 0, -0.34], axis: Y, limit: [-0.87, 0.52], child: { name: `${p}ankle_pitch_link`, visuals: [knuckle(0.032)] } },
      { name: `${p}ankle_roll_joint`, parent: `${p}ankle_pitch_link`, at: [0, 0, 0], axis: X, limit: [-0.26, 0.26], child: { name: `${p}foot_link`, visuals: [{ shape: { box: [0.22, 0.09, 0.035] }, at: [0.035, 0, -0.04], material: 'ink' }] } },
      { name: `${p}shoulder_roll_joint`, parent: 'torso_link', at: [0, 0.2 * s, 0.31], axis: X, limit: s > 0 ? [-0.05, 2.25] : [-2.25, 0.05], child: { name: `${p}shoulder_roll_link`, visuals: [knuckle(0.05)] } },
      { name: `${p}shoulder_yaw_joint`, parent: `${p}shoulder_roll_link`, at: [0, 0, 0], axis: Z, limit: [-2.6, 2.6], child: { name: `${p}shoulder_yaw_link`, visuals: [{ shape: { box: [0.07, 0.06, 0.07] }, material: 'ink' }] } },
      { name: `${p}shoulder_pitch_joint`, parent: `${p}shoulder_yaw_link`, at: [0, 0, 0], axis: Y, limit: [-3.08, 2.67], child: { name: `${p}upper_arm_link`, visuals: [limb(0.2, 0.04)] } },
      { name: `${p}elbow_joint`, parent: `${p}upper_arm_link`, at: [0, 0, -0.22], axis: Y, limit: [-2.4, 0.1], child: { name: `${p}forearm_link`, visuals: [knuckle(0.038), limb(0.18, 0.034)] } },
      { name: `${p}wrist_roll_joint`, parent: `${p}forearm_link`, at: [0, 0, -0.19], axis: X, limit: [-1.97, 1.97], child: { name: `${p}hand_link`, visuals: [{ shape: { box: [0.06, 0.04, 0.09] }, at: [0, 0, -0.05], material: 'ink' }] } },
    );
  }
  const rest: Joints = { left_shoulder_roll_joint: 0.15, right_shoulder_roll_joint: -0.15, left_elbow_joint: -0.35, right_elbow_joint: -0.35, left_knee_joint: 0.08, right_knee_joint: 0.08, left_hip_pitch_joint: -0.04, right_hip_pitch_joint: -0.04, left_ankle_pitch_joint: -0.04, right_ankle_pitch_joint: -0.04 };
  const pelvis: Link = { name: 'pelvis', visuals: [{ shape: { box: [0.14, 0.24, 0.1] }, material: 'ink' }, { shape: { box: [0.02, 0.2, 0.05] }, at: [0.075, 0, 0], material: 'rust' }] };
  return write('humanoid', 'Humanoid', pelvis, joints, rest);
}

function arm() {
  const joints: Joint[] = [
    { name: 'shoulder_pan_joint', parent: 'base_link', at: [0, 0, 0.06], axis: Z, limit: [-3.1, 3.1], child: { name: 'shoulder_link', visuals: [upright(0.12, 0.065, 'jade')] } },
    { name: 'shoulder_lift_joint', parent: 'shoulder_link', at: [0, 0, 0.12], axis: Y, limit: [-2.2, 2.2], child: { name: 'upper_arm_link', visuals: [knuckle(0.07), upright(0.34, 0.045)] } },
    { name: 'elbow_joint', parent: 'upper_arm_link', at: [0, 0, 0.34], axis: Y, limit: [-2.6, 2.6], child: { name: 'forearm_link', visuals: [knuckle(0.058), upright(0.3, 0.038)] } },
    { name: 'wrist_pitch_joint', parent: 'forearm_link', at: [0, 0, 0.3], axis: Y, limit: [-2.1, 2.1], child: { name: 'wrist_link', visuals: [knuckle(0.046, 'jade'), upright(0.06, 0.034, 'ink')] } },
    { name: 'wrist_roll_joint', parent: 'wrist_link', at: [0, 0, 0.06], axis: Z, limit: [-3.1, 3.1], child: { name: 'hand_link', visuals: [{ shape: { box: [0.06, 0.15, 0.03] }, at: [0, 0, 0.015], material: 'ink' }] } },
    { name: 'left_finger_joint', parent: 'hand_link', type: 'prismatic', at: [0, 0.012, 0.03], axis: Y, limit: [0, 0.05], child: { name: 'left_finger_link', visuals: [{ shape: { box: [0.035, 0.016, 0.08] }, at: [0, 0.008, 0.04], material: 'rust' }] } },
    { name: 'right_finger_joint', parent: 'hand_link', type: 'prismatic', at: [0, -0.012, 0.03], axis: [0, -1, 0], limit: [0, 0.05], mimic: 'left_finger_joint', child: { name: 'right_finger_link', visuals: [{ shape: { box: [0.035, 0.016, 0.08] }, at: [0, -0.008, 0.04], material: 'rust' }] } },
  ];
  const base: Link = { name: 'base_link', visuals: [upright(0.06, 0.1, 'ink'), { shape: { cylinder: [0.13, 0.015] }, at: [0, 0, 0.0075], material: 'jade' }] };
  return write('arm', 'Robot arm', base, joints, { shoulder_lift_joint: 0.45, elbow_joint: 1.15, wrist_pitch_joint: 0.9, left_finger_joint: 0.03 }, true);
}

function quadruped() {
  const joints: Joint[] = [
    { name: 'head_joint', parent: 'trunk', at: [0.24, 0, 0.05], type: 'fixed', child: { name: 'head_link', visuals: [{ shape: { box: [0.1, 0.13, 0.09] } }, { shape: { box: [0.012, 0.09, 0.03] }, at: [0.05, 0, 0.01], material: 'ink' }] } },
  ];
  for (const [leg, x, y] of [['FL', 1, 1], ['FR', 1, -1], ['RL', -1, 1], ['RR', -1, -1]] as const) {
    joints.push(
      { name: `${leg}_hip_joint`, parent: 'trunk', at: [0.17 * x, 0.055 * y, 0], axis: X, limit: [-0.45, 0.45], child: { name: `${leg}_hip`, visuals: [{ shape: { cylinder: [0.04, 0.05] }, rpy: [Math.PI / 2, 0, 0], material: 'ink' }] } },
      { name: `${leg}_thigh_joint`, parent: `${leg}_hip`, at: [0, 0.07 * y, 0], axis: Y, limit: [-1.2, 2.2], child: { name: `${leg}_thigh`, visuals: [knuckle(0.035), limb(0.2, 0.028, 'rust')] } },
      { name: `${leg}_calf_joint`, parent: `${leg}_thigh`, at: [0, 0, -0.2], axis: Y, limit: [-2.7, -0.9], child: { name: `${leg}_calf`, visuals: [knuckle(0.026), limb(0.2, 0.018), { shape: { sphere: 0.026 }, at: [0, 0, -0.2], material: 'ink' }] } },
    );
  }
  const rest = Object.fromEntries(['FL', 'FR', 'RL', 'RR'].flatMap(leg => [[`${leg}_thigh_joint`, 0.8], [`${leg}_calf_joint`, -1.55]]));
  const trunk: Link = { name: 'trunk', visuals: [{ shape: { box: [0.42, 0.19, 0.1] } }, { shape: { box: [0.3, 0.12, 0.012] }, at: [0, 0, 0.056], material: 'rust' }] };
  return write('quadruped', 'Robot dog', trunk, joints, rest);
}

export const ROBOTS: Record<RobotId, RobotFile> = { humanoid: humanoid(), arm: arm(), quadruped: quadruped() };
export const ROBOT_IDS = Object.keys(ROBOTS) as RobotId[];
