import { districts } from './districts';
import {
  clearSegment,
  walkable,
  INSTALLATION_RADIUS,
  type Point,
} from './movement';

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
type Edge = { to: number; distance: number };
let graph: { points: Point[]; edges: Edge[][] } | undefined;
function islandGraph() {
  if (graph) return graph;
  // A circumscribed polygon leaves clearance even along adjacent straight edges.
  const points = districts
    .flatMap((d) =>
      Array.from({ length: 24 }, (_, i) => {
        const angle = (i * Math.PI * 2) / 24,
          radius = INSTALLATION_RADIUS + 0.055;
        return {
          x: d.position[0] + Math.cos(angle) * radius,
          z: d.position[2] + Math.sin(angle) * radius,
        };
      }),
    )
    .filter(walkable);
  const edges: Edge[][] = points.map(() => []);
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++) {
      if (!clearSegment(points[i], points[j])) continue;
      const cost = distance(points[i], points[j]);
      edges[i].push({ to: j, distance: cost });
      edges[j].push({ to: i, distance: cost });
    }
  graph = { points, edges };
  return graph;
}

/** Waypoints exclude the start and include the exact destination. Null means invalid/unreachable. */
export function planRoute(start: Point, goal: Point): Point[] | null {
  if (!walkable(start) || !walkable(goal)) return null;
  if (distance(start, goal) < 1e-7) return [];
  if (clearSegment(start, goal)) return [{ ...goal }];
  const { points: fixed, edges: fixedEdges } = islandGraph();
  const points = [...fixed, start, goal],
    origin = fixed.length,
    end = origin + 1;
  const edges = fixedEdges.map((row) => row.slice());
  edges.push([], []);
  for (const endpoint of [origin, end])
    for (let i = 0; i < fixed.length; i++) {
      if (!clearSegment(points[endpoint], points[i])) continue;
      const cost = distance(points[endpoint], points[i]);
      edges[endpoint].push({ to: i, distance: cost });
      edges[i].push({ to: endpoint, distance: cost });
    }
  const cost = points.map(() => Infinity),
    previous = points.map(() => -1),
    visited = new Set<number>();
  cost[origin] = 0;
  while (visited.size < points.length) {
    let current = -1;
    for (let i = 0; i < points.length; i++)
      if (!visited.has(i) && (current < 0 || cost[i] < cost[current]))
        current = i;
    if (current < 0 || !Number.isFinite(cost[current])) return null;
    if (current === end) break;
    visited.add(current);
    for (const edge of edges[current])
      if (cost[current] + edge.distance < cost[edge.to]) {
        cost[edge.to] = cost[current] + edge.distance;
        previous[edge.to] = current;
      }
  }
  const route: Point[] = [];
  for (let cursor = end; cursor !== origin; cursor = previous[cursor]) {
    if (cursor < 0) return null;
    route.unshift({ ...points[cursor] });
  }
  return route;
}

/** Consume a route at a bounded speed, leaving a gap measured along the route. */
export function followRoute(
  position: Point,
  route: Point[],
  budget: number,
  gap = 0,
): Point {
  let remaining = 0,
    previous = position;
  for (const point of route) {
    remaining += distance(previous, point);
    previous = point;
  }
  budget = Math.min(Math.max(0, budget), Math.max(0, remaining - gap));
  let next = { ...position };
  while (route.length && budget > 1e-7) {
    const point = route[0],
      step = distance(next, point);
    if (step <= budget + 1e-7) {
      next = { ...point };
      route.shift();
      budget = Math.max(0, budget - step);
    } else {
      next = {
        x: next.x + ((point.x - next.x) * budget) / step,
        z: next.z + ((point.z - next.z) * budget) / step,
      };
      budget = 0;
    }
  }
  return next;
}
