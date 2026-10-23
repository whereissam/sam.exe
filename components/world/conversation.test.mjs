import { test, expect } from 'bun:test';
import { ConversationTimeline } from './conversation';
const advance = (timeline, seconds, ready = true, tea = false) => {
  let line = null;
  for (let i = 0; i < seconds * 2; i++) line = timeline.step(.5, ready, tea);
  return line;
};
test('nearby idle travellers take turns, then leave a quiet interval', () => {
  const timeline = new ConversationTimeline();
  expect(advance(timeline, 7)).toBeNull();
  const first = advance(timeline, 1);
  expect(first.speaker).toBe('sam');
  const second = advance(timeline, 5);
  expect(second.speaker).toBe('companion');
  expect(second.text).not.toBe(first.text);
  expect(advance(timeline, 5)).toBeNull();
  expect(advance(timeline, 39)).toBeNull();
  expect(advance(timeline, 1)).not.toBeNull();
});
test('movement, separation or pausing interrupts and requires fresh idle time', () => {
  const timeline = new ConversationTimeline();
  expect(advance(timeline, 8)).not.toBeNull();
  expect(timeline.step(.2, false, false)).toBeNull();
  expect(advance(timeline, 7)).toBeNull();
  expect(advance(timeline, 1)).not.toBeNull();
});
test('tea selects a conversation about their shared break', () => {
  expect(advance(new ConversationTimeline(), 8, true, true).text).toContain('茶');
});

test('both speakers turn toward each other without moving their positions', async () => {
  const { conversationHeading } = await import('./conversation');
  for (const [a, b] of [[{x:0,z:0},{x:1,z:0}], [{x:2,z:-3},{x:-1,z:4}]]) {
    for (const [from, to] of [[a,b],[b,a]]) {
      let heading = 0;
      for (let frame = 0; frame < 90; frame++) heading = conversationHeading(heading, from, to, 1/60);
      const distance = Math.hypot(to.x-from.x,to.z-from.z);
      expect(Math.sin(heading)).toBeCloseTo((to.x-from.x)/distance, 4);
      expect(Math.cos(heading)).toBeCloseTo((to.z-from.z)/distance, 4);
    }
  }
});

test('facing takes the short arc across pi and supports reduced motion', async () => {
  const { conversationHeading } = await import('./conversation');
  const from = {x:0,z:0}, to = {x:-.01,z:-1};
  const heading = Math.PI-.01;
  expect(Math.abs(conversationHeading(heading,from,to,1/60)-heading)).toBeLessThan(.02);
  expect(Math.sin(conversationHeading(0,from,to,1/60,true))).toBeCloseTo(-.01, 4);
  expect(conversationHeading(1,from,from,1/60)).toBe(1);
});
