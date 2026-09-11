import { test, expect, afterEach } from 'bun:test';
import { mountSound, playSound, setSoundEnabled, soundEnabled } from './sound';
const original = Object.getOwnPropertyDescriptors(globalThis);
let cleanup;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  for (const key of ['document', 'localStorage', 'AudioContext']) {
    if (original[key]) Object.defineProperty(globalThis, key, original[key]);
    else delete globalThis[key];
  }
});
function environment(saved = 'on') {
  const document = new EventTarget();
  document.hidden = false;
  const storage = new Map([['sam-exe-sound', saved]]);
  const contexts = [],
    notes = [];
  const parameter = () => ({
    value: 0,
    setValueAtTime(v) {
      this.value = v;
    },
    setTargetAtTime(v) {
      this.value = v;
    },
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
  });
  class Context {
    currentTime = 1;
    state = 'running';
    destination = {};
    constructor() {
      contexts.push(this);
    }
    createGain() {
      const node = { gain: parameter(), connect() {}, disconnect() {} };
      this.master ??= node;
      return node;
    }
    createOscillator() {
      return {
        frequency: parameter(),
        connect() {},
        disconnect() {},
        start(time) {
          notes.push(time);
        },
        stop() {},
      };
    }
    resume() {
      this.state = 'running';
      return Promise.resolve();
    }
    close() {
      this.state = 'closed';
      return Promise.resolve();
    }
  }
  Object.assign(globalThis, {
    document,
    AudioContext: Context,
    localStorage: {
      getItem: (key) => storage.get(key),
      setItem: (key, value) => storage.set(key, value),
    },
  });
  cleanup = mountSound();
  return { document, storage, contexts, notes };
}
test('audio remains unallocated until a gesture, and remembers mute', () => {
  const env = environment('off');
  env.document.dispatchEvent(new Event('pointerdown'));
  playSound('discover');
  expect(env.contexts).toHaveLength(0);
  expect(soundEnabled()).toBe(false);
  setSoundEnabled(true);
  expect(env.contexts).toHaveLength(1);
  expect(env.storage.get('sam-exe-sound')).toBe('on');
  setSoundEnabled(false);
  const count = env.notes.length;
  playSound('open');
  expect(env.notes).toHaveLength(count);
  expect(env.contexts[0].master.gain.value).toBe(0);
});
test('footsteps are throttled across render frames and the hidden tab is silent', () => {
  const env = environment();
  playSound('step');
  expect(env.contexts).toHaveLength(0);
  env.document.dispatchEvent(new Event('keydown'));
  for (let i = 0; i < 60; i++) playSound('step');
  expect(env.notes).toHaveLength(1);
  env.contexts[0].currentTime += 0.34;
  playSound('step');
  expect(env.notes).toHaveLength(2);
  env.document.hidden = true;
  env.document.dispatchEvent(new Event('visibilitychange'));
  playSound('discover');
  expect(env.notes).toHaveLength(2);
  expect(env.contexts[0].master.gain.value).toBe(0);
});
test('unmount closes the audio context and removes gesture listeners', () => {
  const env = environment();
  env.document.dispatchEvent(new Event('pointerdown'));
  cleanup();
  cleanup = undefined;
  expect(env.contexts[0].state).toBe('closed');
  env.document.dispatchEvent(new Event('pointerdown'));
  expect(env.contexts).toHaveLength(1);
});
