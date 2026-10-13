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
    // Reading happens over the central rug, away from the shelf and its other covers.
    if (focused) return { position: [0, 6.5, 6.8], target: [0, 1.7, 1.2], zoom: fit(4.25, 4.1) };
    return { position: [-2.5, 3.2, z + 2.1], target: [-6.85, 1.55, z], zoom: fit(4.8, 4.8) };
  }
  if (view === 'arena') return { position: [5.9, 4.5, 0.1], target: [2.4, 1.8, -4.65], zoom: fit(4.4, 4.6) };
  if (view === 'exit') return { position: [-2.2, 3.8, 4.6], target: [-7.5, 1.2, 2.15], zoom: fit(5, 5.5) };
  return { position: [13, 12, 16], target: [0, 0.8, 0], zoom: Math.min(64, fit(22 / 0.9, 14 / 0.9)) };
}
