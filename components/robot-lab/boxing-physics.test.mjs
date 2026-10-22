import { beforeAll, test, expect } from 'bun:test';
import { Quaternion, Vector3 } from 'three';
import { initBoxing, BoxingWorld } from './boxing-physics';
beforeAll(async () => {
  await initBoxing();
});
test('motor-driven dynamic robots produce real opponent contacts and stay finite', () => {
  const sim = new BoxingWorld();
  try {
    expect(sim.parts.every((p) => p.body.isDynamic())).toBe(true);
    for (let i = 0; i < 1800; i++) sim.tick();
    expect(sim.contacts).toBeGreaterThan(0);
    expect(sim.lastImpulse).toBeGreaterThan(0);
    for (const p of sim.parts) {
      const pos = p.body.translation();
      expect([pos.x, pos.y, pos.z].every(Number.isFinite)).toBe(true);
      expect(pos.y).toBeGreaterThan(-0.2);
      expect(Math.abs(pos.x)).toBeLessThan(3.4);
    }
  } finally {
    sim.dispose();
  }
});
test('a strong angular impulse causes a persistent knockdown, not a pose reset', () => {
  const sim = new BoxingWorld();
  try {
    for (let i = 0; i < 120; i++) sim.tick();
    sim.torsos[0].applyTorqueImpulse({ x: 0, y: 0, z: 150 }, true);
    for (let i = 0; i < 360; i++) sim.tick();
    expect(sim.fallen[0]).toBe(true);
    // Well below its 1.3 m standing height, and still down: no snap back to the pose.
    expect(sim.torsos[0].translation().y).toBeLessThan(1);
  } finally {
    sim.dispose();
  }
});
test('fixed physics steps are independent of render rate and zero delta freezes bodies', () => {
  const a = new BoxingWorld(),
    b = new BoxingWorld();
  try {
    for (let i = 0; i < 180; i++) a.step(1 / 60);
    for (let i = 0; i < 90; i++) b.step(1 / 30);
    expect(a.elapsed).toBeCloseTo(b.elapsed, 8);
    expect(a.torsos[0].translation().x).toBeCloseTo(
      b.torsos[0].translation().x,
      5,
    );
    const before = { ...a.torsos[0].translation() };
    a.step(0);
    expect({ ...a.torsos[0].translation() }).toEqual(before);
  } finally {
    a.dispose();
    b.dispose();
  }
});

test('operator command stream follows physics time, freezes and resets with the ring', () => {
  const commands = { frames: [] };
  const sim = new BoxingWorld(commands);
  try {
    expect(commands.frames).toHaveLength(2);
    const initial = commands.frames;
    sim.step(0);
    expect(commands.frames).toBe(initial);
    sim.step(1 / 30);
    expect(commands.frames).not.toBe(initial);
    const expected = new BoxingWorld();
    try {
      expected.step(1 / 30);
      expect(commands.frames).toEqual(expected.commands.frames);
    } finally {
      expected.dispose();
    }
    const paused = commands.frames;
    sim.step(0);
    expect(commands.frames).toBe(paused);
  } finally {
    sim.dispose();
  }
  const restarted = new BoxingWorld(commands);
  try {
    expect(commands.frames).toEqual(restarted.commands.frames);
    expect(commands.frames[0].weight).toBe(0);
  } finally {
    restarted.dispose();
  }
});

test('the robots follow the operators: every joint tracks the shared command closely', () => {
  const sim = new BoxingWorld();
  try {
    let worst = 0, sum = 0, n = 0;
    for (let i = 0; i < 120 * 8; i++) {
      sim.tick();
      if (i < 120 || i % 12 || sim.fallen.some(Boolean)) continue;
      for (const joint of sim.jointAngles()) {
        const error = Math.abs(joint.actual - joint.target);
        worst = Math.max(worst, error); sum += error; n++;
      }
    }
    expect(sum / n).toBeLessThan(0.12);
    expect(worst).toBeLessThan(0.8);
  } finally {
    sim.dispose();
  }
});
test('strikes really land: clean hits on the body, not only glove on glove', () => {
  const sim = new BoxingWorld();
  try {
    for (let i = 0; i < 120 * 30; i++) sim.tick();
    expect(sim.hits).toBeGreaterThanOrEqual(4);
    expect(sim.lastHit?.position.every(Number.isFinite)).toBe(true);
  } finally {
    sim.dispose();
  }
});
test('no invisible hand: a robot tipped well past upright is left to fall', () => {
  const sim = new BoxingWorld();
  try {
    for (let i = 0; i < 120; i++) sim.tick();
    // Tip the torso to about 50° and let go.
    const r = sim.torsos[0].rotation();
    const tipped = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.87).multiply(new Quaternion(r.x, r.y, r.z, r.w));
    sim.torsos[0].setRotation(tipped, true);
    for (let i = 0; i < 240; i++) sim.tick();
    expect(sim.fallen[0]).toBe(true);
  } finally {
    sim.dispose();
  }
});
test('no robot is held up at a steep lean: past 30° it recovers or falls within half a second', () => {
  const sim = new BoxingWorld();
  try {
    const streak = [0, 0];
    let longest = 0;
    for (let i = 0; i < 120 * 60 && !sim.fallen.some(Boolean); i++) {
      sim.tick();
      sim.torsos.forEach((body, side) => {
        const r = body.rotation();
        const up = new Vector3(0, 1, 0).applyQuaternion(new Quaternion(r.x, r.y, r.z, r.w));
        streak[side] = !sim.fallen[side] && up.y < Math.cos((30 * Math.PI) / 180) ? streak[side] + 1 / 120 : 0;
        longest = Math.max(longest, streak[side]);
      });
    }
    expect(longest).toBeLessThan(0.5);
    // A knockdown only follows a heavy hit (every sixth clean one).
    if (sim.fallen.some(Boolean)) expect(sim.hits).toBeGreaterThanOrEqual(6);
  } finally {
    sim.dispose();
  }
});
