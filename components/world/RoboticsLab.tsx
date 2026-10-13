'use client';
import { TeleoperationPair } from './TeleoperationPair';

export default function RoboticsLab({ reduced }: { reduced: boolean }) {
  return <group>
    <mesh position={[0, 0.08, 0]} receiveShadow><boxGeometry args={[4.65, 0.14, 3.35]} /><meshStandardMaterial color="#b69566" roughness={0.8} /></mesh>
    <group position={[0, 0.34, 0]} scale={0.82}><TeleoperationPair auto reduced={reduced} /></group>
  </group>;
}
