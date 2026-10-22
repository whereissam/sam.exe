// One confirmation per press; interruption requires releasing before trying again.
export function createHold() {
  let pressed = false,
    target: string | null = null,
    elapsed = 0,
    locked = false;
  return {
    cancel() {
      target = null;
      elapsed = 0;
      locked = pressed;
    },
    update(down: boolean, next: string | null, delta: number, blocked = false) {
      if (!down) {
        pressed = false;
        target = null;
        elapsed = 0;
        locked = false;
        return { progress: 0, fired: false, rejected: false };
      }
      if (!pressed) {
        pressed = true;
        target = next;
        locked = !next || blocked;
        if (next && blocked)
          return { progress: 0, fired: false, rejected: true };
      }
      if (next !== target || !next) {
        locked = true;
        elapsed = 0;
      }
      if (locked) return { progress: 0, fired: false, rejected: false };
      elapsed += Math.max(0, delta);
      const progress = Math.min(1, elapsed / 2);
      if (progress === 1) locked = true;
      return { progress, fired: progress === 1, rejected: false };
    },
  };
}
