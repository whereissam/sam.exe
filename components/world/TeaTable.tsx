import { Laptop } from './Laptop';
import { TEA_SEATS, TEA_TABLE } from './island-layout';

/** A permanent place to meet, with clear space for both chairs and the paths. */
export function TeaTable({
  working = false,
  tea = false,
}: {
  working?: boolean;
  tea?: boolean;
}) {
  return (
    <group>
      <group position={[TEA_TABLE.x, 0, TEA_TABLE.z]}>
        <mesh position={[0, 0.52, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.7, 0.69, 0.055, 32]} />
          <meshStandardMaterial color="#c49862" />
        </mesh>
        <mesh position={[0, 0.27, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.14, 0.48, 8]} />
          <meshStandardMaterial color="#856c4b" />
        </mesh>
        {working ? (
          <>
            {[-1, 1].map((side) => (
              <group
                key={side}
                position={[side * 0.49, 0.561, 0]}
                rotation={[0, (-side * Math.PI) / 2, 0]}
              >
                <Laptop />
              </group>
            ))}
          </>
        ) : tea ? (
          <>
            <mesh position={[0, 0.56, 0.15]}>
              <cylinderGeometry args={[0.16, 0.14, 0.025, 12]} />
              <meshStandardMaterial color="#f3e5bc" />
            </mesh>
            {[-0.07, 0.06].map((x) => (
              <mesh key={x} position={[x, 0.59, 0.15]} rotation={[0, x * 3, 0]}>
                <boxGeometry args={[0.09, 0.035, 0.07]} />
                <meshStandardMaterial color="#b97e45" />
              </mesh>
            ))}
            {[-1, 1].map((side) => (
              <mesh
                key={side}
                position={[side * 0.58, 0.55, side * 0.125]}
                receiveShadow
              >
                <cylinderGeometry args={[0.085, 0.075, 0.012, 24]} />
                <meshStandardMaterial color="#f3e6c9" />
              </mesh>
            ))}
            <group position={[0, 0.64, -0.14]}>
              <mesh castShadow>
                <sphereGeometry args={[0.105, 20, 12]} />
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
                <torusGeometry args={[0.07, 0.014, 8, 20]} />
                <meshStandardMaterial color="#779e91" />
              </mesh>
            </group>
          </>
        ) : null}
      </group>
      {Object.entries(TEA_SEATS).map(([id, seat]) => (
        <group key={id} position={[seat.x, 0, seat.z]}>
          <group position={[id === 'sam' ? 0.19 : -0.19, 0, 0]}>
            {[-0.155, 0.155].map((z) => (
              <mesh key={z} position={[0, 0.46, z]} castShadow>
                <cylinderGeometry args={[0.021, 0.025, 0.56, 8]} />
                <meshStandardMaterial color="#96704e" />
              </mesh>
            ))}
            {[0.54, 0.68].map((y) => (
              <mesh key={y} position={[0, y, 0]} castShadow>
                <boxGeometry args={[0.045, 0.065, 0.35]} />
                <meshStandardMaterial color="#b38a61" />
              </mesh>
            ))}
          </group>
          <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.225, 0.215, 0.055, 20]} />
            <meshStandardMaterial color="#a68058" />
          </mesh>
          <mesh position={[0, 0.337, 0]} receiveShadow>
            <cylinderGeometry args={[0.205, 0.21, 0.035, 24]} />
            <meshStandardMaterial
              color={id === 'sam' ? '#87a99c' : '#b4a0b9'}
              roughness={1}
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
