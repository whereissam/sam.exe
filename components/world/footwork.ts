export type FootPoint = { x: number; y: number; z: number };
export type FootPose = { left: FootPoint; right: FootPoint };
type Root = { x: number; z: number; heading: number };
const STEP_SECONDS = 0.26;
const smooth = (t: number) => t * t * (3 - 2 * t);

/** World-space stance anchors: only the swing foot moves during a step. */
export class Footwork {
  feet: [FootPoint, FootPoint] | null = null;
  swing: { foot: 0 | 1; from: FootPoint; to: FootPoint; time: number } | null = null;
  next: 0 | 1 = 0;
  previous: Root | null = null;
  step(dt: number, root: Root): FootPose {
    const c = Math.cos(root.heading), s = Math.sin(root.heading);
    const home = (i: number): FootPoint => {
      const x = i === 0 ? -0.19 : 0.19, z = i === 0 ? 0.09 : -0.09;
      return { x: root.x + c * x + s * z, y: 0.05, z: root.z - s * x + c * z };
    };
    if (!this.feet) this.feet = [home(0), home(1)];
    const safeDt = Math.max(0, Math.min(dt, 0.05));
    if (!this.swing && safeDt > 0) {
      const errors = this.feet.map((foot, i) => Math.hypot(foot.x - home(i).x, foot.z - home(i).z));
      const foot = errors[this.next] > 0.1 ? this.next : errors[1 - this.next] > 0.18 ? (1 - this.next) as 0 | 1 : null;
      if (foot !== null) {
        const to = home(foot);
        if (this.previous) {
          to.x += Math.max(-0.15, Math.min(0.15, (root.x - this.previous.x) / safeDt * 0.13));
          to.z += Math.max(-0.15, Math.min(0.15, (root.z - this.previous.z) / safeDt * 0.13));
        }
        this.swing = { foot, from: { ...this.feet[foot] }, to, time: 0 };
      }
    }
    if (this.swing) {
      const step = this.swing;
      step.time = Math.min(STEP_SECONDS, step.time + safeDt);
      const phase = step.time / STEP_SECONDS, blend = smooth(phase);
      this.feet[step.foot] = { x: step.from.x + (step.to.x - step.from.x) * blend, y: 0.05 + Math.sin(phase * Math.PI) * 0.15, z: step.from.z + (step.to.z - step.from.z) * blend };
      if (phase === 1) { this.feet[step.foot] = { ...step.to }; this.next = (1 - step.foot) as 0 | 1; this.swing = null; }
    }
    this.previous = { ...root };
    const local = (p: FootPoint): FootPoint => ({ x: c * (p.x - root.x) - s * (p.z - root.z), y: p.y, z: s * (p.x - root.x) + c * (p.z - root.z) });
    return { left: local(this.feet[0]), right: local(this.feet[1]) };
  }
}
