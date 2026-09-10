import { advance, SPAWN, type Point } from './movement';
import { planRoute, followRoute } from './navigation';

export type Character = 'sam' | 'companion';
type Walker = {
  position: Point;
  heading: number;
  walking: boolean;
  phase: number;
};
const walker = (x: number, z: number): Walker => ({
  position: { x, z },
  heading: 0,
  walking: false,
  phase: 0,
});
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
const FOLLOW_GAP = 0.85;

/** Exploration state is independent of React/render frequency so it can be simulated. */
export class Exploration {
  walkers = {
    sam: walker(SPAWN.x, SPAWN.z),
    companion: walker(SPAWN.x - 0.85, SPAWN.z),
  };
  active: Character = 'sam';
  destination: Point | null = null;
  private route: Point[] = [];
  private following: Point[] = [];
  private followGoal: Point | null = null;
  private replanIn = 0;

  reset(character: Character) {
    this.walkers = {
      sam: walker(SPAWN.x, SPAWN.z),
      companion: walker(SPAWN.x - 0.85, SPAWN.z),
    };
    this.active = character;
    this.cancel();
    this.following = [];
    this.followGoal = null;
    this.replanIn = 0;
  }
  switchTo(character: Character) {
    if (this.active === character) return;
    this.active = character;
    this.cancel();
    this.following = [];
    this.followGoal = null;
    this.replanIn = 0;
  }
  cancel() {
    this.destination = null;
    this.route = [];
  }
  goTo(destination: Point) {
    const route = planRoute(this.walkers[this.active].position, destination);
    this.route = route ?? [];
    this.destination = route?.length ? { ...destination } : null;
    return route !== null;
  }
  step(elapsed: number, direction: Point = { x: 0, z: 0 }) {
    const dt = Math.max(
      0,
      Math.min(Number.isFinite(elapsed) ? elapsed : 0, 0.05),
    );
    if (!dt) return false;
    const leader = this.walkers[this.active],
      follower = this.walkers[this.active === 'sam' ? 'companion' : 'sam'];
    const wasMoving = leader.walking || follower.walking;
    const update = (actor: Walker, next: Point) => {
      const dx = next.x - actor.position.x,
        dz = next.z - actor.position.z;
      actor.walking = Math.hypot(dx, dz) > 1e-7;
      if (actor.walking) {
        const angle = Math.atan2(dx, dz),
          difference = Math.atan2(
            Math.sin(angle - actor.heading),
            Math.cos(angle - actor.heading),
          );
        actor.heading += difference * Math.min(1, dt * 14);
        actor.phase += dt;
      }
      actor.position = next;
    };
    const magnitude = Math.hypot(direction.x, direction.z);
    if (Number.isFinite(magnitude) && magnitude > 0) {
      this.cancel();
      update(
        leader,
        advance(leader.position, {
          x: (direction.x / magnitude) * dt * 2.4,
          z: (direction.z / magnitude) * dt * 2.4,
        }),
      );
    } else {
      update(leader, followRoute(leader.position, this.route, dt * 2.4));
      if (!this.route.length) this.destination = null;
    }
    this.replanIn = Math.max(0, this.replanIn - dt);
    const goalMoved =
      !this.followGoal || distance(this.followGoal, leader.position) > 0.12;
    if (this.replanIn === 0 && goalMoved) {
      this.following = planRoute(follower.position, leader.position) ?? [];
      this.followGoal = { ...leader.position };
      this.replanIn = 0.25;
    }
    update(
      follower,
      followRoute(follower.position, this.following, dt * 2.65, FOLLOW_GAP),
    );
    // One final frame settles walking poses; an idle or unreachable route does not spin.
    return (
      wasMoving ||
      leader.walking ||
      follower.walking ||
      this.destination !== null ||
      goalMoved
    );
  }
}
