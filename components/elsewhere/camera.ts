import { radius } from './railway';

// Orthographic zoom changes framing, not camera distance. Keep the entire
// railway in front of the near plane, even while following an outer platform.
export function railwayCamera(count: number) {
  const extent = radius(count) + 10;
  const distance = extent * 4;
  return { distance, near: 0.1, far: distance + extent * 3 };
}

// Restore a known elevated view, never reuse an eye-level camera direction.
export function stationCameraOffset(count: number, yaw = 0) {
  const length = Math.hypot(7, 9.3, 12.5);
  const scale = railwayCamera(count).distance / length;
  return {
    x: (Math.cos(yaw) * 7 + Math.sin(yaw) * 12.5) * scale,
    y: 9.3 * scale,
    z: (-Math.sin(yaw) * 7 + Math.cos(yaw) * 12.5) * scale,
  };
}
