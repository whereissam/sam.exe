import { test, expect } from 'bun:test';
import { ROBOTS, ROBOT_IDS } from './urdf-robots';

const parse = urdf => ({
  links: new Set([...urdf.matchAll(/<link name="([^"]+)"/g)].map(m => m[1])),
  joints: Object.fromEntries([...urdf.matchAll(/<joint name="([^"]+)" type="(revolute|prismatic)">[\s\S]*?<limit lower="([^"]+)" upper="([^"]+)"/g)].map(m => [m[1], [+m[3], +m[4]]])),
  pairs: [...urdf.matchAll(/<parent link="([^"]+)"\/>\n\s*<child link="([^"]+)"\/>/g)].map(m => [m[1], m[2]]),
});

test('each robot file is a connected tree of real links', () => {
  for (const id of ROBOT_IDS) {
    const { links, pairs } = parse(ROBOTS[id].urdf);
    expect(pairs.length).toBe(links.size - 1);
    const children = new Set(pairs.map(([, child]) => child));
    expect(children.size).toBe(pairs.length);
    for (const [parent, child] of pairs) { expect(links.has(parent)).toBe(true); expect(links.has(child)).toBe(true); }
  }
});
test('the three robots are genuinely different machines', () => {
  const counts = ROBOT_IDS.map(id => Object.keys(parse(ROBOTS[id].urdf).joints).length);
  expect(counts).toEqual([23, 7, 12]);
  expect(ROBOTS.arm.urdf).toContain('type="prismatic"');
  expect(ROBOTS.arm.urdf).toContain('<mimic joint="left_finger_joint"');
  expect(ROBOTS.quadruped.urdf).toContain('FL_calf_joint');
});
test('rest poses only use movable joints, within their limits', () => {
  for (const id of ROBOT_IDS) {
    const { joints } = parse(ROBOTS[id].urdf);
    for (const [name, value] of Object.entries(ROBOTS[id].rest)) {
      expect(joints[name]).toBeDefined();
      expect(value).toBeGreaterThanOrEqual(joints[name][0]);
      expect(value).toBeLessThanOrEqual(joints[name][1]);
    }
  }
});
test('each movable joint maps to the lines of its own block in the file', () => {
  for (const id of ROBOT_IDS) {
    const lines = ROBOTS[id].urdf.split('\n');
    const { joints } = parse(ROBOTS[id].urdf);
    expect(Object.keys(ROBOTS[id].blocks).sort()).toEqual(Object.keys(joints).sort());
    for (const [name, [start, end]] of Object.entries(ROBOTS[id].blocks)) {
      expect(lines[start]).toContain(`<joint name="${name}"`);
      expect(lines[end]).toBe('  </link>');
    }
  }
});
test('every reward show drives real joints and stays inside their limits', async () => {
  const { MISSIONS, showPose, SHOW_SECONDS } = await import('./missions');
  for (const id of ROBOT_IDS) {
    expect(MISSIONS[id].task.length).toBeGreaterThan(0);
    const { joints } = parse(ROBOTS[id].urdf);
    for (let t = 0; t <= SHOW_SECONDS; t += 0.05) {
      for (const [name, value] of Object.entries(showPose(id, t, ROBOTS[id].rest))) {
        expect(joints[name]).toBeDefined();
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(joints[name][0]);
        expect(value).toBeLessThanOrEqual(joints[name][1]);
      }
    }
  }
});
