import { TEA_SEATS, TEA_TABLE } from './island-layout';

/** A permanent place to meet, with clear space for both chairs and the paths. */
export function TeaTable() {
  return (
    <group>
      <group position={[TEA_TABLE.x, 0, TEA_TABLE.z]}>
        <mesh position={[0, 0.52, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.46, 0.43, 0.08, 12]} />
          <meshStandardMaterial color="#c49862" />
        </mesh>
        <mesh position={[0, 0.27, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.14, 0.48, 8]} />
          <meshStandardMaterial color="#856c4b" />
        </mesh>
        <mesh position={[0, 0.575, 0.12]}>
          <cylinderGeometry args={[0.16, 0.14, 0.025, 12]} />
          <meshStandardMaterial color="#f3e5bc" />
        </mesh>
        {[-0.07, 0.06].map((x) => (
          <mesh key={x} position={[x, 0.6, 0.12]} rotation={[0, x * 3, 0]}>
            <boxGeometry args={[0.09, 0.035, 0.07]} />
            <meshStandardMaterial color="#b97e45" />
          </mesh>
        ))}
        <group position={[0, 0.65, -0.14]}>
          <mesh castShadow>
            <sphereGeometry args={[0.12, 10, 6]} />
            <meshStandardMaterial color="#779e91" />
          </mesh>
          <mesh position={[0, 0.11, 0]}>
            <cylinderGeometry args={[0.06, 0.075, 0.025, 10]} />
            <meshStandardMaterial color="#587e75" />
          </mesh>
          <mesh position={[0.13, 0.025, 0]} rotation={[0, 0, -0.65]}>
            <cylinderGeometry args={[0.025, 0.05, 0.15, 8]} />
            <meshStandardMaterial color="#779e91" />
          </mesh>
          <mesh position={[-0.12, 0.015, 0]}>
            <torusGeometry args={[0.07, 0.018, 6, 12]} />
            <meshStandardMaterial color="#779e91" />
          </mesh>
        </group>
      </group>
      {Object.entries(TEA_SEATS).map(([id, seat]) => (
        <group key={id} position={[seat.x, 0, seat.z]}>
          <mesh position={[id === 'sam' ? 0.2 : -0.2, 0.52, 0]} castShadow>
            <boxGeometry args={[0.055, 0.36, 0.38]} />
            <meshStandardMaterial color={id === 'sam' ? '#87a99c' : '#b4a0b9'} />
          </mesh>
          <mesh position={[0, 0.31, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.24, 0.23, 0.075, 10]} />
            <meshStandardMaterial
              color={id === 'sam' ? '#87a99c' : '#b4a0b9'}
            />
          </mesh>
          {[-1, 1].flatMap((x) =>
            [-1, 1].map((z) => (
              <mesh
                key={`${x}-${z}`}
                position={[x * 0.13, 0.15, z * 0.13]}
                castShadow
              >
                <boxGeometry args={[0.045, 0.3, 0.045]} />
                <meshStandardMaterial color="#937955" />
              </mesh>
            )),
          )}
        </group>
      ))}
    </group>
  );
}
