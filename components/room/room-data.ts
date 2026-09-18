export type RoomObjectId =
  | 'workstation'
  | 'ai-core'
  | 'webgl'
  | 'robot'
  | 'robot-arm'
  | 'learning'
  | 'travel'
  | 'relic';

export type RoomObject = {
  id: RoomObjectId;
  number: string;
  label: string;
  name: string;
  zone: 'DIGITAL' | 'PHYSICAL' | 'PERSONAL';
  note: string;
  approach: [number, number];
};

export const roomObjects: RoomObject[] = [
  { id: 'workstation', number: '01', label: 'WORKSTATION', name: 'Where ideas become interfaces', zone: 'DIGITAL', note: 'The everyday command centre: ultrawide canvas, MacBook, mechanical keys, coffee—and usually one more browser tab than necessary.', approach: [-4.35, -3.25] },
  { id: 'ai-core', number: '02', label: 'AI CORE', name: 'Intelligence, kept abstract', zone: 'DIGITAL', note: 'Not a glowing brain. A small system that observes, reasons, and hands useful decisions back to the world.', approach: [-0.65, -3.1] },
  { id: 'webgl', number: '03', label: 'WEBGL STUDY', name: 'The browser as a material', zone: 'DIGITAL', note: 'Shaders, geometry, motion, and interaction—experiments for making the web feel less like a document and more like a place.', approach: [-2.55, -3.65] },
  { id: 'robot-arm', number: '04', label: 'ROBOT ARM', name: 'Code gains a body', zone: 'PHYSICAL', note: 'A compact test bench for control, perception, and the difficult last metre between simulation and reality.', approach: [2.15, -2.7] },
  { id: 'robot', number: '05', label: 'G1 STUDY', name: 'The direction of travel', zone: 'PHYSICAL', note: 'A humanoid study surrounded by its planned trajectory: simulation → control → real world.', approach: [5.1, -2.25] },
  { id: 'learning', number: '06', label: 'FIELD NOTES', name: 'Thinking made visible', zone: 'PERSONAL', note: 'ROS 2, robotics, AI systems, software architecture—and loose diagrams that connect them before the ideas are fully formed.', approach: [-5.55, 0.45] },
  { id: 'travel', number: '07', label: 'LIFE MAP', name: 'A life with several coordinates', zone: 'PERSONAL', note: 'Taiwan, Berlin, Albania, Greece. The backpack stays ready because perspective changes when the coordinates do.', approach: [-4.85, 3.55] },
  { id: 'relic', number: '08', label: 'OLD ERA', name: 'A blockchain relic', zone: 'PERSONAL', note: 'A quiet artifact from years spent in Web3—not erased, just placed in context as the work moves toward intelligent physical systems.', approach: [0.75, 4.05] },
];

export const roomObjectById = Object.fromEntries(
  roomObjects.map((item) => [item.id, item]),
) as Record<RoomObjectId, RoomObject>;
