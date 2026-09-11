import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
const script = fileURLToPath(new URL('./import.mjs', import.meta.url));
test('photo import downsizes, strips EXIF, preserves original, and resolves a journey', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sam-photo-test-'));
  const original = await sharp({
    create: { width: 2400, height: 1800, channels: 3, background: '#8d7b97' },
  })
    .withMetadata({ exif: { IFD0: { Artist: 'Test fixture' } } })
    .jpeg()
    .toBuffer();
  await writeFile(join(dir, 'original.jpg'), original);
  const input = {
    photos: [
      {
        id: 'fixture',
        file: 'original.jpg',
        title: 'Test fixture',
        alt: 'Solid test color',
        country: 'Test country',
      },
    ],
    journeys: [
      {
        id: 'fixture-city',
        city: 'Test city',
        country: 'Test country',
        period: '',
        title: 'Fixture',
        paragraphs: [],
        photoIds: ['fixture'],
      },
    ],
  };
  const manifest = join(dir, 'source.json');
  await writeFile(manifest, JSON.stringify(input));
  const out = join(dir, 'output');
  const run = spawnSync(
    process.execPath,
    [script, manifest, '--output-root', out],
    { encoding: 'utf8' },
  );
  assert.equal(run.status, 0, run.stderr);
  const data = JSON.parse(
    await readFile(join(out, 'content/stories.json'), 'utf8'),
  );
  const image = await sharp(join(out, 'public', data.photos[0].src)).metadata();
  assert.equal(data.photos[0].country, 'Test country');
  assert.equal(image.width, 1600);
  assert.equal(image.height, 1200);
  assert.equal(image.exif, undefined);
  const thumb = await sharp(
    join(out, 'public', data.photos[0].thumbnail),
  ).metadata();
  assert.equal(thumb.width, 480);
  assert.deepEqual(await readFile(join(dir, 'original.jpg')), original);
  assert.deepEqual(data.journeys[0].photoIds, ['fixture']);
});
test('invalid journey reference fails before replacing the published catalog', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sam-photo-invalid-'));
  await mkdir(join(dir, 'content'));
  const old = '{"photos":[],"journeys":[]}';
  await writeFile(join(dir, 'content/stories.json'), old);
  const input = join(dir, 'source.json');
  await writeFile(
    input,
    JSON.stringify({
      photos: [],
      journeys: [
        {
          id: 'broken',
          city: 'Test',
          country: 'Test',
          title: 'Test',
          paragraphs: [],
          photoIds: ['missing'],
        },
      ],
    }),
  );
  const run = spawnSync(
    process.execPath,
    [script, input, '--output-root', dir],
    { encoding: 'utf8' },
  );
  assert.notEqual(run.status, 0);
  assert.equal(await readFile(join(dir, 'content/stories.json'), 'utf8'), old);
});
