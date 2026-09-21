export type RoomObjectId =
  | 'workstation'
  | 'ai-core'
  | 'webgl'
  | 'robot'
  | 'robot-arm'
  | 'learning'
  | 'travel'
  | 'bed'
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
  { id: 'bed', number: '09', label: 'BED', name: 'Time to rest', zone: 'PERSONAL', note: 'Move or click the floor to wake up.', approach: [5.5, 0.3] },
  { id: 'workstation', number: '01', label: 'WORKSTATION', name: 'Where ideas become interfaces', zone: 'DIGITAL', note: 'The everyday command centre: ultrawide canvas, MacBook, mechanical keys, coffee—and usually one more browser tab than necessary.', approach: [-4.35, -3.25] },
  { id: 'ai-core', number: '02', label: 'AI MODEL', name: 'Intelligence, kept abstract', zone: 'DIGITAL', note: 'A small geometric model on the project cabinet, representing systems that observe, reason, and hand useful decisions back to the world.', approach: [-0.85, -3.6] },
  { id: 'webgl', number: '03', label: 'WEBGL STUDY', name: 'The browser as a material', zone: 'DIGITAL', note: 'Shaders, geometry, motion, and interaction—experiments for making the web feel less like a document and more like a place.', approach: [-2.55, -3.65] },
  { id: 'robot-arm', number: '04', label: 'ROBOT ARM MODEL', name: 'Code gains a body', zone: 'PHYSICAL', note: 'A tabletop robot-arm model for experiments in control, perception, and the last metre between simulation and reality.', approach: [0.7, -3.6] },
  { id: 'robot', number: '05', label: 'G1 MODEL', name: 'The direction of travel', zone: 'PHYSICAL', note: 'A small humanoid study on the project cabinet: simulation → control → real world.', approach: [2.0, -3.5] },
  { id: 'learning', number: '06', label: 'FIELD NOTES', name: 'Thinking made visible', zone: 'PERSONAL', note: 'ROS 2, robotics, AI systems, software architecture—and loose diagrams that connect them before the ideas are fully formed.', approach: [-5.55, 0.45] },
  { id: 'travel', number: '07', label: 'LIFE MAP', name: 'A life with several coordinates', zone: 'PERSONAL', note: 'Taiwan, Berlin, Albania, Greece. The backpack stays ready because perspective changes when the coordinates do.', approach: [-4.85, 3.55] },
  { id: 'relic', number: '08', label: 'KEEPSAKE', name: 'A blockchain relic', zone: 'PERSONAL', note: 'A small keepsake on the bedside table from years spent in Web3, as the work moves toward intelligent physical systems.', approach: [3.25, -2.4] },
];

export const roomObjectById = Object.fromEntries(
  roomObjects.map((item) => [item.id, item]),
) as Record<RoomObjectId, RoomObject>;
