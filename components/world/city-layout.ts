import { districts } from './districts';
/** Shared circular city plan: meshes, collision, routes and elevations use this. */
export const CITY_CENTER = { x: 0, z: -18 };
export const CITY_TERRACES = [
  { id: 'harbor', inner: 16, outer: 27, y: 0 },
  { id: 'workshops', inner: 9, outer: 14, y: 3.5 },
  { id: 'summit', inner: 0, outer: 7, y: 7 },
] as const;
export function cityPoint(radius: number, angle: number) {
  return { x: Math.sin(angle) * radius, z: CITY_CENTER.z + Math.cos(angle) * radius };
}
export const CITY_STAIRS = [
  ...[-1, 1].map(side => ({ angle: side * Math.PI * 0.31, outer: 16, inner: 14, yStart: 0, yEnd: 3.5, width: 3 })),
  ...[-1, 1].map(side => ({ angle: side * Math.PI * 0.43, outer: 9, inner: 7, yStart: 3.5, yEnd: 7, width: 2.6 })),
];
export const CITY_FOUNTAIN = { x: 0, z: -18, y: 7, radius: 2.2 };
export const CITY_HOMES = [
  ...Array.from({ length: 16 }, (_, i) => {
    const angle = 1.45 + i * (Math.PI * 2 - 2.9) / 15;
    return { ...cityPoint(23.5 + (i % 3) * 0.65, angle), y: 0, variant: i, angle: angle + Math.PI };
  }),
  ...Array.from({ length: 9 }, (_, i) => {
    const angle = 1.6 + i * (Math.PI * 2 - 3.2) / 8;
    return { ...cityPoint(12, angle), y: 3.5, variant: i + 2, angle: angle + Math.PI };
  }),
];
export const CITY_TREES = [
  ...[-1, 1].flatMap(side => [0.22, 0.7, 1.23].map(a => ({ ...cityPoint(25.5, side * a), y: 0 }))),
];
export const CITY_CANALS = [
  { inner: 14, outer: 16, y: -0.15 },
  { inner: 7, outer: 9, y: 3.35 },
] as const;

/** Top-rail projection includes its overhang on the sloping flight. */
export const CITY_RAILS = CITY_STAIRS.flatMap(s => [-1, 1].map(side => {
  const center = cityPoint((s.inner + s.outer) / 2 + .25, s.angle);
  return {
    x: center.x + side * (s.width / 2 + .12) * Math.cos(s.angle),
    z: center.z - side * (s.width / 2 + .12) * Math.sin(s.angle),
    angle: s.angle, halfWidth: .16, halfDepth: (s.outer - s.inner) / 2 + .55,
  };
}));

// Each destination is marked on its own plinth. Position and interaction
// metadata come from the exhibit, with no detached gates or gate colliders.
export const CITY_PORTS = districts.map(district => ({
  district,
  id: district.id,
  number: district.number,
  x: district.position[0],
  y: district.position[1],
  z: district.position[2],
  approach: { x: district.position[0], z: district.position[2] + (district.id === 'robotics' ? 2.7 : 2.2) },
}));
