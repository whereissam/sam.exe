import { useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { Motion } from './Companions';
import { teaPose } from './tea-motion';

export function TeaCup({
  motion,
  reduced,
}: {
  motion: RefObject<Motion>;
  reduced: boolean;
}) {
  const group = useRef<Group>(null);
  useFrame(() => {
    if (!group.current) return;
    group.current.visible = motion.current.teaTime !== undefined;
    const pose = teaPose(reduced ? 0 : (motion.current.teaTime ?? 0));
    group.current.position.set(pose.cup[0], pose.cup[1], pose.cup[2]);
    group.current.rotation.x = pose.tilt;
  });
  return (
    <group ref={group} visible={false}>
      <mesh castShadow>
        <cylinderGeometry args={[0.052, 0.038, 0.08, 24]} />
        <meshStandardMaterial color="#f3e6c9" />
      </mesh>
      <mesh position={[0, 0.041, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.043, 24]} />
        <meshStandardMaterial color="#946238" />
      </mesh>
      <mesh position={[0.055, 0, 0]}>
        <torusGeometry args={[0.023, 0.008, 8, 16]} />
        <meshStandardMaterial color="#f3e6c9" />
      </mesh>
    </group>
  );
}
