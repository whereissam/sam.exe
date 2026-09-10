import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../../', import.meta.url));
const catalog = JSON.parse(
  readFileSync(join(root, 'components/world/model-manifest.json'), 'utf8'),
);
const expected = [
  'robotics',
  'frontend',
  'blockchain',
  'ai',
  'photography',
  'travel',
];
if (!Object.keys(catalog).length) {
  console.log('No Blender exports yet. Procedural fallback is active.');
  process.exit(0);
}
assert.deepEqual(
  Object.keys(catalog).sort(),
  [...expected].sort(),
  'Catalog must contain all six districts',
);
for (const [district, url] of Object.entries(catalog)) {
  assert.match(url, new RegExp(`^/models/${district}-[a-f0-9]{12}\\.glb$`));
  const path = join(root, 'public', url.slice(1));
  const data = readFileSync(path);
  assert.ok(statSync(path).size <= 500_000, `${district}: GLB exceeds 500 kB`);
  assert.ok(data.length >= 20, `${district}: truncated header`);
  assert.equal(data.readUInt32LE(0), 0x46546c67, 'Invalid GLB magic');
  assert.equal(data.readUInt32LE(4), 2, 'glTF 2 required');
  assert.equal(data.readUInt32LE(8), data.length, 'GLB length mismatch');
  const jsonLength = data.readUInt32LE(12);
  assert.equal(data.readUInt32LE(16), 0x4e4f534a, 'First chunk must be JSON');
  assert.ok(20 + jsonLength <= data.length, 'JSON chunk out of bounds');
  const doc = JSON.parse(
    data
      .subarray(20, 20 + jsonLength)
      .toString('utf8')
      .trim(),
  );
  assert.equal(doc.asset.version, '2.0');
  assert.ok(!doc.animations?.length, 'Starter district exports are static');
  assert.ok(
    !doc.images?.length,
    'Starter district exports must be texture-free',
  );
  assert.ok(
    !doc.extensionsRequired?.some((x) => /draco|meshopt/i.test(x)),
    'External decoders are disabled',
  );
  assert.ok(
    doc.buffers?.length === 1 && !doc.buffers[0].uri,
    'Geometry must be embedded',
  );
  let triangles = 0;
  let primitives = 0;
  for (const mesh of doc.meshes ?? [])
    for (const primitive of mesh.primitives) {
      assert.equal(primitive.mode ?? 4, 4, 'Only triangle primitives expected');
      const accessor =
        doc.accessors[primitive.indices ?? primitive.attributes.POSITION];
      assert.ok(
        accessor && accessor.count % 3 === 0,
        'Invalid triangle accessor',
      );
      triangles += accessor.count / 3;
      primitives++;
    }
  assert.ok(
    triangles > 0 && triangles <= 12_000,
    `${district}: triangle budget exceeded or empty mesh`,
  );
  console.log(
    `${district}: ${(data.length / 1024).toFixed(1)} KiB, ${triangles} triangles, ${primitives} primitives`,
  );
}
