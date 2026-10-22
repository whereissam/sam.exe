import { test, expect } from 'bun:test';
import { createHold } from './hold';

test('a short tap does nothing and a fresh two-second hold fires once', () => {
  const hold = createHold();
  expect(hold.update(true, 'bag', 0.8).fired).toBe(false);
  expect(hold.update(false, 'bag', 0).progress).toBe(0);
  expect(hold.update(true, 'bag', 1).fired).toBe(false);
  expect(hold.update(true, 'bag', 1).fired).toBe(true);
  expect(hold.update(true, 'bag', 3).fired).toBe(false);
});
test('movement, target changes and focus loss require a fresh press', () => {
  for (const interruption of ['movement', 'target', 'blur']) {
    const hold = createHold();
    hold.update(true, 'board', 1.5);
    if (interruption === 'blur') hold.cancel();
    else hold.update(true, interruption === 'movement' ? null : 'ticket', 0.1);
    expect(hold.update(true, 'board', 3).fired).toBe(false);
    hold.update(false, 'board', 0);
    expect(hold.update(true, 'board', 2).fired).toBe(true);
  }
});
test('holding before reaching an object cannot trigger on arrival', () => {
  const hold = createHold();
  hold.update(true, null, 1);
  expect(hold.update(true, 'bag', 3).fired).toBe(false);
});
test('missing prerequisites report immediately, once per press, without filling the ring', () => {
  const hold = createHold();
  expect(hold.update(true, 'board', 0, true)).toEqual({
    progress: 0,
    fired: false,
    rejected: true,
  });
  expect(hold.update(true, 'board', 3, true).rejected).toBe(false);
  expect(hold.update(true, 'board', 3, false).fired).toBe(false);
  hold.update(false, 'board', 0);
  expect(hold.update(true, 'board', 2, false).fired).toBe(true);
});
