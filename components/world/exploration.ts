import { advance, clearSegment, walkable, recoverWalkable, SPAWN, type Point } from './movement';
import { planRoute, followRoute } from './navigation';
import { TEA_SEATS } from './island-layout';
import { BODY_SEPARATION, bodiesCollide } from './character-collision';

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
const PERSONAL_SPACE = BODY_SEPARATION;
export const STRETCH_SPACE = 1.45;

/** Exploration state is independent of React/render frequency so it can be simulated. */
export class Exploration {
  walkers = {
    sam: walker(SPAWN.x, SPAWN.z),
    companion: walker(SPAWN.x - 0.85, SPAWN.z),
  };
  seating = false;
  private leavingSeat = false;
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
    this.leavingSeat = this.seating && Object.values(this.walkers).some(w => !walkable(w.position));
    this.seating = this.leavingSeat;
    this.destination = null;
    this.route = [];
    this.companionDestination = null;
  }
  goTo(destination: Point, companionDestination: Point | null = null, seating = false) {
    const follower = this.walkers[this.active === 'sam' ? 'companion' : 'sam'];
    if (
      companionDestination &&
      !planRoute(follower.position, companionDestination, seating)
    )
      return false;
    const start = this.leavingSeat ? {x: TEA_SEATS[this.active].x, z: TEA_SEATS[this.active].z + .55}
      : this.walkers[this.active].position;
    const route = planRoute(start, destination, seating);
    this.seating = this.leavingSeat || (seating && route !== null);
    this.route = route ?? [];
    this.destination = route?.length ? { ...destination } : null;
    this.companionDestination = route ? companionDestination : null;
    this.replanIn = 0;
    this.followGoal = null;
    return route !== null;
  }
  step(elapsed: number, direction: Point = { x: 0, z: 0 }, personalSpace = PERSONAL_SPACE) {
    const dt = Math.max(
      0,
      Math.min(Number.isFinite(elapsed) ? elapsed : 0, 0.05),
    );
    if (!dt) return false;
    if (this.leavingSeat) {
      let finished = true;
      for (const id of ['sam', 'companion'] as const) {
        const actor = this.walkers[id];
        const goal = { x: TEA_SEATS[id].x, z: TEA_SEATS[id].z + .55 };
        const dx = goal.x-actor.position.x, dz = goal.z-actor.position.z;
        const length = Math.hypot(dx, dz);
        actor.walking = length > .001;
        if (actor.walking) {
          const step = Math.min(length, dt*2.4);
          actor.position = advance(actor.position, {x: dx/length*step, z: dz/length*step}, true);
          actor.heading = Math.atan2(dx, dz);
          actor.phase += dt;
          finished = false;
        }
      }
      if (finished) { this.leavingSeat = false; this.seating = false; }
      return true;
    }
    const leader = this.walkers[this.active],
      follower = this.walkers[this.active === 'sam' ? 'companion' : 'sam'];
    for (const actor of [leader, follower]) {
      const safe = recoverWalkable(actor.position, this.seating);
      if (safe !== actor.position) {
        actor.position = safe;
        this.cancel();
        this.following = [];
        this.followGoal = null;
      }
    }
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
    const followerBefore = { ...follower.position };
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
      update(leader, followRoute(leader.position, this.route, dt * 2.4, 0, (a, b) => clearSegment(a, b, this.seating)));
      if (!this.route.length) this.destination = null;
    }
    // Reversing toward the companion should make them give way, never pass
    // through one another. Every avoidance step still respects scenery.
    if (distance(leader.position, follower.position) < personalSpace ||
      bodiesCollide(leaderBefore, leader.position, followerBefore, follower.position)) {
      const dx = follower.position.x - leader.position.x;
      const dz = follower.position.z - leader.position.z;
      const length = Math.hypot(dx, dz);
      const awayX = length > 1e-7 ? dx / length : -1;
      const awayZ = length > 1e-7 ? dz / length : 0;
      const candidates = [
        [awayX, awayZ],
        [-awayZ, awayX],
        [awayZ, -awayX],
      ];
      const next = candidates
        .map(([x, z]) =>
          advance(follower.position, { x: x * dt * 2.65, z: z * dt * 2.65 }, this.seating),
        )
        .sort(
          (a, b) => distance(b, leader.position) - distance(a, leader.position),
        )[0];
      // Both proposed motions must be safe over the entire frame, not only
      // at the final positions. A blocked pair yields instead of exchanging sides.
      if (bodiesCollide(leaderBefore, leader.position, followerBefore, next)) {
        leader.position = leaderBefore;
        leader.walking = false;
        if (!(magnitude > 0)) {
          this.route = routeBefore;
          this.destination = destinationBefore;
        }
      }
      update(follower, bodiesCollide(leaderBefore, leader.position, followerBefore, next)
        ? followerBefore : next);
      if (distance(leader.position, follower.position) < personalSpace ||
      bodiesCollide(leaderBefore, leader.position, followerBefore, follower.position)) {
        leader.position = leaderBefore;
        leader.walking = false;
        if (!(magnitude > 0)) {
          this.route = routeBefore;
          this.destination = destinationBefore;
        }
      }
      this.followGoal = null;
      this.replanIn = 0;
      return wasMoving || leader.walking || follower.walking || this.destination !== null;
    }
    this.replanIn = Math.max(0, this.replanIn - dt);
    const followTarget = this.companionDestination ?? leader.position;
    const goalMoved =
      !this.followGoal || distance(this.followGoal, followTarget) > 0.12;
    if (this.replanIn === 0 && goalMoved) {
      this.following = planRoute(follower.position, followTarget, this.seating) ?? [];
      this.followGoal = { ...followTarget };
      this.replanIn = 0.25;
    }
    const followingBefore = this.following.slice();
    const followerNext = followRoute(
      follower.position,
      this.following,
      dt * 2.65,
      this.companionDestination ? 0 : Math.max(FOLLOW_GAP, personalSpace + 0.12),
      (a, b) => clearSegment(a, b, this.seating),
    );
    if (distance(followerNext, leader.position) < personalSpace ||
      bodiesCollide(leaderBefore, leader.position, followerBefore, followerNext)) {
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
