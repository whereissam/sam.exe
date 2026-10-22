import { radius } from './railway';
export function platformEdge(x: number, count: number) {
  const r = radius(count);
  return r + 2.8 - Math.sqrt((r + 1.05) ** 2 - x * x);
}
