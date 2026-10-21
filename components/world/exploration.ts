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
const PERSONAL_SPACE = 0.58;

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
  private companionDestination: Point | null = null;

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
    this.companionDestination = null;
  }
  goTo(destination: Point, companionDestination: Point | null = null) {
    const follower = this.walkers[this.active === 'sam' ? 'companion' : 'sam'];
    if (
      companionDestination &&
      !planRoute(follower.position, companionDestination)
    )
      return false;
    const route = planRoute(this.walkers[this.active].position, destination);
    this.route = route ?? [];
    this.destination = route?.length ? { ...destination } : null;
    this.companionDestination = route ? companionDestination : null;
    this.replanIn = 0;
    this.followGoal = null;
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
    const leaderBefore = { ...leader.position };
    const routeBefore = this.route.slice();
    const destinationBefore = this.destination;
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
    // Reversing toward the companion should make them give way, never pass
    // through one another. Every avoidance step still respects scenery.
    if (distance(leader.position, follower.position) < PERSONAL_SPACE) {
      const dx = follower.position.x - leader.position.x;
      const dz = follower.position.z - leader.position.z;
      const length = Math.hypot(dx, dz) || 1;
      const candidates = [
        [dx / length, dz / length],
        [-dz / length, dx / length],
        [dz / length, -dx / length],
      ];
      const next = candidates
        .map(([x, z]) =>
          advance(follower.position, { x: x * dt * 2.65, z: z * dt * 2.65 }),
        )
        .sort(
          (a, b) => distance(b, leader.position) - distance(a, leader.position),
        )[0];
      update(follower, next);
      if (distance(leader.position, follower.position) < PERSONAL_SPACE) {
        leader.position = leaderBefore;
        leader.walking = false;
        if (!(magnitude > 0)) {
          this.route = routeBefore;
          this.destination = destinationBefore;
        }
      }
      this.followGoal = null;
      this.replanIn = 0;
      return true;
    }
    this.replanIn = Math.max(0, this.replanIn - dt);
    const followTarget = this.companionDestination ?? leader.position;
    const goalMoved =
      !this.followGoal || distance(this.followGoal, followTarget) > 0.12;
    if (this.replanIn === 0 && goalMoved) {
      this.following = planRoute(follower.position, followTarget) ?? [];
      this.followGoal = { ...followTarget };
      this.replanIn = 0.25;
    }
    const followingBefore = this.following.slice();
    const followerNext = followRoute(
      follower.position,
      this.following,
      dt * 2.65,
      this.companionDestination ? 0 : FOLLOW_GAP,
    );
    if (distance(followerNext, leader.position) < PERSONAL_SPACE) {
      this.following = followingBefore;
      update(follower, follower.position);
    } else update(follower, followerNext);
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
