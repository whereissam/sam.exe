export const districts = [
  {
    id: 'robotics',
    number: '01',
    title: 'Robotics Lab',
    tag: 'HUMAN × MACHINE',
    color: '#b7f5c4',
    position: [-12, 1.2, -7.8] as [number, number, number],
    description:
      'A human moves. A humanoid follows. Exploring robot control through wearable motion capture.',
    technologies: ['Humanoid robotics', 'PICO', 'Noitom', 'Motion capture'],
    note: 'I research humanoid robotics and host robot fights. A person wears PICO equipment or a Noitom mocap suit to control the robot through their own movements. Try the interactive demo below.',
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
      'Step into the trust workshop: little payments get checked, wait their turn, and ride into a record book nobody can secretly edit.',
    technologies: ['DeFi', 'On-chain data', 'AI infrastructure'],
    note: 'An interactive room about money without a bank. Unplug a checker, tip someone to the front, or try to cheat the book.',
  },
  {
    id: 'ai',
    number: '04',
    title: 'AI Observatory',
    tag: 'THE NEXT CHAPTER',
    color: '#ff927b',
    position: [12, 0.7, 7.8] as [number, number, number],
    description:
      'Give a little explorer a delivery task. Change its world, and watch it find another way.',
    technologies: ['AI agents', 'Embodied AI', 'Simulation'],
    note: 'Enter the observatory to explore how an agent observes, plans, acts, and adapts when its environment changes.',
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
