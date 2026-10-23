// Hold each pose for four seconds, then ease into the next over two seconds.
// Keep feet planted: these rigid-part avatars have no spine or hip IK.
const poses = [
  { left: -2.75, right: 2.75, elbow: -0.12, head: -0.08, squat: 0 },
  { left: -1.55, right: 1.55, elbow: 0, head: 0, squat: 0 },
  { left: -2.85, right: 0.3, elbow: -0.2, head: -0.12, squat: 0 },
  { left: -0.3, right: 2.85, elbow: -0.2, head: 0.12, squat: 0 },
  { left: -0.35, right: 0.35, elbow: -1.15, head: 0, squat: 0.32 },
  { left: -0.12, right: 0.12, elbow: -0.1, head: 0.04, squat: 0 },
];

export function stretchPose(seconds: number, reduced = false) {
  if (reduced) return poses[0];
  const time = Math.max(0, seconds);
  const index = Math.floor(time / 6) % poses.length;
  const a = poses[index];
  const b = poses[(index + 1) % poses.length];
  const progress = Math.max(0, (time % 6 - 4) / 2);
  const blend = progress * progress * (3 - 2 * progress);
  return Object.fromEntries(
    Object.entries(a).map(([key, value]) => [
      key, value + (b[key as keyof typeof b] - value) * blend,
    ]),
  ) as typeof a;
}
