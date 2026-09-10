import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { Box3, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const manifest = JSON.parse(
  await readFile(
    new URL('../../components/world/character-manifest.json', import.meta.url),
    'utf8',
  ),
);
const report = {};
for (const [name, url] of Object.entries(manifest)) {
  const bytes = await readFile(new URL('../../public' + url, import.meta.url));
  const array = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
  const gltf = await new GLTFLoader().parseAsync(array, '');
  const scene = gltf.scene;
  for (const joint of ['Head', 'ArmL', 'ArmR', 'LegL', 'LegR', 'Body'])
    assert.ok(scene.getObjectByName(joint), `${name}: missing ${joint}`);
  const size = new Box3().setFromObject(scene).getSize(new Vector3());
  assert.ok(size.y > 2 && size.y < 2.7, `${name}: avatar height ${size.y}`);
  assert.ok(size.x > 0.8 && size.x < 1.5, `${name}: avatar width ${size.x}`);
  const arm = scene.getObjectByName('ArmR');
  const before = new Box3().setFromObject(arm).getCenter(new Vector3());
  arm.rotation.z = 2.5;
  scene.updateMatrixWorld(true);
  const after = new Box3().setFromObject(arm).getCenter(new Vector3());
  assert.ok(
    after.y > before.y + 0.2,
    `${name}: raised arm must lift above resting pose`,
  );
  let triangles = 0,
    primitives = 0;
  scene.traverse((node) => {
    if (node.isMesh) {
      primitives++;
      triangles +=
        (node.geometry.index?.count ??
          node.geometry.attributes.position.count) / 3;
    }
  });
  assert.ok(
    bytes.length < 500000 && triangles < 12000,
    `${name}: model budget exceeded`,
  );
  report[name] = {
    bytes: bytes.length,
    triangles,
    primitives,
    height: size.y,
    articulation: 'raised arm verified',
  };
}
await writeFile(
  new URL('../../assets/blender/character-report.json', import.meta.url),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(report);
