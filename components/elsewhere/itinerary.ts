import type { Action, Trip } from './journey';
export function planJourney(
  trip: Trip,
  city: number | 'home',
  count: number,
): Action[] {
  if (city === 'home') {
    if (trip.phase === 'riding') return [];
    if (trip.area === 'station')
      return trip.phase === 'onboard' ? ['alight'] : [];
    return trip.phase === 'onboard'
      ? ['alight', 'board', 'alight']
      : ['board', 'alight'];
  }
  if (
    !Number.isInteger(city) ||
    city < 0 ||
    city >= count ||
    trip.phase === 'riding'
  )
    return [];
  if (trip.area === 'city' && trip.city === city)
    return trip.phase === 'onboard' ? ['alight'] : [];
  const steps: Action[] = [];
  if (trip.phase === 'onboard') steps.push('alight');
  if (trip.area === 'city') return [...steps, `ride:${city}`, 'alight'];
  if (!trip.bag) steps.push('bag');
  steps.push(`city:${city}`);
  if (trip.ticket !== city) steps.push('ticket');
  steps.push('board', 'alight');
  return steps;
}
