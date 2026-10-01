export type RoomView = 'overview' | 'shelf' | 'arena' | 'exit';
export const roomViews: { id: RoomView; label: string }[] = [
  { id: 'overview', label: 'Room' },
  { id: 'shelf', label: 'Books' },
  { id: 'arena', label: 'Robots' },
  { id: 'exit', label: 'Door' },
];

export function roomViewPose(view: RoomView, width: number, height: number, bookIndex = 0, focused = false) {
  const compact = width < 650;
  const fit = (span: number, vertical: number) => Math.max(18, Math.min(width / span, height / vertical));
  if (view === 'shelf') {
    const z = compact || focused ? 0.1 - (bookIndex - 1.5) * 1.85 * 0.35 : 0.1;
    const shiftX = focused && !compact ? 0.5 : 0;
    const shiftZ = focused && !compact ? -1 : 0;
    const shiftY = focused && compact ? -Math.min(2.5, 0.75 + height / 440) : 0;
    return { position: [-2.5 + shiftX, 3.2 + shiftY, z + 2.1 + shiftZ], target: [-6.85 + shiftX, 1.55 + shiftY, z + shiftZ], zoom: fit(focused ? 3.7 : 4.8, compact && focused ? 7 : 4.8) };
  }
  if (view === 'arena') return { position: [5.9, 4.5, 0.1], target: [2.4, 1.8, -4.65], zoom: fit(4.4, 4.6) };
  if (view === 'exit') return { position: [-2.2, 3.8, 4.6], target: [-7.5, 1.2, 2.15], zoom: fit(5, 5.5) };
  return { position: [13, 12, 16], target: [0, 0.8, 0], zoom: Math.min(64, fit(22 / 0.9, 14 / 0.9)) };
}
