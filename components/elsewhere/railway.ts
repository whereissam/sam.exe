import type { Point } from './journey';
export const radius = (count: number) => Math.max(14, (count + 1) * 2.5);
export const stopAngle = (index: number, count: number) =>
  -Math.PI / 2 + ((index + 1) / (count + 1)) * Math.PI * 2;
export function railPoint(angle: number, count: number): Point {
  const r = radius(count);
  return { x: r * Math.cos(angle), z: r + 2.8 + r * Math.sin(angle) };
}
export const stopYaw = (angle: number) => -angle - Math.PI / 2;
export function platformToWorld(
  p: Point,
  angle: number,
  count: number,
  origin = 0,
): Point {
  const stop = railPoint(angle, count),
    yaw = stopYaw(angle);
  const x = p.x - origin,
    z = p.z - 2.8;
  return {
    x: stop.x + Math.cos(yaw) * x + Math.sin(yaw) * z,
    z: stop.z - Math.sin(yaw) * x + Math.cos(yaw) * z,
  };
}
export function worldToPlatform(
  p: Point,
  angle: number,
  count: number,
  origin = 0,
): Point {
  const stop = railPoint(angle, count),
    yaw = stopYaw(angle);
  const x = p.x - stop.x,
    z = p.z - stop.z;
  return {
    x: origin + Math.cos(yaw) * x - Math.sin(yaw) * z,
    z: 2.8 + Math.sin(yaw) * x + Math.cos(yaw) * z,
  };
}
