import { test, expect } from 'bun:test';
import {
  createAgent,
  runAgent,
  advanceAgent,
  toggleWall,
  findPath,
  key,
  same,
  targetOf,
  destinations,
  PARCEL,
} from './agent';
test('every destination can be reached after collecting the parcel without entering crates', () => {
  for (const mission of destinations) {
    let state = runAgent(createAgent(mission.id));
    for (let i = 0; i < 150 && state.status !== 'done'; i++) {
      const previous = state;
      state = advanceAgent(state);
      expect(state.walls.includes(key(state.position))).toBe(false);
      expect(
        Math.abs(state.position.x - previous.position.x) +
          Math.abs(state.position.z - previous.position.z),
      ).toBeLessThanOrEqual(1);
      if (!previous.carrying && state.carrying)
        expect(same(state.position, PARCEL)).toBe(true);
    }
    expect(state.status).toBe('done');
    expect(state.carrying).toBe(true);
    expect(same(state.position, mission.cell)).toBe(true);
    expect(advanceAgent(state)).toBe(state);
  }
});
test('a crate placed on a live route causes a safe detour', () => {
  let state = advanceAgent(runAgent(createAgent()));
  const blocked = state.path[1];
  state = toggleWall(state, blocked);
  expect(state.replans).toBe(1);
  expect(state.status).toBe('running');
  expect(state.path.some((p) => same(p, blocked))).toBe(false);
  for (let i = 0; i < 100 && state.status !== 'done'; i++) {
    state = advanceAgent(state);
    expect(same(state.position, blocked)).toBe(false);
  }
  expect(state.status).toBe('done');
});
test('a trapped agent stops, then can resume after a route is opened', () => {
  let state = runAgent(createAgent());
  state = toggleWall(state, { x: 1, z: 6 });
  state = toggleWall(state, { x: 0, z: 5 });
  expect(state.status).toBe('blocked');
  expect(advanceAgent(state)).toBe(state);
  state = toggleWall(state, { x: 0, z: 5 });
  expect(state.status).toBe('paused');
  state = runAgent(state);
  expect(state.status).toBe('running');
  expect(state.path.length).toBeGreaterThan(0);
});
test('protected tiles and invalid coordinates cannot be covered by obstacles', () => {
  const state = createAgent();
  for (const cell of [
    state.position,
    PARCEL,
    ...destinations.map((d) => d.cell),
    { x: -1, z: 0 },
    { x: 1.5, z: 2 },
  ])
    expect(toggleWall(state, cell)).toBe(state);
});
test('one-step control stays paused and paths end at the current subgoal', () => {
  const state = advanceAgent(createAgent());
  expect(state.status).toBe('paused');
  expect(state.steps).toBe(1);
  expect(state.path.at(-1)).toEqual(targetOf(state));
  expect(findPath({ x: 0, z: 0 }, { x: 2, z: 0 }, [])).toHaveLength(2);
  expect(findPath({ x: 0, z: 0 }, { x: 2, z: 0 }, ['1,0', '0,1'])).toBeNull();
});

test('a full shift delivers every parcel exactly once without teleporting or crossing crates', async () => {
  const { createShift, pickupOf } = await import('./agent');
  let state = runAgent(createShift());
  for (let i = 0; i < 600 && state.status !== 'done'; i++) {
    const previous = state;
    state = advanceAgent(state);
    expect(state.walls.includes(key(state.position))).toBe(false);
    expect(
      Math.abs(state.position.x - previous.position.x) +
        Math.abs(state.position.z - previous.position.z),
    ).toBeLessThanOrEqual(1);
    if (!previous.carrying && state.carrying)
      expect(state.position).toEqual(pickupOf(previous));
    if (state.delivered.length > previous.delivered.length)
      expect(state.position).toEqual(
        destinations.find((d) => d.id === previous.destination).cell,
      );
  }
  expect(state.status).toBe('done');
  expect(new Set(state.delivered.map((job) => job.id)).size).toBe(6);
  expect(state.delivered.map((job) => job.id)).toEqual(
    state.jobs.map((job) => job.id),
  );
});
test('priority changes preserve the parcel already in transit and all completed results', async () => {
  const { createShift, prioritizeCargo } = await import('./agent');
  let state = runAgent(createShift());
  while (!state.carrying) state = advanceAgent(state);
  const current = state.jobs[state.jobIndex];
  state = prioritizeCargo(state, '06');
  expect(state.jobs[state.jobIndex]).toEqual(current);
  expect(state.jobs[state.jobIndex + 1].id).toBe('06');
  while (state.delivered.length < 1) state = advanceAgent(state);
  expect(state.jobs[state.jobIndex].id).toBe('06');
  expect(state.delivered[0]).toEqual(current);
  expect(state.carrying).toBe(false);
});
test('new cargo after completion preserves position, obstacles and history', async () => {
  const { enqueueCargo } = await import('./agent');
  let state = runAgent(createAgent());
  while (state.status !== 'done') state = advanceAgent(state);
  const completed = state;
  state = enqueueCargo(state, 'desk');
  expect(state.status).toBe('paused');
  expect(state.position).toEqual(completed.position);
  expect(state.walls).toEqual(completed.walls);
  expect(state.delivered).toEqual(completed.delivered);
  expect(state.carrying).toBe(false);
  state = runAgent(state);
  while (state.status !== 'done') state = advanceAgent(state);
  expect(state.delivered).toHaveLength(2);
});
test('queued pickup cells are protected and an intake cannot be double booked', async () => {
  const { createShift, enqueueCargo } = await import('./agent');
  let state = createShift();
  for (let i = 0; i < 10; i++) state = enqueueCargo(state, 'desk');
  expect(new Set(state.jobs.map((job) => key(job.pickup))).size).toBe(
    state.jobs.length,
  );
  for (const job of state.jobs)
    expect(toggleWall(state, job.pickup)).toBe(state);
});
