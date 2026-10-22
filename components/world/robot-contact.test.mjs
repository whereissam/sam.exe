import { test, expect } from 'bun:test';
import { constrainedFight, contactCorrection } from './robot-contact';
test('all six attacks remain outside the opposing solid envelopes for a complete circuit', () => {
  let contacts = 0;
  for (let i = 0; i <= 972; i++) {
    const result = constrainedFight(i / 120);
    if (result.correction > 0.001) contacts++;
    expect(contactCorrection(...result.frames).correction).toBeLessThan(1e-8);
    expect(result.correction).toBeLessThan(1);
  }
  expect(contacts).toBeGreaterThan(20);
});
