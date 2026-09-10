export type Project = {
  id: string;
  name: string;
  category: string;
  summary: string;
  cover: string;
  coverAlt: string;
  coverCaption: string;
  stack: string[];
  challenge: string;
  implementation: string;
  liveUrl?: string;
  sourceUrl?: string;
  currentWorld?: boolean;
};

// Add confirmed projects here. Do not infer ownership from nearby folders.
export const projects: Project[] = [
  {
    id: 'sam-exe',
    name: 'SAM.EXE',
    category: 'Interactive web',
    summary: 'A personal world for building, seeing, and wandering together.',
    cover: '/projects/sam-exe.webp',
    coverAlt:
      'Blender artwork of the SAM.EXE island with two travellers and six districts',
    coverCaption: 'World artwork · Blender render',
    stack: ['React', 'React Three Fiber', 'TypeScript', 'Blender', 'Bun'],
    challenge:
      'Bring software projects, photography, and travel into a place visitors can explore at their own pace.',
    implementation:
      'Two articulated travellers, walkable districts, collectible sparks, and a private visitor passport. Touch controls and an optional 3D entry support smaller screens.',
    currentWorld: true,
  },
];
