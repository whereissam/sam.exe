export const linkedRooms = [
  {
    id: 'blockchain',
    label: 'TRUST WORKSHOP',
    href: '/blockchain',
    color: '#88758d',
  },
  { id: 'room', label: 'SAM’S ROOM', href: '/room', color: '#739b8a' },
  { id: 'robot-lab', label: 'ROBOT LAB', href: '/robot-lab', color: '#b97953' },
  {
    id: 'atlas',
    label: 'MEMORY ATLAS',
    href: '/atlas/world',
    color: '#829dab',
  },
] as const;
export type LinkedRoom = (typeof linkedRooms)[number]['id'];
export function otherRooms(current: LinkedRoom) {
  return linkedRooms.filter((room) => room.id !== current);
}
export function surpriseRoom(current: LinkedRoom, random = Math.random()) {
  const choices = otherRooms(current);
  const index = Math.max(
    0,
    Math.min(choices.length - 1, Math.floor(random * choices.length)),
  );
  return choices[index];
}
