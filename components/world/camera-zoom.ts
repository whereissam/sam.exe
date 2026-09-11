/** Zoom levels, as multiples of the zoom that fits the island to the viewport.
 *  Relative rather than absolute so the fitted level frames the island on every
 *  screen, from a short laptop window to a tall phone. */
export const ZOOM_LEVELS = [0.55, 0.75, 1, 1.4, 2, 2.9, 4.2, 8];
export const FITTED_LEVEL = 2;
// Leave room below the fitted view for both overview rungs on narrow screens.
export const ZOOM_MIN = 2;
// The top rungs put a single harbor island on screen so the inlaid floor
// signs can actually be read; the ceiling has to clear them on a large display.
export const ZOOM_MAX = 340;
/** How far a wheel or pinch has to travel before it counts as one level. */
export const WHEEL_PER_LEVEL = 120;
export const PINCH_PER_LEVEL = 1.22;

/** The zoom that frames the whole island, reserving room for the chrome above
 *  and below it. Shared with the tests so the ladder is never measured against
 *  a formula the scene has since moved on from. */
export function fittedZoom(width: number, height: number) {
  const reserved = Math.min(160, height * 0.2);
  return Math.max(4, Math.min(width / 49, (height - reserved) / 37, 75));
}

const clamp = (value: number, low: number, high: number) =>
  Math.max(low, Math.min(value, high));

/** Steps never wrap: the ends of the ladder are the ends of the zoom range. */
export const clampLevel = (index: number) =>
  Number.isFinite(index)
    ? clamp(Math.round(index), 0, ZOOM_LEVELS.length - 1)
    : FITTED_LEVEL;

export const zoomForLevel = (fitted: number, index: number) =>
  clamp(fitted * ZOOM_LEVELS[clampLevel(index)], ZOOM_MIN, ZOOM_MAX);

/** Turns accumulated wheel delta into whole levels, keeping the leftover so a
 *  slow trackpad still advances exactly one level per notch's worth of travel. */
export function stepsFromWheel(accumulated: number) {
  if (!Number.isFinite(accumulated)) return { steps: 0, rest: 0 };
  const steps = Math.trunc(accumulated / WHEEL_PER_LEVEL);
  // `|| 0` keeps -0 out of the result, which reads oddly everywhere downstream.
  return { steps: -steps || 0, rest: accumulated - steps * WHEEL_PER_LEVEL };
}

/** A pinch reports a level only once it has spread or closed far enough. */
export const stepFromPinch = (ratio: number) =>
  !Number.isFinite(ratio) || ratio <= 0
    ? 0
    : ratio > PINCH_PER_LEVEL
      ? 1
      : ratio < 1 / PINCH_PER_LEVEL
        ? -1
        : 0;
