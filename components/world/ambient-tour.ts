import { districts } from './districts';
import type { Exploration } from './exploration';
import { TEA_SEATS, TEA_TABLE } from './island-layout';

// Give the local-hour activity a full minute before heading to the table.
export const TOUR_IDLE_SECONDS = 60;
export const NIGHT_REST_SECONDS = 8;
export const WORK_SECONDS = 60;
export const tourStops = [0, 4, 2, 3, 5, 1].map((index) => {
  const district = districts[index];
  return {
    title: district.title,
    goal: {
      x: district.position[0],
      z: district.position[2] + (district.id === 'robotics' ? 2.7 : 2.2),
    },
    lookAt: { x: district.position[0], z: district.position[2] },
    stay: 60 + (index % 3) * 15,
  };
});

/** A small, interruptible visitor routine. Only routes it owns are cancelled. */
export class AmbientTour {
  phase:
    | 'idle'
    | 'walking'
    | 'visiting'
    | 'gathering'
    | 'work'
    | 'tea'
    | 'sleep' = 'idle';
  stop = 0;
  private seconds = 0;
  private travelSeconds = 0;
  private teaDue = true;
  private visits = 0;
  private night = false;
  private working = false;
  private teaAllowed = true;

  get teaSeconds() {
    return this.phase === 'tea' ? this.seconds : 0;
  }

  get active() {
    return this.phase !== 'idle';
  }
  get label() {
    if (!this.active) return null;
    if (this.phase === 'gathering')
      return this.night
        ? 'Finding a quiet seat'
        : this.working
          ? 'Heading to the work table'
          : 'Meeting for tea';
    if (this.phase === 'work') return 'Working together';
    if (this.phase === 'sleep') return 'A quiet moment';
    if (this.phase === 'tea') return 'Tea for two';
    return `${this.phase === 'walking' ? 'Off to' : 'Visiting'} ${tourStops[this.stop].title}`;
  }
  interrupt(model: Exploration) {
    if (this.active) model.cancel();
    this.phase = 'idle';
    this.teaDue = true;
    this.seconds = 0;
    this.travelSeconds = 0;
  }
  step(
    elapsed: number,
    model: Exploration,
    allowed: boolean,
    night = false,
    working = false,
    teaAllowed = true,
  ) {
    if (
      night !== this.night ||
      working !== this.working ||
      teaAllowed !== this.teaAllowed
    ) {
      this.interrupt(model);
      this.night = night;
      this.working = working;
      this.teaAllowed = teaAllowed;
      this.teaDue = true;
    }
    if (!allowed) {
      this.interrupt(model);
      return;
    }
    // Demand rendering wakes only occasionally while waiting; movement itself
    // still uses Exploration's bounded frame delta.
    const dt = Math.max(0, Math.min(Number.isFinite(elapsed) ? elapsed : 0, 1));
    if (this.phase === 'idle' && model.destination) {
      this.seconds = 0;
      return;
    }
    if (this.phase === 'gathering') {
      this.travelSeconds += dt;
      const arrived = Object.entries(model.walkers).every(([id, walker]) => {
        const seat = TEA_SEATS[id as keyof typeof TEA_SEATS];
        return (
          Math.hypot(walker.position.x - seat.x, walker.position.z - seat.z) <
          0.08
        );
      });
      if (arrived) {
        this.phase = this.night ? 'sleep' : this.working ? 'work' : 'tea';
        for (const walker of Object.values(model.walkers)) {
          walker.heading = Math.atan2(
            TEA_TABLE.x - walker.position.x,
            TEA_TABLE.z - walker.position.z,
          );
        }
        this.seconds = 0;
        this.teaDue = false;
      } else if (this.travelSeconds > 90) {
        this.interrupt(model);
        this.teaDue = false;
      }
      return;
    }
    if (this.phase === 'walking') {
      this.travelSeconds += dt;
      if (!model.destination) {
        const p = model.walkers[model.active].position;
        const goal = tourStops[this.stop].goal;
        if (Math.hypot(p.x - goal.x, p.z - goal.z) < 0.2) {
          this.phase = 'visiting';
          this.seconds = 0;
        } else this.interrupt(model);
      } else if (this.travelSeconds > 90) {
        this.interrupt(model);
        this.stop = (this.stop + 1) % tourStops.length;
      }
      return;
    }
    this.seconds += dt;
    if (
      this.phase === 'work' ||
      this.phase === 'visiting' ||
      this.phase === 'tea' ||
      this.phase === 'sleep'
    ) {
      const look =
        this.phase !== 'visiting' ? TEA_TABLE : tourStops[this.stop].lookAt;
      for (const walker of Object.values(model.walkers)) {
        if (walker.walking) continue;
        const angle = Math.atan2(
          look.x - walker.position.x,
          look.z - walker.position.z,
        );
        const turn = Math.atan2(
          Math.sin(angle - walker.heading),
          Math.cos(angle - walker.heading),
        );
        walker.heading += turn * Math.min(1, dt * 3);
      }
      if (this.phase === 'work') {
        if (this.teaAllowed && this.seconds >= WORK_SECONDS) {
          this.phase = 'tea';
          this.seconds = 0;
        }
        return;
      }
      if (this.phase === 'sleep' || this.phase === 'tea') return;
      if (this.seconds < tourStops[this.stop].stay) return;
      if (this.phase === 'visiting') {
        this.stop = (this.stop + 1) % tourStops.length;
        this.visits++;
        this.teaDue = this.visits % 2 === 0;
      }
    } else if (
      this.seconds <
      (this.night || this.working ? NIGHT_REST_SECONDS : TOUR_IDLE_SECONDS)
    )
      return;

    if ((this.teaDue && this.teaAllowed) || this.working || this.night) {
      const other = model.active === 'sam' ? 'companion' : 'sam';
      if (model.goTo(TEA_SEATS[model.active], TEA_SEATS[other], true)) {
        this.phase = 'gathering';
        this.seconds = 0;
        this.travelSeconds = 0;
        return;
      }
      this.teaDue = false;
    }
    // If a future layout makes a stop unreachable, wait before trying the next.
    if (model.goTo(tourStops[this.stop].goal) && model.destination) {
      this.phase = 'walking';
      this.travelSeconds = 0;
    } else {
      this.phase = 'idle';
      this.stop = (this.stop + 1) % tourStops.length;
    }
    this.seconds = 0;
  }
}
