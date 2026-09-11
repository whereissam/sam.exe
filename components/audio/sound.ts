/** Tiny synthesized effects: no downloads, loops or audio before a user gesture. */
export type Sound =
  | 'step'
  | 'open'
  | 'photo'
  | 'discover'
  | 'splash'
  | 'fire'
  | 'windmill'
  | 'boat'
  | 'jump'
  | 'wave'
  | 'celebrate';
export const SOUND_KEY = 'sam-exe-sound';
let enabled = true;
let context: AudioContext | undefined;
let master: GainNode | undefined;
const listeners = new Set<() => void>();
const lastPlayed = new Map<Sound, number>();
export const subscribeSound = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const soundEnabled = () => enabled;
export const serverSoundEnabled = () => true;
function publish() {
  for (const listener of listeners) listener();
}
export function setSoundEnabled(value: boolean) {
  enabled = value;
  try {
    localStorage.setItem(SOUND_KEY, value ? 'on' : 'off');
  } catch {
    /* Session-only preference. */
  }
  if (master && context)
    master.gain.setTargetAtTime(value ? 0.18 : 0, context.currentTime, 0.015);
  publish();
  if (value) {
    unlockSound();
    playSound('photo');
  }
}
function unlockSound() {
  if (!enabled || document.hidden) return;
  try {
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.18;
      master.connect(context.destination);
    }
    if (context.state === 'suspended') void context.resume().catch(() => {});
  } catch {
    /* Audio is optional on unsupported or restricted browsers. */
  }
}
export function mountSound() {
  try {
    enabled = localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    /* Keep default. */
  }
  publish();
  const visibility = () => {
    if (document.hidden && context) {
      // Silence immediately; scheduled effects expire on the running clock.
      master?.gain.setValueAtTime(0, context.currentTime);
    } else if (context && master)
      master.gain.setTargetAtTime(
        enabled ? 0.18 : 0,
        context.currentTime,
        0.02,
      );
  };
  document.addEventListener('pointerdown', unlockSound, true);
  document.addEventListener('keydown', unlockSound, true);
  document.addEventListener('visibilitychange', visibility);
  return () => {
    document.removeEventListener('pointerdown', unlockSound, true);
    document.removeEventListener('keydown', unlockSound, true);
    document.removeEventListener('visibilitychange', visibility);
    if (context) void context.close().catch(() => {});
    context = undefined;
    master = undefined;
    lastPlayed.clear();
  };
}
export function playSound(sound: Sound) {
  if (
    !enabled ||
    !context ||
    !master ||
    context.state !== 'running' ||
    document.hidden
  )
    return;
  const now = context.currentTime;
  if (now - (lastPlayed.get(sound) ?? -10) < (sound === 'step' ? 0.32 : 0.12))
    return;
  lastPlayed.set(sound, now);
  const notes: Record<Sound, number[]> = {
    step: [125],
    open: [392, 587],
    photo: [740],
    discover: [523, 659, 784, 1047],
    splash: [650, 410, 820],
    fire: [95, 155, 110],
    windmill: [294, 440],
    boat: [220, 330],
    jump: [280, 560],
    wave: [440, 554],
    celebrate: [523, 659, 784, 1047],
  };
  notes[sound].forEach((frequency, i) => {
    const oscillator = context!.createOscillator(),
      envelope = context!.createGain();
    const start = now + i * 0.075,
      duration = sound === 'step' ? 0.065 : 0.19;
    oscillator.type =
      sound === 'step' || sound === 'fire' ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(
      frequency * (sound === 'splash' ? 0.45 : 0.85),
      start + duration,
    );
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(
      sound === 'step' ? 0.13 : 0.3,
      start + 0.008,
    );
    envelope.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(master!);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
  });
}
