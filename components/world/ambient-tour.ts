import { districts } from './districts';
import type { Exploration } from './exploration';
import { TEA_SEATS, TEA_TABLE } from './island-layout';

export const TOUR_IDLE_SECONDS = 8;
export const tourStops = [0, 4, 2, 3, 5, 1].map((index) => {
  const district = districts[index];
  return {
    title: district.title,
    goal: {
      x: district.position[0],
      z: district.position[2] + (district.id === 'robotics' ? 2.6 : 1.8),
    },
    lookAt: { x: district.position[0], z: district.position[2] },
    stay: 9 + (index % 3) * 3,
  };
});

/** A small, interruptible visitor routine. Only routes it owns are cancelled. */
export class AmbientTour {
  phase: 'idle' | 'walking' | 'visiting' | 'gathering' | 'tea' | 'sleep' =
    'idle';
  stop = 0;
  private seconds = 0;
  private travelSeconds = 0;
  private teaDue = true;
  private visits = 0;
  private night = false;

  get teaSeconds() {
    return this.phase === 'tea' ? this.seconds : 0;
  }

  get active() {
    return this.phase !== 'idle';
  }
  get label() {
    if (!this.active) return null;
    if (this.phase === 'gathering')
      return this.night ? 'Finding a quiet seat' : 'Meeting for tea';
    if (this.phase === 'sleep') return 'A quiet moment';
    if (this.phase === 'tea') return 'Tea for two';
    return `${this.phase === 'walking' ? 'Off to' : 'Visiting'} ${tourStops[this.stop].title}`;
  }
  interrupt(model: Exploration) {
    if (this.active) model.cancel();
    this.phase = 'idle';
    this.seconds = 0;
    this.travelSeconds = 0;
  }
  step(elapsed: number, model: Exploration, allowed: boolean, night = false) {
    if (night !== this.night) {
      this.interrupt(model);
      this.night = night;
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
        this.phase = this.night ? 'sleep' : 'tea';
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
      if (this.phase === 'sleep') return;
      if (
        this.seconds < (this.phase === 'tea' ? 24 : tourStops[this.stop].stay)
      )
        return;
      if (this.phase === 'visiting') {
        this.stop = (this.stop + 1) % tourStops.length;
        this.visits++;
        this.teaDue = this.visits % 2 === 0;
      }
    } else if (this.seconds < TOUR_IDLE_SECONDS) return;

    if (this.teaDue || this.night) {
      const other = model.active === 'sam' ? 'companion' : 'sam';
      if (model.goTo(TEA_SEATS[model.active], TEA_SEATS[other])) {
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
