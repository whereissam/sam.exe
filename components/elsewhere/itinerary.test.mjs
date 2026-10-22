import { test, expect } from 'bun:test';
import { planJourney } from './itinerary';
import { initialTrip, interact, arrive, actionPoint } from './journey';
function run(trip, city) {
  for (const action of planJourney(trip, city, 4)) {
    trip = interact(trip, action, actionPoint(trip, action), 4);
    if (trip.phase === 'riding') trip = arrive(trip);
  }
  return trip;
}
test('one city selection collects luggage, gets the correct ticket, rides and alights', () => {
  const trip = run(initialTrip(), 2);
  expect(trip).toMatchObject({
    area: 'city',
    city: 2,
    phase: 'walking',
    bag: true,
    ticket: 2,
  });
});
test('a different city is reached directly without returning to the departure station', () => {
  const berlin = run(initialTrip(), 0);
  expect(planJourney(berlin, 3, 4)).toEqual(['ride:3', 'alight']);
  const trip = run(berlin, 3);
  expect(trip).toMatchObject({
    area: 'city',
    city: 3,
    phase: 'walking',
    bag: true,
    ticket: 3,
  });
});
test('changing the goal while walking rebuilds only the remaining prerequisites', () => {
  const trip = { ...initialTrip(), bag: true, ticket: 2, city: 2 };
  expect(planJourney(trip, 2, 4)).toEqual(['city:2', 'board', 'alight']);
  expect(planJourney(trip, 1, 4)).toEqual([
    'city:1',
    'ticket',
    'board',
    'alight',
  ]);
  expect(planJourney({ ...trip, phase: 'riding' }, 1, 4)).toEqual([]);
});

test('a full circuit preserves the physical departure city until arrival', () => {
  let trip = run(initialTrip(), 3);
  trip = interact(trip, 'ride:0', actionPoint(trip, 'ride:0'), 4);
  expect(trip.city).toBe(3);
  expect(trip.destination).toBe(0);
  expect(trip.phase).toBe('riding');
  trip = arrive(trip);
  expect(trip.city).toBe(0);
  expect(trip.area).toBe('city');
});

test('home is reachable from every city and another trip can start afterward', () => {
  for (let city = 0; city < 4; city++) {
    const away = run(initialTrip(), city);
    expect(planJourney(away, 'home', 4)).toEqual(['board', 'alight']);
    const home = run(away, 'home');
    expect(home).toMatchObject({
      area: 'station',
      phase: 'walking',
      bag: true,
    });
    expect(run(home, (city + 1) % 4)).toMatchObject({
      area: 'city',
      city: (city + 1) % 4,
      phase: 'walking',
    });
  }
});
test('returning home while onboard first alights and does not start a second trip while in transit', () => {
  const away = { ...run(initialTrip(), 2), phase: 'onboard' };
  expect(planJourney(away, 'home', 4)).toEqual(['alight', 'board', 'alight']);
  expect(run(away, 'home').area).toBe('station');
  expect(planJourney(initialTrip(), 'home', 4)).toEqual([]);
  expect(planJourney({ ...away, phase: 'riding' }, 'home', 4)).toEqual([]);
});
