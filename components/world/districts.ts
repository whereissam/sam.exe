export const districts = [
  {
    id: 'robotics',
    number: '01',
    title: 'Robotics Lab',
    tag: 'HUMAN × MACHINE',
    color: '#b7f5c4',
    position: [-12, 1.2, -7.8] as [number, number, number],
    description:
      'Building the bridge between human intention and robotic motion.',
    technologies: ['ROS 2', 'Unitree', 'MuJoCo', 'Isaac Sim'],
    note: 'A space for humanoid control, motion capture, and simulation experiments.',
  },
  {
    id: 'frontend',
    number: '02',
    title: 'Project Arcade',
    tag: 'IDEAS → EXPERIENCES',
    color: '#f5bc79',
    position: [-12, 0.35, 7.8] as [number, number, number],
    description:
      'A collection of things built for the web. Step inside, look closer, and try them for yourself.',
    technologies: ['React', 'TypeScript', 'Three.js', 'WebGL'],
    note: 'Every exhibit connects an idea to a working experience: the problem, the craft, and a way to explore it.',
  },
  {
    id: 'blockchain',
    number: '03',
    title: 'Blockchain Hub',
    tag: 'CONNECTED BY DESIGN',
    color: '#d7a0ff',
    position: [12, 2.1, -7.8] as [number, number, number],
    description:
      'Exploring the intersection of decentralized networks and AI infrastructure.',
    technologies: ['DeFi', 'On-chain data', 'AI infrastructure'],
    note: 'A home for future project stories about transparent systems and connected infrastructure.',
  },
  {
    id: 'ai',
    number: '04',
    title: 'AI Observatory',
    tag: 'THE NEXT CHAPTER',
    color: '#ff927b',
    position: [12, 0.7, 7.8] as [number, number, number],
    description:
      'Following a question beyond the screen. What happens when intelligence gets a body?',
    technologies: ['AI agents', 'Embodied AI', 'Simulation'],
    note: 'An evolving notebook of experiments at the edge of software and the physical world.',
  },
  {
    id: 'photography',
    number: '05',
    title: 'The Darkroom',
    tag: 'A DIFFERENT WAY OF SEEING',
    color: '#e8d4a1',
    position: [0, 2.8, -14.3] as [number, number, number],
    description:
      'Looking closer. Staying longer. Collecting the light between destinations.',
    technologies: ['Photography', 'Visual stories', 'Field notes'],
    note: 'A quiet gallery for photographic series. Each frame can carry a place, a date, and the story behind it.',
  },
  {
    id: 'travel',
    number: '06',
    title: 'Elsewhere Station',
    tag: 'HOME IS A MOVING POINT',
    color: '#93dce1',
    position: [0, -0.4, 14.3] as [number, number, number],
    description:
      'A life across time zones. Places become stories, and stories become part of what I build.',
    technologies: ['Slow travel', 'Remote life', 'Travel journals'],
    note: 'An atlas of lived moments, connecting destinations with photographs, notes, and projects made along the way.',
  },
] as const;
export type District = (typeof districts)[number];
