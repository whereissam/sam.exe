export const GRID_SIZE = 7;
export type Cell = { x: number; z: number };
export const START: Cell = { x: 0, z: 6 };
export const PARCEL: Cell = { x: 1, z: 1 };
export const destinations = [
  {
    id: 'garden',
    name: 'Greenhouse',
    cell: { x: 6, z: 0 },
    description: 'Bring the seed parcel to the greenhouse.',
  },
  {
    id: 'desk',
    name: 'Research desk',
    cell: { x: 6, z: 4 },
    description: 'Bring the sample parcel to the research desk.',
  },
  {
    id: 'dock',
    name: 'Supply dock',
    cell: { x: 3, z: 6 },
    description: 'Return the parcel to the supply dock.',
  },
] as const;
export type Destination = (typeof destinations)[number]['id'];
export const key = (cell: Cell) => `${cell.x},${cell.z}`;
export const same = (a: Cell, b: Cell) => key(a) === key(b);
export const inside = (cell: Cell) =>
  Number.isInteger(cell.x) &&
  Number.isInteger(cell.z) &&
  cell.x >= 0 &&
  cell.x < GRID_SIZE &&
  cell.z >= 0 &&
  cell.z < GRID_SIZE;
export function findPath(
  start: Cell,
  goal: Cell,
  walls: string[],
): Cell[] | null {
  if (
    !inside(start) ||
    !inside(goal) ||
    walls.includes(key(start)) ||
    walls.includes(key(goal))
  )
    return null;
  const queue = [start];
  const visited = new Map<string, Cell | null>([[key(start), null]]);
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (same(current, goal)) {
      const path: Cell[] = [];
      let cursor = current;
      while (!same(cursor, start)) {
        path.unshift(cursor);
        cursor = visited.get(key(cursor))!;
      }
      return path;
    }
    for (const [dx, dz] of [
      [1, 0],
      [0, -1],
      [-1, 0],
      [0, 1],
    ]) {
      const next = { x: current.x + dx, z: current.z + dz };
      if (!inside(next) || visited.has(key(next)) || walls.includes(key(next)))
        continue;
      visited.set(key(next), current);
      queue.push(next);
    }
  }
  return null;
}
export type Cargo = {
  id: string;
  destination: Destination;
  pickup: Cell;
  label: string;
};
export const cargoNames: Record<Destination, string> = {
  garden: 'Seed capsule',
  desk: 'Mineral sample',
  dock: 'Spare parts',
};
export const cargoColors: Record<Destination, string> = {
  garden: '#87a58a',
  desk: '#a59aba',
  dock: '#cfac79',
};
export type AgentState = {
  jobs: Cargo[];
  jobIndex: number;
  delivered: Cargo[];
  serial: number;
  destination: Destination;
  position: Cell;
  carrying: boolean;
  walls: string[];
  path: Cell[];
  status: 'ready' | 'running' | 'paused' | 'blocked' | 'done';
  steps: number;
  replans: number;
  journal: string[];
};
export const targetOf = (state: AgentState) =>
  state.carrying
    ? destinations.find((d) => d.id === state.destination)!.cell
    : pickupOf(state);
function note(state: AgentState, message: string): AgentState {
  return { ...state, journal: [message, ...state.journal].slice(0, 5) };
}
export const pickupOf = (state: AgentState) =>
  state.jobs[state.jobIndex]?.pickup ?? PARCEL;
export function createAgent(destination: Destination = 'garden'): AgentState {
  const walls = ['2,2', '2,3', '2,4', '4,1', '4,2', '4,3'];
  return {
    jobs: [
      {
        id: '01',
        destination,
        pickup: { ...PARCEL },
        label: cargoNames[destination],
      },
    ],
    jobIndex: 0,
    delivered: [],
    serial: 1,
    destination,
    position: { ...START },
    carrying: false,
    walls,
    path: findPath(START, PARCEL, walls)!,
    status: 'ready',
    steps: 0,
    replans: 0,
    journal: ['Task received. First, collect the parcel on the amber tile.'],
  };
}
export function runAgent(state: AgentState): AgentState {
  if (state.status === 'done') return state;
  const path = findPath(state.position, targetOf(state), state.walls);
  if (!path)
    return note(
      { ...state, path: [], status: 'blocked' },
      'No safe route. Remove an obstacle to open a path.',
    );
  return note(
    { ...state, path, status: 'running' },
    `Route ready: ${path.length} steps to ${state.carrying ? 'the destination' : 'the parcel'}.`,
  );
}
export function advanceAgent(state: AgentState): AgentState {
  if (state.status === 'done' || state.status === 'blocked') return state;
  const path = findPath(state.position, targetOf(state), state.walls);
  if (!path)
    return note(
      { ...state, path: [], status: 'blocked' },
      'No safe route. I stopped instead of crossing an obstacle.',
    );
  const position = path[0] ?? state.position;
  let next: AgentState = {
    ...state,
    position,
    path: path.slice(1),
    steps: state.steps + Number(!same(position, state.position)),
    status: state.status === 'running' ? 'running' : 'paused',
  };
  if (same(position, targetOf(state))) {
    if (!state.carrying) {
      next = { ...next, carrying: true };
      const delivery = findPath(position, targetOf(next), next.walls);
      return note(
        {
          ...next,
          path: delivery ?? [],
          status: delivery ? next.status : 'blocked',
        },
        delivery
          ? `Parcel collected. New route: ${delivery.length} steps to ${destinations.find((d) => d.id === state.destination)!.name.toLowerCase()}.`
          : 'Parcel collected, but the destination is blocked. Open a route to continue.',
      );
    }
    const cargo = state.jobs[state.jobIndex];
    const delivered = [...state.delivered, cargo];
    const upcoming = state.jobs[state.jobIndex + 1];
    if (upcoming) {
      const route = findPath(position, upcoming.pickup, state.walls);
      return note(
        {
          ...next,
          delivered,
          carrying: false,
          jobIndex: state.jobIndex + 1,
          destination: upcoming.destination,
          path: route ?? [],
          status: route ? next.status : 'blocked',
        },
        `#${cargo.id} delivered. Next: #${upcoming.id} ${upcoming.label.toLowerCase()}.${route ? '' : ' Pickup blocked; clear a route.'}`,
      );
    }
    return note(
      { ...next, delivered, status: 'done', path: [] },
      `Shift complete. ${delivered.length} parcels delivered. Add more cargo to keep working.`,
    );
  }
  return next;
}
export function canPlaceWall(state: AgentState, cell: Cell) {
  return (
    inside(cell) &&
    !same(cell, state.position) &&
    !state.jobs.slice(state.jobIndex).some((job) => same(cell, job.pickup)) &&
    !destinations.some((d) => same(d.cell, cell))
  );
}
export function toggleWall(state: AgentState, cell: Cell): AgentState {
  if (!canPlaceWall(state, cell)) return state;
  const id = key(cell),
    removed = state.walls.includes(id);
  const walls = removed
    ? state.walls.filter((w) => w !== id)
    : [...state.walls, id];
  if (state.status === 'done')
    return note(
      { ...state, walls },
      'Layout updated. Add more cargo to try this route.',
    );
  const path = findPath(state.position, targetOf(state), walls);
  const changed = JSON.stringify(path) !== JSON.stringify(state.path);
  return note(
    {
      ...state,
      walls,
      path: path ?? [],
      replans: state.replans + Number(changed),
      status: path
        ? state.status === 'blocked'
          ? 'paused'
          : state.status
        : 'blocked',
    },
    !path
      ? 'Route blocked. Waiting for a clear path.'
      : changed
        ? `Room changed. Replanned a safe route with ${path.length} steps remaining.`
        : 'Room changed. The current route is still clear.',
  );
}

const intakeCells: Cell[] = [
  { x: 1, z: 1 },
  { x: 0, z: 2 },
  { x: 1, z: 4 },
  { x: 3, z: 0 },
  { x: 5, z: 5 },
  { x: 0, z: 4 },
  { x: 3, z: 3 },
  { x: 5, z: 2 },
];
export function createShift(): AgentState {
  const state = createAgent();
  const sequence: Destination[] = [
    'garden',
    'desk',
    'dock',
    'desk',
    'garden',
    'dock',
  ];
  return {
    ...state,
    jobs: sequence.map((destination, i) => ({
      id: String(i + 1).padStart(2, '0'),
      destination,
      pickup: { ...intakeCells[i] },
      label: cargoNames[destination],
    })),
    serial: sequence.length,
    journal: [
      'Six parcels checked in. Start the shift, or prioritize a parcel before dispatch.',
    ],
  };
}
export function enqueueCargo(
  state: AgentState,
  destination: Destination,
): AgentState {
  const pending =
    state.status === 'done' ? [] : state.jobs.slice(state.jobIndex);
  const pickup = intakeCells.find(
    (cell) =>
      !state.walls.includes(key(cell)) &&
      !same(cell, state.position) &&
      !pending.some((job) => same(job.pickup, cell)),
  );
  if (!pickup)
    return note(
      state,
      'Intake is full. Deliver a parcel or clear an intake tile first.',
    );
  const job: Cargo = {
    id: String(state.serial + 1).padStart(2, '0'),
    destination,
    pickup: { ...pickup },
    label: cargoNames[destination],
  };
  const next = {
    ...state,
    serial: state.serial + 1,
    jobs: [...state.jobs, job],
  };
  if (state.status === 'done') {
    const path = findPath(state.position, pickup, state.walls);
    return note(
      {
        ...next,
        jobIndex: state.jobs.length,
        carrying: false,
        destination,
        path: path ?? [],
        status: path ? 'paused' : 'blocked',
      },
      `#${job.id} checked in. Resume the shift to collect it.`,
    );
  }
  return note(next, `#${job.id} ${job.label} added to the queue.`);
}
export function prioritizeCargo(state: AgentState, id: string): AgentState {
  const index = state.jobs.findIndex((job) => job.id === id);
  const slot = state.jobIndex + Number(state.carrying);
  if (state.status === 'done' || index <= slot) return state;
  const jobs = [...state.jobs];
  const [job] = jobs.splice(index, 1);
  jobs.splice(slot, 0, job);
  if (state.carrying)
    return note({ ...state, jobs }, `#${id} is next after this delivery.`);
  const path = findPath(state.position, job.pickup, state.walls);
  return note(
    {
      ...state,
      jobs,
      destination: job.destination,
      path: path ?? [],
      replans: state.replans + 1,
      status: path
        ? state.status === 'blocked'
          ? 'paused'
          : state.status
        : 'blocked',
    },
    `Prioritized #${id}. ${path ? 'Pickup route updated.' : 'Clear a route to its pickup.'}`,
  );
}
