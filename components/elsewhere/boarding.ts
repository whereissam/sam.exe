// Platform-local coordinates. Both travellers cross the centred doorway before
// moving along the aisle; the second traveller waits until the first is clear.
export function boardingPose(
  progress: number,
  companion: boolean,
  alighting = false,
) {
  const side = companion ? 1 : -1;
  const points = alighting
    ? [
        [side * 0.85, 0.525, 2.65],
        [0, 0.525, 2.65],
        [0, 0.525, 2.23],
        [0, 0.3, 1.95],
        [0, 0.06, 1.3],
        [side, 0.06, 1.3],
      ]
    : [
        [companion ? 1 : 0, 0.06, 1.3],
        [0, 0.06, 1.3],
        [0, 0.3, 1.95],
        [0, 0.525, 2.23],
        [0, 0.525, 2.65],
        [side * 0.85, 0.525, 2.65],
      ];
  const t = Math.max(0, Math.min(1, (progress - (companion ? 0.5 : 0)) * 2));
  const lengths = points
    .slice(1)
    .map((p, i) => Math.hypot(...p.map((v, j) => v - points[i][j])));
  let remaining = t * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] || i === lengths.length - 1) {
      const f = lengths[i] ? Math.min(1, remaining / lengths[i]) : 1;
      return {
        x: points[i][0] + (points[i + 1][0] - points[i][0]) * f,
        y: points[i][1] + (points[i + 1][1] - points[i][1]) * f,
        z: points[i][2] + (points[i + 1][2] - points[i][2]) * f,
      };
    }
    remaining -= lengths[i];
  }
  throw new Error('Missing boarding path');
}
