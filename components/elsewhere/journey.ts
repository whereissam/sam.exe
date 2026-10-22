export type Point = { x: number; z: number };
export type Area = 'station' | 'city';
export type Action =
  | `ride:${number}`
  | 'bag'
  | 'ticket'
  | 'board'
  | 'alight'
  | 'stamp'
  | 'postcard'
  | `city:${number}`;
export type Trip = {
  area: Area;
  phase: 'walking' | 'riding' | 'onboard';
  city: number;
  destination: number | null;
  bag: boolean;
  ticket: number | null;
  stamps: number[];
  message: string;
  postcard: boolean;
};
export const initialTrip = (): Trip => ({
  area: 'station',
  phase: 'walking',
  city: 0,
  destination: null,
  bag: false,
  ticket: null,
  stamps: [],
  message: '選擇一座城市，和旅伴一起出發；也可以點地面自由走動。',
  postcard: false,
});
export const origin = (area: Area) => (area === 'station' ? 0 : 24);
export const spots = {
  bag: { x: -4.65, z: -1 },
  ticket: { x: 1, z: -1 },
  board: { x: 0, z: 1.3 },
  alight: { x: 0, z: 2.8 },
  stamp: { x: 26, z: -1.5 },
  postcard: { x: 21, z: -1.5 },
};
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.z - b.z);
export function actionPoint(trip: Trip, action: Action): Point {
  if (action.startsWith('city:')) return { x: -1.5, z: -1.5 };
  if (action.startsWith('ride:'))
    return { ...spots.board, x: origin(trip.area) };
  if (action === 'board' || action === 'alight')
    return { ...spots[action], x: origin(trip.area) };
  return spots[action as keyof typeof spots];
}
export function prerequisite(trip: Trip, action: Action): string | null {
  if (action.startsWith('ride:'))
    return !trip.bag
      ? '先拿好旅行箱。'
      : trip.ticket === null
        ? '先領取車票。'
        : null;
  if (action !== 'board') return null;
  if (!trip.bag) return '旅行箱還在行李架，先把它拿上。';
  if (trip.ticket !== trip.city)
    return '還沒有這個目的地的車票，先到售票機領票。';
  return null;
}
export function interact(
  trip: Trip,
  action: Action,
  at: Point,
  cityCount: number,
): Trip {
  if (trip.phase === 'riding') return trip;
  if (trip.phase === 'onboard' && action !== 'alight') return trip;
  if (action === 'alight')
    return trip.phase === 'onboard'
      ? {
          ...trip,
          phase: 'walking',
          message:
            trip.area === 'city'
              ? '已抵達。下車後走到郵局蓋章，也可以到攝影攤看明信片。'
              : '回到車站了，可以選下一個城市。',
        }
      : trip;
  if (distance(at, actionPoint(trip, action)) > 1)
    return { ...trip, message: '走近這個物件，才能操作。' };
  if (action.startsWith('ride:')) {
    const city = Number(action.slice(5));
    if (
      !Number.isInteger(city) ||
      city < 0 ||
      city >= cityCount ||
      trip.area !== 'city'
    )
      return trip;
    const missing = prerequisite(trip, action);
    if (missing) return { ...trip, message: missing };
    return {
      ...trip,
      phase: 'riding',
      destination: city,
      ticket: city,
      postcard: false,
      message: '已上車，沿環線前往下一座城市。',
    };
  }
  if (action.startsWith('city:')) {
    const city = Number(action.slice(5));
    if (
      trip.area !== 'station' ||
      !Number.isInteger(city) ||
      city < 0 ||
      city >= cityCount
    )
      return trip;
    return {
      ...trip,
      city,
      ticket: trip.city === city ? trip.ticket : null,
      message:
        trip.city === city
          ? '目的地已選好。前往售票機領票。'
          : '目的地已更換，請到售票機重新領票。',
    };
  }
  if (action === 'bag')
    return trip.area === 'station'
      ? {
          ...trip,
          bag: true,
          message: '行李拿好了。點班次牌選城市，再去售票機領票。',
        }
      : trip;
  if (action === 'ticket')
    return trip.area === 'station'
      ? {
          ...trip,
          ticket: trip.city,
          message: '車票印好了。帶著行李，走到列車門口上車。',
        }
      : trip;
  if (action === 'board') {
    const missing = prerequisite(trip, action);
    if (missing) return { ...trip, message: missing };
    return {
      ...trip,
      phase: 'riding',
      destination: trip.area === 'station' ? trip.city : null,
      postcard: false,
      message:
        trip.area === 'station'
          ? '已上車，正前往目的地。'
          : '已上車，正在返回 Elsewhere Station。',
    };
  }
  if (action === 'stamp')
    return trip.area === 'city'
      ? {
          ...trip,
          stamps: trip.stamps.includes(trip.city)
            ? trip.stamps
            : [...trip.stamps, trip.city],
          message: '旅程印章已蓋好！可以繼續逛，或走回列車返站。',
        }
      : trip;
  if (action === 'postcard')
    return trip.area === 'city'
      ? {
          ...trip,
          postcard: true,
          message: '在攝影攤翻閱這個城市的照片與日誌。',
        }
      : trip;
  return trip;
}
export function arrive(trip: Trip): Trip {
  return trip.phase === 'riding'
    ? {
        ...trip,
        area: trip.destination === null ? 'station' : 'city',
        city: trip.destination ?? trip.city,
        phase: 'onboard',
        message: '列車已停靠。按住 Space 或「下車」走上月台。',
      }
    : trip;
}
// Navigation is a half-metre grid, inflated around furniture for the traveller.
const solids = {
  station: [
    [-4.65, -2.4, 1.8, 1],
    [-1.5, -2.8, 3.5, 0.5],
    [1, -2, 0.9, 0.8],
    [4, -1.4, 1.8, 0.65],
  ],
  city: [
    [-3, -2.8, 2.6, 1],
    [2, -2.8, 2.4, 1],
    [-3.7, 0.2, 1.8, 0.6],
    [4.6, -0.4, 1, 0.55],
    [-5.45, -3.5, 0.3, 0.3],
    [5.45, -3.5, 0.3, 0.3],
  ],
};
export function walkable(area: Area, p: Point) {
  const x = p.x - origin(area),
    z = p.z;
  if (x < -5.5 || x > 5.5 || z < -3.8 || z > 1.5) return false;
  return !solids[area].some(
    ([cx, cz, w, d]) =>
      Math.abs(x - cx) < w / 2 + 0.25 && Math.abs(z - cz) < d / 2 + 0.25,
  );
}
export function route(area: Area, start: Point, end: Point): Point[] {
  const snap = (p: Point) => ({
    x: Math.round(p.x * 2) / 2,
    z: Math.round(p.z * 2) / 2,
  });
  const a = snap(start),
    b = snap(end);
  if (!walkable(area, a) || !walkable(area, b)) return [];
  const key = (p: Point) => `${p.x}:${p.z}`;
  const queue = [a],
    parents = new Map<string, Point | null>([[key(a), null]]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (key(p) === key(b)) {
      const result: Point[] = [];
      let cursor = p;
      while (key(cursor) !== key(a)) {
        result.unshift(cursor);
        cursor = parents.get(key(cursor))!;
      }
      return result;
    }
    for (const [dx, dz] of [
      [0.5, 0],
      [-0.5, 0],
      [0, 0.5],
      [0, -0.5],
    ]) {
      const q = { x: p.x + dx, z: p.z + dz };
      if (walkable(area, q) && !parents.has(key(q))) {
        parents.set(key(q), p);
        queue.push(q);
      }
    }
  }
  return [];
}
