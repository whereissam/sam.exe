import type { Point } from './movement';

export type DailyRoutine = 'sleep' | 'stretch' | 'work' | 'wander' | 'relax';
export const routineLabels: Record<DailyRoutine, string> = {
  sleep: 'A little nap. Move to wake up.',
  stretch: 'Morning stretches',
  work: 'Making something small',
  wander: 'Watching the world go by',
  relax: 'Winding down with a book',
};
export type Lighting = 'night' | 'day';
export const LIGHTING_KEY = 'sam-exe-lighting';
/** A remembered lighting choice, or null to follow the visitor's local hour. */
export const readLighting = (raw: string | null): Lighting | null =>
  raw === 'night' || raw === 'day' ? raw : null;
export const isNightHour = (hour: number) => hour < 7 || hour >= 22;
export function routineAtHour(hour: number, night: boolean): DailyRoutine {
  if (night) return 'sleep';
  if (hour >= 7 && hour < 11) return 'stretch';
  if (hour >= 11 && hour < 17) return 'work';
  if (hour >= 17 && hour < 21) return 'wander';
  return 'relax';
}

/** Seconds of stillness before the pair settle into the hour's routine. */
export const REST_DELAY = 4;
export type Activity = {
  walking: boolean;
  gesturing: boolean;
  travelling: boolean;
  steering: boolean;
  /** Holding the binoculars up to a photograph is attention, not idleness. */
  viewing: boolean;
};
const busy = (a: Activity) =>
  a.walking || a.gesturing || a.travelling || a.steering || a.viewing;

/** Rest state is independent of React/render frequency so it can be simulated.
 *  Any activity zeroes the timer, so a routine pose never survives a step. */
export class Rest {
  seconds = 0;
  get resting() {
    return this.seconds >= REST_DELAY;
  }
  /** Wake them without waiting for a frame, after a reset or a triggered action. */
  interrupt() {
    this.seconds = 0;
  }
  /** @returns whether they are resting once this step is accounted for. */
  step(elapsed: number, activity: Activity) {
    const dt = Math.max(
      0,
      Math.min(Number.isFinite(elapsed) ? elapsed : 0, 0.05),
    );
    this.seconds = busy(activity) ? 0 : Math.min(REST_DELAY, this.seconds + dt);
    return this.resting;
  }
  /** The pose to hold right now: the hour's routine only once they have settled. */
  poseFor(routine: DailyRoutine) {
    return this.resting ? routine : undefined;
  }
}

/** Sleepers lie along their own local X axis, so two of them sharing a heading
 *  lie parallel. Aiming that heading straight down the line between them puts
 *  each body across that line, side by side, instead of through the other.
 *  Returns null when they are too close together for the line to mean anything. */
export function sleepHeading(a: Point, b: Point) {
  const dx = b.x - a.x,
    dz = b.z - a.z;
  return Math.hypot(dx, dz) > 0.05 ? Math.atan2(dx, dz) : null;
}

/** The world direction a body lying at this heading extends along. */
export const lieAxis = (heading: number) => ({
  x: Math.cos(heading),
  z: -Math.sin(heading),
});
